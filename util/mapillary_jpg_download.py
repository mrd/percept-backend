import mercantile, mapbox_vector_tile, requests, json, os
from vt2geojson.tools import vt_bytes_to_geojson
from pathlib import Path
from PIL import Image
import argparse
import os.path
import signal
import shutil
import time
import sys
import io

parser = argparse.ArgumentParser(prog='mapillary_jpg_download.py', description='Download mapillary images')
parser.add_argument('--configfile', '--config', '-c', default=None, required=False, metavar='FILENAME', help='Configuration file to process')
parser.add_argument('--quiet', '-q', action='store_true', default=False, help='Run in quiet mode')
parser.add_argument('--overwrite', '-O', action='store_true', default=False, help='Overwrite any existing output file')
parser.add_argument('--tile-cache-dir', metavar='DIR', help='Directory in which to store tile cache',default=None)
parser.add_argument('--seqdir', metavar='DIR', help='Directory in which to store image sequences',default=None)
parser.add_argument('--token', metavar='TOKEN', help='Mapillary API token (see Developers help for Mapillary)',default=None)
parser.add_argument('--token-file', metavar='FILE', help='Alternatively, read the token from this file (with the token written on a single line)',default='token.txt')
parser.add_argument('--required-disk-space', default=100, metavar='GB', type=int, help='Will stop run less than this number in gigabytes is available.')
parser.add_argument('--num-retries', default=10, metavar='NUM', type=int, help='Number of times to retry if there is a network failure.')
parser.add_argument('--west', default=None, metavar='LON', type=float, help='Western boundary (longitude)')
parser.add_argument('--south', default=None, metavar='LAT', type=float, help='Southern boundary (latitude)')
parser.add_argument('--east', default=None, metavar='LON', type=float, help='Eastern boundary (longitude)')
parser.add_argument('--north', default=None, metavar='LAT', type=float, help='Northern boundary (latitude)')

def signal_handler(sig, frame):
    sys.exit(0)

def is_jpg_file(fname):
    try:
        with Image.open(fname) as img:
            return img.format in ['JPEG', 'MPO']
    except:
        return False

def is_jpg_data(data):
    return is_jpg_file(io.BytesIO(data))

