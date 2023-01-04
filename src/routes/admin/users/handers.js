'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')

const Users = db.users

/**
 * Returns a list of users
 * @param {object} query request query object
 * @param {number} query.limit limit of results to get
 * @param {number} query.page result page to get
 * @param {string} query.order order to sort results by 'DESC' or 'ASC'
 * @param {string} query.sortBy field to use to sort
 * @param {string} query.search search string
 * @param {string} query.language language string
 * @param {string|number} query.id user id pattern
 * @param {string} query.searchDateBy search by field e.g. 'createdAt'
 * @param {array} query.searchDateRange date range
 * @param {string} query.status any field to search by e.g. waitlist
 * @param {any} query.statusResult value the status field should be e.g. true
 * @returns {Promise<object>}
 */
exports.list = async function list (query) {
  const users = await Users.List(query, false)

  return users
}
