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
  const Blogs = sequelize.define('blogs', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      unique: true,
      primaryKey: true
    },
    // tag name
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // emoji or svg associated with tag
    text: DataTypes.TEXT,
    // last time a blog used it
    link: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    }
  }, {
    tableName: 'blogs'
  })

  Blogs.associate = function associate (models) {
    Blogs.belongsToMany(models.blogs, {
      through: 'blogTags',
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
      as: 'tags',
      foreignKey: 'blogId'
    })
  }

  return Blogs
}
