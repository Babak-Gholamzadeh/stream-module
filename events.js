class EventEmitter {
  constructor() {
    this._events = {};
  }

  addListener(eventName, listener) {
    const events = this._events;
    if (!events[eventName])
      events[eventName] = [];
    events[eventName].push(listener);
    return this;
  }

  on(eventName, listener) {
    return this.addListener(eventName, listener);
  }

  once(eventName, listener) {
    return this.addListener(eventName, this._onceWrap(eventName, listener));
  }

  _onceWrap(eventName, listener) {
    const state = { eventName, listener, wrapFn: null };
    state.wrapFn = this._onceWrapper.bind(this, state);
    state.wrapFn.listener = listener;
    return state.wrapFn;
  }

  _onceWrapper({eventName, listener, wrapFn}, ...args) {
    this.removeListener(eventName, wrapFn);
    listener.apply(this, args);
  }

  emit(eventName, ...args) {
    const events = this._events;
    if (events[eventName]) {
      const listeners = this._arrayClone(events[eventName]);
      for (let i = 0; i < listeners.length; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }
    return true;
  }

  _arrayClone(arr) {
    return arr.map(v => v);
  }

  removeListener(eventName, listener) {
    const events = this._events;
    if (events[eventName]) {
      for (let i = events[eventName].length - 1; i >= 0; i--) {
        if (events[eventName][i] === listener || events[eventName][i].listener === listener) {
          events[eventName].splice(i, 1);
          break;
        }
      }
      if (events[eventName].length === 0)
        delete events[eventName];
    }
    return this;
  }

  off(eventName, listener) {
    return this.removeListener(eventName, listener);
  }

  removeAllListeners(eventName) {
    if (eventName === undefined) {
      this._events = {};
      return this;
    }
    delete this._events[eventName];
    return this;
  }

  listenerCount(eventName) {
    const events = this._events;
    if (events[eventName])
      return events[eventName].length
    return 0;
  }

}

module.exports = EventEmitter;
