'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */
/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { USER_HISTORY: history } = require('@/src/constants')
const base64 = require('@/src/helpers/base64')
const errors = require('@/src/classes/errors')

const Users = db.users

/**
 * marks a user email as read when the user opens the email
 * @param {object} data options (request params)
 * @returns {Promise<object>} email data
 */
exports.updateUserEmail = async function (data) {
  let { uid, emailId } = data

  // no need to throw error, silently fail
  if (!uid || !emailId) return

  // decode emailId and userId
  uid = base64.decode(uid)
  emailId = base64.decode(emailId)

  const user = await Users.findByPk(uid)
  if (!user) return

  const emailHistory = user.history[history.EMAIL]
  const emailData = emailHistory[emailId]
  if (!emailData) {
    throw errors.api.unprocessableEntity('Cannot process invalid email ID')
  }

  // mark that the user has read the email
  emailData.data.read = true
  emailData.data.openedAt = new Date()

  user.changed('history', true)
  await user.save({ hooks: false })

  return {
    outlets: { email: emailData }
  }
}
