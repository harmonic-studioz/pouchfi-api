'use strict'

const cuid = require('cuid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { QueryTypes } = require('sequelize')

const config = require('@config')
const { api, domain } = require('@/src/classes/errors')
const { LOCALE, ACCOUNT_TYPES } = require('@/src/constants')
const { transformedLimit, transformedPage, pagiParser } = require('@/src/helpers')

const BCRYPT_SALT_ROUNDS = 13
const ADMIN_HOST = config.admin.host
const TOKEN_EXPIRES_IN = config.authorization.expiresIn

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
  const User = sequelize.define('users', {
    // row id
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true
    },
    // user uid
    uid: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      unique: true
    },
    // user username
    username: {
      type: DataTypes.TEXT,
      unique: true,
      validate: {
        len: {
          args: [3, 32],
          msg: 'Username must be within three(3) and thirty-two(32)'
        }
      }
    },
    // user first name
    firstName: DataTypes.STRING,
    // user last name
    lastName: DataTypes.STRING,
    // user full name
    fullName: {
      type: DataTypes.VIRTUAL,
      get () {
        return this.firstName && this.lastName
          ? `${this.firstName} ${this.lastName}`
          : this.firstName
            ? this.firstName
            : this.lastName
              ? this.lastName
              : this.username
                ? this.username
                : ''
      },
      set (value) {
        throw new Error('Do not try to set the `fullName` value!')
      }
    },
    // user email
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      validate: {
        isEmail: true
      },
      set (val) {
        const lowered = val ? val.toLowerCase() : ''
        this.setDataValue('email', lowered)
      }
    },
    // active flag
    inactive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // password hash
    passwordHash: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // the password is stored plainly in the password field so it can be validated, but is never stored in the DB.
    password: {
      type: DataTypes.VIRTUAL,
      set (password) {
        // remember to set the data value, otherwise it won't be validated
        this.setDataValue('password', password)
        const hash = bcrypt.hashSync(password, BCRYPT_SALT_ROUNDS)
        this.setDataValue('passwordHash', hash)
      },
      validate: {
        isLongEnough (password) {
          if (password.length < 6) {
            throw new Error('Password too short, min 6 characters.')
          }
        }
      }
    },
    // user avatar
    avatar: DataTypes.TEXT,
    // user phone number
    phone: DataTypes.STRING,
    // user self introduction
    bio: DataTypes.TEXT,
    // user language
    language: {
      type: DataTypes.STRING,
      defaultValue: LOCALE.EN
    },
    // user nationality
    nationality: DataTypes.STRING,
    // user gender
    gender: {
      type: DataTypes.ENUM('FEMALE', 'MALE', 'GENDERLESS'),
      allowNull: false,
      defaultValue: 'MALE'
    },
    // user birthday
    birthday: {
      type: DataTypes.DATEONLY,
      validate: {
        isDate: true
      }
    },
    // indicates where user registered from
    registeredFrom: DataTypes.STRING,
    // user meta data
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    // used for 3rd party auth such as omni, facebook, google
    externalAuthId: DataTypes.STRING,
    // response from external auth
    oAuthResponse: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    // if external auth ID the last login method
    provider: DataTypes.STRING,
    // uid of user who invited the user
    invitedByUid: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'users',
        key: 'uid'
      }
    },
    // used to track some things
    history: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [{
        type: 'CREATED',
        createdAt: Date.now()
      }]
    },
    // user last login time
    lastLogin: DataTypes.DATE,
    // waitlist flag to see if user was waitlisted
    waitlist: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // this flag indicates if the user would receive newsletter emails
    newsletters: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    schema: 'public',
    paranoid: true,
    freezeTableName: true,
    defaultScope: {
      attributes: {
        exclude: [
          'id',
          'oAuthResponse',
          'invitedByUid',
          'passwordHash',
          'deletedAt',
          'lastLogin',
          'waitlist',
          'newsletters'
        ]
      }
    }
  })

  // before create hooks
  User.addHook('beforeCreate', 'generateUid', async user => {
    const uid = `u${cuid()}`
    user.setDataValue('uid', uid)
    user.uid = uid
  })
  User.addHook('beforeCreate', async user => {
    const isUsernameSet = user.getDataValue('username')
    if (isUsernameSet) return
    if (!user.firstName && !user.lastName) return
    const username = user.firstName
      ? user.lastName
        ? `${user.firstName}${user.lastName}${Math.random().toString(36).slice(2, 4)}`
        : `${user.firstName}${Math.random().toString(36).slice(2, 4)}`
      : `${user.lastName}${Math.random().toString(36).slice(2, 4)}`
    if (username) {
      user.setDataValue('username', username)
      user.username = username
    }
  })

  // associations
  User.associate = function associate (models) {
    User.hasOne(models.users, {
      foreignKey: 'invitedByUid',
      as: 'invitedBy'
    })

    User.belongsToMany(models.networks, {
      through: 'userNetworks',
      onDelete: 'CASCADE',
      as: 'networks',
      foreignKey: 'uid'
    })

    User.belongsToMany(models.tokens, {
      through: 'userTokens',
      onDelete: 'CASCADE',
      as: 'tokens',
      foreignKey: 'userId'
    })

    User.hasMany(models.transactions, {
      targetKey: 'userId',
      as: 'transactions'
    })

    User.hasMany(models.accounts, {
      foreignKey: 'userId',
      sourceKey: 'uid',
      as: 'accounts'
    })
  }

  /**
   * verify jwt token
   * @param {string} token jwt token
   * @param {strin} issuer issuer string
   * @returns decoded token
   */
  User.verifyToken = (token, issuer = ADMIN_HOST) => {
    const claims = jwt.verify(token, config.jwtKeys.public, {
      issuer,
      algorithms: 'RS256'
    })

    return claims
  }

  /**
   * decode token
   * @param {string} token jwt token
   * @returns
   */
  User.decodeToken = token => jwt.decode(token)

  /**
   * verify user password
   * @param {string} rawPassword user typed password
   * @return {boolean} true if correct password else false
   */
  User.prototype.verifyPassword = async function (rawPassword) {
    /**
     * if the user has not set te password yet then
     * user hasn't accepted the invitation
     */
    if (this.passwordHash === null) {
      return false
    }

    return bcrypt.compare(rawPassword, this.passwordHash)
  }

  /**
   * Clean up the user object
   * @param {object} props extra keys you might want to add
   * @return {object}
   */
  User.prototype.toClean = function (props) {
    const {
      passwordHash,
      password,
      id,
      deletedAt,
      updatedAt,
      createdAt,
      metadata,
      history,
      role,
      ...rest
    } = this.toJSON()

    return {
      ...rest,
      level: role && role.level,
      roleName: role && role.name,
      ...props
    }
  }

  /**
   * sign a jwt token
   * @param {number} level user level
   * @param {boolean} isRefreshToken flag to indicate refresh token
   * @param {string} issuer token issuer
   * @param {string} expiresIn token expiration time
   * @return {string} jwt token
   */
  User.prototype.signToken = function (level, isRefreshToken = false, issuer = ADMIN_HOST, expiresIn = TOKEN_EXPIRES_IN) {
    const {
      createdAt,
      updatedAt,
      deletedAt,
      invitedByUid,
      ...rest
    } = this.toClean()

    const token = jwt.sign({
      ...rest,
      isRefreshToken,
      level
    }, config.jwtKeys.private, {
      expiresIn,
      issuer,
      audience: issuer,
      subject: this.uid,
      algorithm: 'RS256'
    })

    return token
  }

  /**
   * Generate password reset token
   * @param {object} attrs config object
   * @param {string} attrs.resetId reset ID to be used as the token subject
   * @returns {string} reset token
   */
  User.prototype.getPasswordResetToken = async function (attrs) {
    if (this.registeredFrom !== 'email') {
      throw new Error(
        'getPasswordResetToken only support user created via email address.'
      )
    }

    const token = jwt.sign({
      actionCode: 'RESET_PASSWORD',
      uid: this.uid,
      email: this.email
    }, config.jwtKeys.private, {
      expiresIn: 60 * 15, // Expired in 15 mins
      issuer: ADMIN_HOST,
      audience: ADMIN_HOST,
      subject: attrs.resetId,
      algorithm: 'RS256'
    }
    )
    return token
  }

  /**
   * List users
   * @param {object} options config object
   * @param {number} options.limit number of results to return
   * @param {number} options.page result page to return
   * @param {string} options.sortBy column to order results by
   * @param {string} options.search search string
   * @param {string} options.role user role
   * @param {boolean} isExport flag to indicate if exporting data
   * @returns {object} user and count
   */
  User.List = async function list (options, isExport = false) {
    let {
      limit,
      page,
      order = 'DESC'
    } = options
    page = transformedPage(page)
    limit = transformedLimit(limit)
    const transformUserListSort = (sortBy) => {
      switch (sortBy) {
        case 'uid':
          return 'users.uid'
        case 'id':
          return 'users.id'
        case 'lastLogin':
          return 'users.lastLogin'
        case 'name':
          return `users."lastName" collate "C" ${order}, users."firstName" collate "C" ${order}`
        default:
          return 'users."createdAt"'
      }
    }
    const sortBy = transformUserListSort(options.sortBy)

    const wheres = ['users."deletedAt" IS NULL']
    const replacements = {}
    if (options.search) {
      wheres.push(`
        (
          LOWER(
            concat_ws(
              ' ',
              users.username,
              users."firstName",
              users."lastName",
              users.email,
              users.id::varchar,
              users.uid
            )
          ) LIKE ALL(ARRAY [:search])
        )
      `)
      const searchReplacement = options.search
        .split(' ')
        .map(word => word.trim().length ? `%${word.replace(/(_|%|\\)/g, '\\$1').toLowerCase()}%` : '')
      replacements.search = Array.isArray(searchReplacement) && searchReplacement.length ? searchReplacement : []
    }
    if (options.language && options.language.length > 0) {
      wheres.push('users.language = :language')
      replacements.language = options.language
    }
    if (options.id) {
      const isNumeric = !isNaN(options.id) && !isNaN(parseFloat(options.id))
      if (isNumeric) {
        wheres.push('CAST(users.id AS TEXT) LIKE :id')
      } else {
        wheres.push('users.uid LIKE :id')
      }
      replacements.id = `%${options.id}%`
    }
    if (options.searchDateBy?.length > 0 && options.searchDateRange?.length > 0) {
      wheres.push(`
        users."${options.searchDateBy}" >= :from
        AND
        users."${options.searchDateBy}" <= :to
      `)
      replacements.from = options.searchDateRange[0]
      replacements.to = options.searchDateRange[1]
    }
    if (options.status && options.statusResult) {
      const statusValue = typeof options.statusResult === 'boolean' ? options.statusResult : options.statusResult === 'true'
      wheres.push(`users."${options.status}" = :status`)
      replacements.status = statusValue
    }

    let listSQL = `
      SELECT
        users.id,
        users.uid,
        users.username,
        users.email,
        users.inactive,
        users."roleCode",
        roles.name AS "roleName",
        users."invitedByuid",
        users."createdAt",
        users.history,
        users."lastLogin"
    `
    let countSQL = 'SELECT COUNT(DISTINCT users.id)::INTEGER as count'
    const fromNJoins = `
      FROM
        users
    `
    listSQL += fromNJoins
    countSQL += fromNJoins
    const where = wheres.join(' AND ')
    const whereClause = 'WHERE ' + where
    listSQL += whereClause
    countSQL += whereClause

    const groupby = `
      GROUP BY
        users.id,
        users.uid,
        users.username,
        users.email,
        users.inactive,
        users."roleCode",
        users."invitedByUid",
        users."createdAt",
        users.history
      ORDER BY
        ${sortBy} ${options.sortBy === 'name' ? '' : order}
  `

    listSQL += groupby

    if (!isExport) {
      listSQL += 'LIMIT :limit OFFSET :offset'
      replacements.limit = limit
      replacements.offset = limit * (page - 1)
    }

    const queryOptions = {
      type: QueryTypes.SELECT,
      replacements
    }

    const [rowForUsers, rowForCount] = await Promise.all([
      sequelize.query(listSQL, queryOptions),
      sequelize.query(countSQL, { plain: true, ...queryOptions })
    ])

    const total = rowForCount?.count || 0
    return {
      rows: rowForUsers,
      summary: {
        showing: pagiParser(page, limit, total),
        total
      }
    }
  }

  /**
   * return a user detail
   * @param {string} uid user uid
   * @returns {object} user
   */
  User.One = async function one (uid) {
    const opts = {
      type: QueryTypes.SELECT,
      plain: true,
      replacements: { uid }
    }

    const inst = await sequelize.query(`
      SELECT
        user.uid,
        user.username,
        user."firstName",
        user."lastName",
        user.email,
        user."roleCode",
        role.name AS "roleName",
        user."profileImage",
        user.phone,
        user.bio,
        user."createdAt",
        user.language,
        (SELECT username from users where "uid" = "user"."invitedByUid") AS "invitedBy
      FROM
        users AS user
        INNER JOIN roles AS role ON role.code = user."roleCode"
      WHERE
        user."deletedAt" IS NULL
        AND user.uid = :uid
      GROUP BY
        role.code,
        user.uid
    `, opts)

    if (inst === null) {
      throw api.badRequest('User does not exist')
    }

    return inst
  }

  User.Find = async function find (property, value) {
    const user = await User.findOne({
      where: {
        [property]: value
      }
    })

    if (!user) {
      throw new domain.EntityNotFound(value, {
        model: 'User',
        property
      })
    }

    if (user.inactive) {
      throw api.forbidden('Access has been disabled for this Guest: ' + value)
    }

    return user
  }

  /**
   * Get details regarding the current network the user is on
   * @param {number} uid user uid
   * @param {object} [opts] options
   * @param {Boolean} [opts.includeTokens] flag to include tokens
   * @param {Boolean} [opts.plain] flag to return only network data
   * @param {Boolean} [opts.includeTokenPrice] flag to include token prices
   */
  User.getUserCurrentNetwork = async function getUserCurrentNetwork (uid, opts = {}) {
    const {
      includeTokens = true,
      plain = false,
      includeTokenPrice = false
    } = opts

    const replacements = { uid }

    const listSQL = `
      SELECT
        network.id,
        network.name,
        network.rpc,
        network.symbol,
        networl.api,
        network.blockExplorer
    `
    const fromNJoins = `
      FROM
        userNetworks as user
      LEFT JOIN
        networks as network
        ON user.networkId = network.id AND user.guestUid = :uid
    `
    const whereQuery = `
      WHERE
        user.guestUid = :uid
        AND user.current = true
    `
    const groupQuery = `
      GROUP BY
        network.id
    `

    const query = listSQL + fromNJoins + whereQuery + groupQuery
    const network = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
      plain: true,
      nest: true
    })

    if (!network) {
      throw api.unprocessableEntity('Could not get user network!')
    }

    if (includeTokens) {
      const tokens = await sequelize.models.tokens.getUserTokens(uid, network.id, includeTokenPrice)
      network.tokens = tokens || []
    }

    if (plain) return { network }

    const accountData = await sequelize.query(`
      SELECT
        address,
        account
      FROM
        guests.accounts accounts
      WHERE
        accounts."userId" = :uid
        AND accounts.current = true
        AND accounts."accountCode" = :code
        AND accounts."networkId" = :networkId
    `, {
      type: QueryTypes.SELECT,
      plain: true,
      replacements: {
        uid,
        networkId: network.id,
        code: ACCOUNT_TYPES.CRYPTO_CUSTODIAL
      }
    })

    return {
      userAddress: accountData.address,
      ethAccount: JSON.parse(accountData.account),
      network
    }
  }

  return User
}
