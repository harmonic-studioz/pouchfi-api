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
  const Token = sequelize.define('tokens', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // name of token
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    // token symbol
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    // token address
    address: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    // token abi
    abi: DataTypes.TEXT
  }, {
    schema: 'networks',
    paranoid: true
  })

  Token.associate = function associate (models) {
    Token.belongsTo(models.networks, {
      as: 'network',
      foreignKey: 'networkId',
      targetKey: 'id',
      onDelete: 'SET NULL'
    })
  }

  return Token
}
