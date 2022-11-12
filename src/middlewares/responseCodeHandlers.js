'use strict'

const { ApiError } = require('@/src/classes/errors')

exports.notFound = (provider) => (req, res, next) => {
  // Format and return all 404 responses
  try {
    // if not match
    if (!req.route) {
      res.locals.meta.reqId = req.id
      throw new ApiError(
        404,
        'generic_error',
        'endpoint_not_found',
        `Not Found = ${req.method} ${provider}-${req.originalUrl}`
      )
    }
    next()
  } catch (err) {
    next(err)
  }
}

exports.okResponse = (req, res) => {
  // Format and return all 2xx response
  const { meta, outlets } = res.locals

  meta.claims = req.claims // user info if any
  meta.token = req.token // JWT if any

  res.send({
    meta,
    outlets
  })
}

exports.errorHandler = (err, req, res, _next) => {
  // Format and return all 4xx / 5xx response
  if (req && req.log) {
    // log error
    req.log.error(err.message, {
      ...err,
      stack: err.stack,
      reqId: req.id
    })
  }

  let standardResponse = {
    meta: {
      ...(res.locals ? res.locals.meta : res.locals)
    },
    error:
      err instanceof ApiError
        ? err.toExternalResponse()
        : { ...err, message: err.message }
  }

  // if its external route, simplify the response
  if (res.locals && res.locals.meta && res.locals.meta.external) {
    standardResponse =
      err instanceof ApiError
        ? err.toExternalResponse()
        : { ...err, message: err.message }
  }

  const status = err.status
    ? err.status
    : err.statusCode
      ? err.statusCode
      : res.statusCode === 200
        ? 500
        : res.statusCode

  // additional checking for unit test
  return res.status
    ? res.status(isNaN(status) ? 500 : status).send(standardResponse)
    : res
}
