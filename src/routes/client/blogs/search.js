'use strict'

const Ajv = require('ajv').default
const ajvKeywords = require('ajv-keywords').default

const handlers = require('./handlers')
const errors = require('@/src/classes/errors')
const { withErrorHandler } = require('@/src/helpers')

const ajv = new Ajv({
  useDefaults: true
})
ajvKeywords(ajv, 'transform')

const validate = ajv.compile({
  type: 'object',
  properties: {
    q: {
      type: 'string',
      minLength: 1,
      transform: ['trim']
    },
    language: {
      type: 'string',
      minLength: 1,
      transform: ['trim']
    },
    locale: {
      enum: [
        'en-us',
        'ja-jp',
        'zh-cn',
        'zh-tw'
      ]
    }
  }
})

module.exports = router => {
  router.get('/search',
    validator,
    withErrorHandler(search)
  )

  function validator (req, res, next) {
    const isValid = validate(req.query)
    if (!isValid) {
      return next(errors.api.unprocessableEntity(validate.errors[0]))
    }

    next()
  }

  async function search (req, res) {
    const filters = {
      page: req.query.page,
      query: req.query.q,
      tags: req.query.tags,
      sortBy: req.query.sortBy
    }

    const options = {
      language: req.query.language,
      locale: req.query.locale
    }

    const blogs = await handlers.search(filters, options)

    res.send({
      ok: true,
      outlets: { blogs }
    })
  }
}
