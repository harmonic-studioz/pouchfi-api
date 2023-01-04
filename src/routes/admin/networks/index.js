'use strict'

const { Router } = require('express')

const {
  normalLimiter,
  secureLimiter,
  authenticated,
  rolePermission
} = require('@/src/middlewares')
const handler = require('./handlers')
const { ROLE } = require('@/src/constants')
const { withErrorHandler } = require('@/src/helpers/routes')

const roles = [
  ROLE.SUPER_ADMIN,
  ROLE.POUCHFI_ADMIN
]
const canModify = [...roles, ROLE.POUCHFI_STAFF]
const canView = [...canModify, ROLE.POUCHFI_CS]

/**
 * Mount endpoints for `/admin/networks`
 * @param {Router} router - Express Router
 */
const router = Router({
  strict: true,
  mergeParams: true,
  caseSenstitive: true
})

router.post(
  '/add',
  secureLimiter,
  authenticated('staff'),
  rolePermission(roles),
  withErrorHandler(async (req, res) => {
    const network = await handler.addNetwork(req.body)
    res.json({ ok: true, network })
  })
)

router.get(
  '/',
  normalLimiter,
  authenticated('staff'),
  rolePermission(canView),
  withErrorHandler(async (req, res) => {
    const networks = await handler.getNetworks(req.query)
    res.json({ ok: true, networks })
  })
)

router.post(
  '/:id',
  normalLimiter,
  authenticated('staff'),
  rolePermission(canView),
  withErrorHandler(async (req, res) => {
    const options = {
      networkId: req.params.id,
      includeTokens: req.query.includeTokens
    }
    const network = await handler.getNetwork(options)
    res.json({ ok: true, network })
  })
)

module.exports = router
