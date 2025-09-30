// Centralized middleware exports
module.exports = {
  ...require('./errorHandler'),
  ...require('./validation'),
  ...require('./auth')
};
