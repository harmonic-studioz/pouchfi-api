'use strict'

const Redis = require('ioredis')

const config = require('@config')
const Logger = require('./logger')

const logger = Logger('Redis')

const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
  reconnectOnError (err) {
    logger.error('Redis error occurs. Reconnect to redis', err)

    return err.message.includes('READONLY')
  }
})

redis.on('error', err => {
  logger.error('Unable to connect to redis', err)
})

redis.on('connect', () => {
  logger.info('Redis Connection has been established successfully.')
})

module.exports = redis
module.exports.redis = redis
