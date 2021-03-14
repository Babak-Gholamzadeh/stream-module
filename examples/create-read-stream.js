const Readable = require('../readable');
const fs = require('fs');

class CreateReadStream extends Readable {
  constructor(filePath, options) {
    super(options);
    this._filePath = filePath;
  }
  _construct(callback) {
    fs.open(this._filePath, 'r+', (err, fd) => {
      if (err) {
        callback(err);
      } else {
        this._fd = fd;
        callback();
      }
    });
  }
  _read(n) {
    const buf = Buffer.alloc(n);
    fs.read(this._fd, buf, 0, n, null, (err, bytesRead) => {
      this.push(bytesRead > 0 ? buf.slice(0, bytesRead) : null);
    });
  }
}

const createReadStream = (filePath, options) => new CreateReadStream(filePath, options);

module.exports = createReadStream;
