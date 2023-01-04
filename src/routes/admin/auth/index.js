'use strict'

const { Router } = require('express')

const db = require('@models')
const handlers = require('./handers')
const passport = require('./passport')
const { api } = require('@/src/classes/errors')
const { withErrorHandler } = require('@/src/helpers')
const { secureLimiter, metaHelper, authenticated } = require('@/src/middlewares')

const Users = db.users

/**
 * Mount endpoints for /admin/auth
 * @type {Router} router - express router
 */
const router = Router({
  caseSensitive: true,
  strict: true
})

router.post(
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

router.post(
  '/logout',
  authenticated('staff'),
  withErrorHandler(async (req, res) => {
    req.session.destroy()
    req.logout()

    res.json({ ok: true })
  })
)

router.get(
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

router.post(
  '/confirm_registration',
  secureLimiter,
  metaHelper(),
  withErrorHandler(async (req, res) => {
    const data = await handlers.confirmRegistration(req.body, res.locals.getProps())
    res.locals.setData(data)
  })
)

router.post(
  '/forgot_password',
  secureLimiter,
  metaHelper(),
  withErrorHandler(async (req, res) => {
    await handlers.forgotPassword(req.body.email, res.locals.getProps())
    res.json({ ok: true })
  })
)

router.post(
  '/reset_password',
  secureLimiter,
  metaHelper(),
  verifyPasswordResetToken,
  withErrorHandler(async (req, res) => {
    await handlers.resetpassword(req.body.password, req.claims, res.locals.getProps())
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

module.exports = router
