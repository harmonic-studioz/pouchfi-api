'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const Cache = require('@/src/classes/cache')
const { api } = require('@/src/classes/errors')

const HomepageContents = db.homepageContents

/**
 * Get homepage contents
 */
exports.get = async function get () {
  const outlets = {
    details: undefined
  }

  const id = 1
  const homepageContents = await HomepageContents.findByPk(id)
  if (!homepageContents) {
    throw api.notFound(`ID: ${id} not found`)
  }

  const jsonHomepageContent = homepageContents.toJSON()
  outlets.details = jsonHomepageContent

  return { outlets }
}

/**
 * Update home pae content
 * @param {object} body updated homepage content
 * @returns {object} updated home page content
 */
exports.update = async function update (body) {
  const outlets = {
    details: undefined
  }

  const id = 1
  const homepageContent = await HomepageContents.findByPk(id)
  if (!homepageContent) {
    throw api.notFound(`ID: ${id} not found`)
  }

  await homepageContent.update(body)
  await Cache.forgetByPattern('*homepage_*')

  outlets.details = homepageContent.toJSON()

  return { outlets }
}
