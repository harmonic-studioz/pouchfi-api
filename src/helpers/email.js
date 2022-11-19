'use strict'

const Nodemailer = require('nodemailer')

const db = require('@models')
const config = require('@config')

const nodemailer = Nodemailer.createTransport(config.sendMail)
exports.nodemailer = nodemailer

/**
 * Replace Placeholder on the email template
 *
 * @param template template string
 * @param mapObj fields & value for replacements
 */
exports.replacePlaceholders = function replacePlaceholders (template, mapObj) {
  const keys = []

  mapObj = Object.assign({
    currentYear: new Date().getFullYear(),
    siteName: config.service.name,
    serverUrl: config.service.host
  }, mapObj)

  // push object keys to array string with additional brackets for regex
  Object.keys(mapObj).forEach(item => {
    keys.push(`(${item})`)
  })

  // join keys with pipe to construct regex
  let pattern = keys.join('|')
  // we want to escape dot from being regex
  pattern = pattern.replace(/\./g, '\\.')

  // eg: /(?:(order.id)|(order.item)+)/gi
  const re = new RegExp(`(?:(${pattern})+)`, 'gi')

  // replace template with matched keys value
  return template.replace(re, matched => {
    return mapObj[matched]
  })
}

/**
 * Clean template from unecessary symbols
 *
 * @param template template string
 */
exports.cleansingTemplate = function cleansingTemplate (template) {
  return exports.replacePlaceholders(template.toString(), {
    '&lt;%=': '',
    '&lt;%= ': '',
    '<%=': '',
    '<%= ': '',
    '%>': '',
    ' %>': ''
  })
}

/**
 * generate email template
 * @param {String} templateName
 * @param {String} language
 * @param {Object} data
 */
exports.getTemplate = async function getTemplate (templateName, language, data = {}) {
  const templateInst = await db.templates.findOne({
    where: {
      name: templateName,
      language
    }
  })

  const emailTemplateInst = templateInst.toJSON()
  let template = emailTemplateInst.fileTemplate.toString()

  // content replacements
  template = exports.replacePlaceholders(template.toString(), data)

  return exports.cleansingTemplate(template)
}

exports.sendEmail = async function sendEmail (msg) {
  return nodemailer.sendMail(msg)
}
