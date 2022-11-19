'use strict'

const { Router } = require('express')

const {
  normalLimiter,
  secureLimiter,
  authenticated,
  rolePermission
} = require('@/src/middlewares')
const getRoutes = require('./get')
const postRoutes = require('./post')
const { ROLE } = require('@/src/constants')
const { withErrorHandler } = require('@/src/helpers/routes')

const roles = [
  ROLE.SUPER_ADMIN,
  ROLE.BREAV_ADMIN,
  ROLE.BREAV_ACCOUNTING
]
const canModify = [...roles, ROLE.BREAV_STAFF]
const canView = [...canModify, ROLE.BREAV_CS]

/**
 * Mount endpoints for `/admin/users`
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const userRouter = Router({
    strict: true,
    mergeParams: true,
    caseSenstitive: true
  })

  getRoutes([], userRouter)
  postRoutes([secureLimiter, authenticated, rolePermission(roles), withErrorHandler], userRouter)

  router.use('/users', userRouter)
}
