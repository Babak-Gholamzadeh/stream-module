const Duplex = require('../duplex');
const fs = require('fs');

class CreateDuplexStream extends Duplex {
  constructor(readFilePath, writeFilePath, options) {
    super(options);
    this._readFilePath = readFilePath;
    this._writeFilePath = writeFilePath;
  }
  _construct(callback) {
    fs.open(this._writeFilePath, 'w', (err, file) => {
      if (err) {
        callback(err);
      } else {
        this._writefd = file;
        fs.open(this._readFilePath, 'r+', (err, file) => {
          if (err) {
            callback(err);
          } else {
            this._readfd = file;
            callback();
          }
        });
      }
    });
  }
  _read(n) {
    const buf = Buffer.alloc(n);
    fs.read(this._readfd, buf, 0, n, null, (err, bytesRead) => {
      this.push(bytesRead > 0 ? buf.slice(0, bytesRead) : null);
    });
  }
  _write(chunk, encoding, next) {
    fs.write(this._writefd, chunk, next);
  }
  _destroy(err, callback) {
    fs.close(this._writefd, er => callback(er || err));
  }
}

const createDuplexStream = (readFilePath, writeFilePath, options) => new CreateDuplexStream(readFilePath, writeFilePath, options);

module.exports = createDuplexStream;
