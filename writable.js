class WritableState {
  constructor() {
    this.buffered = [];
    this.writing = false;
    this.writecb = null;
  }
}
class Writable {
  constructor() {
    this._writableState = new WritableState();
  }
  
  write(chunk, callback) {
    const state = this._writableState;

    if (typeof this._write !== 'function')
      throw new Error('_write() must to be implemented!');
    
    if (state.writing) {
      state.buffered.push({ chunk, callback });
    } else {
      state.writing = true;
      state.writecb = callback;
      this._write(chunk, this._onwrite.bind(this));
    }
  }

  _onwrite() {
    const state = this._writableState;

    const cb = state.writecb;

    state.writing = false;
    state.writecb = null;

    if (state.buffered.length) {
      this._clearBuffer();
    }

    if (typeof cb === 'function') {
      cb();
    }
  }

  _clearBuffer() {
    const state = this._writableState;
    const { chunk, callback } = state.buffered.shift();
    this._doWrite(chunk, callback);
  }

  _doWrite(chunk, callback) {
    const state = this._writableState;
    state.writing = true;
    state.writecb = callback;
    this._write(chunk, this._onwrite.bind(this));
  }

}

module.exports = Writable;
