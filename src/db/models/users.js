'use strict'

const cuid = require('cuid')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const config = require('@config')
const { LOCALE } = require('@/src/constants')

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
    // user display name
    displayName: {
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
    selfIntroduction: DataTypes.TEXT,
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
        model: 'users',
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
  User.addHook('beforeCreate', 'generateUid', async user => {
    const uid = `u${cuid()}`
    user.setDataValue('uid', uid)
    user.uid = uid
  })
  User.addHook('beforeCreate', async user => {
    const displayName = `${user.firstName}${user.lastName}${Math.random().toString(36).slice(2, 4)}`
    user.setDataValue('displayName', displayName)
    user.displayName = displayName
  })

  // associations
  User.associate = function associate (models) {
    User.hasOne(models.users, {
      foreignKey: 'invitedByUid',
      as: 'invitedBy'
    })

    User.belongsTo(models.roles, {
      foreignKey: 'roleCode',
      as: 'role'
    })

    User.addScope('list', {
      include: [{
        model: models.roles,
        as: 'role',
        attributes: ['name', 'code', 'type']
      }]
    })

    User.addScope('role', {
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
   * generate invitation token
   * @param {object} attrs config params
   * @param {string} attrs.expiration expiration time
   * @param {string} attrs.timestamp timestamp of token
   * @returns {string} invitation token
   */
  User.prototype.getInvitationToken = function (attrs) {
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
  User.prototype.getConfirmationToken = function (attrs) {
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

  return User
}
