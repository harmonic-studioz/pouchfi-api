'use strict'

const { Router } = require('express')

const {
  secureLimiter,
  authenticated,
  rolePermission
} = require('@/src/middlewares')
const handlers = require('./handlers')
const { ROLE } = require('@/src/constants')
const { withErrorHandler } = require('@/src/helpers/routes')

const roles = [
  ROLE.SUPER_ADMIN,
  ROLE.POUCHFI_ADMIN
]
const canModify = [...roles, ROLE.POUCHFI_STAFF]

/**
 * Mount endpoints for `/admin/networks`
 * @type {Router} _router - Express Router
 */
const router = Router({
  strict: true,
  mergeParams: true,
  caseSenstitive: true
})

router.post(
  '/custom',
  secureLimiter,
  authenticated('staff'),
  rolePermission(canModify),
  withErrorHandler(async (req, res) => {
    const result = await handlers.sendUsersMail(req.body)
    res.json(result)
  })
)

module.exports = router
