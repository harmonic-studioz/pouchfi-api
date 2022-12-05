const { LOCALE } = require('@/src/constants')
const { sendEmail } = require('@/src/helpers/email')

const AdminInvitation = require('./messages/staff/adminInvitation')

module.exports = class SendMail {
  /**
   * Send email when a user has been invited to Pouchfi
   * @param {object} data template data
   * @param {object} user user data
   * @param {string} locale template locale
   * @returns {Promise<object>}
   */
  static async sendAdminInvitation (data, user, locale = LOCALE.EN) {
    const recipient = {
      name: user.username,
      address: user.email
    }

    const meta = {
      uid: user.uid,
      invitedBy: data.inviter.uid
    }

    const inst = new AdminInvitation(locale, data, recipient, meta)
    const message = await inst.buildMessage()
    try {
      return {
        res: await sendEmail(message)
      }
    } catch (error) {
      return {
        message,
        error
      }
    }
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
