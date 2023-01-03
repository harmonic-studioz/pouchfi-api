'use strict'

const { Router } = require('express')

const config = require('@config')
const { secureLimiter, authenticated: auth } = require('@/src/middlewares')

const authenticated = auth()
