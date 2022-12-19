const config = require('@config')
const Message = require('./index')
const constants = require('@/src/constants')

class PartnerWithUsMessage extends Message {
  constructor (language, data, recipient, meta, attachments, html) {
    super(language, data, recipient, meta)
    this.html = html
    this.attachments = attachments
  }

  /**
   * @inheritdoc
   */
  getSubject () {
    return 'New Partnership Request'
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.PARTNER_WITH_US]
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

  getAttachments () {
    return this.attachments
  }

  async buildMessage () {
    return {
      track_clicks: false,
      track_opens: false,
      inline_css: true,
      from_email: this.getFromEmail(),
      from_name: this.getFromName(),
      metadata: this.getMetaData(),
      tags: this.getTag(),
      to: this.getRecipient(),
      html: await this.getTemplate(),
      attachments: this.getAttachments(),
      subject: this.getSubject(),
      preserve_recipients: true,
      ...(config.mailchimp.account ? { subaccount: config.mailchimp.account } : {})
    }
  }
}

module.exports = PartnerWithUsMessage
