'use strict'

const fs = require('fs')
const path = require('path')
const cors = require('cors')
const passport = require('passport')
const { Router } = require('express')
const session = require('express-session')
const connectRedis = require('connect-redis')

const config = require('@config')
const redis = require('@/src/helpers/redis')
// Middlewares
const { initializer, errorHandler, notFound, okResponse } = require('@/src/middlewares')

const router = Router({
  strict: true,
  caseSensitive: true
})

router.use(cors(config.cors))

const cookieOpts = {
  httpOnly: true,
  secure: !config.isDev,
  sameSite: config.isDev ? 'strict' : 'none'
}

router
  .use(createSession({ maxAge: config.cookies.maxAge }))
  .use(initializer({ version: `admin-v${config.version}` }))
  .use(passport.initialize())
  .use(passport.session())

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

router.use(notFound('breav-admin')).use(okResponse).use(errorHandler)

function createSession (options) {
  const Store = connectRedis(session)

  return session({
    store: new Store({ client: redis }),
    name: config.cookies.name,
    secret: config.cookies.secret,
    rolling: true,
    resave: false,
    saveUninitialized: false,
    genid: req => `${req.body.email}:${req.id}`,
    proxy: true,
    cookie: {
      ...cookieOpts,
      maxAge: options.maxAge
    }
  })
}

module.exports = router
