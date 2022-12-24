'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 *
 */

const { Router } = require('express')

const handlers = require('./handlers')
const { withErrorHandler } = require('@/src/helpers')
const metaHelper = require('@/src/middlewares/metaHelper')

/**
 * Mount endpoints for /__internal/templates
 * @param {Router} _router - express router
 */
module.exports = _router => {
  const router = Router({
    strict: true,
    caseSensitive: true
  })

  router.get('/get', metaHelper(), withErrorHandler(async (req, res, next) => {
    const data = handlers.getTemplate(req.query.name)
    res.locals.setData(data)
    next()
  }))

  router.get('/preview', withErrorHandler(preview))

  /**
   * Preview template file
   * @param {Request} req request object
   * @param {Response} res response object
   */
  async function preview (req, res) {
    const { html } = handlers.previewTemplate(req.query.name)
    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  }

  _router.use('/templates', router)
}
