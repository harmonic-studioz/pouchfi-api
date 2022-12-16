'use strict'

exports.transformedLimit = function transformedLimit (limit) {
  const availableLimit = [2, 10, 25, 50, 60, 100, 300, 500]
  const newLimit = Number(limit)
  return availableLimit.includes(newLimit) ? newLimit : newLimit < 25 ? newLimit : 25
}

exports.transformedPage = function transformedPage (page) {
  return parseInt(page, 10) || 1
}

/**
 * returns an enum with first item indicating the position i.e. it has offsetting n-1 results of the results you're getting
 * the second item indicates how many results
 * @param {number} page page number
 * @param {number} limit limit
 * @param {number} total total count of results
 * @returns {array} [current result index, number of results]
 * @example
 * pagiParser(1, 3, 5) = [1, 3]
 * pagiParser(2, 3, 5) = [4, 3]
 */
exports.pagiParser = function pagiParser (page, limit, total) {
  if (total === 0) return [0, 0]

  let k = page * limit
  if (total <= k) {
    k = total
  }

  return [(page - 1) * limit + 1, k]
}
