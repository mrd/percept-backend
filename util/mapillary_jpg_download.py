import mercantile, mapbox_vector_tile, requests, json, os
import time
from vt2geojson.tools import vt_bytes_to_geojson
import os.path
import sys
import shutil
from PIL import Image
import io

reqdiskspacegb=100
retries=10
tiledir='tiles'
seqdir='seqs'

def is_jpg_file(fname):
    try:
        with Image.open(fname) as img:
            return img.format in ['JPEG', 'MPO']
    except:
        return False

def is_jpg_data(data):
    return is_jpg_file(io.BytesIO(data))

# define an empty geojson as output
output= { "type": "FeatureCollection", "features": [] }

# vector tile endpoints -- change this in the API request to reference the correct endpoint
tile_coverage = 'mly1_public'

# tile layer depends which vector tile endpoints: 
# 1. if map features or traffic signs, it will be "point" always
# 2. if looking for coverage, it will be "image" for points, "sequence" for lines, or "overview" for far zoom
tile_layer = "image"

# Mapillary access token -- user should provide their own
access_token = 'MLY|5946251815466309|182480777606b215f898572d43a313eb';

if len(sys.argv) != 2:
    print('must provide json file with tile list')
    exit(1)


with open(sys.argv[1]) as f:
    tilesinfo = json.load(f)

west, south, east, north = tilesinfo['west'], tilesinfo['south'], tilesinfo['east'], tilesinfo['north']

tiles = []
for [x,y,z] in tilesinfo['tiles']:
    tiles.append(mercantile.Tile(x,y,z))

print(f'working on region (west={west}, south={south}, east={east}, north={north}) tilecount={len(tiles)}')


if not os.path.exists(tiledir):
    os.makedirs(tiledir)

if not os.path.exists(seqdir):
    os.makedirs(seqdir)


# loop through list of tiles to get tile z/x/y to plug in to Mapillary endpoints and make request
for tile in tiles:
    tile_cache = os.path.join(tiledir,'{}_{}_{}_{}'.format(tile_coverage,tile.x,tile.y,tile.z))
    data = {}
    if os.path.exists(tile_cache):
        with open(tile_cache) as f:
            data = json.load(f)
        print(f'loaded {tile_cache} from cache')
    if not data:
        print(f'fetching tile {tile.x}, {tile.y}, {tile.z} from mapillary')
        tile_url = 'https://tiles.mapillary.com/maps/vtp/{}/2/{}/{}/{}?access_token={}'.format(tile_coverage,tile.z,tile.x,tile.y,access_token)
        response = requests.get(tile_url)
        data = vt_bytes_to_geojson(response.content, tile.x, tile.y, tile.z,layer=tile_layer)

        with open(tile_cache,'w') as f:
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

            if os.path.isfile(imgfile) and is_jpg_file(imgfile):
                print(f'sequence {sequence_id}, image {image_id} is already downloaded')
                continue

            if not os.path.exists(os.path.join(seqdir,sequence_id)):
                os.makedirs(os.path.join(seqdir,sequence_id))

            if shutil.disk_usage(seqdir).free < reqdiskspacegb*1000000000:
                print('insufficient free disk space, stopping for now')
                exit(0)

            print(f'downloading: sequence {sequence_id}, image {image_id}')
            #import pdb;pdb.set_trace() 

            header = {'Authorization' : 'OAuth {}'.format(access_token)}
            url = 'https://graph.mapillary.com/{}?fields=thumb_original_url'.format(image_id)

            cursleep=1
            for retryno in range(retries+1):
                r = requests.get(url, headers=header)
                data = r.json()
                if 'thumb_original_url' not in data:
                    print(f'thumb_original_url not found in {data}')
                    if retryno < retries:
                        print(f'retrying after {cursleep} seconds...')
                        time.sleep(cursleep)
                        cursleep *= 2 # exponential backoff
                    else:
                        print('out of retries, skipping...')
                        break
                else:
                    break

            if 'thumb_original_url' not in data:
                continue # skip

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
                        print(f'error: downloaded data for {imgfile} is not a jpeg!')
                        if retryno < retries:
                            print(f'retrying after {cursleep} seconds...')
                            time.sleep(cursleep)
                            cursleep *= 2 # exponential backoff
                        else:
                            print('out of retries, exiting...')
                            exit(1)

