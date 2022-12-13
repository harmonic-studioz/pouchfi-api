'use strict'

const { Router } = require('express')

const handlers = require('./handlers')
const { metaHelper } = require('@/src/middlewares')
const { withErrorHandler } = require('@/src/helpers')

/**
 * Mount endpoints for email scripts
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const emails = Router({
    strict: true,
    caseSensitive: true
  })

  emails.get('/update', metaHelper(), withErrorHandler(async (req, res, next) => {
    const data = await handlers.updateUserEmail(req.query)

    res.locals.setData(data)
    next()
  }))

  router.use('/emails', emails)
}
