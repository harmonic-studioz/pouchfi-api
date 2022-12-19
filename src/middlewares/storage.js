'use strict'

const { promises: fs } = require('fs')
const path = require('path')
const { randomUUID } = require('crypto')

const multer = require('multer')

const config = require('@config')

exports.PublicFileMiddleware = multer({
  storage: config.isDev ? local() : local(),
  limits: config.isDev ? { fileSize: Math.pow(1024, 2) * 1024 } : { fileSize: Math.pow(1024, 2) * 1024 * 3 },
  fileFilter
})

function local () {
  return multer.diskStorage({
    destination: async (_req, file, cb) => {
      if (file.fieldname === 'files') {
        await getFileDestination('files', cb)
      } else if (file.fieldname === 'image' || /image/.test(file.mimetype)) {
        await getFileDestination('images', cb)
      } else {
        cb(null, 'uploads')
      }
    },
    filename: generateFilename
  })
}

function generateFilename (_req, file, cb) {
  const uuid = randomUUID()
  file.uid = uuid

  cb(null, `${uuid}${path.extname(file.originalname)}`)
}

async function getFileDestination (type, cb) {
  const date = new Date()
  const filePath = `uploads/${type}/${date.getFullYear()}/${date.getMonth() + 1}`
  await fs.mkdir(filePath, { recursive: true })
  cb(null, filePath)
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
