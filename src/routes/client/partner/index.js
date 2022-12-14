'use strict'

const { Router } = require('express')
const multer = require('multer')

const handlers = require('./handlers')
const errors = require('@/src/classes/errors')
const { withErrorHandler } = require('@/src/helpers')
const { normalLimiter, PublicFileMiddleware } = require('@/src/middlewares')

/**
 * Mount endpoints for `/partner`
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const partnerRouter = Router({
    strict: true,
    caseSensitive: true
  })

  partnerRouter.post(
    '/email',
    normalLimiter,
    (req, res, next) => {
      PublicFileMiddleware.fields([{ name: 'files', maxCount: 3 }])(req, res, async (err) => {
        try {
          if (err instanceof multer.MulterError) {
            throw errors.api.badRequest(err.message)
          } else if (err) {
            throw errors.api.badRequest(err.toString())
          } else {
            next()
          }
        } catch (err) {
          next(err)
        }
      })
    },
    withErrorHandler(async (req, res) => {
      const options = {
        ...req.body,
        files: req.files.files
      }
      const data = await handlers.sendPartnerEmail(options)
      res.status(200).json(data)
    })
  )

  router.use('/partner', partnerRouter)
}
