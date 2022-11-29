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
  const Staff = sequelize.define('staffs', {
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
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // user last name
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
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
      set (val) {
        const lowered = val ? val.toLowerCase() : ''
        this.setDataValue('email', lowered)
      },
      validate: {
        isEmail: true
      }
    },
    // active flag
    inactive: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
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
      set (val) {
        // remember to set the data value, otherwise it won't be validated
        this.setDataValue('password', val)
        const hash = bcrypt.hashSync(val, BCRYPT_SALT_ROUNDS)
        this.setDataValue('passwordHash', hash)
      },
      validate: {
        isLongEnough (password) {
          if (password.length < 8) {
            throw new Error('Password too short, min 8 characters.')
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
    // user role code
    roleCode: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'roles',
        key: 'code'
      }
    },
    // indicates where user registered from
    registeredFrom: DataTypes.STRING,
    // user meta data
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    // uid of user who invited the user
    invitedByUid: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'staffs',
        key: 'uid'
      }
    },
    // used to track some things
    history: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    // user last login time
    lastLogin: DataTypes.DATE
  }, {
    schema: 'public',
    paranoid: true,
    freezeTableName: true,
    defaultScope: {
      attributes: {
        exclude: [
          'id',
          'invitedByUid',
          'passwordHash',
          'deletedAt',
          'lastLogin'
        ]
      }
    }
  })

  // before create hooks
  Staff.addHook('beforeCreate', 'generateUid', async user => {
    const uid = `u${cuid()}`
    user.setDataValue('uid', uid)
    user.uid = uid
  })
  Staff.addHook('beforeCreate', async staff => {
    const isUsernameSet = staff.getDataValue('username')
    if (isUsernameSet) return
    const username = `${staff.firstName}${staff.lastName}${Math.random().toString(36).slice(2, 4)}`
    staff.setDataValue('username', username)
    staff.username = username
  })

  // associations
  Staff.associate = function associate (models) {
    Staff.hasOne(models.staffs, {
      foreignKey: 'invitedByUid',
      as: 'invitedBy'
    })

    Staff.belongsTo(models.roles, {
      foreignKey: 'roleCode',
      as: 'role'
    })

    Staff.addScope('list', {
      include: [{
        model: models.roles,
        as: 'role',
        attributes: ['name', 'code', 'type']
      }]
    })

    Staff.addScope('role', {
      include: [{
        model: models.roles,
        as: 'role',
        attributes: ['name', 'code', 'type', 'level']
      }]
    })
  }

  /**
   * verify jwt token
   * @param {string} token jwt token
   * @param {strin} issuer issuer string
   * @returns decoded token
   */
  Staff.verifyToken = async (token, issuer = ADMIN_HOST) => {
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
  Staff.decodeToken = token => jwt.decode(token)

  /**
   * verify user password
   * @param {string} rawPassword user typed password
   * @return {boolean} true if correct password else false
   */
  Staff.prototype.verifyPassword = async function (rawPassword) {
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
  Staff.prototype.toClean = function (props) {
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
  Staff.prototype.signToken = function (level, isRefreshToken = false, issuer = ADMIN_HOST, expiresIn = TOKEN_EXPIRES_IN) {
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
  Staff.prototype.getPasswordResetToken = async function (attrs) {
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
   * generate invitation token
   * @param {object} attrs config params
   * @param {string} attrs.expiration expiration time
   * @param {string} attrs.timestamp timestamp of token
   * @returns {string} invitation token
   */
  Staff.prototype.getInvitationToken = function (attrs) {
    const expirationTime = attrs.expiration || config.admin.invitationTokenExpiration

    const token = jwt.sign({
      actionCode: 'INVITE',
      uid: this.uid,
      email: this.email
    }, config.jwtKeys.private, {
      expiresIn: expirationTime,
      issuer: ADMIN_HOST,
      audience: ADMIN_HOST,
      subject: attrs.timestamp,
      algorithm: 'RS256'
    })

    return token
  }

  /**
   * get confirmation token
   * @param {object} attrs config params
   * @param {string} attrs.appCode config params
   * @param {string} attrs.timestamp timestamp of token generation
   * @returns {string} token
   */
  Staff.prototype.getConfirmationToken = function (attrs) {
    const token = jwt.sign({
      actionCode: 'CONFIRMATION',
      appCode: attrs.appCode,
      uid: this.uid,
      email: this.email
    }, config.jwtKeys.private, {
      expiresIn: '7 days',
      issuer: ADMIN_HOST,
      audience: ADMIN_HOST,
      subject: attrs.timestamp,
      algorithm: 'RS256'
    })

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
  Staff.list = async function list (options, isExport) {
    const {
      limit = 10,
      page = 1
    } = options
    const transformUserListSort = (sortBy) => {
      switch (sortBy) {
        case 'uid':
          return 'staffs.uid'
        case 'id':
          return 'staffs.id'
        case 'lastLogin':
          return 'staffs.lastLogin'
        default:
          return 'staffs."createdAt"'
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
              staffs.username,
              staffs."firstName",
              staffs."lastName",
              staffs.email,
              staffs.id::varchar,
              staffs.uid
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
      wheres.push('staffs."roleCode" = :roleCode')
      replacements.roleCode = options.role
    }

    let listSQL = `
      SELECT
        staffs.id,
        staffs.uid,
        staffs.username,
        staffs.email,
        staffs.inactive,
        staffs."roleCode",
        roles.name AS "roleName",
        staffs."invitedByuid",
        staffs."createdAt",
        staffs.history,
        staffs."lastLogin"
    `
    let countSQL = 'SELECT COUNT(DISTINCT staffs.id)'
    const fromNJoins = `
      FROM
        staffs
      INNER JOIN
        roles ON roles.code = staffs."roleCode"
      LEFT JOIN
        staffs AS self ON self.uid = staffs."invitedByuid"
    `
    listSQL += fromNJoins
    countSQL += fromNJoins
    const where = wheres.join(' AND ')
    const whereClause = 'WHERE ' + where
    listSQL += whereClause
    countSQL += whereClause

    const groupby = `
      GROUP BY
        staffs.id,
        staffs.uid,
        staffs.username,
        staffs.email,
        staffs.inactive,
        staffs."roleCode",
        staffs."invitedByUid",
        staffs."createdAt",
        staffs.history,
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
  Staff.one = async function one (uid) {
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
        (SELECT username from staffs where "uid" = "user"."invitedByUid") AS "invitedBy
      FROM
        staffs AS user
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

  return Staff
}
