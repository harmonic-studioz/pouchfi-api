'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 *
 */

const handler = require('./handlers')
const { withErrorHandler } = require('@/src/helpers')

module.exports = router => {
  router.get('/', withErrorHandler(get))

  /**
   * Fetches homepage contents row
   * @param {Request} req request object
   * @param {Response} res response object
   */
  async function get (req, res) {
    const homepageContent = await handler.get({ language: req.query.language })

    res.send({
      ok: true,
      outlets: { homepageContent }
    })
  }
}
