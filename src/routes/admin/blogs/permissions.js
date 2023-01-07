'use strict'

/**
 * @typedef {import ("express").Router} Router
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 * @typedef {import ("express").NextFunction} Next
 */

const Ajv = require('ajv').default

const handlers = require('./handlers')
const { ROLE } = require('@/src/constants')
const errors = require('@/src/classes/errors')
const { rolePermission } = require('@/src/middlewares')
const { withErrorHandler } = require('@/src/helpers/routes')

const ajv = new Ajv({
  removeAdditional: true
})

const validate = ajv.compile({
  type: 'object',
  properties: {
    isPublished: {
      type: 'boolean'
    },
    needsReview: {
      type: 'boolean'
    }
  },
  minProperties: 1,
  additionalProperties: false
})

const roles = [
  ROLE.SUPER_ADMIN,
  ROLE.POUCHFI_ADMIN
]

/**
 * Endpoint to update blog permissions
 *
 * @param {Object[]} middlewares - List of middlewares to be applied to this endpoint
 * @param {Router} router - Express router
 */
module.exports = (middlewares, router) => {
  middlewares.push(rolePermission(roles))
  middlewares.push(validator)
  middlewares.push(withErrorHandler(create))

  router.put('/:blogId/permissions', middlewares)

  /**
   * Validates incoming request
   * @param {Request} req request object
   * @param {Response} res response object
   * @param {Next} next next function
   */
  function validator (req, res, next) {
    const blogId = parseInt(req.params.blogId, 10)

    if (isNaN(blogId)) {
      return next(errors.api.unprocessableEntity(':blogId parameter must be a number'))
    }

    const isValid = validate(req.body)

    if (!isValid) {
      const error = validate.errors[0]

      return next(errors.api.unprocessableEntity(error.message))
    }

    next()
  }

  /**
   * Handles updating of Blog's permissions
   *
   * Responds with:
   *  200 if the provided permission has been updated
   */
  async function create (req, res) {
    const { blogId } = req.params

    await handlers.updatePermissions(blogId, req.body, req)

    res.json({
      ok: true
    })
  }
}
