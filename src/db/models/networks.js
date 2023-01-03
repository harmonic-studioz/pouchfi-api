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
    rpcTest: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    // api
    api: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    // block explorer
    blockExplorer: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    }
  }, {
    tableName: 'networks',
    schema: 'public',
    defaultScope: {
      attributes: {
        exclude: ['rpcTest', 'blockExplorer', 'api', 'createdAt', 'updatedAt']
      }
    }
  })

  Network.associate = function associate (models) {
    Network.hasMany(models.tokens, {
      foreignKey: 'networkId',
      sourceKey: 'id',
      as: 'tokens'
    })

    Network.belongsToMany(models.users, {
      through: 'userNetworks',
      onDelete: 'CASCADE',
      as: 'users',
      foreignKey: 'networkId'
    })

    Network.hasMany(models.accounts, {
      foreignKey: 'networkId',
      sourceKey: 'id',
      as: 'accounts'
    })

    Network.addScope('tokens', {
      include: [{
        model: models.tokens,
        as: 'tokens',
        attributes: ['id', 'name', 'symbol', 'address']
      }]
    })
  }

  return Network
}
