const EventEmitter = require('./events');
const BufferList = require('./buffer-list');
class ReadableState {
  constructor({ highWaterMark = 16 * 1024 }) {
    this.buffer = new BufferList();
    this.length = 0;
    this.flowing = null;
    this.resumeScheduled = false;
    this.reading = false;
    this.sync = true;
    this.highWaterMark = highWaterMark;
  }
}

class Readable extends EventEmitter {
  constructor(options = {}) {
    super();
    this._readableState = new ReadableState(options);
  }

  push(chunk) {
    const state = this._readableState;
    state.reading = false;

    if (state.flowing && this.listenerCount('data') > 0 && state.length === 0 && !state.sync) {
      this.emit('data', chunk);
    } else {
      state.length += chunk.length;
      state.buffer.push(chunk);
    }

    return state.length < state.highWaterMark;
  }

  resume() {
    const state = this._readableState;
    if (!state.flowing) {
      state.flowing = true;
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        process.nextTick(this._resume.bind(this));
      }
    }
  }

  _resume() {
    const state = this._readableState;
    state.resumeScheduled = false;
    this.emit('resume');
    this._flow();
  }

  _flow() {
    const state = this._readableState;
    while (state.flowing && this.read() !== null);
  }

  pause() {
    const state = this._readableState;
    if (state.flowing !== false) {
      state.flowing = false;
      this.emit('pause');
    }
    return this;
  }

  isPaused() {
    return this._readableState.flowing === false;
  }
  
  read() {
    const state = this._readableState;

    let n = this._howMuchToRead();

    let doRead = false;

    if (state.length - n < state.highWaterMark)
      doRead = true;

    if (state.reading)
      doRead = false;
    else if (doRead) {
      state.sync = true;
      state.reading = true;
      this._read(state.highWaterMark);
      state.sync = false;

      if (!state.reading)
        n = this._howMuchToRead();
    }

    let ret = null;
    if (state.length > 0)
      ret = this._fromList();

    if (ret !== null) {
      state.length -= ret.length;
      this.emit('data', ret);
    }

    return ret;
  }

  on(eventName, listener) {
    super.on(eventName, listener);

    const state = this._readableState;
    if (eventName === 'data') {
      if (state.flowing !== false)
        this.resume();
    }
  }

  _read() {
    throw new Error('_read method must be implemented');
  }

  _howMuchToRead() {
    const state = this._readableState;
    if (state.length === 0)
      return 0;
    return state.buffer.first().length;
  }

  _fromList() {
    const state = this._readableState;
    return state.buffer.shift();
  }
}

module.exports = Readable;
