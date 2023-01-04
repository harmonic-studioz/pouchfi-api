'use strict'

const { QueryTypes, Op } = require('sequelize')

/**
 * @typedef {import ("sequelize").Sequelize} Sequelize
 * @typedef {import ("sequelize").DataTypes} DataTypes
 *
 */

/**
 * Junction table of `experiences` and `categories`
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns
 */
module.exports = (sequelize, DataTypes) => {
  const Kind = sequelize.define('kinds', {
    blogId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'blogs',
        key: 'id'
      }
    },
    tagId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'tags',
        key: 'id'
      }
    }
  }, {
    timestamps: false
  })

  /**
   * List kinds from the provided `blogId`
   * @param {number} blogId - Blog ID
   * @returns {Promise<Object[]>}
   */
  Kind.listByBlogId = async function listByBlogId (blogId) {
    return sequelize.query(`
      SELECT
        tags.id,
        tags.level,
        tags."lastUsedAt",
        tags.tag,
        COALESCE(kinds."blogId"::boolean, false) AS selected
      FROM
        kinds
      RIGHT JOIN
        tags
        ON tag.id = kinds."tagId"
        AND kinds."blogId" = :blogId
      ORDER BY
        tags.is ASC
    `, {
      replacements: {
        blogId
      },
      type: QueryTypes.SELECT
    })
  }

  /**
   * Deletes tags from the provided `blogId`
   * @param {number} blogId - Blog ID
   * @param {number[]} tagIds - tag IDs to be deleted
   * @param {Object} [options] - Options
   * @param {Object} [options.transaction] - SQL Transaction
   * @returns {Promise<void>} Tags has been deleted
   */
  Kind.deleteByBlogId = async function deleteByBlogId (blogId, tagIds, options) {
    const where = {
      blogId
    }

    if (tagIds.length) {
      where.tagId = {
        [Op.in]: tagIds
      }
    }

    await this.destroy({
      where,
      transaction: options?.transaction
    })
  }

  return Kind
}
