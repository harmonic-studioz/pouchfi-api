'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { sq, Sequelize: { QueryTypes } } = require('@models')
const { EMAIL_TYPE } = require('@/src/constants')
const { ApiError, api } = require('@/src/classes/errors')
const SendMail = require('@/src/services/email/SendMail')

const Users = db.users

/**
 * Enter registration waitlist
 * @param {Object} data user data
 * @param {string} data.email user email
 * @param {string} data.username user selected username
 * @returns {Promise<Object>} user object
 */
exports.enterWaitlist = async function enterWaitlist (data) {
  const { email, username } = data
  let user = await sq.query(`
    SELECT
      uid
    FROM
      users
    WHERE
      email = LOWER(:email)
      ${username ? 'OR username = LOWER(:username)' : ''}
  `, {
    replacements: { username, email },
    type: QueryTypes.SELECT,
    plain: true
  })

  if (user) {
    throw new ApiError(400, 'invalid_request_error', 'email_or_username_exist', 'Invalid param "email" or "username", value already taken.')
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (emailRegex.test(email) === false) {
    throw api.badRequest('This e-mail is invalid.')
  }

  user = await Users.create({
    email,
    waitlist: true,
    uid: '',
    registeredFrom: 'email',
    history: [{
      type: 'CREATED',
      createdAt: Date.now(),
      waitlistedAt: Date.now()
    }],
    ...(username ? { username } : {})
  })

  // send waitlist email to user
  const history = user.history
  const sent = await SendMail.sendWaitlistEmail(user)

  let historyOpts = {}
  if (sent.error || sent.res.isAxiosError) {
    if (sent.message && sent.message.html) sent.message.html = '...'
    historyOpts = {
      event: {
        status: 'fail',
        type: EMAIL_TYPE.WAITLIST_NOTIFICATION
      },
      req: sent.message,
      res: sent.error
    }
    await Users.destroy({
      where: { email },
      force: true
    })
    throw api.serverError('An error occured, please try again later')
  } else {
    historyOpts = {
      event: {
        status: 'in-progress',
        type: EMAIL_TYPE.WAITLIST_NOTIFICATION
      },
      res: sent.res
    }
  }

  history.push({
    ...historyOpts,
    createdAt: Date.now(),
    type: 'WAITLIST_ISSUED',
    openedAt: null,
    read: false
  })

  user.changed('history', true)
  await user.save()

  return user
}
