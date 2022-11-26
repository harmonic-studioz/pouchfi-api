'use strict'

const { Router } = require('express')

const db = require('@models')
const handlers = require('./handers')
const passport = require('./passport')
const { api } = require('@/src/classes/errors')
const { withErrorHandler } = require('@/src/helpers')
const { secureLimiter, metaHelper, authenticated } = require('@/src/middlewares')

const Users = db.users

module.exports = router => {
  const authRouter = Router({
    caseSensitive: true,
    strict: true
  })

  authRouter.post(
    '/login',
    passport.local,
    withErrorHandler(async (req, res) => {
      res.json({
        ok: true,
        outlets: {
          user: req.user
        }
      })
    })
  )

  authRouter.post(
    '/logout',
    authenticated,
    withErrorHandler(async (req, res) => {
      req.session.destroy()
      req.logout()

      res.json({ ok: true })
    })
  )

  authRouter.get(
    '/me',
    withErrorHandler(async (req, res) => {
      let user = null

      if (req.isAunthenticated()) {
        user = req.user
      }

      res.json({
        ok: true,
        outlets: { user }
      })
    })
  )

  authRouter.post(
    '/confirm_registration',
    secureLimiter,
    metaHelper(),
    withErrorHandler(async (req, res) => {
      const data = await handlers.confirmRegistration(req.body, res.locals.getProps())
      res.locals.setData(data)
    })
  )

  authRouter.post(
    '/forgot_password',
    secureLimiter,
    metaHelper(),
    withErrorHandler(async (req, res) => {
      await handlers.forgotPassword(req.body, res.locals.getProps())
      res.json({ ok: true })
    })
  )

  authRouter.post(
    '/reset_password',
    secureLimiter,
    verifyPasswordResetToken,
    withErrorHandler(async (req, res) => {
      await handlers.resetpassword(req.body.password, req.claims)
      res.json({ ok: true })
    })
  )

  /**
   * Verifies the `req.body.token` if valid
   */
  function verifyPasswordResetToken (req, _res, next) {
    try {
      req.claims = Users.verifyToken(req.body.token)

      next()
    } catch (err) {
      if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        return next(api.badRequest('Token night be expired or invalid'))
      }

      next(err)
    }
  }

  router.use('/auth', authRouter)
}
