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
  const Network = sequelize.define('networks', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // name of netwwork
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    // network symbol
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    // network rpc
    rpc: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isUrl: true
      }
    },
    // network test rpc
    rpc_test: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        isUrl: true
      }
    }
  }, {
    tableName: 'networks',
    defaultScope: {
      attributes: {
        exclude: ['rpc_test', 'createdAt', 'updatedAt']
      }
    }
  })

  Network.associate = function associate (models) {
    Network.hasMany(models.tokens, {
      foreignKey: 'networkId',
      sourceKey: 'id',
      as: 'tokens'
    })

    Network.belongsToMany(models.guests, {
      through: 'guestNetworks',
      onDelete: 'CASCADE',
      as: 'users',
      foreignKey: 'networkId'
    })
  }

  return Network
}
