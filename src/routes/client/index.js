'use strict'

const fs = require('fs')
const path = require('path')
const cors = require('cors')
const { Router } = require('express')

const config = require('@config')
// Middlewares
const {
  notFound,
  errorHandler,
  normalLimiter
  // authorizeForGuest
} = require('@/src/middlewares')

const router = Router({
  strict: true,
  caseSensitive: true
})
router.use(cors(config.cors))

// router.use(authorizeForGuest)

if (!config.isDev) {
  router.use(normalLimiter)
}

// routes
function * getRouteFiles (dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (let i = 0; i < files.length; i++) {
    if (files[i].isDirectory()) {
      yield * getRouteFiles(path.join(dir, files[i].name))
    } else {
      yield path.join(dir, files[i].name)
    }
  }
}

const routeFiles = []
for (const i of getRouteFiles(__dirname)) {
  routeFiles.push(i)
}
routeFiles
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== __filename &&
      file.slice(-3) === '.js' &&
      file.indexOf('index') > 0 &&
      !file.match(/[A-Za-z0-9]+\.spec\.js/)
    )
  })
  .forEach((file) => {
    require(file)(router)
  })

router.use(notFound('pouchfi-client')).use(errorHandler)

module.exports = router
