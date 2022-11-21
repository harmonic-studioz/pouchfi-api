'use strict'

const { Router } = require('express')

const get = require('./get')

/**
 * Mount endpoints for `/homepage-contents`
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const homepageContents = Router({
    strict: true,
    caseSensitive: true
  })

  get(homepageContents)

  router.use('/homepage-contents', homepageContents)
}
