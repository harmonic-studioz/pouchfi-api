'use strict'

const fs = require('fs')

const { version, name } = require('./package.json')
const NO_REPLY = 'noreply@pouchfi.com'

const {
  NODE_ENV = 'development',

  PORT = '3005',

  // BACKEND SERVICE
  APP_HOST = 'http://localhost:3004',

  // ADMIN SITE
  ADMIN_HOST = 'http://localhost:8080',
  ADMIN_INVITATION_TOKEN_EXPIRATION = '7 days',

  // Guest service
  GUEST_HOST = 'https://localhost:3000',

  // Whitelisting for CORS
  ORIGINS_WHITELIST = '',

  // POSTGRES
  PG_HOST = 'localhost',
  PG_PORT = '5432',
  PG_USERNAME,
  PG_PASSWORD,
  PG_DATABASE,

  // REDIS
  REDIS_HOST = 'localhost',
  REDIS_PORT = '6379',
  REDIS_PASSWORD,
  REDIS_DB = 0,

  // SESSION COOKIES
  COOKIE_NAME,
  COOKIE_SECRET,
  COOKIE_MAX_AGE = '15 minutes',

  // AUTHORIZATION
  AUTHORIZATION_JWT_SECRET,
  AUTHORIZATION_JWT_EXPIRES = '30 days',

  // MAILCHIMP
  MANDRILL_API_KEY,
  MANDRILL_SUB_ACCOUNT,
  MANDRILL_WEBHOOK_KEY,
  MAIL_SENDER = NO_REPLY,

  // MAILS
  MAIL_BIZ = NO_REPLY,
  MAIL_GUEST_FAQ = NO_REPLY,
  MAIL_BIZ_CS = NO_REPLY,
  MAIL_PAYOUT_MONITOR = NO_REPLY,
  MAIL_PARTNERSHIP,

  // cache
  CACHE_PREFIX = 'pouch_',
  CACHE_DRIVER = 'redis',

  // slack channels hooks
  DEVELOPMENT_INFO,

  // google app details
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,

  // facebook app details
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,

  IS_STAGING
} = process.env

const isDev = NODE_ENV === 'development'
const isProd = NODE_ENV === 'production'
const isStaging = IS_STAGING === '1'

module.exports = {
  isDev,
  isProd,
  version,
  isStaging,

  service: {
    name,
    host: APP_HOST,
    port: parseInt(PORT, 10)
  },

  admin: {
    host: ADMIN_HOST,
    invitationTokenExpiration: ADMIN_INVITATION_TOKEN_EXPIRATION
  },

  guest: {
    host: GUEST_HOST
  },

  postgres: {
    url: _createPostgresConnectionURI({
      host: PG_HOST,
      port: parseInt(PG_PORT, 10),
      username: PG_USERNAME,
      password: PG_PASSWORD,
      database: PG_DATABASE
    }),
    host: PG_HOST,
    database: PG_DATABASE,
    options: {
      dialect: 'postgres',
      logging: _loggerForPostgres(isProd)
    }
  },

  redis: {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT, 10),
    password: REDIS_PASSWORD
  },

  cookies: {
    name: COOKIE_NAME,
    secret: COOKIE_SECRET,
    maxAge: getTimeFromString(COOKIE_MAX_AGE).milliseconds
  },

  authorization: {
    secret: AUTHORIZATION_JWT_SECRET,
    expiresIn: AUTHORIZATION_JWT_EXPIRES
  },

  mailchimp: {
    apiKey: MANDRILL_API_KEY,
    account: MANDRILL_SUB_ACCOUNT,
    sender: MAIL_SENDER,
    webhookKey: MANDRILL_WEBHOOK_KEY
  },

  emails: {
    biz: MAIL_BIZ,
    guestFaq: MAIL_GUEST_FAQ,
    cs: MAIL_BIZ_CS,
    payoutMonitor: MAIL_PAYOUT_MONITOR,
    partnership: MAIL_PARTNERSHIP
  },

  cors: {
    origin: (origin, callback) => {
      const origins = ORIGINS_WHITELIST ? ORIGINS_WHITELIST.split(',') : []
      const whitelist = [ADMIN_HOST, GUEST_HOST, ...origins]

      if (whitelist.includes(origin) || !origin) {
        return callback(null, true)
      }

      return callback(new Error(`Origin: "${origin}" Not allowed by CORS`))
    },
    credentials: true
  },

  cache: {
    prefix: CACHE_PREFIX,
    driver: CACHE_DRIVER,
    clients: {
      null: {},
      redis: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        db: REDIS_DB,
        password: REDIS_PASSWORD
      }
    }
  },

  slack: {
    info: DEVELOPMENT_INFO
  },

  jwtKeys: {
    public: fs.readFileSync('public.key'),
    private: fs.readFileSync('private.key')
  },

  google: {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    strategyName: 'google'
  },

  facebook: {
    clientID: FACEBOOK_CLIENT_ID,
    clientSecret: FACEBOOK_CLIENT_SECRET,
    strategyName: 'facebook'
  },

  time: getTimeFromString
}

function _createPostgresConnectionURI (options) {
  const uri = new URL('postgres://')
  uri.hostname = options.host
  uri.port = options.port
  uri.username = options.username
  uri.password = options.password
  uri.pathname = options.database

  return uri.href
}

function _loggerForPostgres (isProd) {
  if (!isProd) {
    return console.log
  }

  return false
}

/**
 *
 * @typedef {Object} Result
 * @property {number} seconds
 * @property {number} milliseconds
 */

/**
 *
 * @param {string} str time string
 * @returns {Result} object containing time in seconds and milliseconds
 */
function getTimeFromString (str) {
  const second = 1
  const minute = 60 * second
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day
  let num
  let type
  switch (true) {
    case str.includes('s'):
      num = str.split('s')[0]
      type = second
      break
    case str.includes('m'):
      num = str.split('m')[0]
      if (str.includes('o')) {
        type = month
      } else {
        type = minute
      }
      break
    case str.includes('h'):
      num = str.split('h')[0]
      type = hour
      break
    case str.includes('d'):
      num = str.split('d')[0]
      type = day
      break
    case str.includes('w'):
      num = str.split('w')[0]
      type = week
      break
    case str.includes('y'):
      num = str.split('y')[0]
      type = year
      break

    default:
      num = /(\d+)/.exec(str)[0]
      type = second
      break
  }
  const res = {
    seconds: num * type,
    milliseconds: num * type * 1000
  }
  return res
}
