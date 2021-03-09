const EventEmitter = require('./events');
class WritableState {
  constructor({
    objectMode = false,
    decodeStrings = false,
    defaultEncoding = 'utf8',
    highWaterMark = 16 * 1024,
    autoDestroy = true,
    emitClose = true,
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
    this.ending = false;
    this.ended = false;
    this.finished = false;
    this.autoDestroy = autoDestroy;
    this.destroyed = false;
    this.emitClose = emitClose;
    this.closed = false;
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

    if (state.ending)
      throw new Error('cannot write after stream has already been ended');
    
    if (state.destroyed)
      throw new Error('cannot write after stream has already been destroyed');
  
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

    if (state.needDrain && state.length === 0 && !state.ending && !state.destroyed) {
      state.needDrain = false;
      this.emit('drain');
    }

    if (typeof cb === 'function') {
      cb();
    }

    this._finishMaybe();
  }

  _clearBuffer() {
    const state = this._writableState;
    if (state.corked || state.destroyed)
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

  end(chunk, encoding) {
    const state = this._writableState;

    if (chunk !== null && chunk !== undefined)
      this.write(chunk, encoding);

    if (state.corked) {
      state.corked = 1;
      this.uncork();
    }
  
    if (state.destroyed) {
      throw new Error('write after destroyed');
    } else {
      state.ending = true;
      this._finishMaybe();
      state.ended = true;
    }
  }

  _finishMaybe() {
    const state = this._writableState;
    if (this._needFinish()) {
      state.finished = true;
      this.emit('finish');
      if (state.autoDestroy) {
        this.destroy();
      }
    }
  }

  _needFinish() {
    const state = this._writableState;
    return (
      state.ending &&
      state.length === 0 &&
      !state.finished &&
      !state.writing
    );
  }

  destroy() {
    const state = this._writableState;
    state.destroyed = true;
    if (state.emitClose)
      this._close();
    return this;
  }

  _close() {
    this._writableState.closed = true;
    process.nextTick(() => {
      this.emit('close');
    });
  }

}

module.exports = Writable;
