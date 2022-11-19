'use strict'

const handlers = require('./handlers')

module.exports = (middlewares, router) => {
  const {
    secureLimiter,
    authenticated,
    rolePermission,
    withErrorHandler
  } = middlewares
  router.post('/invite', secureLimiter, authenticated, rolePermission, withErrorHandler(invite))
  /**
   * Handles inviting admin users
   */
  async function invite (req, res, next) {
    const inviter = req.user
    const invitee = req.body

    await handlers.inviteUser(inviter, invitee)
    res.json({ ok: true })
  }
}
