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
  const userNetworks = sequelize.define('userNetworks', {
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
        model: 'users',
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
    },
    // flag to determine if it is the current network user is on
    current: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'userNetworks'
  })

  return userNetworks
}
