'use strict'

const fs = require('fs')

function loadHTMLTemplate (filename) {
  const html = fs.readFileSync(`./templates/${filename}.html`, 'utf8')

  return html
    .replace(/>[\r\n ]+</g, '><')
    .replace(/(<.*?>)|\s+/g, (m, $1) => $1 || ' ')
    .trim()
}
exports.loadHTMLTemplate = loadHTMLTemplate

module.exports = [
  {
    name: '',
    language: 'en-us',
    type: 'email',
    fileTemplate: loadHTMLTemplate('')
  }
]
