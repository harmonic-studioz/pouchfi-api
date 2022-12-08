'use strict'

const { Router } = require('express')

const mail = require('./mail')

/**
 * Mount endpoints for `/webhooks`
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const webhooks = Router({
    strict: true,
    caseSensitive: true
  })

  mail(webhooks)

  router.use('/webhooks', webhooks)
}
