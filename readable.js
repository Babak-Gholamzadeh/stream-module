const EventEmitter = require('./events');
class Readable extends EventEmitter {
  constructor() {
    super();
  }

  push(chunk) {
    this.emit('data', chunk);
  }
}

module.exports = Readable;
