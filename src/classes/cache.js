'use strict'

const crypto = require('crypto')
const { EventEmitter } = require('events')
const cacheManager = require('cache-manager')
const cacheManagerRedisStore = require('cache-manager-redis-store')

const { cache: config } = require('@config')

const TTL_MS = {
  ONE_MINUTE: 60 * 1,
  TWO_MINUTES: 60 * 2,
  FIVE_MINUTES: 60 * 5,
  ONE_HOUR: 60 * 60,
  ONE_DAY: 60 * 60 * 24 * 1,
  TWO_DAYS: 60 * 60 * 24 * 2,
  ONE_WEEK: 60 * 60 * 24 * 7,
  ONE_MONTH: 60 * 60 * 24 * 7 * 4,
  TWO_MONTHS: 60 * 60 * 24 * 7 * 2
}

/**
 * Since ES6 does not have interface class, we will
 * simulate an interface by extending this class for
 * specific implementation of cache client.
 */
class Client extends EventEmitter {
  /**
   * Client getter.
   *
   * @returns {Object}
   */
  getClient () {
    throw new Error('Not implemented.')
  }

  /**
   * Determine if the flag _closed is true.
   *
   * @returns {Boolean}
   */
  isClosed () {
    throw new Error('Not implemented.')
  }

  /**
   * Prefix getter.
   *
   * @returns {String}
   */
  getPrefix () {
    throw new Error('Not implemented.')
  }

  /**
   * Prefix getter.
   *
   * @param {String} prefix
   *
   * @returns {CacheClient}
   */
  setPrefix (_prefix) {
    return this
  }

  /**
   * Get a cached value based from the key provided.
   *
   * @param {String} key
   *
   * @returns {Promise<Object|String>}
   */
  get (_key) {
    throw new Error('Not implemented.')
  }

  /**
   * Put a value in the cache.
   *
   * @param {String} key
   * @param {String} value
   * @param {Number} ttl
   *
   * @returns {Promise<Boolean>}
   */
  put (_key, _value, _ttl = null) {
    throw new Error('Not implemented.')
  }

  /**
   * Return the ttl for a key
   *
   * @param {String} key
   *
   * @returns {Promise<Number>}
   */
  ttl (_key) {
    throw new Error('Not implemented.')
  }

  /**
   * Delete a cache.
   *
   * @param {String} key
   *
   * @returns {Promise<Boolean>}
   */
  forget (_key) {
    throw new Error('Not implemented.')
  }

  /**
   * Attempt to get an existing record from cache.
   * If it does not exist, the callback will be executed
   * and the result will be stored in the cache.
   *
   * @param {String} key
   * @param {Number} ttl
   * @param {Function} callback
   *
   * @returns {Promise<Object>}
   */
  remember (_key, _ttl, _callback) {
    throw new Error('Not implemented.')
  }

  /**
   * Like @remember() except it remembers forever <3
   *
   * @param {String} key
   * @param {Function} callback
   *
   * @returns {Promise<Object>}
   */
  rememberForever (_key, _callback) {
    throw new Error('Not implemented.')
  }

  /**
   * Flush the cache db.
   *
   * @returns {Promise<Boolean>}
   */
  flush () {
    throw new Error('Not implemented.')
  }

  /**
   * Quit the cache db.
   *
   * @returns {Boolean}
   */
  quit () {
    throw new Error('Not implemented.')
  }
}

class Null extends Client {
  /** @override */
  constructor () {
    super()
    this.emit('connect')
  }

  /** @inheritdoc */
  getClient () {
    return null
  }

  /** @inheritdoc */
  isClosed () {
    return false
  }

  /** @inheritdoc */
  getPrefix () {
    return ''
  }

  /** @inheritdoc */
  setPrefix (_prefix) {
    return this
  }

  /** @inheritdoc */
  get (_key) {
    return Promise.resolve(null)
  }

  /** @inheritdoc */
  put (_key, _value, _ttl = null) {
    return Promise.resolve(false)
  }

  /** @inheritdoc */
  ttl (_key) {
    return Promise.resolve(0)
  }

  /** @inheritdoc */
  getMany (..._keys) {
    return Promise.resolve(null)
  }

  /** @inheritdoc */
  putMany (_sets, _ttl = null) {
    return Promise.resolve(false)
  }

  /** @inheritdoc */
  forget (..._keys) {
    return Promise.resolve(true)
  }

  /** @inheritdoc */
  forgetByPattern (_pattern) {
    return Promise.resolve(true)
  }

  /** @inheritdoc */
  remember (key, ttl, callback) {
    return Promise.resolve(callback())
  }

  /** @inheritdoc */
  rememberForever (key, callback) {
    return this.remember(key, null, callback)
  }

  /** @inheritdoc */
  flush () {
    return Promise.resolve(true)
  }

  /** @inheritdoc */
  quit () {
    return Promise.resolve(true)
  }
}

class Redis extends Client {
  /**
   * Create Redis cache client instance.
   *
   * @param {string} prefix
   * @param {CacheConfig} options
   */
  constructor (prefix = '', options = { store: 'none' }) {
    super()
    this.prefix = prefix
    this.options = options
    this.client = this.create(options)
  }

