'use strict'

const Ajv = require('ajv')
const { Router } = require('express')
const ajvFormats = require('ajv-formats')

const {
  metaHelper,
  normalLimiter,
  secureLimiter,
  authenticated,
  rolePermission
} = require('@/src/middlewares')
const handler = require('./handlers')
const { ROLE } = require('@/src/constants')
const errors = require('@/src/classes/errors')
const { withErrorHandler } = require('@/src/helpers/routes')

const roles = [
  ROLE.SUPER_ADMIN,
  ROLE.POUCHFI_ADMIN,
  ROLE.POUCHFI_ACCOUNTING
]
const canModify = [...roles, ROLE.POUCHFI_STAFF]
const canView = [...canModify, ROLE.POUCHFI_CS]

const inviteAJV = new Ajv()
ajvFormats(inviteAJV)

/**
 * Mount endpoints for `/admin/users`
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const staffRouter = Router({
    strict: true,
    mergeParams: true,
    caseSenstitive: true
  })

  staffRouter.post(
    '/invite',
    secureLimiter,
    authenticated,
    rolePermission(roles),
    inviteValidator,
    withErrorHandler(async (req, res) => {
      const inviter = req.user
      const invitee = req.body

      await handler.inviteUser(inviter, invitee)
      res.json({ ok: true })
    })
  )

  staffRouter.get(
    '/list',
    normalLimiter,
    authenticated,
    rolePermission(canModify),
    metaHelper(),
    withErrorHandler(async (req, res, next) => {
      const data = await handler.list(req.query, res.locals.getProps())
      res.locals.setData(data)
      next()
    })
  )

  staffRouter.get(
    '/one/:uid',
    secureLimiter,
    authenticated,
    rolePermission(canView, (req) => req.params.uid === req.user.uid),
    metaHelper(),
    withErrorHandler(async (req, res, next) => {
      const data = await handler.one(req.params.uid, res.locals.getProps())
      res.locals.setData(data)
      next()
    })
  )

  staffRouter.delete(
    '/one/:uid',
    secureLimiter,
    authenticated,
    rolePermission(canModify),
    withErrorHandler(async (req, res) => {
      await handler.deleteUser(req.body, req.user)
      res.json({ ok: true })
    })
  )

  staffRouter.patch(
    '/one',
    secureLimiter,
    authenticated,
    rolePermission(canModify, (req) => req.body.uid === req.user.uid),
    withErrorHandler(async (req, res) => {
      await handler.updateUser(req.body, req.user)
      res.json({ ok: true })
    })
  )

  staffRouter.post(
    '/xls',
    secureLimiter,
    authenticated,
    rolePermission(roles),
    metaHelper(),
    withErrorHandler(async (req, res) => {
      const {
        report,
        fileName
      } = await handler.xls(req.query, req.user.username, res.locals.getProps())
      res.set({
        'Content-disposition': `attachment; filename=${fileName}`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      res.set('Access-Control-Expose-Headers', 'Content-Disposition')
      res.send(report)
    })
  )

  staffRouter.post(
    '/resend_invitation',
    secureLimiter,
    authenticated,
    rolePermission(canModify),
    withErrorHandler(async (req, res) => {
      await handler.resendInvitation(req.body, req.user, req)
      res.json({ ok: true })
    })
  )

  staffRouter.get(
    '/autosuggest',
    secureLimiter,
    authenticated,
    metaHelper(),
    withErrorHandler(async (req, res, next) => {
      const data = await handler.autosuggest(req.query, res.locals.getProps())
      res.locals.setData(data)
      next()
    })
  )

  const inviteValidate = inviteAJV.compile({
    type: 'object',
    required: [
      'firstName',
      'lastName',
      'email',
      'roleCode',
      'language'
    ],
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      roleCode: { type: 'string' }, // add more validation later
      language: { type: 'string', enum: ['en-US', 'ja-JP'] }
    }
  })

  function inviteValidator (req, _res, next) {
    const allowedRolesForNonSuperAdmin = [
      ROLE.SUPPLIER,
      ROLE.POUCHFI_ADMIN
    ]
    const isValid = inviteValidate(req.body)
    if (!isValid) {
      const error = inviteValidate.errors[0]
      return next(errors.api.unprocessableEntity(error.message))
    }

    const inviterRoleCode = req.user.roleCode
    if (inviterRoleCode !== ROLE.SUPER_ADMIN) {
      if (!allowedRolesForNonSuperAdmin.includes(req.body.roleCode)) {
        return next(errors.api.forbidden(`Cannot invite ${req.body.roleCode} if inviter is ${inviterRoleCode}`))
      }
    }

    next()
  }

  router.use('/users', staffRouter)
}
