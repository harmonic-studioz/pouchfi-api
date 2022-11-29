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
  const homepageContents = sequelize.define('homepageContents', {
    id: {
      primaryKey: true,
      type: DataTypes.INTEGER,
      autoIncrement: true
    },
    content: {
      type: DataTypes.BLOB,
      allowNull: true,
      get () {
        return this.getDataValue('content').toString('utf8')
      }
    },
    testimonials: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  }, {
    tableName: 'homepageContents',
    paranoid: true
  }
  )

  return homepageContents
}
