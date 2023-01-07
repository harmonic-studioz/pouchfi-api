'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 * @typedef {import ("express").NextFunction} Next
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { ROLE } = require('@/src/constants')
const errors = require('@/src/classes/errors')

const Blogs = db.blogs

/**
 * Validate blog if user role is cs
 * and if it has access to the blog id.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {Next} next
 */
exports.validateProviderBlog = async function validateProviderBlog (req, res, next) {
  const { user, params } = req
  const blogId = parseInt(params.blogId, 10)
  const { uid, roleCode } = user

  if (roleCode !== ROLE.POUCHFI_CS) {
    return next()
  }

  const yes = await Blogs.belongsToStaff(blogId, uid)
  if (yes) {
    return next()
  }

  next(errors.api.unauthorized('Blog not found'))
}
