'use strict'

const { ACCOUNT_TYPES } = require('../../constants')

/**
 * @typedef {import ("sequelize").Sequelize} Sequelize
 * @typedef {import ("sequelize").QueryInterface} QueryInterface
 */
module.exports = {
  /**
   * @param {QueryInterface} queryInterface
   */
  up: async (queryInterface) => {
    await queryInterface.bulkInsert({
      tableName: 'types', schema: 'users'
    }, prepare())
  },

  /**
   * @param {QueryInterface} queryInterface
   */
  down: async (queryInterface) => {
    await queryInterface.bulkDelete({ tableName: 'types', schema: 'users' })
  }
}

function prepare () {
  const roles = [
    {
      name: 'Crypto Custodial',
      code: ACCOUNT_TYPES.CRYPTO_CUSTODIAL,
      type: 'NATIVE',
      inactive: false,
      level: 999
    },
    {
      name: 'Cypto Imported',
      code: ACCOUNT_TYPES.CRYPTO_IMPORTED,
      type: 'NATIVE',
      inactive: false,
      level: 777
    },
    {
      name: 'Fiat Normal',
      code: ACCOUNT_TYPES.FIAT_NORMAL,
      type: 'NATIVE',
      inactive: false,
      level: 333,
      limit: 200000
    },
    {
      name: 'Fiat KYC',
      code: ACCOUNT_TYPES.FIAT_KYC,
      type: 'NATIVE',
      inactive: false,
      level: 777,
      limit: 100000000
    }]

  for (const role of roles) {
    role.createdAt = new Date()
    role.updatedAt = new Date()
  }

  return roles
}
