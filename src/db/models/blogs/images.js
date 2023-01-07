'use strict'

/**
 * @typedef {import ("sequelize").Sequelize} Sequelize
 * @typedef {import ("sequelize").DataTypes} DataTypes
 *
 */

const { QueryTypes } = require('sequelize')

const { IMAGE_TYPE } = require('@/src/constants')

/**
 *
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns
 */
module.exports = (sequelize, DataTypes) => {
  const Images = sequelize.define('images', {
    id: {
      primaryKey: true,
      type: DataTypes.BIGINT,
      autoIncrement: true
    },
    blogId: {
      type: DataTypes.INTEGER,
      references: {
        model: {
          tableName: 'blogs',
          schema: 'public'
        },
        key: 'id'
      },
      allowNull: false
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM([
        IMAGE_TYPE.HERO,
        IMAGE_TYPE.THUMBNAIL,
        IMAGE_TYPE.GALLERY
      ]),
      allowNull: false
    },
    caption: {
      type: DataTypes.TEXT
    },
    source: {
      type: DataTypes.ENUM([
        'contentTeam',
        'pixta',
        'adobeStock',
        'shutterstock',
        'other'
      ]),
      defaultValue: 'contentTeam'
    },
    origin: {
      type: DataTypes.STRING,
      validate: {
        isUrl: true
      }
    },
    position: {
      type: DataTypes.INTEGER,
      validate: {
        min: 0
      }
    }
  }, {
    schema: 'blogs'
  })

  Images.associate = function associate (models) {
    Images.belongsTo(models.blogs, {
      foreignKey: 'blogId',
      as: 'blog'
    })
  }

  /**
   * List all blogs's images that is ordered by `position` in ascending order
   *
   * @param {number} blogId - Blog ID
   * @returns {Promise<Object[]>} List of blog's images
   */
  Images.listByBlogId = async function listByBlogId (blogId, options) {
    const opts = {}

    if (options?.fields) {
      options.fields.push('id')

      opts.attributes = options.fields
    }

    return this.findAll({
      attributes: opts.attributes,
      where: {
        blogId
      },
      order: [
        ['position']
      ],
      raw: true
    })
  }

  /**
   * Get's the next position available for an image
   *
   * @param {number} blogId - blog ID
   * @returns {Promise<number>} Next position for the image
   */
  Images.getNextPosition = async function getNextPosition (blogId) {
    const row = await sequelize.query(`
      SELECT MAX(position) AS position
      FROM blogs.images
      WHERE "blogId" = :blogId
      GROUP BY "blogId"
    `, {
      replacements: {
        blogId
      },
      plain: true,
      type: QueryTypes.SELECT
    })

    if (!row) return 0

    return row.position + 1
  }

  return Images
}
