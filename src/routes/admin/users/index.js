'use strict'

const Ajv = require('ajv')
const { Router } = require('express')
const ajvFormats = require('ajv-formats')

const {
  metaHelper,
  normalLimiter,
  authenticated,
  rolePermission
} = require('@/src/middlewares')
const handlers = require('./handers')
const { ROLE } = require('@/src/constants')
const { withErrorHandler } = require('@/src/helpers/routes')

const roles = [
  ROLE.SUPER_ADMIN,
  ROLE.POUCHFI_ADMIN,
  ROLE.POUCHFI_ACCOUNTING
]
const canModify = [...roles, ROLE.POUCHFI_STAFF]

const inviteAJV = new Ajv()
ajvFormats(inviteAJV)

/**
 * Mount endpoints for `/admin/users`
 *
 * @type {Router} - Express Router
 */
const router = Router({
  strict: true,
  mergeParams: true,
  caseSenstitive: true
})

router.get(
  '/list',
  normalLimiter,
  authenticated('staff'),
  rolePermission(canModify),
  metaHelper(),
  withErrorHandler(async (req, res, next) => {
    const data = await handlers.list(req.query)
    res.locals.setData(data)
    next()
  })
)

module.exports = router
