'use strict'

const cors = require('cors')
const { Router } = require('express')

const {
  notFound,
  okResponse,
  initializer,
  errorHandler
} = require('@/src/middlewares')
const config = require('@config')

// routes
const crons = require('./crons')
const cache = require('./cache')
const postman = require('./postman')
const webhooks = require('./webhooks')
const publicRouter = require('./public')

const router = Router({
  strict: true,
  caseSensitive: true
})

router
  .use(cors())
  .use(initializer({ version: `Internal - v${config.version}` }))

crons(router)
cache(router)
postman(router)
webhooks(router)
publicRouter(router)

router
  .use(notFound('Internal'))
  .use(okResponse)
  .use(errorHandler)

module.exports = router
