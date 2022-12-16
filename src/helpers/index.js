module.exports = {
  ...require('./redis'),
  ...require('./routes'),
  ...require('./common'),
  ...require('./logger'),
  ...require('./pagination')
}
