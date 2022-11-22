'use strict'

/**
* @typedef {import ("express").Request} Request
* @typedef {import ("express").Response} Response
*
*/

const Cache = require('@/src/classes/Cache')

const OK = 200
const NOT_MODIFIED = 304

/**
   * List all cache. Or not :|.
   *
   * @param {Request} request request object
   * @param {Response} response response object
   * @returns {object}
   */
exports.index = function index (request, response) {
  return response.status(OK).json({
    message: "Nope, we don't display all cache. :)",
    code: OK
  })
}

/**
   * Get a cache by key.
   *
   * @param {Request} request request object
   * @param {Response} response response object
   * @returns {Promise<object>}
   */
exports.find = async function find (request, response) {
  const { key } = request.params
  const value = await Cache.get(key)

  return response.status(OK).json({ key, value, code: OK })
}

/**
   * Flush cache.
   *
   * @param {Request} request request object
   * @param {Response} response response object
   * @returns {Promise<object>}
   */
exports.flush = async function flush (request, response) {
  const { pattern } = request.query
  let message = 'Cache has been deleted.'

  if (pattern) {
    message = `Cache with pattern "${pattern}" has been deleted.`
    await Cache.forgetByPattern(pattern)
  } else {
    await Cache.flush()
  }

  return response.status(OK).json({ message, code: OK })
}

/**
   * Delete a cache by key.
   *
   * @param {Request} request request object
   * @param {Response} response response object
   * @returns {Promise<object>}
   */
exports.delete = async function _delete (request, response) {
  const { key } = request.params
  let code = OK
  let message = `Cache with key "${key}" has been deleted.`

  const result = await Cache.forget(key)

  if (!result) {
    code = NOT_MODIFIED
    message = `Cache with key "${key}" does not exist.`
  }

  return response.status(code).json({ message, code })
}
