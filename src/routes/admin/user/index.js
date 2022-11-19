'use strict'

const { Router } = require('express')

const {
  normalLimiter,
  secureLimiter,
  authenticated,
  rolePermission,
  metaHelper
} = require('@/src/middlewares')
const handlers = require('./handlers')
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

  userRouter.post(
    '/invite',
    secureLimiter,
    authenticated,
    rolePermission(roles),
    withErrorHandler(async (req, res) => {
      const inviter = req.user
      const invitee = req.body

      await handlers.inviteUser(inviter, invitee)
      res.json({ ok: true })
    })
  )

  userRouter.get(
    '/list',
    normalLimiter,
    authenticated,
    rolePermission(canModify),
    metaHelper(),
    withErrorHandler(async (req, res, next) => {
      const data = await handlers.list(req.query, res.locals.getProps())
      res.locals.setData(data)
      next()
    })
  )

  userRouter.get(
    '/one/:uid',
    secureLimiter,
    authenticated,
    rolePermission(canView, (req) => req.params.uid === req.user.uid),
    metaHelper(),
    withErrorHandler(async (req, res, next) => {
      const data = await handlers.one(req.params.uid, res.locals.getProps())
      res.locals.setData(data)
      next()
    })
  )

  router.use('/users', userRouter)
}
