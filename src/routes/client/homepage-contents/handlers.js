'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const models = require('@models')
const errors = require('@/src/classes/errors')
const { Cache, TTL_MS } = require('@/src/classes/cache')

const HomepageContents = models.homepageContents

/**
 * Fetches the single HomepageContents row and returns it
 * @param {Object} options - Options
 * @param {string} options.language - Language
 * @returns {Promise<Object>} HomepageContents details
 */
exports.get = async function get (options) {
  const id = 1
  const homepageContent = await Cache.remember(
    `homepage_find_pk_${id}`,
    TTL_MS.ONE_DAY,
    async () => {
      const result = await HomepageContents.findByPk(id)

      return result ? result.toJSON() : null
    }
  )

  if (!homepageContent) {
    throw errors.domain.EntityNotFound(id, {
      model: 'HomepageContent',
      property: 'id'
    })
  }

  return homepageContent
}
