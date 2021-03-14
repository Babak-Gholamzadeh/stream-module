const Readable = require('./readable');
const Writable = require('./writable');

class Duplex extends Readable {
  constructor(options = {}) {
    super(options);
    Object.assign(this, new Writable(options));
  }
}

for (const method of Object.getOwnPropertyNames(Writable.prototype)) {
  if (method !== 'constructor' && !Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
}

module.exports = Duplex;
