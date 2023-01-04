'use strict'

const fs = require('fs')
const path = require('path')
const Sequelize = require('sequelize')

const { postgres } = require('@config')
const Tokens = require('./networks/tokens')
const Accounts = require('./users/accounts')
const ExperienceImages = require('./blogs/images')
const AccountTypes = require('./users/accountTypes')
const BlogTranslations = require('./blogs/translations')
/**
 * @typedef {import ("sequelize").Sequelize} Sequelize
 *
 */
/**
 * @constant
 * @type {Sequelize}
 * @default
 */
const sequelize = new Sequelize(postgres.url, postgres.options)

const db = {}

const files = fs.readdirSync(__dirname, {
  withFileTypes: true
})

for (const file of files) {
  if (file.isDirectory()) continue

  if (file.name === 'index.js') continue

  if (file.name.endsWith('.spec.js')) continue

  const Model = require(path.join(__dirname, file.name))

  if (typeof Model !== 'function') {
    throw new TypeError('Model must be a function')
  }

  const model = Model(sequelize, Sequelize.DataTypes)
  db[model.name] = model
}
db.tokens = Tokens(sequelize, Sequelize.DataTypes)
db.accountTypes = AccountTypes(sequelize, Sequelize.DataTypes)
db.accounts = Accounts(sequelize, Sequelize.DataTypes)
db.images = ExperienceImages(sequelize, Sequelize.DataTypes)
db.blogTranslations = BlogTranslations(sequelize, Sequelize.DataTypes)

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db)
  }
})

/**
 * SHIM: Sequelize return DECIMAL as string.
 * this to convert it to float
 */
Sequelize.postgres.DECIMAL.parse = function decimal (value) {
  return parseFloat(value)
}

db.sq = sequelize
db.Sequelize = Sequelize

module.exports = db

module.exports.init = async function init (retries = 0) {
  try {
    await sequelize.sync()
    await db.tokens.sync()
    await db.accountTypes.sync()
    await db.accounts.sync()
    await db.blogTranslations.sync()
  } catch (err) {
    if (err.parent?.code === '42P01') {
      await db.accountTypes.sync()
      await db.accounts.sync()

      if (retries >= 3) {
        throw err
      }

      ++retries

      return init(retries)
    }

    throw err
  }
}
