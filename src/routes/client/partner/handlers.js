'use strict'

const fs = require('fs')

const SendMail = require('@SendMail')
const base64 = require('@/src/helpers/base64')
const { EMAIL_TYPE } = require('@/src/constants')

/**
 * Send Partnership email to pouchfi
 * @param {Object} options request body
 */
exports.sendPartnerEmail = async function sendPartnerEmail (options) {
  const {
    name,
    email,
    message,
    files
  } = options

  const html = `
    <p>${message}</p>
    </br>

    Yours faithfully,<br/>
    ${name}<br/>
    (${email})
  `

  const attachments = files
    ? files.length === 0
      ? []
      : files.map(file => ({
        type: file.contentType || file.mimetype,
        name: file.originalname,
        content: base64.encode(fs.readFileSync(file.path))
      }))
    : []

  const sent = await SendMail.sendPartnershipEmail(html, attachments)

  let result = {}
  if (sent.error) {
    result = {
      event: {
        status: 'fail',
        type: EMAIL_TYPE.PARTNER_WITH_US
      },
      req: sent.message,
      res: sent.error
    }
  } else {
    result = {
      event: {
        status: 'in-progress',
        type: EMAIL_TYPE.PARTNER_WITH_US
      },
      res: sent.res
    }
  }

  // delete file
  if (files && files.length) {
    files.forEach(file => {
      fs.unlink(file.path, () => {})
    })
  }

  return result
}
