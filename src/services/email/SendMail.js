const config = require('@config')
const { LOCALE } = require('@/src/constants')
const { sendEmail } = require('@/src/helpers/email')

const PartnerWithUs = require('./messages/PartnerWithUs')
const CustomEmailMessage = require('./messages/staff/customEmail')
const AdminInvitation = require('./messages/staff/adminInvitation')
const WaitlistNotification = require('./messages/users/waitlistNotification')
const EmailErrorToAdminMessage = require('./messages/staff/emailErrorToAdmin')

module.exports = class SendMail {
  /**
   * Send email when a guest requests partnership
   * @param {string} html message to be send
   * @param {Array<object>} attachments file attachments
   * @param {string} locale template locale
   * @returns {Promise<object>}
   */
  static async sendPartnershipEmail (html, attachments, locale = LOCALE.EN) {
    const recipient = {
      email: config.emails.partnership,
      name: 'Partnerships'
    }

    const inst = new PartnerWithUs(locale, {}, recipient, {}, attachments, html)
    const message = await inst.buildMessage()
    try {
      return {
        res: await sendEmail({ message })
      }
    } catch (error) {
      return {
        message,
        error
      }
    }
  }

  /**
   * Send email when a guest requests partnership
   * @param {string} html message to be send
   * @param {string} subject Email subject
   * @param {string} receiverEmail receivers email
   * @param {string} locale template locale
   * @returns {Promise<object>}
   */
  static async sendCustomizedMail (subject, receiverEmail, replacements, locale = LOCALE.EN) {
    const recipient = {
      email: receiverEmail,
      name: 'Partnerships'
    }

    const inst = new CustomEmailMessage(locale, replacements, recipient, {}, subject)
    const message = await inst.buildMessage()
    try {
      return {
        res: await sendEmail({ message })
      }
    } catch (error) {
      return {
        message,
        error
      }
    }
  }

  /**
   * Send email when a user has been invited to Pouchfi
   * @param {object} invitedUser invited user data
   * @param {string} invitationLink invitation link
   * @param {object} request request object
   * @param {string} locale template locale
   * @returns {Promise<object>}
   */
  static async sendAdminInvitation (invitedUser, invitationLink, request, locale = LOCALE.EN) {
    const user = request.user
    const displayName = `${invitedUser.firstName} ${invitedUser.lastName}`

    const data = {
      displayName,
      '<%= link %>': invitationLink,
      inviteDisplayName: user.username,
      inviteUserEmail: user.email
    }

    const recipient = {
      email: invitedUser.email,
      displayName
    }

    const meta = {
      uid: invitedUser.uid,
      invitedBy: user.uid
    }

    const inst = new AdminInvitation(locale, data, recipient, meta)
    const message = await inst.buildMessage()
    try {
      return {
        res: await sendEmail({ message })
      }
    } catch (error) {
      return {
        message,
        error
      }
    }
  }

  /**
   * Send email when a user has applied to Pouchfi waitlist
   * @param {object} waitlistUser invited user data
   * @param {string} locale template locale
   * @returns {Promise<object>}
   */
  static async sendWaitlistEmail (waitlistUser, locale = LOCALE.EN) {
    const data = {
      email: waitlistUser.email,
      siteURL: config.guest.host
    }

    const recipient = {
      email: waitlistUser.email
    }

    const inst = new WaitlistNotification(locale, data, recipient, {})
    const message = await inst.buildMessage()
    try {
      return {
        res: await sendEmail({ message })
      }
    } catch (error) {
      return {
        message,
        error
      }
    }
  }

  /**
   * Send email error details to admin.
   *
   * @static
   * @param {object} [data={}]
   *
   * @returns {Promise<void>}
   */
  static async sendEmailErrorToAdmin (data = {}) {
    const recepient = {
      email: config.emails.guestEnFaq,
      displayName: 'Admin'
    }

    const inst = new EmailErrorToAdminMessage(LOCALE.EN, data, recepient)
    const message = await inst.buildMessage()

    return sendEmail({ message })
  }

  /**
   * Bulk sends mail
   * @param {Object[]} mails - Set of mails to sent
   * @param {string} mails[].method - Mail method to use when sending
   * @param {Any[]} mails[].args - Method arguments
   * @returns {Promise<Object|void>} - Mails sent
   */
  static async sendBulk (mails) {
    const promises = []

    for (const { method, args } of mails) {
      promises.push(SendMail[method].apply(null, args))
    }

    return Promise.all(promises)
  }
}
