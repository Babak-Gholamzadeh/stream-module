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

  emit(eventName, ...args) {
    const events = this._events;
    if (events[eventName]) {
      const listeners = events[eventName];
      for (let i = 0; i < listeners.length; i++) {
        listeners[i].apply(this, args);
      }
    } else {
      return false;
    }
    return true;
  }

  removeListener(eventName, listener) {
    const events = this._events;
    if (events[eventName]) {
      for (let i = events[eventName].length - 1; i >= 0; i--) {
        if (events[eventName][i] === listener) {
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
  
}

module.exports = EventEmitter;
