'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */
/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const base64 = require('@/src/helpers/base64')
const errors = require('@/src/classes/errors')

const Users = db.users
const Staffs = db.staffs

/**
 * marks a user email as read when the user opens the email
 * @param {object} data options (request params)
 * @returns {Promise<object>} email data
 */
exports.updateUserEmail = async function (data) {
  let { uid, emailId, type } = data

  // no need to throw error, silently fail
  if (!uid || !emailId) return

  // decode emailId and userId
  uid = base64.decode(uid)
  emailId = base64.decode(emailId)
  type = type ? base64.decode(type) : 'user'

  /**
   * @type {Object.<string, Model>}
   */
  const models = {
    staff: Staffs,
    user: Users
  }
  const Model = models[type]

  const user = await Model.findByPk(uid)
  if (!user) return

  const history = user.history
  const emailIndex = history.findIndex(mail => mail.createdAt === emailId)
  if (emailIndex < 0) {
    throw errors.api.unprocessableEntity('Cannot process invalid email ID')
  }

  // mark that the user has read the email
  history[emailIndex].read = true
  history[emailIndex].openedAt = new Date()

  user.changed('history', true)
  await user.update({ history })

  return {
    outlets: { email: history[emailIndex] }
  }
}
