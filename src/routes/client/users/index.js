'use strict'

const Ajv = require('ajv')
const { Router } = require('express')
const ajvFormats = require('ajv-formats')

const handlers = require('./handlers')
const errors = require('@/src/classes/errors')
const { secureLimiter } = require('@/src/middlewares')
const { withErrorHandler } = require('@/src/helpers/routes')

const inviteAJV = new Ajv()
ajvFormats(inviteAJV)

/**
 * Mount endpoints for `/users`
 *
 * @param {Router} _router Express Router
 */
module.exports = _router => {
  const router = Router({
    strict: true,
    caseSensitive: true
  })

  router.use(secureLimiter)

  router.post(
    '/waitlist',
    waitlistValidator,
    withErrorHandler(async (req, res) => {
      const user = await handlers.enterWaitlist(req.body)
      res.json(user)
    })
  )

  function waitlistValidator (req, _res, next) {
    const validate = inviteAJV.compile({
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string' },
        username: { type: 'string' }
      }
    })

    const isValid = validate(req.body)
    if (!isValid) {
      const error = validate.errors[0]
      return next(errors.api.unprocessableEntity(error.message))
    }

    next()
  }

  _router.use('/users', router)
}
