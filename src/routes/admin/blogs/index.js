'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
*
*/

const { Router } = require('express')

const handlers = require('./handlers')
const { withErrorHandler } = require('@/src/helpers')
const { secureLimiter, authenticated } = require('@/src/middlewares')

/**
 * Mount endpoints for /admin/blogs
 * @type {Router} router - express router
 */
const router = Router({
  strict: true,
  caseSensitive: true
})

router.post(
  '/create',
  secureLimiter,
  authenticated,
  withErrorHandler(createBlog)
)

/**
 * Create a blog database entry
 * @param {Request} req request object
 * @param {Response} res response object
 */
async function createBlog (req, res) {
  const { blog, tags } = await handlers.createBlog(req.body)
  res.json({ blog, identifiedTags: tags })
}

module.exports = router
