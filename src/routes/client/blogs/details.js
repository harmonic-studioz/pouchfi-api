'use strict'

const handlers = require('./handlers')
const errors = require('@/src/classes/errors')
const { LANG, LOCALE } = require('@/src/constants')
const { withErrorHandler } = require('@/src/helpers/routes')

module.exports = router => {
  router.get('/details/:id',
    validator,
    withErrorHandler(details))

  function validator (req, res, next) {
    const blogId = parseInt(req.params.id, 10)

    if (isNaN(blogId)) {
      return next(errors.api.unprocessableEntity(':id parameter must be a number'))
    }

    req.params.id = blogId

    next()
  }

  /**
   * Sends the experience details as the response
   */
  async function details (req, res) {
    const experience = await handlers.details(req.params.id, {
      language: req.query.language || LANG.EN,
      locale: req.query.locale || LOCALE.EN
    })

    res.json({
      ok: true,
      outlets: {
        experience
      }
    })
  }
}
