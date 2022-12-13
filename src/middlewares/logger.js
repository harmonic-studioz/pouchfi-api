'use strict'

const { Logger } = require('../helpers/logger')

module.exports = (req, res, next) => {
  req.log = Logger(req.path, { serviceName: 'INTERNAL' })

  // skip for OPTIONS request
  if (req.method === 'OPTIONS') {
    return next()
  }

  // log incoming request
  const httpRequest = {
    status: undefined,
    requestUrl: req.url,
    requestMethod: req.method,
    remoteIp: req.connection.remoteAddress,
    usrAgent: req.headers['user-agent'],
    responseSize: 0,
    latency: {}
  }

  req.log.info(`${req.url}`, {
    httpRequest,
    reqId: req.id,
    query: req.query || undefined,
    params: req.params || undefined,
    body: req.body || undefined
  })

  req.on('close', () => {
    /**
     * on close request we add more log and add more attributes => latency and response size
     * this is very useful to trace what has been done with some request within the timeframe
     */
    const latencyMs = Date.now() - res.locals.startEpoch
    httpRequest.latency = {
      seconds: Math.floor(latencyMs / 1e3),
      nanos: Math.floor(latencyMs % 1e3)
    }
    httpRequest.responseSize = (res.getHeader && Number(res.getHeader('Content-Length'))) || 0
    httpRequest.status = res.statusCode
    req.log.info(`${req.url}`, {
      httpRequest,
      reqId: req.id,
      query: req.query || undefined,
      params: req.params || undefined,
      body: req.body || undefined
    })
  })

  next()
}
