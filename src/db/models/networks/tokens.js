'use strict'

const { default: Web3 } = require('web3')
const { QueryTypes } = require('sequelize')

const { api } = require('@/src/classes/errors')
const { TOKEN_TYPE } = require('@/src/constants')

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
  const Token = sequelize.define('tokens', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // name of token
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    // token symbol
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    // token address
    address: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    // token abi
    abi: DataTypes.TEXT
  }, {
    schema: 'networks',
    paranoid: true,
    defaultScope: {
      attributes: {
        exclude: [
          'abi',
          'createdAt',
          'updatedAt',
          'deletedAt'
        ]
      }
    }
  })

  Token.associate = function associate (models) {
    Token.belongsTo(models.networks, {
      as: 'network',
      foreignKey: 'networkId',
      targetKey: 'id',
      onDelete: 'SET NULL'
    })

    Token.belongsToMany(models.users, {
      through: 'userTokens',
      onDelete: 'CASCADE',
      as: 'users',
      foreignKey: 'tokenId'
    })
  }

  /**
   * Get token ID from symbol
   * @param {string} symbol token symbol
   * @return {number} Token ID
   */
  Token.getIdFromSymbol = async function getIdFromSymbol (symbol) {
    const token = (await sequelize.query(`
      SELECT
        tokens.id
      FROM
        tokens
      WHERE
        LOWER(tokens.symbol) LIKE LOWER(:symbol)
    `, {
      type: QueryTypes.SELECT,
      plain: true,
      replacements: [symbol]
    })).id

    return token
  }

  /**
   * Get token data
   * @param {boolean} includePrices flag for returning prices
   * @param {object} opts options
   * @param {Object.<string, string>} opts.where object
   * @param {Array<string>} opts.keys keys to add to default returned keys
   * @returns {Promise<Array>} list of token data
   */
  Token.getAll = async function getAll (includePrices, opts) {
    const { CoinFactory } = require('@/src/services/coingecko')
    const { keys = [] } = opts

    const listSQL = `
      SELECT
        id,
        name,
        symbol
        ${keys.length > 0 ? `,${keys}` : ''}
      FROM
        tokens
    `
    let whereQuery = ''
    const wheres = []
    for (const item in opts.where) {
      wheres.push(`"${item.key}" = '${item.value}'`)
    }
    if (wheres.length > 0) {
      whereQuery = `
        WHERE
          ${wheres.join(' AND ')}
      `
    }
    const query = listSQL + whereQuery

    let tokens = await sequelize.query(query, {
      type: QueryTypes.SELECT
    })

    tokens = await Promise.all(tokens.map(async token => {
      if (includePrices) {
        const { id: tokenId } = await CoinFactory.getCoinId(token.symbol)
        const price = await CoinFactory.getRates(tokenId)
        token = { ...price, ...token }
      }
      if (!token.images) {
        token.images = await CoinFactory.getTokenImage(token.symbol)
      }

      return token
    }))

    return tokens || []
  }

  /**
   * Get token data
   * @param {number|string} id token ID or symbol
   * @param {boolean} includePrice flag to include price details
   */
  Token.getById = async function getById (id, includePrice = false) {
    const { CoinFactory } = require('@/src/services/coingecko')

    const replacements = { id }
    const listSQL = `
      SELECT
        tokens.*
        networks.id as 'network.id',
        networks.rpc as 'network.rpc',
        networks.name as 'network.name',
        networks.symbol as 'network.symbol'
    `
    const fromNJoins = `
      FROM
        tokens
      INNER JOIN
        networks ON tokens.networkId = networks.id
      `
    const whereQuery = `
      WHERE
        tokens.id = :id OR tokens.symbol = :id
      LIMIT 1
    `
    const query = listSQL + fromNJoins + whereQuery
    let token = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements,
      plain: true,
      nest: true
    })

    if (!token) {
      throw api.notFound('Token not found')
    }

    if (includePrice) {
      const { id: tokenId } = await CoinFactory.getCoinId(token.symbol)
      const price = await CoinFactory.getRates(tokenId)
      token = { ...price, ...token }
    }

    return token
  }

  /**
   * Get token contract details
   * @param {number} id token ID
   * @param {string} userId user uid
   * @param {boolean} includePrice flag to include prices
   * @return {Promise<object>} contract details
   */
  Token.getContractDetails = async function getContractDetails (id, includePrice = false) {
    const token = await Token.getById(id, includePrice)
    const { address, network } = token
    const web3 = new Web3(network.rpc)
    const abi = typeof token.abi === 'string' ? JSON.parse(token.abi) : token.abi
    const contract = new web3.eth.Contract(abi, address)
    const { abi: abiData, network: networkData, user, ...validTokenData } = token

    return {
      token: validTokenData,
      network,
      contract,
      web3,
      address
    }
  }

  /**
   * Get tokens a user has
   * @param {number} uid user UID
   * @param {number} networkId network ID
   * @param {boolean} includePrice include price data in result
   * @returns {Promise<array>}
   */
  Token.getUserTokens = async function getUserTokens (uid, networkId, includePrice) {
    const { CoinFactory } = require('@/src/services/coingecko')

    const tokenRawData = await sequelize.query(`
      SELECT
        tokens.id
      FROM
        tokens
        INNER JOIN "userTokens" user
        ON user."userId" = :uid AND user."tokenId" = token.id
      WHERE
        token."networkId" = :networkId
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        uid,
        networkId
      },
      raw: true
    })

    const tokenIds = tokenRawData || []
    const tokenData = await Promise.all(tokenIds.map(async token => {
      const tokenUncleanFullData = await Token.getById(token.id, includePrice)

      if (!tokenUncleanFullData.images) {
        tokenUncleanFullData.images = await CoinFactory.getTokenImage(tokenUncleanFullData.symbol)
      }

      return Token.toClean(tokenUncleanFullData)
    }))

    return tokenData
  }

  /**
   * This fn handles sending of tokens
   * @param {object} data contains info related to the tx
   * @param {object} data.token token to be sent
   * @param {number} data.amount amount to be sent
   * @param {object} data.sender details of the person sending the token
   * @param {object} data.network  network details of the token
   * @param {object} data.contract  contract details of the token
   * @param {object} data.receiver  details of the person receiving the token
   * @param {string} data.senderKey  private key of the person sending the token
   * @param {string} data.senderAddress  wallet address of the sender
   * @param {string} data.receiverAddress  wallet address of the receiver
   * @param {string} data.contractAddress  contract address of the token
   * @param {object} type network  network details of the token
   * @returns {Promise<object>} transaction data
   */
  Token.sendToken = async function send (data, type = TOKEN_TYPE.NORMAL) {
    let {
      token,
      amount,
      sender,
      network,
      contract,
      receiver,
      senderKey,
      senderAddress,
      receiverAddress,
      contractAddress
    } = data
    const web3 = new Web3(network.rpc)
    let balance
    if (type === TOKEN_TYPE.NETWORK) {
      balance = await web3.eth.getBalance(senderAddress)
    } else {
      balance = await contract.methods.balanceOf(senderAddress).call()
    }
    amount = web3.utils.toWei(amount.toString(), 'ether')
    const symbol = type === TOKEN_TYPE.NETWORK ? network.symbol : token.symbol
    if (Number(balance) < Number(amount)) {
      throw api.badRequest(`Insufficient ${symbol} balance!!!`)
    }

    // build tx
    const [txCount, gasLimit] = await Promise.all([
      web3.eth.getTransactionCount(senderAddress),
      web3.eth.estimateGas({ from: senderAddress })
    ])

    const to = type === TOKEN_TYPE.NETWORK ? receiverAddress : contractAddress
    const tx = await web3.eth.accounts.signTransaction({
      nonce: web3.utils.toHex(txCount),
      to,
      value: web3.utils.toHex(amount),
      gasLimit,
      ...(type === TOKEN_TYPE.NORMAL
        ? {
            from: senderAddress,
            data: contract.methods.transfer(receiverAddress, web3.utils.toHex(amount)).encodeABI()
          }
        : {})
    }, senderKey)
    const txHash = await web3.eth.sendSignedTransaction(tx.rawTransaction)
    // save transaction to db
    const newTx = await sequelize.models.transactions.register({
      userId: sender.uid,
      amount,
      currency: symbol,
      senderAddress,
      receiverAddress,
      type: 'token_transfer',
      transactionHash: txHash.transactionHash
    })

    // add token to user wallet if they don't already have it
    Token.findByPk(token.id).then(async tok => {
      const doesUserHaveToken = await tok.hasUsers(receiver.uid)
      if (!doesUserHaveToken) {
        await tok.addUsers(receiver.uid)
      }
    }).catch(console.log)

    if (receiver) {
      // notify user
    }

    return newTx
  }

  /**
   * Returns clean token object
   * @param {object} token token object
   * @returns {object} clean token object
   */
  Token.toClean = function toClean (token) {
    const {
      user,
      abi,
      network,
      address,
      createdAt,
      updatedAt,
      deletedAt,
      ...rest
    } = token

    return rest
  }

  /**
   * Clean up the token object
   * @param {object} props object containing things to be added to the return object
   * @returns {object} clean object
   */
  Token.prototype.toClean = function toClean (props) {
    const {
      user,
      abi,
      network,
      address,
      createdAt,
      updatedAt,
      deletedAt,
      ...rest
    } = this.toJSON()

    return { ...rest, ...props }
  }

  return Token
}
