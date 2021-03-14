const EventEmitter = require('./events');
const BufferList = require('./buffer-list');
class ReadableState {
  constructor({
    objectMode = false,
    defaultEncoding = 'utf8',
    highWaterMark = 16 * 1024,
  }) {
    this.objectMode = objectMode;
    this.defaultEncoding = defaultEncoding;
    this.encoding = null;
    this.buffer = new BufferList();
    this.length = 0;
    this.flowing = null;
    this.resumeScheduled = false;
    this.reading = false;
    this.sync = true;
    this.highWaterMark = highWaterMark;
    this.emittedReadable = false;
    this.needReadable = false;
    this.readableListening = false;
    this.readingMore = false;
    this.ended = false;
    this.endEmitted = false;
    this.pipes = [];
  }
}

class Readable extends EventEmitter {
  constructor(options = {}) {
    super();
    this._readableState = new ReadableState(options);
  }

  push(chunk, encoding) {
    return this._readableAddChunk(chunk, encoding, false);
  }

  unshift(chunk, encoding) {
    return this._readableAddChunk(chunk, encoding, true);
  }

  _readableAddChunk(chunk, encoding, addToFront) {
    const state = this._readableState;

    if (!state.objectMode) {
      if (typeof chunk === 'string') {
        encoding = encoding || state.defaultEncoding;
        if (state.encoding !== encoding) {
          if (addToFront && state.encoding) {
            chunk = Buffer.from(chunk, encoding).toString(state.encoding);
          } else {
            chunk = Buffer.from(chunk, encoding);
            encoding = '';
          }
        }
      } else if (chunk instanceof Buffer) {
        encoding = '';
      } else if (chunk != null) {
        throw new Error('invalid types! only string and buffer are accepted');
      }
    }

    if (chunk === null) {
      state.reading = false;
      this._onEofChunk();
    } else if (state.objectMode || (chunk && chunk.length > 0)) {
      if (addToFront) {
        if (state.endEmitted)
          throw new Error('cannot shift chunk after stream has already been ended');
        this._addChunk(chunk, true);
      } else if (state.ended) {
        throw new Error('cannot push chunk after stream has already been ended');
      } else {
        state.reading = false;
        this._addChunk(chunk, false);
      }
    } else if (!addToFront) {
      state.reading = false;
      this._maybeReadMore();
    }

    return !state.ended && state.length < state.highWaterMark;
  }

  _addChunk(chunk, addToFront) {
    const state = this._readableState;
    if (state.flowing && state.length === 0 && !state.sync && this.listenerCount('data') > 0) {
      this.emit('data', chunk);
    } else {
      state.length += (state.objectMode ? 1 : chunk.length);
      if (addToFront)
        state.buffer.unshift(chunk);
      else
        state.buffer.push(chunk);

      if (state.needReadable)
        this._emitReadable();
    }
    this._maybeReadMore();
  }

  _onEofChunk() {
    const state = this._readableState;
    if (state.ended) return;
    state.ended = true;
    if (state.sync)
      this._emitReadable();
  }

