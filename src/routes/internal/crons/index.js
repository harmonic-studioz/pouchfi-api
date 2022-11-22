'use strict'

const cron = require('node-cron')
const { Router } = require('express')

const handler = require('./handlers')
const errors = require('@/src/classes/errors')
const { withErrorHandler } = require('@/src/helpers')

/**
 * Mount endpoints for `/crons`
 * Call cron jobs either by using terminal crontab or use node-cron
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const cronRouter = Router({
    strict: true,
    mergeParams: true,
    caseSenstitive: true
  })

  cronRouter.use((req, _res, next) => {
    if (req.headers['x-appengine-cron'] || req.headers['x-cloudscheduler']) {
      next()

      return
    }

    next(errors.api.unauthorized('Invalid cron permission'))
  })

  /**
   * use crontab to set cron jobs e.g
   * 0 0 * * * curl --silent --request POST --url http://localhost:3005/__internal/crons/tokens/test-cron --header 'x-cloudscheduler: true'
   * down side is someone can trigger this if they know server URL and headers to send.
   */
  cronRouter.post(
    '/test-cron',
    withErrorHandler(async (_req, res) => {
      await handler.testCron()
      res.send({ ok: true })
    })
  )
  /**
   *  alternatively use node cron to set this (should be safer)
   */
  cron.schedule('0 0 * * *', handler.testCron(), { timezone: 'Africa/Lagos' })

  router.use('/crons', cronRouter)
}
