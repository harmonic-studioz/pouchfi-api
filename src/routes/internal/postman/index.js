'use strict'

const path = require('path')
const { Router } = require('express')

const helpers = require('@/src/helpers/routes')
const { authorizeFor } = require('@/src/middlewares')

/**
 * Mount endpoints for `/postman`
 *
 * @param {Router} router - Express Router
 */
module.exports = router => {
  const postman = Router({
    strict: true,
    caseSensitive: true
  })

  postman.get('/', authorizeFor('pouchDev'), helpers.withErrorHandler(getCollection))

  async function getCollection (req, res, next) {
    const file = path.join(__dirname, '..', '..', '..', '../pouchfi.postman_collection.json')

    res.download(file, (err) => {
      if (err) {
        next(err)
      }
    })
  }

  router.use('/postman', postman)
}
