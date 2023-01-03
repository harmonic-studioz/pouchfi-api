'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */

const jwt = require('jsonwebtoken')
const { DateTime } = require('luxon')

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const config = require('@config')
const Cache = require('@/src/classes/cache')
const errors = require('@/src/classes/errors')
const { isPlainObject } = require('@/src/helpers')

const Users = db.users
const Staffs = db.staffs

const USER_TYPE_HEADER = 'User-Type'
const USER_TOKEN_HEADER = 'authorization'

/**
 * Checks if the incoming request is authenticated
 */
exports.authenticated = (role) => async function authenticated (req, res, next) {
  /**
   * @type {Object.<string, Model>}
   */
  const models = {
    staff: Staffs,
    users: Users
  }
  const Model = models[role]
  if (req.isAunthenticated && !req.isAunthenticated()) {
    return next(errors.api.unauthorized('User is not authenticated'))
  }

  const authToken = req.get('authorization')
  const token = authToken && authToken.startsWith('Bearer') ? authToken.split(' ')[1] : null
  if (!token) {
    return next(errors.api.unauthorized('Not authorized, no token'))
  }

  const decoded = Model.verifyToken(token)
  if (!decoded) {
    return next(errors.api.unauthorized('Token is invalid'))
  }

  const isTokenValid = await checkValidToken(decoded)
  if (!isTokenValid) {
    return next(errors.api.unauthorized('Token is invalid'))
  }

  let user
  if (role === 'user') {
    user = await Model.findByPk(decoded.uid)
  } else {
    user = await Model.scope('role').findByPk(decoded.uid)
  }
  if (!user) {
    return next(errors.api.unauthorized('Not authorized, invalid user'))
  }
  req.user = user.toClean()
  req.token = token
  return next()
}

exports.authorizeForGuest = authorizeFor('guest', _verifyUserId)
exports.authorizeForAdmin = authorizeFor('admin', _verifyAdminId)

exports.rolePermission = function rolePermission (roleCode, orComparator = null) {
  return async (req, _res, next) => {
    try {
      const isValid = orComparator ? await orComparator(req) : false

      if (roleCode.includes(req.user.roleCode) || isValid) {
        return next()
      }
      return next(errors.api.forbidden('No permissions'))
    } catch (err) {
      next(err)
    }
  }
}

exports.gteLevelPermission = function gteLevelPermission (gteLevel) {
  return async (req, _res, next) => {
    try {
      if (req.user.level >= gteLevel) {
        return next()
      }
      return next(errors.api.forbidden('No permissions'))
    } catch (err) {
      next(err)
    }
  }
}

/**
 * Checks a given request if it is allowed to proceed
 *
 * @param {string} role - The `role` can be either `admin` or `guest`
 * @param {Function} withUser - A function that verifies if the provided `uid` exists
 * @returns {Function} Authorize middleware
 */
function authorizeFor (role, withUser) {
  return async function authorize (req, res, next) {
    const userType = req.get(USER_TYPE_HEADER)

    if (role !== userType) {
      return next(errors.api.unauthorized('role'))
    }

    if (userType === 'pouchDev') {
      return next()
    }

    const token = req.get(USER_TOKEN_HEADER)

    if (!token) {
      return next(errors.api.unauthorized('token'))
    }
    req.token = token

    let claims
    try {
      claims = jwt.verify(token, config.jwtKeys.public, {
        issuer: config.admin.host,
        algorithms: 'RS256'
      })
    } catch (err) {
      return next(err)
    }

    const uid = claims.uid
    if (uid) {
      try {
        req.user = await withUser(uid)
      } catch (err) {
        return next(err)
      }
    }

    next()
  }
}
exports.authorizeFor = authorizeFor

/**
 * Verifies the given `guestId` if it exists
 *
 * @param {string} guestId - Guest ID
 * @returns {Promise<Object>} Guest details
 */
async function _verifyUserId (guestId) {
  const guest = await Users.findByPk(guestId)

  if (!guest) {
    throw new errors.domain.EntityNotFound(guestId, {
      model: Users,
      property: 'uid'
    })
  }

  return guest.toClean()
}

/**
 * Verifies the given `userId` if it exists
 *
 * @param {string} adminId - Guest ID
 * @returns {Promise<Object>} Guest details
 */
async function _verifyAdminId (adminId) {
  const user = await Staffs.findByPk(adminId)

  if (!user) {
    throw new errors.domain.EntityNotFound(adminId, {
      model: Staffs,
      property: 'uid'
    })
  }

  return user.toClean()
}

/**
 * check if a token is valid
 * @param {object} decoded jwt decoded object
 * @returns {Promise<boolean>} true if valid else false
 */
async function checkValidToken (decoded) {
  const isObject = isPlainObject(decoded)
  if (!isObject) return false

  if (decoded.exp < DateTime.now().toSeconds()) return false
  const jwtKey = `${decoded.uid}-${decoded.iat}`
  const result = await Cache.get(jwtKey)
  return !result
}
exports.checkValidToken = checkValidToken
