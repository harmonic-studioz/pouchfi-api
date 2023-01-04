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
  const Tags = sequelize.define('tags', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      unique: true,
      primaryKey: true
    },
    // tag name
    tag: {
      type: DataTypes.STRING,
      allowNull: false,
      set (val) {
        const lowered = val ? val.toLowerCase() : ''
        this.setDataValue('tag', lowered)
      }
    },
    // emoji or svg associated with tag
    tagMoji: DataTypes.TEXT,
    // last time a blog used it
    lastUsedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW()
    },
    // number of blogs that have used it in the selected period. Would be reset after the selected period
    trendingCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    // total number of times the tag has been used
    totalCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    tableName: 'tags',
    defaultScope: {
      attributes: {
        exclude: [
          'tagMoji',
          'createdAt',
          'updatedAt',
          'totalCount',
          'trendingCount'
        ]
      }
    }
  })

  Tags.addHook('beforeUpdate', tag => {
    console.log({ tag })
    tag.setDataValue('lastUsedAt', Date.now())
  })

  Tags.associate = function associate (models) {
    Tags.belongsToMany(models.blogs, {
      through: models.kinds,
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
      as: 'blogs',
      foreignKey: 'tagId'
    })
  }

  return Tags
}
