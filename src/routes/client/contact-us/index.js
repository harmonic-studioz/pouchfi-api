'use strict'

const { Router } = require('express')

const handlers = require('./handlers')
const { withErrorHandler } = require('@/src/helpers')
const { normalLimiter } = require('@/src/middlewares')

/**
 * Mount endpoints for `/partner`
 *
 * @param {Router} _router - Express Router
 */
module.exports = _router => {
  const router = Router({
    strict: true,
    caseSensitive: true
  })

  router.post(
    '/email',
    normalLimiter,
    withErrorHandler(async (req, res) => {
      const data = await handlers.sendContactUsEmail(req.body)
      res.status(200).json(data)
    })
  )

  _router.use('/contact-us', router)
}
