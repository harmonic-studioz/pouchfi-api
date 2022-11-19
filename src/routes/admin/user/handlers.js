'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */

const db = require('@models')
const config = require('@config')
const base64 = require('@/src/helpers/base64')
const { ROLE, EMAIL_TYPE } = require('@/src/constants')
const { ApiError, api } = require('@/src/classes/errors')

const { Sequelize } = db
const ADMIN_HOST = config.admin.host
const invitationUrl = `${ADMIN_HOST}/register`

/**
 * @constant
 * @type {Model}
 */
const Users = db.users
/**
 * @type {Model}
 */
const Roles = db.roles

/**
 * Handler function to invite user
 * @param {object} inviter inviter data
 * @param {object} invitee invitee data
 * @param {object} req request object
 */
exports.inviteUser = async function inviteUser (inviter, invitee) {
  let user = await Users.findOne({
    where: { email: invitee.email.toLowerCase() }
  })

  if (user) {
    throw new ApiError(400, 'invalid_request_error', 'email_exist', 'Invalid param "email", email already taken.')
  }

  // prevent the user to set higher role than his own level
  const role = await Roles.findOne({
    where: {
      code: invitee.roleCode,
      level: {
        [Sequelize.Op.lte]: inviter.level
      }
    }
  })
  if (!role) {
    throw new ApiError(403, 'authentication_error', 'unauthorized', 'No permissions to set this role')
  }

  const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  if (emailRegex.test(invitee.email) === false) {
    throw api.badRequest('This e-mail is invalid.')
  }

  user = await Users.create({
    email: invitee.email,
    uid: '',
    firstName: invitee.firstName,
    lastName: invitee.lastName,
    roleCode: invitee.roleCode,
    invitedbyUid: inviter.uid,
    registeredFrom: 'email',
    history: [{
      createdAt: Date.now(),
      type: 'CREATED',
      byUid: inviter.uid,
      by: inviter.email
    }]
  })

  // token and email creation
  const tokenTimestamp = Date.now().toString()
  const token = user.getInvitationToken({
    expiration: user.roleCode === ROLE.SUPPLIER && '14 days',
    timestamp: tokenTimestamp
  })

  const history = user.history
  const link = new URL(invitationUrl)
  link.searchParams.set('actionToken', token)
  link.searchParams.set('action', 'INVITE')
  link.searchParams.set('email', user.email)
  link.searchParams.set('firstName', user.firstName)
  link.searchParams.set('lastName', user.lastName)

  const callbackUrl = new URL(config.service.host)
  callbackUrl.pathname = '/__internal/emails/users/update'
  callbackUrl.searchParams.set('emailId', base64.encode(tokenTimestamp))
  callbackUrl.searchParams.set('userId', base64.encode(user.uid))

  const data = {
    username: `${user.firstName} ${user.lastName}`,
    '<%= link %>': link.href.trim(),
    inviter,
    '<%= emailLink %>': callbackUrl.href.trim()
  }
  console.log(data)

  const sent = {
    error: true,
    message: { html: '...' }
  }

  /**
   * @todo set up email sending (MAKE USE OF DATA TO PASS TO TEMPLATE)
   */

  let historyOpts = {}
  if (sent.error) {
    sent.message.html = '...'
    historyOpts = {
      event: {
        status: 'fail',
        type: EMAIL_TYPE.USER_INVITATION
      },
      req: sent.message,
      res: sent.error
    }
  } else {
    historyOpts = {
      event: {
        status: 'in-progress',
        type: EMAIL_TYPE.USER_INVITATION
      },
      res: sent.res
    }
  }

  history.push({
    ...historyOpts,
    createdAt: tokenTimestamp,
    type: 'INVITATON_ISSUED',
    byUid: inviter.uid,
    by: inviter.email,
    usedAt: null,
    openedAt: null,
    read: false
  })

  await user.changed('history', true)
  await user.save()
}

exports.list = async function list (query, props, isExport = false) {
  const { users, count } = await Users.list(query, isExport)

  const outlets = { items: users, totalItems: count }
  return {
    meta: props.meta,
    outlets
  }
}

exports.one = async function one (uid, props) {
  const outlets = { details: undefined }

  const user = await Users.one(uid)
  outlets.details = user

  return {
    meta: props.meta,
    outlets
  }
}
