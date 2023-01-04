'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 */

const { Router } = require('express')

const config = require('@config')
const {
  metaHelper,
  secureLimiter,
  authenticated: auth,
  PublicFileMiddleware,
  RemoveFileMiddleware
} = require('@/src/middlewares')
const { withErrorHandler } = require('@/src/helpers')

const authenticated = auth('staff')

/**
 * Mount endpoints for /admin/files
 * @type {Router} router - express router
 */
const router = Router({
  strict: true,
  caseSensitive: true
})

router.post(
  '/upload',
  secureLimiter,
  authenticated,
  metaHelper(),
  PublicFileMiddleware.any(),
  upload
)

/**
 * upload handler
 * @param {Request} req request object
 * @param {Response} res response object
 */
function upload (req, res) {
  const outlets = {
    results: [],
    total: req.files.length
  }

  if (req.files?.length) {
    req.files.forEach(file => {
      if (file.uid) {
        outlets.results.push({
          uid: file.uid,
          name: file.filename,
          type: file.contentType,
          mimetype: file.mimetype,
          size: file.size,
          url: generatePathToFile(file.filename, config.isDev || config.isStaging)
        })
      }
    })
  }

  res.json({ ok: true, outlets })
}

function generatePathToFile (filename, isDev) {
  const prefix = isDev
    ? `${config.service.host}/uploads/`
    : `${config.service.host}/uploads/`

  return prefix + filename
}

router.delete(
  '/upload/:fileName',
  secureLimiter,
  authenticated,
  metaHelper(),
  RemoveFileMiddleware,
  withErrorHandler(async (req, res, next) => {
    const data = {
      meta: res.locals.getProps().meta,
      outlets: { ok: false }
    }
    if (req.fileDeleted) {
      data.outlets.ok = true
    }
    res.locals.setData(data)
    next()
  })
)

module.exports = router
