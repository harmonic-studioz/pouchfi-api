'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */
const luxon = require('luxon')

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { mailchimp } = require('@/config')
const MandrillService = require('@/src/services/email')
const SendMail = require('@/src/services/email/SendMail')

const Users = db.users

/**
 * Handle mail webhook events.
 * If the message came from a different sender,
 * this method will not send an email to the admin.
 *
 * @param {array} [events=[]] - Mail events
 */
exports.mail = async function mail (events = []) {
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const { sender, email, subject, ts } = event.msg

    if (sender === mailchimp.sender) {
      const data = {
        emailRecipient: email,
        '<%= email %>': email,
        '<%= title %>': subject,
        datetime: luxon.DateTime.fromSeconds(ts).toFormat('MM/dd/yyyy HH:mm:ss'),
        '<%= contents %>': `<pre>${JSON.stringify(event, null, 2)}</pre>`
      }

      await SendMail.sendEmailErrorToAdmin(data)
    }
  }
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
