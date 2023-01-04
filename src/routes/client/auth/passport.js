'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

const luxon = require('luxon')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const FacebookStrategy = require('passport-facebook').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const config = require('@config')
const prison = require('@/src/classes/prison')
const { ApiError } = require('@/src/classes/errors')
const { sq, Sequelize: { QueryTypes } } = require('@models')

const Users = db.users

exports = module.exports = {
  jwt: passport.authenticate('jwt'),
  local: passport.authenticate('local'),
  google: passport.authenticate('google'),
  facebook: passport.authenticate('facebook')
}

const googleStrategy = makeStrategy.bind(null, GoogleStrategy, optionsForOpenID)
exports.googleStrategy = googleStrategy

const facebookStrategy = makeStrategy.bind(null, FacebookStrategy, optionsForFB)
exports.facebookStrategy = facebookStrategy

passport
  .use(new LocalStrategy({
    usernameField: 'email'
  }, _verifyForLocalStrategy))
  .use(googleStrategy(config.google))
  .use(facebookStrategy(config.facebook))
  .use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    algorithms: 'RS256',
    audience: config.admin.host,
    issuer: config.admin.host,
    secretOrKey: config.jwtKeys.public
  }, _verifyForJWTStrategy))

passport.serializeUser(serializer)
passport.deserializeUser(deserializer)

passport.serializeUser(serializer)
passport.deserializeUser(deserializer)

/**
 * Verify function for local strategy
 *
 * @param {string} email - Email address of the admin
 * @param {string} password - Raw password of the admin
 * @param {Function} done - Callback function
 */
async function _verifyForLocalStrategy (email, password, done) {
  const user = await Users.findOne({
    where: {
      email,
      registeredFrom: 'email'
    }
  })

  if (!user) {
    return done(new ApiError(
      404,
      'authentication_error',
      'unauthorized',
      'User does not exist'
    ))
  }

  const isPasswordMatched = await user.verifyPassword(password)

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

  if (user.inactive) {
    return done(new ApiError(
      401,
      'authentication_error',
      'suspended',
      'User has been suspended'
    ))
  }

  // update last login
  await sq.query(`
    UPDATE public.users SET "lastLogin" = now() WHERE uid = '${user.uid}'
  `, {
    type: QueryTypes.UPDATE
  })

  done(null, user.toClean())
}
exports._verifyForLocalStrategy = _verifyForLocalStrategy

/**
 * Verify function for local strategy
 *
 * @param {string} email - Email address of the admin
 * @param {string} password - Raw password of the admin
 * @param {Function} done - Callback function
 */
async function _verifyForJWTStrategy (jwt, done) {
  const user = await Users.findByPk(jwt.uid)

  if (!user) {
    return done(new ApiError(
      404,
      'authentication_error',
      'unauthorized',
      'User does not exist'
    ))
  }

  if (user.inactive) {
    return done(new ApiError(
      401,
      'authentication_error',
      'suspended',
      'User has been suspended'
    ))
  }

  // update last login
  await sq.query(`
    UPDATE public.users SET "lastLogin" = now() WHERE uid = '${user.uid}'
  `, {
    type: QueryTypes.UPDATE
  })

  done(null, user.toClean())
}
exports._verifyForJWTStrategy = _verifyForJWTStrategy

/**
 * Helper function to make strategy
 *
 * @param {NewableFunction} Strategy - Passprt strategy class
 * @param {Function} optionFor - A function to apply the `options`
 * @param {Object} options - Options
 * @param {string} options.clientID - Google OAuth2 Client ID
 * @param {string} options.clientSecret - Google OAuth Client secret
 * @returns {Object} Passport strategy instance
 */
function makeStrategy (Strategy, optionFor, options) {
  return new Strategy(optionFor({
    clientID: options.clientID,
    clientSecret: options.clientSecret
  }), createVericationFor(options.strategyName))
}

function createVericationFor (type) {
  return async function (_accessToken, _refreshToken, profile, done) {
    let email

    if (profile.emails && profile.emails.length) {
      email = profile.emails[0].value
    }

    if (!email) {
      return done(new ApiError(
        404,
        'authentication_error',
        'unauthorized',
        'An email must be present for a profile'
      ))
    }

    const oAuthResponse = _createOAuthResponse(profile)

    let user

    try {
      user = await Users.find('email', email)

      user = await Users.update({
        externalAuthId: profile.id,
        oAuthResponse,
        provider: profile.provider,
        lastLogin: new Date()
      })

      done(null, user.toClean())
    } catch (err) {
      if (err.statusCode === 403) {
        return done(null, null, 'Blocked by admin')
      }

      if (err.statusCode !== 404) {
        return done(err)
      }

      // create user
      user = await Users.create({
        registeredFrom: type,
        email,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        externalAuthId: profile.id,
        oAuthResponse,
        username: oAuthResponse.displayName,
        provider: type,
        ...(profile.photos && profile.photos.length ? { avatar: profile.photos[0].value } : {})
      })

      done(null, user.toClean())
    }
  }
}
exports.createVericationFor = createVericationFor

/**
 * Creates options for Open ID compliant OAuth2 strategy
 *
 * @param {Object} credentials - Credentials
 * @param {string} credentials.clientID - Client ID
 * @param {string} credentials.clientSecret - Client secret
 * @returns {Object} Options for Open ID compliant OAuth2 strategy
 */
function optionsForOpenID (credentials) {
  const options = createBaseOptions(credentials)
  options.scope.push('openid')
  options.scope.push('profile')
  options.callbackURL = `${config.service.host}/auth`

  return options
}

/**
 * Creates options for Facebook OAuth2 strategy
 *
 * @param {Object} credentials - Credentials
 * @param {string} credentials.clientID - Client ID
 * @param {string} credentials.clientSecret - Client secret
 * @returns {Object} Options for Facebook OAuth2 strategy
 */
function optionsForFB (credentials) {
  const options = createBaseOptions(credentials)
  options.scope.push('public_profile')
  options.graphAPIVersion = 'v11.0'
  options.profileFields = [
    'email',
    'name',
    'displayName',
    'picture'
  ]

  return options
}

/**
 * Creates a base options for OAuth2 strategies
 *
 * @param {Object} credentials - Credentials
 * @param {string} credentials.clientID - Client ID
 * @param {string} credentials.clientSecret - Client secret
 * @returns {Object} Base options
 */
function createBaseOptions (credentials) {
  return {
    clientID: credentials.clientID,
    clientSecret: credentials.clientSecret,
    scope: ['email']
  }
}

function serializer (user, done) {
  done(null, user.uid)
}

async function deserializer (id, done) {
  const user = await Users.findByPk(id)

  done(null, user.toClean())
}

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

function _createOAuthResponse (profile) {
  return {
    sub: profile.id ? profile.id : '',
    email: profile.emails ? profile.emails : [],
    preferredUsername: profile.preferred_username ? profile.preferredUsername : '',
    givenName: profile.name.givenName ? profile.name.givenName : '',
    displayName: profile.displayName ? profile.displayName : ''
  }
}
exports._createOAuthResponse = _createOAuthResponse
