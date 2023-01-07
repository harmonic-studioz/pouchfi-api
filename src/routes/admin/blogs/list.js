'use strict'

/**
 * @typedef {import ("express").Router} Router
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 * @typedef {import ("express").NextFunction} Next
 */

const Ajv = require('ajv').default

const handlers = require('./handlers')
const errors = require('@/src/classes/errors')
const { withErrorHandler } = require('@/src/helpers')

const ajv = new Ajv()

const validate = ajv.compile({
  type: 'object',
  properties: {
    field: {
      enum: [
        'id',
        'title',
        'type',
        'published',
        'staff',
        'createdAt',
        'updatedAt'
      ]
    },
    order: {
      enum: [
        'asc',
        'desc'
      ]
    }
  }
})

/**
 * Endpoint to list Blogs
 * @param {Object[]} middlewares - List of middlewares to be applied to this endpoint
 * @param {Router} router - Express router
 */
module.exports = (middlewares, router) => {
  middlewares.push(validator)
  middlewares.push(withErrorHandler(list))

  router.get('/', middlewares)

  /**
   * Validates incoming request
   * @param {Request} req request objext
   * @param {Response} res express response object
   * @param {Next} next next fn
   */
  function validator (req, res, next) {
    const isValid = validate(req.query)

    if (!isValid) {
      const error = validate.errors[0]
      return next(errors.api.unprocessableEntity(error.message))
    }

    next()
  }

  /**
   * Handles listing of blogs based on provided filters
   *
   * Responds with:
   *  200 with the paginated list of blogs
   * @param {Request} req express request object
   * @param {Response} res express response object
   */
  async function list (req, res) {
    const options = {
      limit: parseInt(req.query.limit, 10) || 10,
      page: parseInt(req.query.page, 10) || 1,
      userUid: req.user.uid,
      role: req.user.roleName
    }

    const paginated = await handlers.list(req.query, options)

    res.json({
      ok: true,
      outlets: paginated
    })
  }
}
