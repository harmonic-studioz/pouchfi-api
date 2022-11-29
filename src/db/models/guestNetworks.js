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
  const guestNetworks = sequelize.define('userNetworks', {
    id: {
      primaryKey: true,
      type: DataTypes.INTEGER,
      autoIncrement: true,
      unique: true
    },
    // guest uid
    guestUid: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'guests',
        key: 'uid'
      }
    },
    // network id
    networkId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'networks',
        key: 'id'
      }
    }
  }, {
    tableName: 'guestNetworks'
  })

  return guestNetworks
}
