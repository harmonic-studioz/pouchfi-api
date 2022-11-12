'use strict'

const http = require('http')
const cuid = require('cuid')
const helmet = require('helmet')
const express = require('express')
const compression = require('compression')

const { sq } = require('./db/models')
const { Logger, redis } = require('./helpers')
const loggerMiddleware = require('./middlewares/logger')

// routes

const logger = Logger('app')

// Enable KeepAlive to speed up HTTP requests to another microservices
http.globalAgent.keepAlive = true

function App (config) {
  sq
    .authenticate()
    .then(() => logger.info('Database Connection has been established successfully'))
    .catch(err => logger.error('Unable to connect to the database', err))

  try {
    const app = express()

    app
      .use(helmet())
      .use((req, _res, next) => {
        req.id = cuid()
        next()
      })
      .use((_req, res, next) => {
        res.locals.startEpoch = Date.now()
        next()
      })
      .use(compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            // don't compress responses with this request header
            return false
          }

          // fallback to standard filter function
          return compression.filter(req, res)
        }
      }))
      .use(express.urlencoded({ extended: true }))
      .use(express.json())

    /**
     * Inject logger into request.
     * Logger Middleware
     */
    app.use(loggerMiddleware)

    if (config.isDev) {
      app.use('/uploads', express.static('uploads'))
    }

    app.set('trust proxy', 1)

    app.get('/healthcheck', (req, res) => res.send())

    app.get('/_ah/stop', async (_req, res, _next) => {
      // wait for ongoing requests to finish and close Postgres connect
      await sq.close()
      logger.info('DB connection closed by SIGINT')

      // wait for ongoing requests to finish and close Redis connection
      await redis.quit()
      logger.info('Redis connection closed by SIGINT')

      res.send()
    })

    return app
  } catch (err) {
    logger.error('Unable to start server', err)
    throw err
  }
}

module.exports = App
