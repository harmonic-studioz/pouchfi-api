'use strict'

exports.escapeBackslash = function escapeBackslash (value) {
  if (!value.includes('\\')) return value

  const placeholder = '[:backslash]'

  return value
    .replace(/\\+/g, placeholder)
    .split(placeholder)
    .join('\\\\')
}
