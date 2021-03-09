const EventEmitter = require('./events');
class WritableState {
  constructor({
    objectMode = false,
    decodeStrings = false,
    defaultEncoding = 'utf8',
    highWaterMark = 16 * 1024,
  }) {
    this.objectMode = objectMode;
    this.decodeStrings = decodeStrings;
    this.defaultEncoding = defaultEncoding;
    this.highWaterMark = highWaterMark;
    this.length = 0;
    this.buffered = [];
    this.writing = false;
    this.writecb = null;
    this.writelen = 0;
    this.needDrain = false;
    this.corked = 0;
  }
}
class Writable extends EventEmitter {
  constructor(options = {}) {
    super();
    this._writableState = new WritableState(options);
  }

  write(chunk, encoding, callback) {
    const state = this._writableState;

    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = state.defaultEncoding;
    } else {
      if (!encoding)
        encoding = state.defaultEncoding;
      else if (encoding !== 'buffer' && !Buffer.isEncoding(encoding))
        throw new Error('invalid encoding');
    }

    if (chunk === null) {
      throw new Error('chunk cannot be null');
    } else if (!state.objectMode) {
      if (typeof chunk === 'string') {
        if (state.decodeStrings !== false) {
          chunk = Buffer.from(chunk, encoding);
          encoding = 'buffer';
        }
      } else if (chunk instanceof Buffer) {
        encoding = 'buffer';
      } else {
        throw new Error('invalid types! only string and buffer are accepted');
      }
    }

    if (typeof this._write !== 'function')
      throw new Error('_write() must to be implemented!');

    const len = (state.objectMode ? 1 : chunk.length);
    state.length += len;
    const ret = state.length < state.highWaterMark;
    if (!ret)
      state.needDrain = true;

    if (state.writing || state.corked) {
      state.buffered.push({ chunk, encoding, callback });
    } else {
      state.writing = true;
      state.writecb = callback;
      state.writelen = len;
      this._write(chunk, encoding, this._onwrite.bind(this));
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
    if (state.corked)
      return;

    const { chunk, encoding, callback } = state.buffered.shift();
    this._doWrite(chunk, encoding, callback);
  }

  _doWrite(chunk, encoding, callback) {
    const state = this._writableState;
    state.writing = true;
    state.writecb = callback;
    state.writelen = (state.objectMode ? 1 : chunk.length);
    this._write(chunk, encoding, this._onwrite.bind(this));
  }

  cork() {
    this._writableState.corked++;
  }

  uncork() {
    const state = this._writableState;
    if (state.corked) {
      state.corked--;
      if (!state.writing)
        this._clearBuffer();
    }
  }

  setDefaultEncoding(encoding) {
    if (!Buffer.isEncoding(encoding))
      throw new Error('invalid encoding');
    this._writableState.defaultEncoding = encoding;
    return this;
  }

}

module.exports = Writable;
