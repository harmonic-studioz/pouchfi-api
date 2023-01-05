'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const config = require('@config')
const base64 = require('@/src/helpers/base64')
const prison = require('@/src/classes/prison')
const { redis } = require('@/src/helpers/redis')
const { ApiError } = require('@/src/classes/errors')
const SendMail = require('@/src/services/email/SendMail')

const Staffs = db.staffs

/**
 * Confirm admin user registration
 * @param {object} body request body
 * @param {string} body.token registration token
 * @param {string} body.firstName user first name
 * @param {string} body.lastName user last name
 * @param {string} body.password user password
 * @param {object} props request props
 */
exports.confirmRegistration = async function (body, props) {
  const claims = Staffs.verifyToken(body.token)

  let user = await Staffs.scope('role').findOne({
    where: {
      uid: claims.uid,
      email: claims.email.toLowerCase()
    }
  })

  // Validate if the user already created in database
  if (!user) {
    throw new ApiError(
      400,
      'invalid_request_error',
      'invalid_token',
      'Invalid invitation token.'
    )
  }

  if (claims.email !== body.email && body.email !== user.email) {
    throw new ApiError(
      400,
      'invalid_request_error',
      'invalid_token',
      'Invalid invitation token. Tempared identity.'
    )
  }

  const history = user.history
  const inviteLog = history.find(({ createdAt }) => claims.sub === createdAt.toString())

  // Check if it's a new token
  if (inviteLog.usedAt !== null) {
    throw new ApiError(
      400,
      'invalid_request_error',
      'used_token',
      'Invalid used token'
    )
  }

  inviteLog.usedAt = Date.now()

  history.push({
    type: 'INVITATION_ACCEPTED',
    createdAt: Date.now(),
    byUid: claims.uid,
    by: body.email
  })

  user.changed('history', true)

  user = await user.update({
    password: body.password,
    firstName: body.firstName,
    lastName: body.lastName,
    history,
    inactive: false
  })

  return {
    meta: props.meta,
    outlets: {
      details: user.toClean()
    }
  }
}

/**
 * Request for a password reset
 * @param {string} email user email
 * @param {object} props request props
 */
exports.forgotPassword = async function (body, props) {
  const locale = props.meta.locale.toLowerCase()

  const staff = await Staffs.findOne({
    where: {
      email: body.email.toLowerCase(),
      registeredFrom: 'email',
      inactive: false
    }
  })

  if (!staff) {
    throw new ApiError(
      404,
      'invalid_request_error',
      'user_not_found',
      'User not found'
    )
  }

  const resetId = Date.now().toString()
  const token = await staff.getPasswordResetToken({ resetId })
  const link = new URL(`${config.admin.host}/reset-password`)
  link.searchParams.set('actionToken', token)
  link.searchParams.set('action', 'RESET_PASSWORD')
  link.searchParams.set('email', body.email)
  const emailLink = new URL(config.service.host)
  emailLink.pathname = '/__internal/emails/update'
  emailLink.searchParams.set('emailId', base64.encode(resetId))
  emailLink.searchParams.set('uid', base64.encode(staff.uid))
  emailLink.searchParams.set('type', base64.encode('staff'))

  const emailData = {
    '<%= link %>': link.href,
    '<%= emailLink %>': emailLink.href,
    username: staff.get('username') || ''
  }
  const recipientData = {
    email: staff.get('email'),
    name: staff.get('fullName')
  }
  const meta = { uid: staff.get('uid') }

  const metadata = staff.get('metadata') || {}

  // Might not exist if user never request for forgot password
  metadata.passwordHistory = (metadata && metadata.passwordHistory) || {}
  metadata.passwordHistory[resetId] = {
    type: 'FORGOT_PASSWORD',
    usedAt: null,
    oldPasswordHash: staff.get('passwordHash')
  }

  staff.changed('metadata', true)

  await staff.update({
    metadata
  })

  await SendMail.sendForgotPasswordEmail(recipientData, emailData, meta, locale)
}

/**
 * Set new password.
 * @param {string} newPassword - New password
 * @param {Object} claims - Claims
 * @param {string} claims.uid - User ID
 * @param {string} claims.sub - Subject from claims
 * @param {object} props request props
 * @returns {Promise<void>} Password has been changed
 */
exports.resetpassword = async function (newPassword, claims, props) {
  const locale = props.meta.locale.toLowerCase()

  const staff = await Staffs.findOne({
    where: {
      uid: claims.uid,
      inactive: false,
      registeredFrom: 'email'
    }
  })

  // for strange case the user simply just not exists in our database
  if (!staff) {
    throw new ApiError(
      400,
      'invalid_request_error',
      'user_reset_password_user_not_found',
      'Token might expired or invalid'
    )
  }

  const { metadata } = staff

  // for modification after we issued token, E.g: customer had already create their new password.
  if (
    !metadata.passwordHistory[claims.sub] ||
    (metadata.passwordHistory[claims.sub] && metadata.passwordHistory[claims.sub].usedAt)
  ) {
    throw new ApiError(
      400,
      'invalid_request_error',
      'user_reset_password_invalid_token',
      'Token might expired or invalid'
    )
  }

  metadata.passwordHistory[claims.sub].usedAt = Date.now()

  // specify that the field has changed
  staff.changed('metadata', true)

  await staff.update({
    password: newPassword,
    metadata
  })

  const link = new URL(`${config.admin.host}/forgot-password`)
  const emailLink = new URL(config.service.host)
  emailLink.pathname = '/__internal/emails/update'
  emailLink.searchParams.set('emailId', base64.encode(Date.now().toString()))
  emailLink.searchParams.set('uid', base64.encode(staff.uid))
  emailLink.searchParams.set('type', base64.encode('staff'))

  const emailData = {
    '<%= emailLink %>': emailLink.href,
    '<%= link %>': link.href,
    username: staff.get('username') || ''
  }
  const recipientData = {
    email: staff.get('email'),
    name: staff.get('fullName')
  }
  const meta = { uid: staff.get('uid') }

  return Promise.all([
    prison.free(staff.email),
    _clearSession(staff.email),
    SendMail.sendResetPasswordEmail(recipientData, emailData, meta, locale)
  ])
}

/**
 * Clears all active session for the provided `email`
 *
 * @param {string} email - Email address of the user
 * @returns {Promise<void>} Sessions have been cleared
 */
async function _clearSession (email) {
  const keys = await redis.keys('sess:' + email + '*')

  if (!keys.length) return

  await redis.del.apply(redis, keys)
}
