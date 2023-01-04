'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

const luxon = require('luxon')
const passport = require('passport')
const LocalStrategy = require('passport-local')

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const prison = require('@/src/classes/prison')
const { ApiError } = require('@/src/classes/errors')
const { sq, Sequelize: { QueryTypes } } = require('@models')

const Staffs = db.staffs

exports = module.exports = {
  local: passport.authenticate('adminLocal')
}

passport.use('adminLocal', new LocalStrategy({
  usernameField: 'email'
}, _verifyForLocalStrategy))
passport.serializeUser(serializer)
passport.deserializeUser(deserializer)

/**
 * Pluralize the word if the provided `count` is greater than 1
 *
 * @param {string} word - The word to pluralize
 * @param {number} count - The number to determine of `word` will be pluralized
 * @returns {string} Pluralized word
 */
function _pluralize (word, count) {
  count = parseInt(count, 10)

  if (count > 1) {
    return word + 's'
  }

  return word
}
exports._pluralize = _pluralize

/**
 * Converts the format `h:mm` to human readable form
 *
 * @param {string} duration - Duration with the following format: `h:mm`
 * @returns {string} Humanized duration
 */
function _toHumanDuration (duration) {
  const [hours, minutes] = duration.split(':')

  const segments = []

  if (hours && hours !== '0') {
    segments.push(`${hours} ${_pluralize('hour', hours)}`)
  }

  if (minutes && minutes !== '0') {
    segments.push(`${minutes} ${_pluralize('minute', minutes)}`)
  }

  return segments.join(' and ')
}
exports._toHumanDuration = _toHumanDuration

/**
 * Verify function for local strategy
 *
 * @param {string} email - Email address of the admin
 * @param {string} password - Raw password of the admin
 * @param {Function} done - Callback function
 */
async function _verifyForLocalStrategy (email, password, done) {
  const staff = await Staffs.scope('role').findOne({
    where: {
      email,
      registeredFrom: 'email'
    }
  })

  if (!staff) {
    return done(new ApiError(
      404,
      'authentication_error',
      'unauthorized',
      'User does not exist'
    ))
  }

  const isPasswordMatched = await staff.verifyPassword(password)

  const lock = await prison.cell(email)

  if (lock.isLocked) {
    const extendedTTL = await lock.extend()
    const duration = luxon.Duration.fromMillis(extendedTTL * 1000).toFormat('h:m')
    const humanizedDuration = _toHumanDuration(duration)

    let message = 'Locked out'
    if (humanizedDuration) {
      message += ` for ${humanizedDuration}`
    }

    return done(new ApiError(
      401,
      'authentication_error',
      'unauthorized',
      message
    ))
  }

  if (!isPasswordMatched) {
    await lock.increment()

    return done(new ApiError(
      401,
      'authentication_error',
      'unauthorized',
      'Invalid email or password'
    ))
  }

  await lock.free()

  if (staff.inactive) {
    return done(new ApiError(
      401,
      'authentication_error',
      'suspended',
      'User has been suspended'
    ))
  }

  // update last login
  await sq.query(`
    UPDATE public.staffs SET "lastLogin" = now() WHERE uid = '${staff.uid}'
  `, {
    type: QueryTypes.UPDATE
  })

  const token = await staff.signToken(staff.level)
  done(null, { ...staff.toClean(), token })
}
exports._verifyForLocalStrategy = _verifyForLocalStrategy

function serializer (staff, done) {
  done(null, staff.uid)
}

async function deserializer (id, done) {
  const staff = await Staffs.scope('role').findByPk(id)

  done(null, staff.toClean())
}
