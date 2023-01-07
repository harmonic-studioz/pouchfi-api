const Message = require('..')
const config = require('@/config')
const constants = require('@/src/constants')
const { getTemplate } = require('@/src/helpers/email')

class AvailableBlogFirstMessage extends Message {
  /**
   * @inheritdoc
   */
  getSubject () {
    return 'Your Blog Has Become Available!'
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.AVAILABLE_BLOG_TO_STAFF_FIRST]
  }

  /**
   * @inheritdoc
   */
  getRecipient () {
    const recipient = [{
      type: 'to',
      ...this.recipient
    }, {
      type: 'bcc',
      email: config.emails.biz
    }]

    return recipient
  }

  /**
   * @inheritdoc
   */
  async getTemplate () {
    const template = await getTemplate(
      constants.EMAIL_TYPE.AVAILABLE_BLOG_TO_STAFF_FIRST,
      this.language,
      this.data
    )

    return template.toString()
  }
}

module.exports = AvailableBlogFirstMessage
