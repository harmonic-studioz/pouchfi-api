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
  const Type = sequelize.define('types', {
    // type name
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // type code
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    // type of account type
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'NATIVE'
    },
    // flag to determin if type is active
    inactive: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    // type level. would be used to compare types.
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: '333'
    },
    // account type limit
    limit: DataTypes.DECIMAL
  }, {
    schema: 'users',
    tableName: 'types',
    paranoid: true
  })

  Type.associate = function associate (models) {
    Type.hasMany(models.accounts, {
      foreignKey: 'accountCode',
      sourceKey: 'code',
      as: 'accounts'
    })
  }

  return Type
}
