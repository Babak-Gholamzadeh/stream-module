const EventEmitter = require('./events');
class WritableState {
  constructor({ highWaterMark = 16 * 1024 }) {
    this.highWaterMark = highWaterMark;
    this.length = 0;
    this.buffered = [];
    this.writing = false;
    this.writecb = null;
    this.writelen = 0;
    this.needDrain = false;
  }
}
class Writable extends EventEmitter {
  constructor(options = {}) {
    super();
    this._writableState = new WritableState(options);
  }

  write(chunk, callback) {
    const state = this._writableState;

    if (typeof this._write !== 'function')
      throw new Error('_write() must to be implemented!');
    
    const len = chunk.length;
    state.length += len;
    const ret = state.length < state.highWaterMark;
    if (!ret)
      state.needDrain = true;

    if (state.writing) {
      state.buffered.push({ chunk, callback });
    } else {
      state.writing = true;
      state.writecb = callback;
      state.writelen = len;
      this._write(chunk, this._onwrite.bind(this));
    }

    return ret;
  }

  _onwrite() {
    const state = this._writableState;

    const cb = state.writecb;

    state.writing = false;
    state.writecb = null;
    state.length -= state.writelen;
    state.writelen = 0;

    if (state.buffered.length) {
      this._clearBuffer();
    }

    if (state.needDrain && state.length === 0) {
      state.needDrain = false;
      this.emit('drain');
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
    state.writelen = chunk.length;
    this._write(chunk, this._onwrite.bind(this));
  }

}

module.exports = Writable;
