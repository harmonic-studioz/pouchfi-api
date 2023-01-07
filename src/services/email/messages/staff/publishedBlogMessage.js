const Message = require('..')
const config = require('@/config')
const constants = require('@/src/constants')
const { getTemplate } = require('@/src/helpers/email')

class PublishedBlogMessage extends Message {
  /**
   * @inheritdoc
   */
  getSubject () {
    return 'Your Blog Has Been Published!'
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.PUBLISHED_BLOG_TO_STAFF]
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
      constants.EMAIL_TYPE.PUBLISHED_BLOG_TO_STAFF,
      this.language,
      this.data
    )

    return template.toString()
  }
}

module.exports = PublishedBlogMessage
