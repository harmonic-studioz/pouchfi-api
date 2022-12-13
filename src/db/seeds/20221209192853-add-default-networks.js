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
    await queryInterface.bulkInsert('networks', prepare())
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
    await queryInterface.bulkDelete('networks')
  }
}

function prepare () {
  const networks = [
    {
      id: 1,
      name: 'Binance',
      symbol: 'BNB',
      rpc: 'https://bsc-dataseed.binance.org',
      rpcTest: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      api: 'https://api.bscscan.com',
      blockExplorer: 'https://bscscan.com'
    },
    {
      id: 2,
      name: 'Fantom',
      symbol: 'FTM',
      rpc: 'https://rpc.ftm.tools/',
      api: 'https://api.ftmscan.com',
      blockExplorer: 'https://ftmscan.com/'
    }
  ]

  for (const network of networks) {
    network.createdAt = new Date()
    network.updatedAt = new Date()
  }

  return networks
}
