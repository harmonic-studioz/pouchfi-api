'use strict'

/**
 * @typedef {import ("express").Request} Request
 * @typedef {import ("express").Response} Response
 * @typedef {import ("express").NextFunction} Next
 */

const path = require('path')
const multer = require('multer')
const { DateTime } = require('luxon')
const { promises: fs } = require('fs')
const { randomUUID } = require('crypto')

const config = require('@config')

exports.PublicFileMiddleware = multer({
  storage: config.isDev ? local() : local(),
  limits: config.isDev ? { fileSize: Math.pow(1024, 2) * 1024 } : { fileSize: Math.pow(1024, 2) * 1024 * 3 },
  fileFilter
})

function local () {
  return multer.diskStorage({
    destination: 'uploads/',
    filename: generateFilename
  })
}

function generateFilename (_req, file, cb) {
  const uuid = randomUUID()
  const date = DateTime.now().toFormat('yyyy-MM-dd')
  file.uid = `${date}-${uuid}`

  cb(null, `${file.uid}${path.extname(file.originalname)}`)
}

function fileFilter (req, file, cb) {
  if (/image/.test(file.mimetype)) {
    const filetypes = /jpg|jpeg|png|gif/
    const extnameValid = filetypes.test(path.extname(file.originalname).toLowerCase())
    const mimeValid = filetypes.test(file.mimetype)
    if (extnameValid && mimeValid) {
      return cb(null, true)
    } else {
      cb(new Error('Invalid Image Selected'), false)
    }
  } else {
    return cb(null, true)
  }
}

/**
 * Remove file middleware
 * @param {Request} req request object
 * @param {Response} _res response object
 * @param Next next next fn
 */
exports.RemoveFileMiddleware = async (req, _res, next) => {
  try {
    const isDev = config.isDev || config.isStaging
    if (isDev) {
      await fs.unlink(`uploads/${req.params.fileName}`).catch(() => {}).then(() => {
        req.fileDeleted = true
      })
    }
    next()
  } catch (err) {
    next(err)
  }
}
