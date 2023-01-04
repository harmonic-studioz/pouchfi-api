'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { mailchimp } = require('@/config')
const { toType } = require('@/src/helpers')
const { api } = require('@/src/classes/errors')
const MandrillService = require('@/src/services/email')
const SendMail = require('@/src/services/email/SendMail')

const Users = db.users

/**
 * Send emails to users
 * @param {object} body request body
 * @param {string} body.html the html to be sent
 * @param {string} body.subject the email subject
 * @param {Array} body.users array of user emails
 * @param {Boolean} body.newsletter boolean flag to indicate if the email is to be sent to all users.
 * @returns {Promise}
 */
exports.sendUsersMail = async function sendUsersMail (body) {
  let {
    html,
    subject,
    users,
    newsletter
  } = body
  newsletter = typeof newsletter === 'boolean' ? newsletter : newsletter === 'true'

  if ((!Array.isArray(users) || users.length < 1) && !newsletter) {
    throw api.badRequest('"users" email must be provided and it must contain at least one email.')
  }

  if (!html || !subject) {
    throw api.badRequest('missing required parameter "html" or "subject"')
  }

  if (newsletter) {
    users = (await Users.findAll({
      where: {
        newsletters: true
      },
      attributes: ['email', 'username', 'fullName']
    })).map(user => ({ email: user.email, username: user.username }))
  }

  /**
   * @type {Object[]} - Emails to send
   */
  const mails = []
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const dataType = toType(user)
    const replacements = {
      email: dataType === 'object' ? user.email : user,
      '<%= html %>': html,
      username: dataType === 'object' ? user.username || user.email : user
    }
    const email = dataType === 'object' ? user.email : user
    const fullName = dataType === 'object' ? user.fullName : user.split('@')[0]
    mails.push({
      method: 'sendCustomizedMail',
      args: [subject, email, fullName, replacements]
    })
  }

  return SendMail.sendBulk(mails)
}

/**
 * Check Mail mandrill last status
 * @param {object} params options pbject
 * @param {string} params.mailId mail ID
 */
exports.checkMailStatus = async function checkMailStatus (params, props) {
  const outlets = { details: undefined }
  const mandrillService = new MandrillService()
  const mandrillKey = mailchimp.apiKey

  const response = await mandrillService.messageInfo(params.mailId, mandrillKey)
  outlets.details = response

  return {
    outlets,
    meta: { ...props.meta }
  }
}

/**
 * Update Mail Status on User History logs
 * @param {object} payload
 * @param props
 */
exports.updateUserHistoryLog = async function updateUserHistoryLog (payload, props) {
  const outlets = {
    status: undefined
  }
  const meta = props.meta
  const inst = await Users.findOne({
    where: {
      uid: payload.uid
    }
  })

  if (inst === null) {
    outlets.status = 'fail'
    return {
      outlets,
      meta
    }
  }
  const user = inst.toJSON()
  const { history } = user

  if (
    history[payload.index] &&
    history[payload.index].event &&
    history[payload.index].event.type === 'mail'
  ) {
    history[payload.index].event.status = payload.data.state
    history[payload.index].res = payload.data

    await inst.update({
      history
    })

    outlets.status = 'ok'
  }

  return {
    outlets,
    meta
  }
}
