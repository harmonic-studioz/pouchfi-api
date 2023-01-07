'use strict'

/**
 * @typedef {import ("express").Router} Router
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 * @typedef {import ("express").NextFunction} Next
 */

const errors = require('@/src/classes/errors')
const { withErrorHandler } = require('@/src/helpers')
const handlers = require('@routes/admin/blogs/handlers')
const { validateProviderBlog } = require('@/src/middlewares')

/**
 * Endpoint to retrieve a blog
 *
 * @param {Object[]} middlewares - List of middlewares to be applied to this endpoint
 * @param {Router} router - Express router
 */
module.exports = (middlewares, router) => {
  middlewares.push(validator)
  middlewares.push(validateProviderBlog)
  middlewares.push(withErrorHandler(deleteBlog))

  router.delete('/:blogId', middlewares)

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

    req.params.id = blogId

    next()
  }

  /**
   * Handles retrieving of blog
   *
   * Responds with:
   *  200 with the retreived blog
   *  404 if blog was not found
   * @param {Request} req express request object
   * @param {Response} res express response object
   */
  async function deleteBlog (req, res) {
    await handlers.deleteBlog(req.params.id)

    res.json({
      ok: true
    })
  }
}
