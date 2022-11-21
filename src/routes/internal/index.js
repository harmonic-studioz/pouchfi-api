'use strict'

const cors = require('cors')
const { Router } = require('express')

const { errorHandler } = require('@/src/middlewares')

// routes
const webhooks = require('./webhooks')

const router = Router({
  strict: true,
  caseSensitive: true
})

router.use(cors())

webhooks(router)

router.use(errorHandler)

module.exports = router
