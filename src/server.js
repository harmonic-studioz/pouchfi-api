'use strict'

const App = require('./app')
const config = require('@config')
const { sq } = require('./db/models')
const { Logger, redis } = require('./helpers')

const logger = Logger('server')

async function runServer () {
  const app = await App(config)
  const port = config.service.port

  /**
   * Start App
   */
  app.listen(port, async () => {
    logger.info(`server is listening port ${port}`)

    if (config.isDev && process.env.TUNNEL) {
      const localtunnel = require('localtunnel')

      const tunnel = await localtunnel(port)
      config.service.host = tunnel.url
    }
  })

  /**
   * Force shutdown
   */
  process.on('message', async msg => {
    if (msg === 'shutdown') {
      await sq.close()

      await redis.quit()

      setTimeout(() => {
        logger.info('Finished closing connections by message.shutdown')
        process.exit(0)
      }, 1500)
    }
  })

  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server')

    app.close(() => {
      logger.info('HTTP server closed')
    })
  })

  process.on('uncaughtException', err => {
    logger.error('Uncaught Exception', err)
  })
}

runServer()
