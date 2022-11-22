'use strict'

const { Router } = require('express')
const handler = require('./handlers.js')
const { withErrorHandler } = require('@/src/helpers/routes')

/**
 * Mount endpoints for `/cache`
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const cacheRouter = Router({
    strict: true,
    mergeParams: true,
    caseSenstitive: true
  })

  cacheRouter.get('/', handler.index)
  cacheRouter.delete('/', withErrorHandler(handler.flush))
  cacheRouter.delete('/:key', withErrorHandler(handler.find))
  cacheRouter.delete('/:key', withErrorHandler(handler.delete))

  router.use('/cache', cacheRouter)
}
