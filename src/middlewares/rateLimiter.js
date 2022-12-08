'use strict'

const { Duration, DateTime } = require('luxon')
const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible')

const Cache = require('@Cache')

const options = {
  points: 10, // Maximum number of points can be consumed over duration
  duration: 1, // Number of seconds before consumed points are reset
  blockDuration: 60 // Block for N seconds, if consumed more than points
}

const defaultLimiter = new RateLimiterMemory(options)
let rateLimiter = defaultLimiter
Cache.on('ready', () => {
  rateLimiter = new RateLimiterRedis({ ...options, storeClient: Cache.getClient() })
})
Cache.on('error', () => {
  rateLimiter = defaultLimiter
})
exports.rateLimiter = rateLimiter

const limiter = (points, duration) => (req, res, next) => {
  try {
    /**
     *
     * RateLimiterRes = {
        msBeforeNext: 250, // Number of milliseconds before next action can be done
        remainingPoints: 0, // Number of remaining points in current duration
        consumedPoints: 5, // Number of consumed points in current duration
        isFirstInDuration: false, // action is first in current duration
      }
     */
    rateLimiter.points = points || options.points
    rateLimiter.duration = duration || options.duration
    rateLimiter.consume(`${req.ip}_${req.path}`).then((rateLimiterRes) => {
      res.setHeader('Retry-After', rateLimiterRes.msBeforeNext / 1000)
      res.setHeader('X-RateLimit-Limit', points)
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints)
      res.setHeader(
        'X-RateLimit-Reset',
        Duration.fromMillis(DateTime.now().toMillis() + rateLimiterRes.msBeforeNext).toHuman()
      )
      next()
    }).catch((rateLimiterRes) => {
      res.setHeader('Retry-After', rateLimiterRes.msBeforeNext / 1000)
      res.setHeader('X-RateLimit-Limit', points)
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints)
      res.setHeader(
        'X-RateLimit-Reset',
        Duration.fromMillis(DateTime.now().toMillis() + rateLimiterRes.msBeforeNext).toHuman()
      )
      res.status(429).send({
        error: {
          status: 429,
          type: 'rate_limit_error',
          code: 'normal_limit',
          message: 'Too many requests'
        }
      })
    })
  } catch (err) {
    next(err)
  }
}

exports.secureLimiter = limiter(30, 15 * 60) // limit each Ip to 30 reequests per windowMs
exports.normalLimiter = limiter(1000, 10 * 60) // limit each Ip to 1000 reequests per windowMs