  /** @inheritdoc */
  getClient () {
    if (!this.client) {
      this.client = this.create(this.options)
    }

    return this.client
  }

  /**
   * Create cache client.
   *
   * @private
   * @param {CacheConfig} options
   *
   * @returns
   */
  create (options) {
    const opts = {
      store: cacheManagerRedisStore,
      host: options.host,
      port: options.port,
      db: options.db
    }

    if (options.password) {
      opts.password = options.password
    }

    const cache = cacheManager.caching(opts)
    const client = cache.store.getClient()

    client.on('ready', () => {
      this.closed = false
      this.emit('ready')
    })

    client.on('connect', () => {
      this.emit('connect')
    })

    client.on('error', (error) => {
      const { code } = error

      if (code === 'ECONNREFUSED' || code === 'NR_CLOSED') {
        client.quit()
        this.closed = true
      }

      this.emit('error', error)
    })

    return cache
  }

  /** @inheritdoc */
  isClosed () {
    return Boolean(this.closed)
  }

  /** @inheritdoc */
  getPrefix () {
    return this.prefix
  }

  /** @inheritdoc */
  setPrefix (prefix = '') {
    this.prefix = prefix

    return this
  }

  /** @inheritdoc */
  get (key) {
    return new Promise((resolve, reject) => {
      this.getClient()
        .get(this.getPrefix() + key)
        .then((result) => {
          resolve(result)
        })
        .catch((error) => reject(error))
    })
  }

  /** @inheritdoc */
  getMany (...keys) {
    return new Promise((resolve, reject) => {
      const keysWithPrefix = keys.map((key) => this.getPrefix() + key)

      this.getClient()
        .mget(keysWithPrefix)
        .then((result) => resolve(result))
        .catch((error) => reject(error))
    })
  }

  /** @inheritdoc */
  put (key, value, ttl = null) {
    return new Promise((resolve, reject) => {
      this.getClient()
        .set(this.getPrefix() + key, value, { ttl })
        .then((result) => {
          if (result === 'OK') {
            return resolve(true)
          }

          return resolve(false)
        })
        .catch((error) => reject(error))
    })
  }

  /** @inheritdoc */
  ttl (key) {
    return new Promise((resolve, reject) => {
      this.getClient()
        .ttl(this.getPrefix() + key)
        .then((result) => resolve(result)
        )
        .catch(err => reject(err))
    })
  }

  /** @inheritdoc */
  putMany (sets, ttl = null) {
    return new Promise((resolve, reject) => {
      const values = this.setPrefixForPutMany(sets)

      this.getClient()
        .mset(...values, { ttl })
        .then(result => {
          const ok = result === 'OK' || 'OK' in result

          resolve(ok)
        })
        .catch(error => reject(error))
    })
  }

  /** @inheritdoc */
  forget (...keys) {
    return new Promise((resolve, reject) => {
      this.getClient()
        .del(...keys)
        .then(rows => resolve(rows > 0))
        .catch(error => reject(error))
    })
  }

  /** @inheritdoc */
  forgetByPattern (pattern = '*') {
    return new Promise((resolve, reject) => {
      this.getClient()
        .keys(pattern)
        .then((keys) => {
          if (!keys || keys.length === 0) {
            return resolve(true)
          }

          return this.forget(...keys)
        })
        .then(result => resolve(result))
        .catch(error => reject(error))
    })
  }

  /** @inheritdoc */
  remember (key, ttl, callback) {
    return new Promise((resolve, reject) => {
      this.getClient()
        .wrap(this.getPrefix() + key, callback, { ttl })
        .then(result => resolve(result))
        .catch(error => reject(error))
    })
  }

  /** @inheritdoc */
  rememberForever (key, callback) {
    return this.remember(key, null, callback)
  }

  /** @inheritdoc */
  flush () {
    return new Promise((resolve, reject) => {
      this.getClient()
        .reset()
        .then((result) => {
          if (result === 'OK') {
            return resolve(true)
          }

          return resolve(false)
        })
        .catch((error) => reject(error))
    })
  }

  /** @inheritdoc */
  quit () {
    return new Promise((resolve, reject) => {
      this.getClient()
        .store.getClient()
        .quit((err, response) => {
          if (err) {
            return reject(err)
          }

          return resolve(response === 'OK')
        })
    })
  }

  /**
   * Set prefix for the keys.
   *
   * @protected
   * @param {any[]} [sets=[]]
   *
   * @returns {Array}
   */
  setPrefixForPutMany (sets = []) {
    const newSet = []

    for (let i = 0; i < sets.length; i += 2) {
      const key = this.getPrefix() + sets[i]
      const value = sets[i + 1]

      newSet.push(...[key, value])
    }

    return newSet
  }
}

class Cache extends EventEmitter {
  /**
   * Create a cache instance
   */
  constructor () {
    super()
    this.drivers = {
      null: Null,
      redis: Redis
    }

    this.createdClients = {}
    this.create()
  }

