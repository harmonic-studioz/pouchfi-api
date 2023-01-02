'use strict'

const Ajv = require('ajv')
const ajvFormats = require('ajv-formats')

const { api } = require('@/src/classes/errors')

const transactionsAJV = new Ajv()
ajvFormats(transactionsAJV)

/**
 * @typedef {import ("sequelize").Sequelize} Sequelize
 * @typedef {import ("sequelize").DataTypes} DataTypes
 *
 */

/**
 *
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns
 */
module.exports = (sequelize, DataTypes) => {
  const Transactions = sequelize.define('transactions', {
    id: {
      primaryKey: true,
      type: DataTypes.STRING
    },
    // id of the user initiating transaction
    userId: {
      type: DataTypes.STRING,
      references: {
        model: 'users',
        key: 'uid'
      },
      allowNull: false
    },
    // amount being sent
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    // currency or token symbol e.g. NGN or BNB
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false
    },
    // transaction status
    status: {
      type: DataTypes.ENUM,
      values: [
        'pending',
        'captured',
        'partially_refunded',
        'refunded'
      ],
      defaultValue: 'pending'
    },
    // payment gateway used
    gateway: {
      type: DataTypes.ENUM,
      values: [
        'paymentStep',
        'crypto'
      ],
      allowNull: false,
      defaultValue: 'crypto'
    },
    // payment method e.g. card
    paymentMethodCode: {
      type: DataTypes.STRING
    },
    // wallet address of sender
    senderAddress: DataTypes.STRING(100),
    // wallet address of receiver
    receiverAddress: DataTypes.STRING(100),
    // type of transaction
    type: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    transactionHash: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'transactions',
    paranoid: true,
    defaultScope: {
      attributes: {
        exclude: [
          'userId',
          'deletedAt'
        ]
      }
    }
  })

  Transactions.associate = function associate (models) {
    Transactions.belongsTo(models.users, {
      foreignKey: 'userId',
      targetKey: 'uid',
      as: 'guest'
    })

    Transactions.hasMany(models.refunds, {
      targetKey: 'transactionId',
      as: 'refunds'
    })
  }

  /**
   * Retrieves a transaction from the provided `transactionId`
   * @param {string} transactionId - Transaction ID
   * @param {Object} [options] - Options
   * @param {boolean} [options.raw=false] - Flag whether to return query as plain object
   * @param {string[]} [options.fields] - Fields to return from query
   * @returns {Promise<Object>} Transaction details
   */
  Transactions.findById = async function findById (transactionId, options) {
    const opts = {
      raw: options?.raw ?? false
    }

    if (options?.fields) {
      options.fields.push('id')
      opts.attributes = options.fields
    }

    return this.findByPk(transactionId, opts)
  }

  /**
   * Create a new transaction
   * @param {object} opts transaction oprions
   * @returns {Promise<object>} transaction details
   */
  Transactions.register = async function register (opts) {
    const tnValidate = transactionsAJV.compile({
      type: 'object',
      required: [
        'userId',
        'type',
        'currency',
        'transactionHash',
        'amount'
      ],
      properties: {
        userId: { type: 'string' },
        type: { type: 'string' },
        currency: { type: 'string' },
        transactionHash: { type: 'string' },
        amount: { type: 'number' },
        status: { type: 'string', enum: ['pending', 'captured', 'partially_refunded', 'refunded'] }
      }
    })

    const isValid = tnValidate(opts)
    if (!isValid) {
      const error = tnValidate.errors[0]
      return api.unprocessableEntity(error.message)
    }

    const transaction = await Transactions.create(opts)
    return transaction
  }

  return Transactions
}
