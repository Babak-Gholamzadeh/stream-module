const Transform = require('../transform');

class CreateTransformStream extends Transform {
  constructor(options) {
    super(options);
  }

  _transform(data, encoding, callback) {
    callback(null, data.toString().toUpperCase());
  }
}

const createTransformStream = options => new CreateTransformStream(options);

module.exports = createTransformStream;
