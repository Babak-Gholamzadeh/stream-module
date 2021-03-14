const Duplex = require('./duplex');

class Transform extends Duplex {
  constructor(options) {
    super(options);
  }
}

module.exports = Transform;
