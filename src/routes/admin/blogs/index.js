'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 */

const { Router } = require('express')

const handlers = require('./handlers')
const { withErrorHandler } = require('@/src/helpers')
const { secureLimiter, authenticated: auth } = require('@/src/middlewares')

/**
 * Mount endpoints for /admin/blogs
 * @type {Router} router - express router
 */
const router = Router({
  strict: true,
  caseSensitive: true
})
const authenticated = auth('staff')

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

router.get(
  '/tags',
  secureLimiter,
  authenticated,
  withErrorHandler(async (req, res) => {
    const tags = await handlers.listTags(req.query, res.locals.getProps())

    res.json(tags)
  })
)

module.exports = router
