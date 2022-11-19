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
const handlers = require('./handlers')
const { ROLE } = require('@/src/constants')
const { ApiError } = require('@/src/classes/errors')
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
  postRoutes([], userRouter)

  router.post('/invite', secureLimiter, authenticated, rolePermission(roles), withErrorHandler(invite))
  /**
   * Handles inviting admin users
   */
  async function invite (req, res, next) {
    const inviter = req.user
    const invitee = req.body

    await handlers.inviteUser(inviter, invitee)
    res.json({ ok: true })
  }

  router.use('/users', userRouter)
}