def main():
    # cleanly handle Control-C:
    signal.signal(signal.SIGINT, signal_handler)

    args = parser.parse_args()

    # 'verbose' log -- print to screen if quiet mode is not enabled
    def vlog(s):
        if not args.quiet:
            print(s)

    if args.configfile is not None:
        with open(args.configfile) as f:
            config = json.load(f)
    else:
        config = None

    reqdiskspacegb=args.required_disk_space
    retries=args.num_retries
    vlog(f'configfile={args.configfile} required_disk_space={reqdiskspacegb} num_retries={retries}')

    # command-line parameter overrides config file setting
    if args.tile_cache_dir is not None:
        tiledir = args.tile_cache_dir
    elif config is not None and config['tile_cache_dir'] is not None: 
        tiledir = config['tile_cache_dir']
    else:
        print('--tile-cache-dir is required.')
        exit(1)

    # command-line parameter overrides config file setting
    if args.seqdir is not None:
        seqdir = args.seqdir
    elif config is not None and config['seqdir'] is not None: 
        seqdir = config['seqdir']
    else:
        print('--seqdir is required.')
        exit(1)

    vlog(f'tile_cache_dir="{tiledir}" seqdir="{seqdir}"')

    # define an empty geojson as output
    output= { "type": "FeatureCollection", "features": [] }

    # vector tile endpoints -- change this in the API request to reference the correct endpoint
    tile_coverage = 'mly1_public'

    # tile layer depends which vector tile endpoints: 
    # 1. if map features or traffic signs, it will be "point" always
    # 2. if looking for coverage, it will be "image" for points, "sequence" for lines, or "overview" for far zoom
    tile_layer = "image"

    # Mapillary access token:
    # 1. Check command-line argument for token
    # 2. Check command-line argument for token file (default: 'token.txt')
    #    - if token file exists then read the entire contents of the file and
    #      treat it as the token.
    access_token = None
    if args.token is not None:
        access_token = args.token
    elif args.token_file is not None and Path(args.token_file).exists():
        with open(args.token_file) as f:
            access_token = f.read().strip()
    if access_token is None:
        print('--token is required')
        exit(1)

    # a bounding box in [east_lng,_south_lat,west_lng,north_lat] format
    bb = config['bounding_box'] if config is not None else None

    def get_boundary(dirname):
        nonlocal bb, args
        # command-line parameter overrides config file setting
        if hasattr(args, dirname) and getattr(args, dirname) is not None:
            return getattr(args, dirname)
        elif bb is not None and bb[dirname] is not None:
            return bb[dirname]
        else:
            print(f'--{dirname} must be set on the command-line or the configfile.')
            exit(1)

    west = get_boundary('west')
    south = get_boundary('south')
    east = get_boundary('east')
    north = get_boundary('north')

    vlog(f'Bounding box: west={west} south={south} east={east} north={north}')

    # get the list of tiles with x and y coordinates which intersect our bounding box
    # MUST be at zoom level 14 where the data is available, other zooms currently not supported
    tiles = list(mercantile.tiles(west, south, east, north, 14))
    tilesinfo = { 'tiles': tiles, 'west': west, 'south': south, 'east': east, 'north': north}
    vlog(f'tilecount={len(tiles)}')

    # Convert tile list into a list of mercantile.Tile objects
    tiles = []
    for [x,y,z] in tilesinfo['tiles']:
        tiles.append(mercantile.Tile(x,y,z))

    os.makedirs(tiledir, exist_ok=True)
    os.makedirs(seqdir, exist_ok=True)

    # loop through list of tiles to get tile z/x/y to plug in to Mapillary endpoints and make request
    for tile in tiles:
        tile_cache_filename = os.path.join(tiledir,'{}_{}_{}_{}'.format(tile_coverage,tile.x,tile.y,tile.z))
        data = {}
        if not args.overwrite and os.path.exists(tile_cache_filename):
            with open(tile_cache_filename) as f:
                data = json.load(f)
            vlog(f'Loaded tile ({tile.x}, {tile.y}, {tile.z}) cache file "{tile_cache_filename}".')
        if not data:
            vlog(f'Fetching tile ({tile.x}, {tile.y}, {tile.z}) from Mapillary.')
            tile_url = 'https://tiles.mapillary.com/maps/vtp/{}/2/{}/{}/{}?access_token={}'.format(tile_coverage,tile.z,tile.x,tile.y,access_token)
            response = requests.get(tile_url)
            data = vt_bytes_to_geojson(response.content, tile.x, tile.y, tile.z,layer=tile_layer)

            with open(tile_cache_filename,'w') as f:
                json.dump(data, f, indent=4)

        # push to output geojson object if yes
        for feature in data['features']:
            # get lng,lat of each feature
            lng = feature['geometry']['coordinates'][0]
            lat = feature['geometry']['coordinates'][1]

            # ensure feature falls inside bounding box since tiles can extend beyond
            if lng > west and lng < east and lat > south and lat < north:

                # create a folder for each unique sequence ID to group images by sequence
                sequence_id = feature['properties']['sequence_id']

                # request the URL of each image
                image_id = feature['properties']['id']
                imgfile = os.path.join(seqdir,sequence_id,f'{image_id}.jpg')

                if not args.overwrite and os.path.isfile(imgfile) and is_jpg_file(imgfile):
                    vlog(f'Sequence {sequence_id}, image ID {image_id} is already downloaded.')
                    continue

                os.makedirs(os.path.join(seqdir,sequence_id),exist_ok=True)

                if shutil.disk_usage(seqdir).free < reqdiskspacegb*1000000000:
                    print('Insufficient free disk space, stopping for now.')
                    exit(0)

                vlog(f'Downloading: sequence {sequence_id}, image ID {image_id}... ')

                header = {'Authorization' : 'OAuth {}'.format(access_token)}
                url = 'https://graph.mapillary.com/{}?fields=thumb_original_url'.format(image_id)

                cursleep=1
                for retryno in range(retries+1):
                    r = requests.get(url, headers=header)
                    data = r.json()
                    if 'thumb_original_url' not in data:
                        vlog(f'  thumb_original_url not found in {data}.')
                        if retryno < retries:
                            vlog(f'  retrying after {cursleep} seconds...')
                            time.sleep(cursleep)
                            cursleep *= 2 # exponential backoff
                        else:
                            vlog('  out of retries, skipping.')
                            break
                    else:
                        break

                if 'thumb_original_url' not in data:
                    continue # skip because unable to download

                image_url = data['thumb_original_url']

                # save each image with ID as filename to directory by sequence ID
                with open(imgfile, 'wb') as handler:
                    cursleep=1
                    for retryno in range(retries+1):
                        image_data = requests.get(image_url, stream=True).content
                        if is_jpg_data(image_data):
                            handler.write(image_data)
                            break
                        else:
                            vlog(f'  error: downloaded data for {imgfile} is not a jpeg!')
                            if retryno < retries:
                                vlog(f'  retrying after waiting for {cursleep} seconds...')
                                time.sleep(cursleep)
                                cursleep *= 2 # exponential backoff
                            else:
                                print(f'imgfile={imgfile} image_url={image_url}')
                                print(f'download attempt out of retries, exiting...')
                                exit(1)

if __name__=='__main__':
    main()

# vim: ai sw=4 sts=4 ts=4 et
