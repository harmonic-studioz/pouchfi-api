'use strict'

const luxon = require('luxon')

const { mailchimp } = require('@/config')
const SendMail = require('@/src/services/email/SendMail')

/**
 * Handle mail webhook events.
 * If the message came from a different sender,
 * this method will not send an email to the admin.
 *
 * @param {array} [events=[]] - Mail events
 */
exports.mail = async function mail (events = []) {
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const { sender, email, subject, ts } = event.msg

    if (sender === mailchimp.sender) {
      const data = {
        emailRecipient: email,
        '<%= email %>': email,
        '<%= title %>': subject,
        datetime: luxon.DateTime.fromSeconds(ts).toFormat('MM/dd/yyyy HH:mm:ss'),
        '<%= contents %>': `<pre>${JSON.stringify(event, null, 2)}</pre>`
      }

      await SendMail.sendEmailErrorToAdmin(data)
    }
  }
}
