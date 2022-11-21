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

const roles = [ROLE.SUPER_ADMIN, ROLE.BREAV_ADMIN]

/**
 * Mount endpoints for `/admin/users`
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const homeRouter = Router({
    strict: true,
    mergeParams: true,
    caseSenstitive: true
  })

  homeRouter.get(
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

  homeRouter.put(
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

  homeRouter.use('/homepage-contents', homeRouter)
}
