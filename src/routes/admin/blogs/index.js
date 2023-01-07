'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 */

const { Router } = require('express')

const get = require('./get')
const list = require('./list')
const update = require('./update')
const create = require('./create')
const handlers = require('./handlers')
const deleteBlog = require('./delete')
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
update(createBaseMiddlewares(), router)
deleteBlog(createBaseMiddlewares(), router)
get([normalLimiter, authenticated], router)
permissions(createBaseMiddlewares(), router)
list([normalLimiter, authenticated], router)

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
  '/tags/list',
  secureLimiter,
  authenticated,
  withErrorHandler(async (req, res) => {
    const tags = await handlers.listTags(req.query.blogId)

    res.json({
      ok: true,
      meta: res.locals.getMeta(),
      tags
    })
  })
)

router.post(
  '/tags/create',
  secureLimiter,
  authenticated,
  withErrorHandler(async (req, res) => {
    const tag = await handlers.createTag(req.body.tag)

    res.json({
      ok: true,
      outlets: {
        tag
      }
    })
  })
)

router.delete(
  '/tags/:id',
  secureLimiter,
  authenticated,
  withErrorHandler(async (req, res) => {
    await handlers.deleteTag(req.params.id)

    res.json({ ok: true })
  })
)

function createBaseMiddlewares () {
  return [
    secureLimiter,
    authenticated
  ]
}

module.exports = router
