'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

const { DateTime } = require('luxon')
/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { Sequelize: { Op } } = require('@models')

const Tags = db.tags

exports.testCron = function testCron () {
  return 'cron works'
}

exports.resetTrendingTags = async function resetTrendingTags () {
  const tags = await Tags.update({
    trendingCount: 0
  }, {
    where: {
      lastUsedAt: {
        [Op.lte]: DateTime.now().minus({ week: 2 }).toFormat('yyyy-MM-dd HH:mm:ss.SSSZ')
      }
    },
    hooks: false
  })

  return tags
}
