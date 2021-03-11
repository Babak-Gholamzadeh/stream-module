const EventEmitter = require('./events');
const BufferList = require('./buffer-list');
class ReadableState {
  constructor() {
    this.buffer = new BufferList();
    this.length = 0;
    this.flowing = null;
  }
}

class Readable extends EventEmitter {
  constructor() {
    super();
    this._readableState = new ReadableState();
  }

  push(chunk) {
    const state = this._readableState;
    if (state.flowing && this.listenerCount('data') > 0 && state.length === 0) {
      this.emit('data', chunk);
    } else {
      state.length += chunk.length;
      state.buffer.push(chunk);
    }
  }

  resume() {
    const state = this._readableState;
    state.flowing = true;
    while (this.read() !== null);
  }

  read() {
    const state = this._readableState;

    let ret = null;
    if (state.length > 0)
      ret = state.buffer.shift();

    if (ret !== null) {
      state.length -= ret.length;
      this.emit('data', ret);
    }

    return ret;
  }
}

module.exports = Readable;
