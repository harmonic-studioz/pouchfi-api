'use strict'

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
  const Refund = sequelize.define('refunds', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    // transaction ID
    transactionId: {
      type: DataTypes.STRING,
      references: {
        model: 'transactions',
        key: 'id'
      }
    },
    // amount to be refunded
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    }
  }, {
    paranoid: true
  })

  Refund.associate = function associate (models) {
    Refund.belongsTo(models.transactions, {
      foreignKey: 'transactionId',
      targetKey: 'id',
      as: 'transaction'
    })
  }

  return Refund
}
