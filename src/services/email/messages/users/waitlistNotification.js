const Message = require('..')
const constants = require('@/src/constants')
const { getTemplate } = require('@/src/helpers/email')

class WaitlistNotificationMessage extends Message {
  /**
   * @inheritdoc
   */
  getSubject () {
    return 'You have been waitlisted!'
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.WAITLIST_NOTIFICATION]
  }

  /**
   * @inheritdoc
   */
  getRecipient () {
    const recipient = [{
      type: 'to',
      ...this.recipient
    }]

    return recipient
  }

  /**
   * @inheritdoc
   */
  async getTemplate () {
    const template = await getTemplate(
      constants.EMAIL_TYPE.WAITLIST_NOTIFICATION,
      this.language,
      this.data
    )

    return template.toString()
  }
}

module.exports = WaitlistNotificationMessage
