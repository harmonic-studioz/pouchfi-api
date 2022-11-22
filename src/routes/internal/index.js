'use strict'

const cors = require('cors')
const { Router } = require('express')

const { errorHandler } = require('@/src/middlewares')

// routes
const crons = require('./crons')
const cache = require('./cache')
const webhooks = require('./webhooks')

const router = Router({
  strict: true,
  caseSensitive: true
})

router.use(cors())

crons(router)
cache(router)
webhooks(router)

router.use(errorHandler)

module.exports = router
