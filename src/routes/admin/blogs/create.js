'use strict'

const Ajv = require('ajv').default
const ajvKeywords = require('ajv-keywords').default

// const errors = require('@/src/classes/errors')
// const handlers = require('@routes/admin/blogs/handlers')
// const { withErrorHandler } = require('@/src/helpers/routes')

const ajv = new Ajv()
ajvKeywords(ajv, ['transform'])

// const validate = ajv.compile({
//   type: 'object',
//   required: [
//     'id',
//     'language',
//     'title',
//     'type',
//     'content'
//   ],
//   properties: {
//     id: {
//       type: 'integer',
//       minimum: 1
//     },
//     language: {
//       type: 'string',
//       enum: [
//         'en',
//         'ja',
//         'zh_hans',
//         'zh_hant'
//       ]
//     },
//     title: {
//       type: 'string',
//       minLength: 5,
//       maxLength: 100,
//       transform: ['trim']
//     },
//     type: {
//       type: 'string'
//     },
//     content: {
//       type: 'string',
//       minLength: 1,
//       transform: ['trim']
//     }
//   }
// })

/**
 * Endpoint to create a blog
 * @param {Object[]} middlewares - List of middlewares to be applied to this endpoint
 * @param {Object} router - Express router
 */
module.exports = (middlewares, router) => {}
