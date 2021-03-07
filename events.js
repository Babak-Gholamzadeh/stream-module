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

}

module.exports = EventEmitter;
