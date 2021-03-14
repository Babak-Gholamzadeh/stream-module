const Writable = require('../writable');
const fs = require('fs');

class CreateWriteStream extends Writable {
  constructor(filePath, options) {
    super(options);
    this._filePath = filePath;
  }
  _construct(callback) {
    fs.open(this._filePath, 'w', (err, fd) => {
      if (err) {
        callback(err);
      } else {
        this._fd = fd;
        callback();
      }
    });
  }
  _write(chunk, encoding, next) {
    fs.write(this._fd, chunk, next);
  }
  _destroy(err, callback) {
    fs.close(this._fd, er => callback(er || err));
  }
}

const createWriteStream = (filePath, options) => new CreateWriteStream(filePath, options);

module.exports = createWriteStream;
