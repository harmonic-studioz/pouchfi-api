'use strict'

const { DateTime } = require('luxon')

const { LOCALE, LANG } = require('@/src/constants')

/**
 * escape backslash
 * @param {string} value string value
 * @returns {string}
 */
exports.escapeBackslash = function escapeBackslash (value) {
  if (!value.includes('\\')) return value

  const placeholder = '[:backslash]'

  return value
    .replace(/\\+/g, placeholder)
    .split(placeholder)
    .join('\\\\')
}

/**
 * check if an object is a plain object
 * @param {object} obj object
 * @returns {boolean}
 */
exports.isPlainObject = function isPlainObject (obj) {
  return obj === null || Array.isArray(obj) ||
    typeof obj === 'function' || obj.constructor === Date
    ? false
    : typeof obj === 'object'
}

/**
 * Check for empty object
 * @param {object} obj
 * @returns {boolean}
 */
exports.isEmptyObject = function isEmptyObject (obj) {
  return Object.keys(obj).length < 1
}

/**
 * Trim decimal to maxFractionDigits
 *
 * @param {number} val
 * @param {number} maxFractionDigits
 * @example
 * toMaxFractionDigits(1.12345678) // 1.123457
 * toMaxFractionDigits(1.12345678, 2) // 1.13
 */
exports.toMaxFractionDigits = function toMaxFractionDigits (val, maxFractionDigits = 6, options = {}) {
  const round = options.round || 'round'
  const p = maxFractionDigits ? Number(`1e+${maxFractionDigits}`) : undefined

  switch (round) {
    case 'ceil':
      return Math.ceil(val * p) / p
    case 'floor':
      return Math.floor(val * p) / p
    default:
      return Math.round(val * p) / p
  }
}

/**
 * covert locale to language
 * @param {string|null}locale
 * @returns {string}
 */
exports.convertLocaleToLanguage = function convertLocaleToLanguage (locale) {
  switch (locale) {
    case 'en-us':
      return 'en'
    case 'ja-jp':
      return 'ja'
    case 'zh-cn':
      return 'zh_hans'
    case 'zh-tw':
      return 'zh_hant'
    default:
      return 'en'
  }
}

// Filter two arrays and remove common items.
// NOTE only works with string arrays
exports.filterStringArray = function filterStringArray (arr, filter = []) {
  const hash = {}
  let i
  for (i = 0; i < arr.length; i++) hash[arr[i]] = true
  for (i = 0; i < filter.length; i++) {
    if (hash[filter[i]]) delete hash[filter[i]]
  }
  return Object.keys(hash)
}

exports.formatDate = function (date, fromFormat = 'yyyy-MM-dd', toFormat = 'yyyy.MM.dd', locale = 'en-US') {
  return DateTime.fromJSDate(date).setLocale(locale).toFormat(toFormat)
}

exports.randomDateMoment = function randomDateMoment (start, end) {
  return DateTime
    .fromJSDate(new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())))
    .startOf('second')
}

/**
 * Attempts to get the right locale by
 * comparing with LANGUAGE and LOCALE constants.
 *
 * @param {String} [locale='']
 *
 * @returns {String}
 */
exports.getLocale = function getLocale (locale = '') {
  if (!locale) {
    return LOCALE.EN
  }

  const lang = locale.toLowerCase()

  return lang === LOCALE.JA || lang === LANG.JA
    ? LOCALE.JA
    : LOCALE.EN
}

exports.toType = function toType (obj) {
  return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase()
}
