'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { ApiError } = require('@/src/classes/errors')

const Networks = db.networks

/**
 * Add a network
 * @param {object} body request object
 * @param {string} body.name network name
 * @param {string} body.symbol network symbol
 * @param {string} body.rpc network rpc
 * @param {string} body.rpcTest network test rpc
 * @param {string} body.api network api url
 * @param {string} body.blockExplorer network blocl explorer
 */
exports.addNetwork = async function addNetwork (body) {
  const newNetwork = await Networks.create(body)
  if (!newNetwork) {
    throw new ApiError(400, 'invalid_request_error', 'network_error', 'New network could not be added to the database')
  }

  return newNetwork
}

/**
 * Get all networks
 * @param {object} options request query object
 * @param {boolean} options.includeTokens flag to indicate if to return token details
 * @returns {Promise<object[]>}
 */
exports.getNetworks = async function getNetworks (options) {
  const includeTokens = typeof options.includeTokens === 'boolean' ? options.includeTokens : options.includeTokens === 'true'
  let networks
  if (includeTokens) {
    networks = await Networks.scope('tokens').findAll()
  } else {
    networks = await Networks.findAll()
  }

  return networks
}

/**
 * Get details of a network
 * @param {object} options request query object
 * @param {number} options.networkId network id
 * @param {boolean} options.includeTokens flag to indicate if to return token details
 * @returns {Promise<object>}
 */
exports.getNetwork = async function getNetworks (options) {
  const includeTokens = typeof options.includeTokens === 'boolean' ? options.includeTokens : options.includeTokens === 'true'
  let network
  if (includeTokens) {
    network = await Networks.scope('tokens').findByPk(options.networkId)
  } else {
    network = await Networks.findByPk(options.networkId)
  }

  return network
}
