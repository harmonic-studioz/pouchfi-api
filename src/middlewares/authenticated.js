'use strict'

const jwt = require('jsonwebtoken')

const config = require('@config')
const { guest: Guest, user: User } = require('@models')
const errors = require('@/src/classes/errors')

const USER_TYPE_HEADER = 'User-Type'
const USER_TOKEN_HEADER = 'User-Token'
const USER_IDENTITY_HEADER = 'User-Identity'

/**
 * Checks if the incoming request is authenticated
 */
exports.authenticated = function authenticated (req, res, next) {
  if (!req.isAunthenticated()) {
    return next(errors.api.unauthorized('User is not authenticated'))
  }

  return next()
}

exports.guest = authorizeFor('guest', _verifyGuestId)
exports.admin = authorizeFor('admin', _verifyAdminId)

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

    const token = req.get(USER_TOKEN_HEADER)

    if (!token) {
      return next(errors.api.unauthorized('token'))
    }

    try {
      jwt.verify(token, config.authorization.secret)
    } catch (err) {
      return next(err)
    }

    const uid = req.get(USER_IDENTITY_HEADER)
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

/**
 * Verifies the given `guestId` if it exists
 *
 * @param {string} guestId - Guest ID
 * @returns {Promise<Object>} Guest details
 */
async function _verifyGuestId (guestId) {
  const guest = await Guest.findById(guestId)

  if (!guest) {
    throw new errors.domain.EntityNotFound(guestId, {
      model: Guest,
      property: 'uid'
    })
  }

  return guest.toJSON()
}

/**
 * Verifies the given `userId` if it exists
 *
 * @param {string} adminId - Guest ID
 * @returns {Promise<Object>} Guest details
 */
async function _verifyAdminId (adminId) {
  const user = await User.findById(adminId)

  if (!user) {
    throw new errors.domain.EntityNotFound(adminId, {
      model: User,
      property: 'uid'
    })
  }

  return user.toJSON()
}
