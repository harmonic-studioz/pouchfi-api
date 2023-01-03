const Message = require('..')
const constants = require('@/src/constants')
const { getTemplate } = require('@/src/helpers/email')

class ForgotPasswordMessage extends Message {
  /**
   * @inheritdoc
   */
  getSubject () {
    return 'Forgot your password?'
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.FORGOT_PASSWORD]
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
      constants.EMAIL_TYPE.FORGOT_PASSWORD,
      this.language,
      this.data
    )

    return template.toString()
  }
}

module.exports = ForgotPasswordMessage
