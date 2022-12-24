'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const config = require('@config')
const { EMAIL_TYPE } = require('@/src/constants')
const templates = require('@/src/config/templates')
const { replacePlaceholders, cleansingTemplate } = require('@/src/helpers/email')

const Users = db.users

/**
 * Unsubscribe from promotional emails
 * @param {string} email user email
 */
exports.unsubscribe = async function unsubscribe (email) {
  const user = await Users.findOne({
    where: { email }
  })

  let message = 'You have successfuly unsubscribed from newsletters and promotional emails. You would no longer receive the aforementioned types of emails.'

  if (!user) {
    message = 'Could not unsubscribe successfully (user with email not found). Please try again later.'
  } else {
    await user.update({ newsletters: false })
  }

  const html = templates.find(template => template.name === EMAIL_TYPE.UNSUBSCRIBE)
  const replacements = {
    email: user?.email || '',
    username: user?.username || user?.email || email,
    message,
    link: config.guest.host
  }
  let template = replacePlaceholders(html.fileTemplate, replacements)
  template = cleansingTemplate(template)

  return {
    html: template
  }
}
