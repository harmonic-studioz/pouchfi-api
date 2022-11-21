'use strict'

const { Router } = require('express')

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

  router.use('/webhooks', webhooks)
}
