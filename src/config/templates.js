'use strict'

const fs = require('fs')
const path = require('path')
const constants = require('../constants')

function returnViewsDirectory () {
  return path.join(__dirname, '..', '..', '/templates')
}

/**
 * load HTML template from file
 * @param {string} filename
 * @returns {string}
 */
function loadHTMLTemplate (filename) {
  const html = fs.readFileSync(`${returnViewsDirectory()}/${filename}.html`, 'utf8')
  const hasHeader = html.startsWith('<!DOCTYPE')
  if (hasHeader) {
    return html.replace(/>[\r\n ]+</g, '><')
      .replace(/(<.*?>)|\s+/g, (m, $1) => $1 || ' ')
      .trim()
  }
  const header = fs.readFileSync(`${returnViewsDirectory()}/_header.html`, 'utf8')
    .replace(/>[\r\n ]+</g, '><')
    .replace(/(<.*?>)|\s+/g, (_m, $1) => $1 || ' ')
    .trim()
  const footer = fs.readFileSync(`${returnViewsDirectory()}/_footer.html`, 'utf8')
    .replace(/>[\r\n ]+</g, '><')
    .replace(/(<.*?>)|\s+/g, (_m, $1) => $1 || ' ')
    .trim()

  return `${header}${html.replace(/>[\r\n ]+</g, '><')
    .replace(/(<.*?>)|\s+/g, (m, $1) => $1 || ' ')
    .trim()}${footer}`
}
exports.loadHTMLTemplate = loadHTMLTemplate

module.exports = [
  {
    name: constants.EMAIL_TYPE.USER_INVITATION,
    language: 'en-us',
    type: 'email',
    fileTemplate: loadHTMLTemplate(`${constants.EMAIL_TYPE.USER_INVITATION}_en-us`)
  },
  {
    name: constants.EMAIL_TYPE.WAITLIST_NOTIFICATION,
    language: 'en-us',
    type: 'email',
    fileTemplate: loadHTMLTemplate(`${constants.EMAIL_TYPE.WAITLIST_NOTIFICATION}_en-us`)
  },
  {
    name: constants.EMAIL_TYPE.ADMIN_CUSTOM_EMAIL,
    language: 'en-us',
    type: 'email',
    fileTemplate: loadHTMLTemplate(`${constants.EMAIL_TYPE.ADMIN_CUSTOM_EMAIL}_en-us`)
  },
  {
    name: constants.EMAIL_TYPE.TEMPLATE,
    language: 'en-us',
    type: 'email',
    fileTemplate: loadHTMLTemplate(`${constants.EMAIL_TYPE.TEMPLATE}`)
  },
  {
    name: constants.EMAIL_TYPE.UNSUBSCRIBE,
    language: 'en-us',
    type: 'view',
    fileTemplate: loadHTMLTemplate(`${constants.EMAIL_TYPE.UNSUBSCRIBE}`)
  },
  {
    name: constants.EMAIL_TYPE.FORGOT_PASSWORD,
    language: 'en-us',
    type: 'email',
    fileTemplate: loadHTMLTemplate(`${constants.EMAIL_TYPE.FORGOT_PASSWORD}_en-us`)
  },
  {
    name: constants.EMAIL_TYPE.RESET_PASSWORD,
    language: 'en-us',
    type: 'email',
    fileTemplate: loadHTMLTemplate(`${constants.EMAIL_TYPE.RESET_PASSWORD}_en-us`)
  },
  {
    name: constants.EMAIL_TYPE.EMAIL_ERROR_TO_ADMIN,
    language: 'en-us',
    type: 'email',
    fileTemplate: loadHTMLTemplate(`${constants.EMAIL_TYPE.EMAIL_ERROR_TO_ADMIN}_en-us`)
  }
]
