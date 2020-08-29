const path = require('path');
const through2 = require('through2');
const sharp = require('sharp');
const debug = require('debug')('extract:preview');

const { getStoragePaths, writeStorageFile } = require('@home-gallery/storage');
const { toPipe, conditionalTask } = require('./task');

function resize(entry, src, storageDir, filename, size, cb) {
  sharp(src)
    .rotate()
    .resize({width: size})
    .jpeg({quality: 80, chromaSubsampling: '4:4:4'})
    .toBuffer((err, buf) => {
      if (err) {
        return cb(`Could not create JPEG buffer from ${src}: ${err}`);
      }
      writeStorageFile(entry, storageDir, filename, buf, (err) => {
        if (err) {
          return cb(err);
        }
        cb(null, filename);
      });
    });
}

function resizeImage(storageDir, entry, src, sizes, cb) {
  const {dir, prefix} = getStoragePaths(entry.sha1sum);

  let calculatedSizes = [];

  let index = 0;
  const next = () => {
    if (index === sizes.length) {
      return cb(null, calculatedSizes);
    }

    const size = sizes[index++];
    const filename = path.join(dir, `${prefix}-image-preview-${size}.jpg`);

    if (entry.files.indexOf(filename) >= 0) {
      src = path.join(storageDir, filename);
      return next();
    }

    resize(entry, src, storageDir, filename, size, (err) => {
      if (err) {
        return cb(new Error(`Could not calculate image preview from ${src} to ${filename}: ${err}`));
      } else {
        calculatedSizes.push(size);
        src = path.join(storageDir, filename);
        return next();
      }
    });
  }

  next();
}

function imagePreview(storageDir, sizes) {
  const test = entry => entry.type === 'image';

  const task = (entry, cb) => {
    const t0 = Date.now();
    resizeImage(storageDir, entry, entry.src, sizes, (err, calculatedSizes) => {
      if (err) {
        debug(`Could not calculate image preview of ${entry}: ${err}`);
      } else if (calculatedSizes.length) {
        debug(`Created ${calculatedSizes.length} image previews from ${entry} with sizes of ${calculatedSizes.join(',')} in ${Date.now() - t0}ms`)
      }
      cb();
    })
  }

  return toPipe(conditionalTask(test, task));
}

module.exports = { imagePreview, resizeImage };