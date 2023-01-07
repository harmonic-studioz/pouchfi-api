'use strict'

const { Router } = require('express')

const search = require('./search')
const details = require('./details')
const handlers = require('./handlers')
const { withErrorHandler } = require('@/src/helpers')
const { normalLimiter } = require('@/src/middlewares')

/**
 * Mount endpoints for `/blogs`
 *
 * @param {Router} _router - Express Router
 */
module.exports = _router => {
  const router = Router({
    strict: true,
    caseSensitive: true
  })

  search(router)
  details(router)

  router.get('/tags/trending', normalLimiter, withErrorHandler(async (req, res) => {
    const tags = await handlers.getTrendingTags()

    res.json({
      ok: true,
      outlets: { tags }
    })
  }))

  router.get(
    '/tags/list',
    normalLimiter,
    withErrorHandler(async (req, res) => {
      const outlets = await handlers.listTags(req.query)

      res.json({
        ok: true,
        outlets
      })
    }))

  _router.use('/blogs', router)
}
