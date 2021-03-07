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
  
}

module.exports = EventEmitter;
