'use strict'

const { Router } = require('express')

const {
  metaHelper,
  normalLimiter,
  secureLimiter,
  authenticated,
  rolePermission
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

  userRouter.delete(
    '/one/:uid',
    secureLimiter,
    authenticated,
    rolePermission(canModify),
    withErrorHandler(async (req, res) => {
      await handlers.deleteUser(req.body, req.user)
      res.json({ ok: true })
    })
  )

  userRouter.patch(
    '/one',
    secureLimiter,
    authenticated,
    rolePermission(canModify, (req) => req.body.uid === req.user.uid),
    withErrorHandler(async (req, res) => {
      await handlers.updateUser(req.body, req.user)
      res.json({ ok: true })
    })
  )

  userRouter.post(
    '/xls',
    secureLimiter,
    authenticated,
    rolePermission(roles),
    metaHelper(),
    withErrorHandler(async (req, res) => {
      const {
        report,
        fileName
      } = await handlers.xls(req.query, req.user.displayname, res.locals.getProps())
      res.set({
        'Content-disposition': `attachment; filename=${fileName}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      res.set('Access-Control-Expose-Headers', 'Content-Disposition')
      res.send(report)
    })
  )

  userRouter.post(
    '/resend_invitation',
    secureLimiter,
    authenticated,
    rolePermission(canModify),
    withErrorHandler(async (req, res) => {
      await handlers.resendInvitation(req.body, req.user, req)
      res.json({ ok: true })
    })
  )

  router.use('/users', userRouter)
}
