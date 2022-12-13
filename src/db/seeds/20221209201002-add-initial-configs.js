'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /**
   * @typedef {import ("sequelize").Sequelize} Sequelize
   * @typedef {import ("sequelize").QueryInterface} QueryInterface
   */

  /**
   * @param {QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('configs', prepare())
  },

  /**
   * @typedef {import ("sequelize").Sequelize} Sequelize
   * @typedef {import ("sequelize").QueryInterface} QueryInterface
   */

  /**
   * @param {QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('configs')
  }
}

function prepare () {
  const configs = [
    // flag to indicate if users can buy tokens
    {
      name: 'canBuy',
      value: 'false'
    },
    // would be used to encrypt users wallets
    {
      name: 'walletEncryptionKey',
      value: '$2b$13$WxWRgKyUCHSfxxLEjPe7uOaqylUyUYaoRZHjRuTk.YXmGUVSCgPJS'
    }
  ]

  for (const config of configs) {
    config.createdAt = new Date()
    config.updatedAt = new Date()
  }

  return configs
}
