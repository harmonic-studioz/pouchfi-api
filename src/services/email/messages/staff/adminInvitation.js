const Message = require('..')
const constants = require('@constants')
const { getTemplate } = require('@/src/helpers/email')

class AdminInvitationMessage extends Message {
  /**
   * @inheritdoc
   */
  getSubject () {
    return 'Admin Invitation'
  }

  /**
   * @inheritdoc
   */
  getTag () {
    return [constants.EMAIL_TYPE.USER_INVITATION]
  }

  /**
   * @inheritdoc
   */
  getRecipient () {
    const recipient = {
      to: [{ ...this.recipient }]
    }

    return recipient
  }

  /**
   * @inheritdoc
   */
  async getTemplate () {
    const template = await getTemplate(
      constants.EMAIL_TYPE.USER_INVITATION,
      this.language,
      this.data
    )

    return template.toString()
  }
}

module.exports = AdminInvitationMessage
