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
  const Role = sequelize.define('roles', {
    // role name
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // role code
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    // type of role
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'NATIVE'
    },
    // flag to determin if role is active
    inactive: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    // role level. would be used to compare roles.
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: '333'
    }
  }, {
    tableName: 'roles',
    paranoid: true
  })

  Role.associate = function associate (models) {
    Role.hasMany(models.users, {
      foreignKey: 'roleCode',
      sourceKey: 'code',
      as: 'users'
    })
  }

  return Role
}
