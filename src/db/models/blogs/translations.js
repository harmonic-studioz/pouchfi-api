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
  const Translations = sequelize.define('translations', {
    id: {
      primaryKey: true,
      type: DataTypes.BIGINT,
      autoIncrement: true
    },
    // blog ID
    blogId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: sequelize.models.blogs
      }
    },
    // blog languages
    language: {
      type: DataTypes.ENUM([
        'en',
        'ja',
        'zh_hans',
        'zh_hant'
      ]),
      allowNull: false
    },
    // blog title
    title: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // blog content
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    schema: 'blogs',
    freezeTableName: true,
    defaultScope: {
      attributes: {
        exclude: [
          'id',
          'createdAt',
          'updatedAt'
        ]
      }
    }
  })

  Translations.associate = function associate (models) {
    Translations.belongsTo(models.blogs, {
      foreignKey: 'blogId',
      as: 'blog'
    })
  }

  Translations.findMatchingBlog = async function findMatchingBlog (id) {
    return await sequelize.query(`
      SELECT
        translations."blogId"
      FROM
        blogs.translations
      WHERE
        translations.id = :id
    `, {
      plain: true,
      replacements: { id },
      type: sequelize.QueryTypes.SELECT
    })
  }

  return Translations
}
