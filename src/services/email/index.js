'use strict'

const fetch = require('node-fetch')
const fetchResponseHandler = require('../helpers')

class MandrillService {
  constructor () {
    this.basEndpoint = 'https://mandrillapp.com/api/1.0'
  }

  /**
   * https://mandrillapp.com/api/docs/messages.JSON.html#method=info
   * @param {number} id id
   * @param {string} apiKey api key
   */
  async messageInfo (id, apiKey) {
    const moduleName = 'mandrill_messageinfo'
    const path = '/messages/info.json'
    const time = process.hrtime()
    let diff
    let elapse
    const res = await fetch(`${this.basEndpoint}${path}`, {
      method: 'POST',
      body: JSON.stringify({
        id,
        key: apiKey
      })
    })
    return new Promise((resolve, reject) => {
      fetchResponseHandler(res, moduleName)
        .then(async _resJson => {
          diff = process.hrtime(time)
          elapse = `${diff[0]}sec ${diff[1] * 1e-6}ms`
          resolve(_resJson)
        })
        .catch(err => {
          diff = process.hrtime(time)
          elapse = `${diff[0]}sec ${diff[1] * 1e-6}ms`
          console.log(moduleName, path, elapse, err)
          reject(err)
        })
    })
  }
}

module.exports = MandrillService
