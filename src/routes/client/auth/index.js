'use strict'

const { Router } = require('express')

const passport = require('./passport')
const { withErrorHandler } = require('@/src/helpers')
const { authenticated } = require('@/src/middlewares')

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

  router.use('/auth', authRouter)
}
