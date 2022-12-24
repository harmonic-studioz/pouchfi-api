'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { toType } = require('@/src/helpers')
const { api } = require('@/src/classes/errors')
const SendMail = require('@/src/services/email/SendMail')

const Users = db.users

/**
 * Send emails to users
 * @param {object} body request body
 * @param {string} body.html the html to be sent
 * @param {string} body.subject the email subject
 * @param {Array} body.users array of user emails
 * @param {Boolean} body.newsletter boolean flag to indicate if the email is to be sent to all users.
 * @returns {Promise}
 */
exports.sendUsersMail = async function sendUsersMail (body) {
  let {
    html,
    subject,
    users,
    newsletter
  } = body
  newsletter = typeof newsletter === 'boolean' ? newsletter : newsletter === 'true'

  if ((!Array.isArray(users) || users.length < 1) && !newsletter) {
    throw api.badRequest('"users" email must be provided and it must contain at least one email.')
  }

  if (!html || !subject) {
    throw api.badRequest('missing required parameter "html" or "subject"')
  }

  if (newsletter) {
    users = (await Users.findAll({
      where: {
        newsletters: true
      },
      attributes: ['email', 'username']
    })).map(user => ({ email: user.email, username: user.username }))
  }

  /**
   * @type {Object[]} - Emails to send
   */
  const mails = []
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const dataType = toType(user)
    const replacements = {
      email: dataType === 'object' ? user.email : user,
      '<%= html %>': html,
      username: dataType === 'object' ? user.username || user.email : user
    }
    const email = dataType === 'object' ? user.email : user
    mails.push({
      method: 'sendCustomizedMail',
      args: [subject, email, replacements]
    })
  }

  return SendMail.sendBulk(mails)
}
