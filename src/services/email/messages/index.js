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
    return config.nodemailer.sender
  }

  /**
   * get sender name
   * @returns {String}
   */
  getFromName () {
    return 'Swirge'
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
      from: {
        name: this.getFromName(),
        address: this.getFromEmail()
      },
      ...this.getRecipient(),
      subject: this.getSubject(),
      html: await this.getTemplate()
    }
  }
}

module.exports = Message