  resume() {
    const state = this._readableState;
    if (!state.flowing) {
      state.flowing = !state.readableListening;
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        process.nextTick(this._resume.bind(this));
      }
    }
  }

  _resume() {
    const state = this._readableState;
    if (!state.reading) {
      this.read(0);
    }

    state.resumeScheduled = false;
    this.emit('resume');

    this._flow();

    if (state.flowing && !state.reading)
      this.read(0);
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

    if (n > state.highWaterMark)
      state.highWaterMark = this._computeNewHighWaterMark(n);
    
    if (n !== 0)
      state.emittedReadable = false;

    n = this._howMuchToRead(n);

    if (n === 0 && state.ended) {
      if (state.length === 0)
        this._endReadable();
      return null;
    }

    let doRead = false;

    if (state.length - n < state.highWaterMark)
      doRead = true;

    if (state.reading || state.ended)
      doRead = false;
    else if (doRead) {
      state.sync = true;
      state.reading = true;

      if (state.length === 0)
        state.needReadable = true;
      
      this._read(state.highWaterMark);
      state.sync = false;

      if (!state.reading)
        n = this._howMuchToRead(nOrig);
    }

    let ret = null;
    if (n > 0)
      ret = this._fromList(n);

    if (ret === null) {
      state.needReadable = state.length <= state.highWaterMark;
    } else {
      state.length -= n;
    }

    if (state.length === 0) {
      if (!state.ended)
        state.needReadable = true;
      if (nOrig !== n && state.ended)
        this._endReadable();
    }

    if (ret !== null)
      this.emit('data', ret);

    return ret;
  }

  on(eventName, listener) {
    super.on(eventName, listener);

    const state = this._readableState;
    if (eventName === 'data') {
      state.readableListening = this.listenerCount('readable') > 0;
      if (state.flowing !== false)
        this.resume();
    } else if (eventName === 'readable') {
      if (!state.readableListening) {
        state.readableListening = state.needReadable = true;
        state.flowing = false;
        state.emittedReadable = false;
        if (state.length) {
          this._emitReadable();
        } else if (!state.reading) {
          process.nextTick(() => {
            this.read(0);
          });
        }
      }
    }
  }

  _read() {
    throw new Error('_read method must be implemented');
  }

  _howMuchToRead(n) {
    const state = this._readableState;
    if (n <= 0 || (state.length === 0 && state.ended))
      return 0;
    if (state.objectMode)
      return 1;
    if (Number.isNaN(n)) {
      if (state.flowing && state.length)
        return state.buffer.first().length;
      return state.length;
    }
    if (n <= state.length)
      return n;
    return state.ended ? state.length : 0;
  }

  _fromList(n) {
    const state = this._readableState;
    if (state.length === 0)
      return null;
    let ret;
    if (state.objectMode)
      ret = state.buffer.shift();
    else if (n >= state.length) {
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

  _computeNewHighWaterMark(n) {
    const MAX_HWM = 0x40000000;
    if (n >= MAX_HWM) {
      n = MAX_HWM;
    } else {
      n--;
      n |= n >>> 1;
      n |= n >>> 2;
      n |= n >>> 4;
      n |= n >>> 8;
      n |= n >>> 16;
      n++;
    }
    return n;
  }

  _emitReadable() {
    const state = this._readableState;
    state.needReadable = false;
    if (!state.emittedReadable) {
      state.emittedReadable = true;
      process.nextTick(() => {
        if (state.length || state.ended) {
          this.emit('readable');
          state.emittedReadable = false;
        }
        state.needReadable =
          !state.flowing &&
          !state.ended &&
          state.length <= state.highWaterMark;
        this._flow();
      });
    }
  }

  _maybeReadMore() {
    const state = this._readableState;
    if (!state.readingMore) {
      state.readingMore = true;
      process.nextTick(() => {
        while (!state.reading && state.length < state.highWaterMark && !state.ended) {
          const len = state.length;
          this.read(0);
          if (len === state.length)
            break;
        }
        state.readingMore = false;
      });
    }
  }

  _endReadable() {
    const state = this._readableState;
    if (!state.endEmitted) {
      state.ended = true;
      process.nextTick(() => {
        if (!state.endEmitted && state.length === 0) {
          state.endEmitted = true;
          this.emit('end');
        }
      });
    }
  }

  removeListener(eventName, callback) {
    super.removeListener(eventName, callback);

    const state = this._readableState;
    if (eventName === 'readable') {
      process.nextTick(() => {
        state.readableListening = this.listenerCount('readable') > 0;
        if (state.resumeScheduled) {
          state.flowing = true;
        } else if (this.listenerCount('data') > 0) {
          this.resume();
        } else if (!state.readableListening) {
          state.flowing = null;
        }
      });
    }
  }

  pipe(dest) {
    const src = this;
    const state = this._readableState;

    state.pipes.push(dest);

    const onend = () => {
      dest.end();
    }
    src.on('end', onend);

    const onunpipe = () => {
      cleanup();
    };
    dest.on('unpipe', onunpipe);

    const cleanup = () => {
      dest.removeListener('close', onclose);
      dest.removeListener('finish', onfinish);
      dest.removeListener('unpipe', onunpipe);
      if (ondrain) {
        dest.removeListener('drain', ondrain);
      }
      src.removeListener('end', onend);
      src.removeListener('data', ondata);
    };

    let ondrain;
    const pause = () => {
      src.pause();

      if (!ondrain) {
        ondrain = this._pipeOnDrain.bind(this);
        dest.on('drain', ondrain);
      }
    };

    const ondata = chunk => {
      const ret = dest.write(chunk);
      if (ret === false) {
        pause();
      }
    };
    src.on('data', ondata);

    dest.emit('pipe', src);

    const onclose = () => {
      dest.removeListener('finish', onfinish);
      src.unpipe(dest);
    }
    dest.once('close', onclose);
    const onfinish = () => {
      dest.removeListener('close', onclose);
      src.unpipe(dest);
    }
    dest.once('finish', onfinish);

    return dest;
  }

  _pipeOnDrain() {
    const state = this._readableState;
    if (this.listenerCount('data')) {
      state.flowing = true;
      this._flow();
    }
  }

  unpipe(dest) {
    const state = this._readableState;
    if (!dest) {
      this.pause();
      state.pipes.forEach(dest => {
        dest.emit('unpipe');
      });
      state.pipes = [];
      return this;
    }
    for (let i = 0; i < state.pipes.length; i++) {
      if (state.pipes[i] === dest) {
        state.pipes.splice(i, 1);
        break;
      }
    }
    if (state.pipes.length === 0)
      this.pause();
    dest.emit('unpipe');
    return this;
  }
}

module.exports = Readable;
