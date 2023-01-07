'use strict'

/**
 * @typedef {import ("express").Router} Router
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 * @typedef {import ("express").NextFunction} Next
 */

const Ajv = require('ajv').default

const errors = require('@/src/classes/errors')
const { withErrorHandler } = require('@/src/helpers')
const handlers = require('@routes/admin/blogs/handlers')
const { validateProviderBlog } = require('@/src/middlewares')

const ajv = new Ajv()
const validate = ajv.compile({
  type: 'object',
  properties: {
    published: { type: 'boolean' }
  }
})

/**
 * Endpoint to update a blog
 *
 * @param {Object[]} middlewares - List of middlewares to be applied to this endpoint
 * @param {Router} router - Express router
 */
module.exports = (middlewares, router) => {
  middlewares.push(validator)
  middlewares.push(validateProviderBlog)
  middlewares.push(withErrorHandler(update))

  router.put('/:blogId', middlewares)

  /**
   * Validates incoming request
   * @param {Request} req request objext
   * @param {Response} res express response object
   * @param {Next} next next fn
   */
  function validator (req, res, next) {
    const blogId = parseInt(req.params.blogId, 10)

    if (isNaN(blogId)) {
      return next(errors.api.unprocessableEntity(':id parameter must be number'))
    }

    const isValid = validate(req.body)
    if (!isValid) {
      const error = validate.errors[0]

      return next(errors.api.unprocessableEntity(error.message))
    }

    req.params.id = blogId

    next()
  }

  /**
   * Handles updating of blog info
   *
   * Responds with:
   *  200 with the updated blog info
   *  404 if blog was not found
   * @param {Request} req express request object
   * @param {Response} res express response object
   */
  async function update (req, res) {
    const blog = await handlers.update(req.params.id, req.body, req)

    res.json({
      ok: true,
      outlets: {
        blog
      }
    })
  }
}
