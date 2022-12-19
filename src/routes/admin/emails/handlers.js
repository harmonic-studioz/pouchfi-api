'use strict'

const { api } = require('@/src/classes/errors')
const SendMail = require('@/src/services/email/SendMail')

exports.sendUsersMail = async function sendUsersMail (body) {
  const {
    html,
    subject,
    users
  } = body

  if (!Array.isArray(users) || users.length < 1) {
    throw api.badRequest('"users" email must be provided and it must contain at least one email.')
  }

  if (!html || !subject) {
    throw api.badRequest('missing required parameter "html" or "subject"')
  }

  /**
   * @type {Object[]} - Emails to send
   */
  const mails = []
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    mails.push({
      method: 'sendCustomizedMail',
      args: [subject, user, { email: user, html }]
    })
  }

  return SendMail.sendBulk(mails)
}
