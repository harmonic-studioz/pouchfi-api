const crypto = require('crypto')
const config = require('@config')
const errors = require('@/src/classes/errors')
const handlers = require('./handlers')

/**
 * Verify the request signature if
 *  it matches the webhook api key.
 *
 * @see https://mailchimp.com/developer/transactional/guides/track-respond-activity-webhooks
 *
 * @private
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 */
function verifySignature (req, res, next) {
  const { body } = req
  const signature = req.headers['x-mandrill-signature']

  if (!signature) {
    return next(errors.api.unauthorized('Not allowed'))
  }

  // Initial setup sends empty mandrill_events
  if (body.mandrill_events === '[]') {
    return next()
  }

  let url = `${config.service.host}/__internal/webhooks/mail`
  Object
    .keys(body)
    .sort()
    .forEach(function (key) {
      url += key + body[key]
    })

  const hash = crypto
    .createHmac('sha1', config.mailchimp.webhookKey)
    .update(url)
    .digest('base64')

  if (hash !== signature) {
    return next(errors.api.unauthorized('Invalid signature'))
  }

  return next()
}

/**
 * Endpoint for handling mail webhooks
 *
 * @param {Object} router - Express router
 */
module.exports = router => {
  router.post('/mail', verifySignature, async (req, res, next) => {
    try {
      const events = JSON.parse(req.body.mandrill_events)
      await handlers.mail(events)

      return res.send({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  router.post('/mail/status', async (req, res, next) => {
    try {
      const data = await handlers.checkMailStatus({ mailId: req.body.mailId }, {})
      res.json(data)
    } catch (err) {
      next(err)
    }
  })
}
