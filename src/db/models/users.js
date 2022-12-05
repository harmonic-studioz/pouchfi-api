'use strict'

const cuid = require('cuid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { QueryTypes } = require('sequelize')

const config = require('@config')
const { LOCALE } = require('@/src/constants')
const { api } = require('@/src/classes/errors')

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
      unique: true
    },
    // user first name
    firstName: DataTypes.STRING,
    // user last name
    lastName: DataTypes.STRING,
    // user full name
    fullName: {
      type: DataTypes.VIRTUAL,
      get () {
        return `${this.firstName} ${this.lastName}`
      },
      set (value) {
        throw new Error('Do not try to set the `fullName` value!')
      }
    },
    // user email
    email: {
      type: DataTypes.STRING,
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
    // user spending wallet account balance
    balance: {
      type: DataTypes.DECIMAL
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
          'lastLogin'
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
  User.addHook('beforeCreate', async staff => {
    const isUsernameSet = staff.getDataValue('username')
    if (isUsernameSet) return
    const username = `${staff.firstName}${staff.lastName}${Math.random().toString(36).slice(2, 4)}`
    staff.setDataValue('username', username)
    staff.username = username
  })

  // associations
  User.associate = function associate (models) {
    User.hasOne(models.users, {
      foreignKey: 'invitedByUid',
      as: 'invitedBy'
    })

    User.belongsToMany(models.networks, {
      through: 'guestNetworks',
      onDelete: 'CASCADE',
      as: 'networks',
      foreignKey: 'userId'
    })
  }

  /**
   * verify jwt token
   * @param {string} token jwt token
   * @param {strin} issuer issuer string
   * @returns decoded token
   */
  User.verifyToken = async (token, issuer = ADMIN_HOST) => {
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
  User.list = async function list (options, isExport) {
    const {
      limit = 10,
      page = 1
    } = options
    const transformUserListSort = (sortBy) => {
      switch (sortBy) {
        case 'uid':
          return 'users.uid'
        case 'id':
          return 'users.id'
        case 'lastLogin':
          return 'users.lastLogin'
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
    if (options.role) {
      wheres.push('users."roleCode" = :roleCode')
      replacements.roleCode = options.role
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
    let countSQL = 'SELECT COUNT(DISTINCT users.id)'
    const fromNJoins = `
      FROM
        users
      INNER JOIN
        roles ON roles.code = users."roleCode"
      LEFT JOIN
        users AS self ON self.uid = users."invitedByuid"
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
        users.history,
        roles.name
      ORDER BY
        ${sortBy} ${options.order || 'DESC'}
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
      sequelize.query(countSQL, queryOptions)
    ])

    return {
      users: rowForUsers,
      count: parseInt(rowForCount[0].count)
    }
  }

  /**
   * return a user detail
   * @param {string} uid user uid
   * @returns {object} user
   */
  User.one = async function one (uid) {
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

  return User
}