  /**
   * Create an instance of a cache store.
   *
   * @private
   *
   * @returns {Client}
   */
  create () {
    const driver = config.driver || 'null'

    this.client = this.getInstance(driver)

    return this.client
  }

  /**
   * Attempt to get a cache of a created client,
   * otherwise instantiate a new one.
   *
   * @private
   * @param {string} driver
   *
   * @returns {Client}
   */
  getInstance (driver) {
    let instance = this.createdClients[driver]

    if (!instance) {
      const { prefix, clients } = config
      const Client = this.drivers[driver]

      instance = new Client(prefix, clients[driver])
      instance.on('error', (err) => this.emit('error', err))
      instance.on('connect', () => this.emit('connect'))

      this.createdClients[driver] = instance
    }

    return instance
  }

  /**
   * Client getter. This method will return
   * the current client instance if it's not closed.
   * Else, it will default to the Null client.
   *
   * Deleting the closed client will attempt to create a new
   * one with open connection, e.g. Redis.
   *
   * @returns {Client}
   */
  getClient () {
    const { driver } = config

    if (!this.client) {
      this.client = this.getInstance(driver)
    }

    if (this.client.isClosed()) {
      this.client = null
      delete this.createdClients[driver]

      return this.getInstance('null')
    }

    return this.client
  }

  /**
   * Set the current cache client.
   *
   * @param {Client|null} client
   *
   * @returns {Cache}
   */
  setClient (client) {
    this.client = client

    return this
  }

  /**
   * Generate a cache key from a given source.
   *
   * @param {*} [source='']
   *
   * @returns {String}
   */
  generateKey (source = '') {
    return crypto.createHash('md5').update(JSON.stringify(source)).digest('hex')
  }

  /**
   * Prefix getter.
   *
   * @returns {String}
   */
  getPrefix () {
    return this.getClient().getPrefix()
  }

  /**
   * Prefix setter.
   *
   * @param {String} prefix
   *
   * @returns {Client}
   */
  setPrefix (prefix) {
    return this.getClient().setPrefix(prefix)
  }

  /**
   * Get a cached value based from the key provided.
   *
   * @param {String} key
   *
   * @returns {Promise<any>}
   */
  get (key) {
    return this.getClient().get(key)
  }

  /**
   * Put a value in the cache.
   *
   * @param {String} key
   * @param {any} value
   * @param {Number|Null} ttl
   *
   * @returns {Promise<Boolean>}
   */
  put (key, value, ttl = null) {
    return this.getClient().put(key, value, ttl)
  }

  /**
   * Get multiple cache records.
   *
   * @param {...String[]} keys
   *
   * @returns {Promise<any[]>}
   */
  getMany (...keys) {
    return this.getClient().getMany(...keys)
  }

  /**
   * Multiple cache put.
   *
   * @param {any[]} sets
   * @param {(Number | Null)} [ttl=null]
   *
   * @returns {Promise<Boolean>}
   */
  putMany (sets, ttl = null) {
    return this.getClient().putMany(sets, ttl)
  }

  /**
   * Delete a cache.
   *
   * @param {...String[]} keys
   *
   * @returns {Promise<Boolean>}
   */
  forget (...keys) {
    return this.getClient().forget(...keys)
  }

  /**
   * Get ttl for a key.
   *
   * @param {String} key
   *
   * @returns {Promise<Number>}
   */
  ttl (key) {
    return this.getClient().ttl(key)
  }

  /**
   * Delete cache values by pattern.
   *
   * @param {string} [pattern='*']
   *
   * @returns {Promise<Boolean>}
   */
  forgetByPattern (pattern) {
    return this.getClient().forgetByPattern(pattern)
  }

  /**
   * Attempt to get an existing record from cache.
   * If it does not exist, the callback will be executed
   * and the result will be stored in the cache.
   *
   * @param {String} key
   * @param {Number} ttl
   * @param {Function} callback
   *
   * @returns {Promise<any>}
   */
  remember (key, ttl, callback) {
    return new Promise((resolve, reject) => {
      this.getClient()
        .remember(key, ttl, callback)
        .then((result) => resolve(result))
        .catch((error) => {
          if (!this.client || this.client.isClosed()) {
            return resolve(callback())
          }

          return reject(error)
        })
    })
  }

  /**
   * Like @remember() except it remembers forever <3
   *
   * @param {String} key
   * @param {Function} callback
   *
   * @returns {Promise<any>}
   */
  rememberForever (key, callback) {
    return this.getClient().rememberForever(key, callback)
  }

  /**
   * Flush the cache db.
   *
   * @returns {Promise<Boolean>}
   */
  flush () {
    return this.getClient().flush()
  }

  /**
   * Quit the cache client.
   *
   * @returns {Promise<Boolean>}
   */
  quit () {
    return this.getClient().flush()
  }
}

const CacheInstance = new Cache()

module.exports = CacheInstance
module.exports.TTL_MS = TTL_MS
module.exports.Cache = CacheInstance
module.exports.CacheClass = Cache
