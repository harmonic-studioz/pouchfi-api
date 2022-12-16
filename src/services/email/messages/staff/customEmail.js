const Message = require('..')
const constants = require('@/src/constants')
const { getTemplate } = require('@/src/helpers/email')

class CustomEmailMessage extends Message {
  constructor (language, data, recipient, meta, subject) {
    super(language, data, recipient, meta)
    this.subject = subject
  }

  /**
   * @inheritdoc
   */
  getSubject () {
    return this.subject
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.ADMIN_CUSTOM_EMAIL]
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
      constants.EMAIL_TYPE.ADMIN_CUSTOM_EMAIL,
      this.language,
      this.data
    )

    return template.toString()
  }
}

module.exports = CustomEmailMessage
