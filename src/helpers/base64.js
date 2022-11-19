'use strict'

/**
 * Encodes the `raw` string into base64
 *
 * @param {string} raw - The string the be encoded
 * @returns {string} Base64 encoded string
 */
exports.encode = function encode (raw) {
  return Buffer.from(raw, 'utf8').toString('base64')
}

/**
 * Decodes the given base64 `encoded` string
 *
 * @param {string} encoded - Base64 encoded string
 * @returns {string} Decoded string
 */
exports.decode = function decode (encoded) {
  return Buffer.from(encoded, 'base64').toString('utf8')
}
