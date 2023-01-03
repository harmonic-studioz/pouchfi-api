const Message = require('./index')
const constants = require('@/src/constants')

class ContactUsMessage extends Message {
  constructor (language, data, recipient, meta, html) {
    super(language, data, recipient, meta)
    this.html = html
  }

  /**
   * @inheritdoc
   */
  getSubject () {
    return 'New Contact us message'
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.CONTACT_US]
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
    return this.html
  }
}

module.exports = ContactUsMessage
