'use strict'

const config = require('../../config')

const baseConfig = {
  url: config.postgres.url,
  dialect: 'postgres',
  seederStorage: 'sequelize',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: false
}

module.exports = {
  development: baseConfig,
  staging: baseConfig,
  production: Object.assign({
    pool: {
      max: 60,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      socketPath: config.postgres.host
    }
  }, baseConfig)
}
