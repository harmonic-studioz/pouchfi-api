'use strict'

/**
 * Wraps the given `handler` so that
 *   error handling will be handled automatically
 *
 * @param {Function} handler - Express handler
 * @returns {Function} Express handler
 */
exports.withErrorHandler = function withErrorHandler (handler) {
  return async function (req, res, next) {
    try {
      await handler(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
