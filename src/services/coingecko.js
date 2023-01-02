'use strict'

const CoinGeckoClient = require('coingecko-api')

const config = require('@config')
const { Cache, TTL_MS } = require('@Cache')
const { FOREX } = require('@/src/constants')
const Forex = require('@/src/services/forex')
const { Logger } = require('@/src/helpers/logger')
const { ServiceError } = require('@/src/classes/errors')

const DEFAULT_MARKUP = config.openExchangeRates.commision || config.openExchangeRates.defaultCommision
const getTimeFromString = config.time
const moduleName = 'service_coingecko'
const logger = Logger('main', { serviceName: 'CoingeckoService' })
const TWO_MONTHS_AND_ONE_WEEK_IN_SECONDS = getTimeFromString('2mo').seconds + getTimeFromString('1w').seconds

const CoinGecko = new CoinGeckoClient()
exports.CoinGecko = CoinGecko

class CoinFactory {
  /**
   * Pretify response
   * @param {object} data data to be pretified
   */
  static pretify (data) {
    return {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      currentPrice: data.market_data.current_price.usd,
      images: data.image,
      priceChangePercentage:
        data.market_data.price_change_percentage_1h_in_currency.usd ||
        data.market_data.price_change_percentage_24h_in_currency.usd ||
        data.market_data.price_change_percentage_7d_in_currency.usd ||
        data.market_data.price_change_percentage_14d_in_currency.usd ||
        data.market_data.price_change_percentage_30d_in_currency.usd ||
        data.market_data.price_change_percentage_60d_in_currency.usd ||
        data.market_data.price_change_percentage_200d_in_currency.usd ||
        data.market_data.price_change_percentage_1y_in_currency.usd
    }
  }

  /**
   * Get price details of a coin
   * @param {string} coin coin ID
   * @returns {Promise<object>}
   */
  static async getPrice (coin) {
    const time = process.hrtime()
    let diff

    try {
      const result = await CoinGecko.coins.fetch(coin, {
        tickers: false,
        community_data: false,
        developer_data: false,
        localization: false
      })

      if (!result.success) {
        throw new ServiceError(404, moduleName, 'fetch_error', result.message, {
          raw: result.data.error
        })
      }

      diff = process.hrtime(time)

      logger.info(moduleName, {
        elapse: `${diff[0]}sec ${diff[1] * 1e-6}ms`,
        time: diff
      })

      return CoinFactory.pretify(result.data)
    } catch (err) {
      if (err.type === 'FetchError') {
        throw new ServiceError(404, moduleName, 'fetch_error', err.message, {
          raw: err
        })
      }
      diff = process.hrtime(time)
      logger.error(moduleName, {
        elapse: `${diff[0]}sec ${diff[1] * 1e-6}ms`,
        time: diff,
        name: 'getPrice'
      })
      throw err
    }
  }

  /**
   * Get rates of a coin
   * @param {string} coin coin ID
   * @returns {Promise<object>} coin price data
   */
  static async getRates (coin) {
    const data = await Cache.get(coin)
    if (data) return data

    try {
      const coinPrice = await Cache.remember(
        coin,
        TTL_MS.TWO_MINUTES,
        () => CoinFactory.getPrice(coin)
      )
      Cache.put(`${coin}_backup`, coinPrice, TTL_MS.FIVE_MINUTES)

      return coinPrice
    } catch (err) {
      // In case of errors, retrieve from backup rates
      const backup = await Cache.get(`${coin}_backup`)
      if (backup !== null) return backup

      throw err
    }
  }

  /**
   * Get rates for multiple coins
   * @param {Array} coins array of coins to get price detail
   * @returns {Promise<Array>} Array of coin objects
   */
  static async getRatesBulk (coins) {
    const promises = []

    for (const coin of coins) {
      promises.push(CoinFactory.getRates.call(null, coin))
    }

    return Promise.all(promises)
  }

  /**
   * Get details of all coins available
   * @returns {Promise<Array>} list of coins
   */
  static async getCoinList () {
    let tokens = await Cache.get(FOREX.TOKEN_LIST)
    if (tokens) return tokens

    const time = process.hrtime()
    let diff

    try {
      tokens = await Cache.remember(
        FOREX.TOKEN_LIST,
        TTL_MS.TWO_MONTHS,
        async () => {
          const result = await CoinGecko.coins.list()
          return result.data
        }
      )
      Cache.put(
        FOREX.TOKEN_LIST_BACKUP,
        tokens,
        TWO_MONTHS_AND_ONE_WEEK_IN_SECONDS
      )

      diff = process.hrtime(time)
      logger.info(moduleName, {
        elapse: `${diff[0]}sec ${diff[1] * 1e-6}ms`,
        time: diff
      })

      return tokens
    } catch (err) {
      // In case of errors, retrieve from backup
      const backup = await Cache.get(FOREX.TOKEN_LIST_BACKUP)

      if (backup !== null) return backup

      if (err.type === 'FetchError') {
        throw new ServiceError(404, moduleName, 'fetch_error', err.message, {
          raw: err
        })
      }
      diff = process.hrtime(time)
      logger.error(moduleName, {
        elapse: `${diff[0]}sec ${diff[1] * 1e-6}ms`,
        time: diff,
        name: 'getCoinList'
      })
      throw err
    }
  }

  /**
   * Return coin ID
   * @param {string} symbol coin symbol
   * @returns {Promise<object>}
   */
  static async getCoinId (symbol) {
    const coinList = await CoinFactory.getCoinList()

    return coinList.find((coin) => coin.symbol.toLowerCase() === symbol.toLowerCase())
  }

  /**
   * Get token value in USD
   * @param {number} price the amount
   * @param {string} from from token
   * @param {string} to to currency
   * @param {number} markup factor to markup
   * @returns {number} Token value in USD
   */
  static async getTokenValueInCurrency (price, from, to, markup = DEFAULT_MARKUP) {
    try {
      const { id: tokenId } = await CoinFactory.getCoinId(from)
      const tokenPrice = await CoinFactory.getRates(tokenId)
      const tokenPriceInUsd = tokenPrice.currentPrice * price

      let value
      if (to.toUpperCase() === 'USD') {
        value = tokenPriceInUsd * markup
      } else {
        const rates = await Forex.getRates()
        value = Forex.convertWithMarkup(rates, {
          base: 'USD',
          target: to,
          price: tokenPriceInUsd,
          markup
        })
      }

      return value
    } catch (err) {
      logger.error(moduleName, err)
      throw err
    }
  }

  /**
   * Returns an array of token images
   * @param {string} symbol token symbol
   * @returns {Promise<Array>} Array of images
   */
  static async getTokenImage (symbol) {
    const data = await Cache.get(`${symbol}_images`)
    if (data) return data

    const { id: tokenId } = await CoinFactory.getCoinId(symbol)

    return Cache.rememberForever(
      `${symbol}_images`,
      async () => {
        const priceData = await CoinFactory.getRates(tokenId)
        return priceData.images
      }
    )
  }
}

exports.CoinFactory = CoinFactory
