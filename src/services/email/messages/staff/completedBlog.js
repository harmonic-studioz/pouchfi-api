const Message = require('../index')
const config = require('@/config')
const constants = require('@/src/constants')
const { getTemplate } = require('@/src/helpers/email')

class CompletedBlogMessage extends Message {
  /**
   * @inheritdoc
   */
  getSubject () {
    return 'Thanks for Registering Your Blog'
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.COMPLETED_BLOG_TO_STAFF]
  }

  /**
   * @inheritdoc
   */
  getRecipient () {
    const recipient = [{
      type: 'to',
      ...this.recipient
    }, {
      email: config.emails.biz,
      type: 'bcc'
    }]

    return recipient
  }

  /**
   * @inheritdoc
   */
  async getTemplate () {
    const template = await getTemplate(
      constants.EMAIL_TYPE.COMPLETED_BLOG_TO_STAFF,
      this.language,
      this.data
    )

    return template.toString()
  }
}

module.exports = CompletedBlogMessage
