const Duplex = require('./duplex');

class Transform extends Duplex {
  constructor(options) {
    super(options);
    this._callback = null;
  }

  _write(chunk, encoding, callback) {
    this._transform(chunk, encoding, (err, val) => {
      if (err) {
        callback(err);
        return;
      }
      if (val !== null)
        this.push(val);
      this._callback = callback;
    });
  }

  _read() {
    if (this._callback) {
      const callback = this._callback;
      this._callback = null;
      callback();
    }
  }

  _transform() {
    throw new Error('_transform method must be implemented!');
  }
}

module.exports = Transform;
