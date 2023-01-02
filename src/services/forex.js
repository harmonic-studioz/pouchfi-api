'use strict'

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const config = require('@config')
const { Cache, TTL_MS } = require('@Cache')
const { FOREX } = require('@/src/constants')
const { Logger } = require('@/src/helpers/logger')
const { ServiceError } = require('@/src/classes/errors')
const fetchResponseHandler = require('@/src/services/helpers')

const getTimeFromString = config.time
const moduleName = 'service_forex_getforex'
const logger = Logger('main', { serviceName: 'ForexService' })
const TWENTY_FIVE_HOURS_IN_SECONDS = getTimeFromString('25h').seconds

/**
 * Cache forex and refresh it if it's expired
 */
class ForexFactory {
  static async getForex () {
    const path = '/rates/latest.json'
    const forexUrl = `${config.forex.baseURL}${path}`

    const time = process.hrtime()
    let diff
    const res = await fetch(forexUrl, {
      compress: true,
      timeout: 60e3, // 60s timeout as default
      follow: 0,
      headers: {
        'content-type': 'application/json'
      }
    }).catch(err => {
      if (err.type === 'FetchError') {
        throw new ServiceError(404, moduleName, 'fetch_error', err.message, { raw: err })
      }
      diff = process.hrtime(time)
      logger.error(moduleName, {
        url: path,
        elapse: `${diff[0]}sec ${diff[1] * 1e-6}ms`,
        time: diff,
        host: config.forex.baseURL
      })
      throw err
    })

    diff = process.hrtime(time)
    logger.info(moduleName, {
      url: path,
      elapse: `${diff[0]}sec ${diff[1] * 1e-6}ms`,
      time: diff,
      host: config.forex.baseURL
    })

    return fetchResponseHandler(res, moduleName)
  }

  /**
   * Retrieves forex rates
   * @param {string} [reqId] - Request Id
   * @returns {Promise<Object>} - Forex rates
   */
  static async getRates () {
    let data = await Cache.get(FOREX.RATES)
    if (data) {
      data = JSON.parse(data)
      return data.rates
    }

    try {
      // store rates to cache
      const forexRates = await Cache.remember(
        FOREX.RATES,
        TTL_MS.ONE_DAY,
        () => ForexFactory.getForex()
      )
      Cache.put(FOREX.RATES_BACKUP, forexRates, TWENTY_FIVE_HOURS_IN_SECONDS)

      return forexRates.rates
    } catch (err) {
      // in case of errors, retrieve from the backup rates
      let backup = await Cache.get(FOREX.RATES_BACKUP)
      if (backup) {
        backup = JSON.parse(backup)
        return backup.rates
      }

      throw err
    }
  }

  /**
   * Get conversion rate
   * @param baseCcy Base currency
   * @param targetCcy Target currency
   * @param forexMarkupPct Forex markup in perectage default to +0.02
   */
  static async forex (baseCcy = '', targetCcy = '', forexMarkupPct = 0.02) {
    const rates = await ForexFactory.getRates()

    return (
      (rates[targetCcy.toUpperCase()] * (1 + forexMarkupPct)) /
      rates[baseCcy.toUpperCase()]
    )
  }

  /**
   * Converts given currencies
   * @param {Object} rates - Rates
   * @param {Object} currency - Currencies
   * @param {string} currency.base - Base currency
   * @param {string} currency.target - Target currency
   * @param {number} currency.price - Price
   * @param {string} currency.markup - Markup
   * @param {number} markup - Forex markup
   * @returns {number} - Converted currencies
   */
  static convertWithMarkup (rates, currency) {
    const {
      base,
      price,
      target,
      markup = config.openExchangeRates.commision || config.openExchangeRates.defaultCommision
    } = currency

    return (price / rates[base]) * rates[target] * markup
  }

  /**
   * Use this to cache the forex
   */
  static middleware () {
    return async (req, _res, next) => {
      try {
        await ForexFactory.forex('USD', 'USD', undefined)
      } catch (err) {
        next(err)
      }
    }
  }
}

module.exports = ForexFactory
