# Introduction

This is the backend to the Percept project (survey running at: [https://percept.geo.uu.nl](https://percept.geo.uu.nl)). It expects to interact with a frontend server, see [Percept Frontend](https://www.github.com/mrd/percept-frontend).

It depends on Node.js (developed with version 18.14.2) and PostgreSQL (preferably version 13 or greater).

## Configuration

Copy `config.js.sample` to `config.js` and edit the values in the file according to the comments.

## Available Scripts

In the project directory, you can run:

### `npm install`

Downloads, builds and installs the necessary dependencies to run the app. Run this before anything else.

### `npm run dev`

Runs the app in the development mode.

The server will reload when you make changes.\
You may also see any lint errors in the console.

### `npm start`

Runs the app in production mode.

### `npm test`

Runs the test suite on the test database (`testdbname` in `config.js`).
