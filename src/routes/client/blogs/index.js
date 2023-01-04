'use strict'

const { Router } = require('express')

const search = require('./search')
const details = require('./details')

/**
 * Mount endpoints for `/blogs`
 *
 * @param {Router} _router - Express Router
 */
module.exports = _router => {
  const router = Router({
    strict: true,
    caseSensitive: true
  })

  search(router)
  details(router)

  _router.use('/blogs', router)
}
