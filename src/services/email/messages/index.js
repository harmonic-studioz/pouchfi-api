const config = require('@config')

class Message {
  /**
   *
   * @param {*} language
   * @param {Object} data
   * @param {Object} recipient
   * @param {String} recipient.name recipient name
   * @param {String} recipient.address recipient email address
   * @param {Object} meta
   */
  constructor (language, data = {}, recipient = {}, meta = {}) {
    this.language = language
    this.data = data
    this.recipient = recipient
    this.meta = meta
  }

  /**
   * get no reply email
   * @returns {String}
   */
  getFromEmail () {
    return config.mailchimp.sender
  }

  /**
   * get sender name
   * @returns {String}
   */
  getFromName () {
    return 'Pouchfi'
  }

  /**
   * get email subject
   * @protected
   */
  getSubject () {
    throw new Error('getSubject() Not implemented.')
  }

  /**
   * get tag
   * @protected
   */
  getTag () {
    throw new Error('getTag() Not implemented.')
  }

  /**
   * get email meta
   * @protected
   */
  getMetaData () {
    return this.meta
  }

  /**
   * get recipient
   * @protected
   */
  getRecipient () {
    throw new Error('getRecipient() Not implemented.')
  }

  /**
   * get email template
   * @protected
   */
  async getTemplate () {
    throw new Error('getTemplate() Not implemented.')
  }

  /**
   * get mailchimp message object
   * @returns {Object}
   */
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
      subject: this.getSubject(),
      preserve_recipients: true,
      ...(config.mailchimp.account ? { subaccount: config.mailchimp.account } : {})
    }
  }
}

module.exports = Message
