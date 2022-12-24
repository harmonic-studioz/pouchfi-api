'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 *
 */

const { Router } = require('express')

const handlers = require('./handlers')
const { withErrorHandler } = require('@/src/helpers/routes')

/**
 * Mount endpoints for `/emails`
 *
 * @param {Router} _router Express Router
 */
module.exports = _router => {
  const router = Router({
    strict: true,
    caseSensitive: true
  })

  router.get('/unsubscribe/:email', withErrorHandler(unsubscribe))

  /**
   * Preview template file
   * @param {Request} req request object
   * @param {Response} res response object
   */
  async function unsubscribe (req, res) {
    console.log({ email: req.params.email })
    const { html } = await handlers.unsubscribe(req.params.email)
    res.setHeader('Content-Type', 'text/html')
    res.send(html)
  }

  _router.use('/emails', router)
}
