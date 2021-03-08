class Writable {
  constructor() { }
  
  write(chunk) {
    if (typeof this._write !== 'function')
      throw new Error('_write() must to be implemented!');
    this._write(chunk);
  }
}

module.exports = Writable;
