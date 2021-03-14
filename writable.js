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
    this.constructed = true;
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
    this.errored = null;
  }
}
class Writable extends EventEmitter {
  constructor(options = {}) {
    super();
    this._writableState = new WritableState(options);

    if (options) {
      if (typeof options.write === 'function')
        this._write = options.write;
  
      if (typeof options.destroy === 'function')
        this._destroy = options.destroy;
  
      if (typeof options.construct === 'function')
        this._construct = options.construct;
    }

    if (typeof this._construct === 'function') {
      const state = this._writableState;
      state.constructed = false;
      process.nextTick(() => {
        this._construct(err => {
          state.constructed = true;
          if (err)
            state.errored = err;
          this._finishMaybe();
        });
      });
    }
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

    if (state.ending) {
      state.errored = new Error('cannot write after stream has already been ended');
    } else if (state.destroyed) {
      state.errored = new Error('cannot write after stream has already been destroyed');
    }
    if(state.errored) {
      if (typeof callback === 'function')
        process.nextTick(callback, state.errored);
      return false;
    }

    const len = (state.objectMode ? 1 : chunk.length);
    state.length += len;
    const ret = state.length < state.highWaterMark;
    if (!ret)
      state.needDrain = true;

    if (state.writing || state.corked || !state.constructed) {
      state.buffered.push({ chunk, encoding, callback });
    } else {
      state.writing = true;
      state.writecb = callback;
      state.writelen = len;
      this._write(chunk, encoding, this._onwrite.bind(this));
    }

    return ret;
  }

  _onwrite(err) {
    const state = this._writableState;

    const cb = state.writecb;

    state.writing = false;
    state.writecb = null;
    state.length -= state.writelen;
    state.writelen = 0;

    if (err) {
      state.errored = err;
      throw state.errored;
    } else {
      if (state.buffered.length)
        this._clearBuffer();
      if (state.needDrain && state.length === 0 && !state.ending && !state.destroyed) {
        state.needDrain = false;
        this.emit('drain');
      }
      if (typeof cb === 'function')
        cb();
    }

    this._finishMaybe();
  }

  _clearBuffer() {
    const state = this._writableState;
    if (state.corked || state.destroyed || !state.constructed)
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

  end(chunk, encoding, cb) {
    const state = this._writableState;

    if (typeof chunk === 'function') {
      cb = chunk;
      chunk = null;
      encoding = null;
    } else if (typeof encoding === 'function') {
      cb = encoding;
      encoding = null;
    }

    if (chunk !== null && chunk !== undefined)
      this.write(chunk, encoding);

    if (state.corked) {
      state.corked = 1;
      this.uncork();
    }
  
    if (state.destroyed) {
      state.errored = new Error('write after destroyed');
      if (typeof cb === 'function') {
        process.nextTick(cb, state.errored);
      }
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
      state.constructed &&
      state.length === 0 &&
      !state.errored &&
      !state.finished &&
      !state.writing
    );
  }

  destroy(err, cb) {
    const state = this._writableState;
    state.destroyed = true;

    if (typeof cb === 'function')
      cb(err);

    if (err) {
      state.errored = err;
      this._onError();
    }

    if (state.emitClose)
      this._close();

    this._destroy(state.errored, this._onDestroy.bind(this));
    
    return this;
  }

  _close() {
    this._writableState.closed = true;
    process.nextTick(() => {
      this.emit('close');
    });
  }

  _onError() {
    process.nextTick(err => {
      this.emit('error', err);
    }, this._writableState.errored);
  }

  _write() {
    throw new Error('_write() must be implemented!');
  }

  _destroy(err, cb) {
    cb(err);
  }

  _onDestroy(err) {
    if (err) {
      this._writableState.errored = err;
      this._onError();
    }
  }
}

module.exports = Writable;
