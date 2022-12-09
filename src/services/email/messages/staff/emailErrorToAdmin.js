const Message = require('..')
const constants = require('@/src/constants')
const { getTemplate } = require('@/src/helpers/email')

class EmailErrorToAdminMessage extends Message {
  /**
   * @inheritdoc
   */
  getSubject () {
    const { emailRecepient } = this.data

    return `【internal】Email delivery error for ${emailRecepient}`
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.EMAIL_ERROR_TO_ADMIN]
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
      constants.EMAIL_TYPE.EMAIL_ERROR_TO_ADMIN,
      this.language,
      this.data
    )

    return template.toString()
  }
}

module.exports = EmailErrorToAdminMessage
