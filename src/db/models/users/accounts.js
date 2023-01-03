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
  const Account = sequelize.define('accounts', {
    // row id
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // user ID
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: {
          tableName: 'users',
          schema: 'public'
        },
        key: 'uid'
      }
    },
    // inactive flag
    inactive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    // user role code
    accountCode: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'types',
        key: 'code'
      }
    },
    // crypto address or account number
    address: DataTypes.STRING,
    // encrypted eth account
    account: DataTypes.TEXT,
    // used to track some things
    history: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    // flag to determine if it is the current account user is on
    current: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    // amount user has
    balance: DataTypes.DECIMAL,
    // network ID
    networkId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'networks',
          schema: 'public'
        },
        key: 'id'
      }
    }
  }, {
    schema: 'users',
    freezeTableName: true,
    defaultScope: {
      attributes: {
        exclude: [
          'inactive',
          'deletedAt',
          'account',
          'networkId'
        ]
      }
    }
  })

  // associations
  Account.associate = function associate (models) {
    Account.belongsTo(models.accounts.relations.types, {
      foreignKey: 'accountCode',
      as: 'type'
    })

    Account.belongsTo(models.users, {
      foreignKey: 'userId',
      as: 'user'
    })

    Account.belongsTo(models.networks, {
      foreignKey: 'networkId',
      as: 'network'
    })

    Account.addScope('list', {
      include: [{
        model: models.accounts.relations.types,
        as: 'types',
        attributes: ['name', 'code', 'type']
      }]
    })

    Account.addScope('role', {
      include: [{
        model: models.accounts.relations.types,
        as: 'types',
        attributes: ['name', 'code', 'type', 'level']
      }]
    })
  }

  return Account
}
