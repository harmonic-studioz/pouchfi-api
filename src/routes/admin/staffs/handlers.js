'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */
const excel = require('node-excel-export')

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const config = require('@config')
const { Sequelize } = require('@models')
const base64 = require('@/src/helpers/base64')
const { formatDate, getLocale } = require('@/src/helpers')
const { ROLE, EMAIL_TYPE } = require('@/src/constants')
const { ApiError, api } = require('@/src/classes/errors')
const SendMail = require('@/src/services/email/SendMail')

const ADMIN_HOST = config.admin.host
const invitationUrl = `${ADMIN_HOST}/register`

const Staffs = db.staffs
const Roles = db.roles

/**
 * Handler function to invite user
 * @param {object} inviter inviter data
 * @param {object} invitee invitee data
 * @param {object} req request object
 */
exports.inviteUser = async function inviteUser (inviter, invitee) {
  let staff = await Staffs.findOne({
    where: { email: invitee.email.toLowerCase() }
  })

  if (staff) {
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

  staff = await Staffs.create({
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
  const tokenTimestamp = Date.now()
  const token = staff.getInvitationToken({
    expiration: staff.roleCode === ROLE.SUPPLIER && '14 days',
    timestamp: tokenTimestamp.toString()
  })

  const history = staff.history
  const link = new URL(invitationUrl)
  link.searchParams.set('actionToken', token)
  link.searchParams.set('action', 'INVITE')
  link.searchParams.set('email', staff.email)
  link.searchParams.set('firstName', staff.firstName)
  link.searchParams.set('lastName', staff.lastName)

  const callbackUrl = new URL(config.service.host)
  callbackUrl.pathname = '/__internal/emails/users/update'
  callbackUrl.searchParams.set('emailId', base64.encode(tokenTimestamp))
  callbackUrl.searchParams.set('userId', base64.encode(staff.uid))

  const sent = await SendMail.sendAdminInvitation(
    staff,
    link,
    req,
    getLocale(staff.language && staff.language.toLowerCase())
  )

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

  staff.changed('history', true)
  await staff.save()
}

/**
 * list users
 * @param {object} query request query object
 * @param {object} props request props
 * @param {boolean} isExport boolean flag
 * @returns {Promise<boolean>}
 */
exports.list = async function list (query, props, isExport = false) {
  const { users, count } = await Staffs.list(query, isExport)

  const outlets = { items: users, totalItems: count }
  return {
    meta: props.meta,
    outlets
  }
}

/**
 *  Get a user detail
 * @param {string} uid user uid
 * @param {object} props request props
 * @returns {Promise<boolean>}
 */
exports.one = async function one (uid, props) {
  const outlets = { details: undefined }

  const user = await Staffs.one(uid)
  outlets.details = user

  return {
    meta: props.meta,
    outlets
  }
}

/**
 * delete a user
 * @param {object} body request body
 * @param {object} editor request editor
 */
exports.deleteUser = async function deleteUser (body, editor) {
  const { uid, password, ...rest } = body
  const user = await Staffs.scope(null).findByPk(uid)
  if (!user) {
    throw api.badRequest('User does not exist.')
  }

  const data = JSON.parse(JSON.stringify(rest))
  const history = user.get('history')
  history.push({
    createdAt: Date.now(),
    type: 'DELETED',
    req: rest,
    byUid: editor.uid,
    by: editor.email
  })
  user.changed('history', true)
  await user.update({ ...data, history })

  const userInst = await Staffs.scope('role').findOne({
    where: { uid: editor.uid, registeredFrom: 'email' }
  })
  const isPasswordmatched = await userInst.validPassword(password)
  if (!isPasswordmatched) {
    throw api.forbidden('Invalid password')
  }
  await user.update({ deletedAt: Date.now() }, { where: { uid } })
}

/**
 * update a user
 * @param {object} body request body
 * @param {object} editor request editor
 */
exports.updateUser = async function updateUser (body, editor) {
  const { uid, password, ...rest } = body
  const user = await Staffs.scope(null).findByPk(uid)
  if (!user) {
    throw api.badRequest('User does not exist.')
  }

  const data = JSON.parse(JSON.stringify(rest))
  const history = user.get('history')
  history.push({
    createdAt: Date.now(),
    type: 'EDITED',
    req: rest,
    byUid: editor.uid,
    by: editor.email
  })
  user.changed('history', true)
  await user.update({ ...data, history })
}

/**
 * Handler function to resend invite to user
 * @param {object} body invitee data
 * @param {object} inviter inviter data
 * @param {object} req request object
 */
exports.resendInvitation = async function resendInvitation (body, inviter, req) {
  if (!body.email) {
    throw api.badRequest('Invalid payload email.')
  }

  const staff = await Staffs.findOne({
    where: { email: body.email.toLowerCase() }
  })
  if (!staff) {
    throw api.badRequest('Email is not registered.')
  }

  const sent = await SendMail.sendAdminInvitation(
    staff,
    link,
    req,
    getLocale(staff.language && staff.language.toLowerCase())
  )

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

  staff.changed('history', true)
  await staff.save()
}

exports.xls = async function xls (query, generatedBy, props) {
  const { outlets } = await exports.list(query, props, true)
  const styles = require('@/src/helpers/xlsStyle')

  for (const user of outlets.users) {
    user.createdAt = formatDate(user.createdAt, null, 'MMM DD, YYYY')
    user.inactive = user.inactive ? 'Inactive' : 'Active'
  }

  const headers = {
    id: {
      label: '#',
      width: 30
    },
    createdAt: {
      label: 'Joined At',
      width: 180
    },
    roleName: {
      label: 'Role',
      width: 220
    },
    apps: {
      label: 'Client Name',
      width: 250
    },
    uid: {
      label: 'User ID',
      width: 220
    },
    displayName: {
      label: 'User',
      width: 250
    },
    inactive: {
      label: 'Status',
      width: 75
    },
    email: {
      label: 'Email',
      width: 180
    }
  }
  const keys = Object.keys(outlets.users[0])
  const specification = keys.reduce((obj, key) => {
    if (['history', 'roleCode', 'invitedByUid'].indexOf(key) < 0) {
      obj[key] = {
        displayname: headers[key].label,
        headersStyle: styles.headerDark,
        width: headers[key].width
      }
      return obj
    }
    return obj
  }, {})
  const headingInfo = [
    [{ value: 'Users report', style: styles.title, width: 220 }],
    ['Client', query.appCode ? query.appCode : 'ALL'],
    ['Search', query.search ? query.search : '-'],
    ['Generated at', new Date().toJSON()],
    ['Generated By', generatedBy],
    []
  ]
  const report = excel.buildExport([
    { name: 'report', specification, data: outlets.users },
    {
      name: 'info',
      heading: headingInfo,
      specification: {
        fakeWidth: {
          width: 200,
          displayName: '',
          headerStyle: styles.title
        }
      },
      data: [{ fakeWidth: '' }]
    }
  ])
  const fileNamePrefix = new Date().toJSON().replace(/:/g, '').replace(/\..*/g, '')

  return {
    report,
    fileName: `${fileNamePrefix}_users_report.xlsx`
  }
}

/**
 * Suggest user
 * @param {object} query request query
 * @param {object} props meta props
 * @returns {Promise<object>}
 */
exports.autosuggest = async function autosuggest (query, props) {
  const outlets = { items: [] }
  const inst = await Staffs.suggest()
  outlets.items = inst

  return {
    outlets,
    meta: { ...props.meta }
  }
}
