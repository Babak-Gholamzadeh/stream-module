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
  
  read(n) {
    const state = this._readableState;

    if (n === undefined) {
      n = NaN;
    } else if (!Number.isInteger(n)) {
      n = parseInt(n, 10);
    }
    const nOrig = n;

    n = this._howMuchToRead(n);

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
        n = this._howMuchToRead(nOrig);
    }

    let ret = null;
    if (n > 0)
      ret = this._fromList(n);

    if (ret !== null) {
      state.length -= n;
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

  _howMuchToRead(n) {
    const state = this._readableState;
    if (n <= 0 || state.length === 0)
      return 0;
    if (Number.isNaN(n)) {
      if (state.flowing && state.length)
        return state.buffer.first().length;
      return state.length;
    }
    if (n <= state.length)
      return n;
    return 0;
  }

  _fromList(n) {
    const state = this._readableState;
    if (state.length === 0)
      return null;
    let ret;
    if (n >= state.length) {
      if (state.buffer.length === 1)
        ret = state.buffer.first();
      else
        ret = state.buffer.concat(state.length);
      state.buffer.clear();
    } else {
      ret = state.buffer.consume(n);
    }
    return ret;
  }
}

module.exports = Readable;
