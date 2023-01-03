'use strict'

const { Router } = require('express')

const {
  metaHelper,
  normalLimiter,
  secureLimiter,
  authenticated,
  rolePermission
} = require('@/src/middlewares')
const handler = require('./handlers')
const { ROLE } = require('@/src/constants')
const { withErrorHandler } = require('@/src/helpers/routes')

const roles = [ROLE.SUPER_ADMIN, ROLE.POUCHFI_ADMIN]

/**
 * Mount endpoints for `/admin/homepage-content`
 * @type {Router} router - Express Router
 */
const router = Router({
  strict: true,
  mergeParams: true,
  caseSenstitive: true
})

router.get(
  '/',
  normalLimiter,
  authenticated,
  rolePermission(roles),
  metaHelper(),
  withErrorHandler(async (req, res, next) => {
    const data = await handler.get()
    res.locals.setData(data)
    next()
  })
)

router.put(
  '/update',
  secureLimiter,
  authenticated,
  rolePermission(roles),
  metaHelper(),
  withErrorHandler(async (req, res, next) => {
    const data = await handler.update(req.body)
    res.locals.setData(data)
    next()
  })
)

module.exports = router
