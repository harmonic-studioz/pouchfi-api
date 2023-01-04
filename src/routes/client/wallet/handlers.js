'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 * @typedef {import ("web3").default} Web3
*/

const { default: Web3 } = require('web3')

/**
 * @type {Object.<string, Model>}
*/
const db = require('@models')
const { CoinFactory } = require('@/src/services/coingecko')

const Users = db.Users
const Tokens = db.tokens

exports.getWalletBalance = async function getWalletBalance (user) {
  const uid = user.uid
  const { userAddress, network } = await Users.getUserCurrentNetwork(uid)
  const web3 = new Web3(network.rpc)
  const userTokens = network.tokens

  const [tokensData, networkTokenBalance] = await Promise.all([
    getOtherTokensBalance(userTokens, userAddress, uid, web3),
    getNetworkTokenBalance(userAddress, network.symbol, web3)
  ])

  return [
    networkTokenBalance,
    ...tokensData
  ]
}

/**
 * Get balance of the network token
 * @param {string} userAddress user wallet address
 * @param {string} networkSymbol network symbol
 * @param {Web3} web3 web3 instance
 */
async function getNetworkTokenBalance (userAddress, networkSymbol, web3) {
  const [networkBalaceData, { id: networkTokenId }] = await Promise.all([
    web3.eth.getBalance(userAddress),
    CoinFactory.getCoinId(networkSymbol)
  ])
  const networkBalance = web3.utils.fromWei(networkBalaceData, 'ether')
  const networkPriceData = await CoinFactory.getRates(networkTokenId)
  const networkBalanceInUsd = networkPriceData.currentPrice * networkBalance

  return {
    token: networkSymbol,
    balance: networkBalance,
    balanceInUsd: networkBalanceInUsd,
    tokenData: networkPriceData
  }
}

/**
 * Get balances of other tokens that a user has
 * @param {Array} userTokens list of user tokens
 * @param {string} userAddress user wallet address
 * @param {string} userUid user uid
 * @param {Web3} web3 web3 instance
 */
async function getOtherTokensBalance (userTokens, userAddress, userUid, web3) {
  return Promise.all(userTokens.map(async data => {
    const [
      { id: tokenId },
      { token, contract: tokenContract }
    ] = await Promise.all([
      CoinFactory.getCoinId(data.symbol),
      Tokens.getContractDetails(data.id, userUid)
    ])
    const [balanceWei, tokenPriceData] = await Promise.all([
      tokenContract.methods.balanceOf(userAddress).call(),
      CoinFactory.getRates(tokenId)
    ])
    const balance = web3.utils.fromWei(balanceWei, 'ether')
    const balanceInUsd = token.currentPrice * balance

    return {
      token: token.symbol,
      balance,
      balanceInUsd,
      tokenData: tokenPriceData
    }
  }))
}
