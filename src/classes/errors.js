'use strict'

class ApiError extends Error {
  /**
   * basic error class
   * @param {number} status http code to represent the error
   * @param {string} type Error type e.g. TransactionError
   * @param {string} code Code to elaborate error type e.g. transaction_not_found
   * @param {string} message Human readable message about the error
   * @param {object} meta more information about the error
   */
  constructor (status, type, code, message, meta = {}) {
    super(message)
    this.status = status
    this.type = type
    this.code = code
    this.meta = meta
  }

  /**
   * @description filter "meta" fiels and return as error response for external consumption
   */
  toExternalResponse () {
    return {
      status: this.status,
      type: this.type,
      message: this.message,
      code: this.code,
      resolveActions: this.meta
    }
  }
}
exports.ApiError = ApiError
exports.ApiErrorMeta = {
  raw: {},
  resolveActions: {}
}

class ServiceError extends ApiError {
  /** @inheritdoc */
  constructor (status, context, code, message, meta = exports.ApiErrorMeta || {}) {
    super(status, context, code, message, meta)
    this.context = context
  }

  toExternalResponse () {
    return {
      ...super.toExternalResponse(),
      context: this.context
    }
  }
}
exports.ServiceError = ServiceError

exports.ERROR_CODES = {
  // Application checklist error codes
  APP_DOMAIN_NOT_SET: {
    code: 'APP_DOMAIN_NOT_SET',
    message: 'Domain name must be set',
    group: 'Application Info'
  },
  APP_MAIL_NOT_SET: {
    code: 'APP_MAIL_NOT_SET',
    message: 'Mail sender must be set',
    group: 'Mail Settings'
  },
  MAIL_TEMPLATE_IS_NOT_SETUP: {
    code: 'MAIL_TEMPLATE_IS_NOT_SETUP',
    message: 'Mail template was not set up',
    group: 'Application Info'
  }
}

class Domain extends Error {
  constructor (message, model) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)

    this.model = model
  }
}

class EntityNotFound extends Domain {
  constructor (id, options) {
    const { model, property = 'id' } = options

    super(`Entity with ${property} of ${id} was not found`, model)
  }
}

/**
 *
 * @param {string} fnName - Name of the function
 * @returns {string} - Capitalized function name
 */
function _capitalize (fnName) {
  return fnName[0].toUpperCase() + fnName.slice(1)
}
exports._capitalize = _capitalize

/**
 *
 * @param {string} message Error message
 * @param {Object} options Options
 * @param {number} [options.status=500] HTTP Status
 * @param {Object} [options.ctor] The target constructor when throwing the error
 */
function _base (message, options) {
  const Class = class extends Error {
    constructor (message, options) {
      super(message)

      const { status = 500, ctor = this.constructor } = options

      this.name = _capitalize(ctor.name)
      this.statusCode = status
      Error.captureStackTrace(this, ctor)
    }
  }

  return new Class(message, options)
}
exports._base = _base

const errors = new Map([
  ['badRequest', 400],
  ['unauthorized', 401],
  ['forbidden', 403],
  ['notFound', 404],
  ['unprocessableEntity', 422],
  ['serverError', 500]
])

for (const [error, status] of errors) {
  /**
   * Creates a function that when called throws an error
   *
   * @param {string} message - Error message
   */
  exports[error] = function (message) {
    return _base(message, { status, ctor: exports[error] })
  }

  Object.defineProperty(exports[error], 'name', {
    value: error
  })
}
exports.api = {
  notFound: exports.notFound,
  forbidden: exports.forbidden,
  badRequest: exports.badRequest,
  serverError: exports.serverError,
  unauthorized: exports.unauthorized,
  unprocessableEntity: exports.unprocessableEntity
}
exports.domain = {
  EntityNotFound
}
