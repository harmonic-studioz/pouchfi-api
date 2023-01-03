'use strict'

const SendMail = require('@SendMail')
const { EMAIL_TYPE } = require('@/src/constants')

/**
 * Send Partnership email to pouchfi
 * @param {Object} options request body
 */
exports.sendContactUsEmail = async function sendContactUsEmail (options) {
  const {
    email,
    message,
    lastName,
    firstName
  } = options

  const name = `${firstName} ${lastName}`

  const html = `
    <p>${message}</p>
    </br>

    Yours faithfully,<br/>
    ${name}<br/>
    (${email})
  `

  const sent = await SendMail.sendContactUsEmail(html)

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

  return result
}
