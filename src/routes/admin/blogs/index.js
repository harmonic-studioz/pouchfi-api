'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 */

const { Router } = require('express')

const create = require('./create')
const handlers = require('./handlers')
const permissions = require('./permissions')
const { withErrorHandler } = require('@/src/helpers')
const { secureLimiter, authenticated: auth, normalLimiter } = require('@/src/middlewares')

/**
 * Mount endpoints for /admin/blogs
 * @type {Router} router - express router
 */
const router = Router({
  strict: true,
  caseSensitive: true
})
const authenticated = auth('staff')

create(createBaseMiddlewares(), router)
permissions(createBaseMiddlewares(), router)

router.get(
  '/id',
  normalLimiter,
  authenticated,
  withErrorHandler(async (req, res) => {
    const blogId = await handlers.getNextId(req.session)

    res.json({
      ok: true,
      outlets: {
        blog: {
          id: blogId
        }
      }
    })
  })
)

router.get(
  '/tags',
  secureLimiter,
  authenticated,
  withErrorHandler(async (req, res) => {
    const tags = await handlers.listTags(req.query, res.locals.getProps())

    res.json(tags)
  })
)

function createBaseMiddlewares () {
  return [
    secureLimiter,
    authenticated
  ]
}

module.exports = router
