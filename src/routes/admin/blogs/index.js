'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 *
 */

const { Router } = require('express')

/**
 * Mount endpoints for /admin/blogs
 * @param {Router} _router - express router
 */
module.exports = _router => {
  const router = Router({
    strict: true,
    caseSensitive: true
  })

  _router.use('/blogs', router)
}
