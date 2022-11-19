'use strict'

/**
 * Meta helper to fromat req information into locals.meta
 *
 * @param {Object } metadata value to return together to user.
 */
function metaHelper (metadata = {}) {
  return (req, res, next) => {
    /**
     * Prase source market req.query.sourceMarket -> global default
     */
    const sourceMarket =
      (req.query.sourceMarket && req.query.sourceMarket.toUpperCase()) || 'US'
    /**
     * Prase currency -> req.query.currency -> global default
     */
    const currency = req.query.currency || 'USD'
    /**
     * Prase locale -> req.query.locale -> global default
     */
    const locale =
      (req.query.locale && req.query.locale.toLowerCase()) || 'en-us'

    res.locals.meta = {
      ...res.locals.meta,
      ...metadata,
      sourceMarket,
      currency,
      locale
    }
    res.locals.meta.path = req.route.path
    /**
     * Expose the requestId to front-end, so we can show it when error ocured
     */
    res.locals.meta.reqId = req.id

    next()
  }
}

module.exports = metaHelper
module.exports.metaHelper = metaHelper
