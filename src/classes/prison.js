'use strict'

const { time } = require('@config')
const { redis } = require('@/src/helpers/redis')

/**
 * @typedef {import ("@/src/helpers/redis").redis} Redis
 *
 */

class Lock {
  /**
   * @param {Redis} redis - Redis instance
   * @param {string} key - The `key` where to store the new `info`
   * @param {Object} info - Information stored from the `key`
   * @param {boolean} info.lockedout - Indicated if item is locked out
   * @param {number} info.count - Indicates the number of failed tries
   * @param {boolean} info.extended - Indicates if the ttl for the item has been extended
   * @param {Object} options - Options
   * @param {number} options.ttl - ttl number for item
   * @param {number} options.limit - limit of bad tries before item is locked out
   */
  constructor (redis, key, info, options) {
    this.redis = redis
    this.key = key
    this.info = info
    this.options = options
  }

  get isLocked () {
    return false
  }

  async increment () {
    await this.redis.setex(this.key, this.options.ttl, JSON.stringify({
      count: 1,
      lockedout: false
    }))
  }

  async free () {
    // noop
  }
}

class WithInfoLock extends Lock {
  get isLocked () {
    return this.info.lockedout
  }

  /**
   * Sets the provided `data` as the value for the `key`
   *
   * @param {Object} data - Data to be stored
   */
  async _set (data) {
    await this.redis.set(this.key, JSON.stringify(data), 'KEEPTTL')
  }

  async increment (count = 1) {
    this.info.count += count

    if (this.info.count >= this.options.limit) {
      this.info.lockedout = true
    }

    await this._set(this.info)
  }

  /**
   * Extends the TTL
   *
   * @param {number} [factor=2] - Factor for the current TTL to be exnteded. Defaults to `2`
   * @returns {Promise<number>} The value of the extended TTL
   */
  async extend (factor = 2) {
    // if not extended then set extended falg and return ttl
    if (!this.info.extended) {
      this.info.extended = true
      await this._set(this.info)

      return this.options.ttl
    }

    const remainingTTL = await this.redis.ttl(this.key)
    const extendedTTL = remainingTTL * factor

    await this.redis.expire(this.key, extendedTTL)

    return extendedTTL
  }

  async free () {
    await redis.del(this.key)
  }
}

class Prison {
  /**
   * Creates a prison object
   * @param {object} options - Options
  * @param {number} options.limit - The number of attempt before the account is locked
  * @param {number} options.timeToExpireMS - The expiration time in milliseconds
   */
  constructor (options) {
    this.options = Object.assign({
      limit: 5,
      timeToExpireMS: time('1m').seconds
    }, options)
  }

  #buildKey (key) {
    return key + ':lockout'
  }

  /**
   * Retrieves a lock object
   *
   * @param {string} key - To be used as a look up value
   * @returns {Promise<Lock|WithInfoLock>} Lock object
   */
  async cell (key) {
    key = this.#buildKey(key)
    const info = JSON.parse(await redis.get(key))

    return !info
      ? new Lock(redis, key, null, this.options)
      : new WithInfoLock(redis, key, info, this.options)
  }

  /**
   * Frees up the stored value for the provided `key`
   *
   * @param {string} key - To be used as a look up value
   */
  async free (key) {
    key = this.#buildKey(key)

    await redis.del(key)
  }
}

module.exports = new Prison({
  limit: 10,
  timeToExpireMS: time('1h').seconds
})
module.exports.Lock = Lock
module.exports.WithInfoLock = WithInfoLock
