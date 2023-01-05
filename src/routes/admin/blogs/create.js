'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 * @typedef {import ("express").NextFunction} Next
 */

const Ajv = require('ajv').default
const ajvKeywords = require('ajv-keywords').default

const errors = require('@/src/classes/errors')
const handlers = require('@routes/admin/blogs/handlers')
const { withErrorHandler } = require('@/src/helpers/routes')

const ajv = new Ajv()
ajvKeywords(ajv, ['transform'])

const validate = ajv.compile({
  type: 'object',
  required: [
    'title',
    'content',
    'hero'
  ],
  properties: {
    id: {
      type: 'integer',
      minimum: 1
    },
    language: {
      type: 'string',
      enum: [
        'en',
        'ja',
        'zh_hans',
        'zh_hant'
      ]
    },
    title: {
      type: 'string',
      minLength: 5,
      maxLength: 100,
      transform: ['trim']
    },
    type: {
      type: 'string'
    },
    content: {
      type: 'string',
      minLength: 1,
      transform: ['trim']
    }
  }
})

/**
 * Endpoint to create a blog
 * @param {Object[]} middlewares - List of middlewares to be applied to this endpoint
 * @param {Object} router - Express router
 */
module.exports = (middlewares, router) => {
  middlewares.push(validator)
  middlewares.push(withErrorHandler(create))
  middlewares.push(deleteBlogIdFromSession)

  router.post('/create', middlewares)

  /**
   * Validates incoming requests
   */
  function validator (req, res, next) {
    const isValid = validate(req.body)
    if (!isValid) {
      const error = validate.errors[0]
      return next(errors.api.unprocessableEntity(error.message))
    }

    next()
  }

  /**
   * Handles creation of blogs
   * @param {Request} req request object
   * @param {Response} res response object
   * @param {Next} next next function
   */
  async function create (req, res, next) {
    const blogId = req.body.id
    delete req.body.id

    const outlets = await handlers.createBlog(blogId, req.body, req.user, req.session)
    res.status(201).json({ ok: true, outlets })

    next()
  }

  /**
   * Handles deleting blog Id
   * @param {Request} req request object
   * @param {Response} res response object
   */
  async function deleteBlogIdFromSession (req, res) {
    if (!req.seesion?.blogId) return

    delete req.session.blogId
    req.session.save(() => {})
  }
}
