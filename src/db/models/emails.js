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
  const Emails = sequelize.define('mails', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      unique: true
    },
    // from email
    from: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // to email
    to: {
      type: DataTypes.ARRAY(DataTypes.JSON),
      allowNull: false
    },
    // response
    res: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true
    },
    // message
    message: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true
    },
    // error
    error: {
      type: DataTypes.JSONB,
      defaultValue: {},
      allowNull: true
    }
  }, {
    tableName: 'mails'
  })

  return Emails
}
