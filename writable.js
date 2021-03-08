class WritableState {
  constructor() {
    this.buffered = [];
    this.writing = false;
  }
}
class Writable {
  constructor() {
    this._writableState = new WritableState();
  }
  
  write(chunk) {
    const state = this._writableState;

    if (typeof this._write !== 'function')
      throw new Error('_write() must to be implemented!');
    
    if (state.writing) {
      state.buffered.push(chunk);
    } else {
      state.writing = true;
      this._write(chunk, this._onwrite.bind(this));
    }
  }

  _onwrite() {
    const state = this._writableState;
    state.writing = false;
    if (state.buffered.length) {
      this._clearBuffer();
    }
  }

  _clearBuffer() {
    const state = this._writableState;
    const chunk = state.buffered.shift();
    this._doWrite(chunk);
  }

  _doWrite(chunk) {
    const state = this._writableState;
    state.writing = true;
    this._write(chunk, this._onwrite.bind(this));
  }

}

module.exports = Writable;
