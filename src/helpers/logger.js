'use strict'

/**
 * Logger class for global usage
 */

const winston = require('winston')

const config = require('@config')

/**
 * Winston wrapper
 * @param {string} serviceName
 * @param {string} moduleName
 * @type {winston.Logger}
 */
module.exports.Logger = (moduleName = '', opt = {}) => {
  const serviceName = config.service.name

  const metaInfo = {
    serviceContext: {
      service: serviceName,
      version: config.version
    },
    labels: {
      service: serviceName,
      module: moduleName,
      version: config.version
    },
    ...opt
  }

  const consoleOpt = {}

  if (config.isDev) {
    Object.assign(consoleOpt, {
      json: true,
      colorize: true,
      handleExceptions: true,
      humanReadableUnhandledException: true,
      format: winston.format.prettyPrint(),
      silent: process.argv.indexOf('--silent') >= 0
    })
  }

  const winstonConsole = new winston.transports.Console(consoleOpt)

  const logger = winston.createLogger({
    level: 'info',
    exitOnError: false,
    transports: [winstonConsole],
    defaultMeta: metaInfo
  })

  return logger
}
