/* eslint-disable */
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const rimraf = require('rimraf');
const pixelmatch = require('pixelmatch');
const mkdirp = require('mkdirp');
const { PNG } = require('pngjs');
const sharp = require('sharp');