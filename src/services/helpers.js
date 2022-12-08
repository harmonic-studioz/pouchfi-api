'use strict'

const { ServiceError } = require('@/src/classes/errors')

module.exports = async (res, context) => {
  let data

  // when error happens
  if (res.status > 399) {
    // this usually happens when server returns error with non application/json
    if (res.headers.get('content-type').indexOf('application/json') < 0) {
      const f = await res.text()
      throw new ServiceError(res.status, context, 'invalid_json_response', f, {
        raw: f
      })
    }
    data = await res.json()
    // Default throw
    throw new ServiceError(
      res.status,
      context,
      'generic_error',
      `${res.statusText}: ${
        data.message
         ? data.message
         : JSON.stringify(data.error ? data.error.details : data.error)
      }}`,
      { raw: data.error || data }
    )
  }

  /**
   * For all 2xx request
   * Handle unexpected return type (non-json)
   */
  try {
    data = await res.json()
    return data
  } catch (err) {
    // This usually happens when server return error with non application/json
    throw new ServiceError(
      res.status,
      context,
      'invalid_json_response',
      res.statusText,
      { raw: err }
    )
  }
}
