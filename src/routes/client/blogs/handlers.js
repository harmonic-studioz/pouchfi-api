'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

const { DateTime } = require('luxon')

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { Sequelize: { Op } } = require('@models')
const errors = require('@/src/classes/errors')
const { transformedLimit, transformedPage, pagiParser } = require('@/src/helpers')

const Tags = db.tags
const Blogs = db.blogs

const LANGUAGE_BY_LOCALE_WITH_FALLBACK = {
  'en-us': 'en',
  'ja-jp': 'ja',
  'zh-cn': 'zh_hans',
  'zh-tw': 'zh_hant'
}

/**
 * List tags
 * @param {object} query request query object
 * @param {object} query.limit number of results
 * @param {object} query.page result page
 * @param {object} props request props
 * @param {object} props.meta request meta data
 * @returns {Promise<object>} tags
 */
exports.listTags = async function listTags (query) {
  const limit = transformedLimit(query.limit)
  const page = transformedPage(query.page)

  const outlets = {
    tags: [],
    summary: {
      showing: [0, 0],
      total: 0
    }
  }

  const tags = await Tags.findAndCountAll({
    limit,
    offset: limit * (page - 1)
  })
  if (tags && tags.count > 0) {
    outlets.tags = tags.rows
    outlets.summary.showing = pagiParser(page, limit, tags.count)
    outlets.summary.total = tags.count
  }

  return outlets
}

/**
 * Searches for blogs that matches the given `query`
 * @param {Object} filters - Filters to be applied to search
 * @param {string} filters.q - The value to be searched
 * @param {Object} options - Options
 * @param {string} options.locale - Language of the blog translation
 * @param {string} options.language - Language filter
 * @returns {Promise<Object[]>} List of blogs based on the `query`
 */
exports.search = async function search (filters, options) {
  const {
    locale,
    language
  } = options

  if (locale && !language) {
    options.language = LANGUAGE_BY_LOCALE_WITH_FALLBACK[locale]
  }

  const blgs = await Blogs.guest.search(filters, options)

  /**
   * @type {Object}
   * BLogs mapped by their `id`
   *  used to check if the blog has
   *  already been selected with it's translation
   */
  const blogsById = {}
  for (const row of blgs.results) {
    const blogId = row.id

    for (const blog of row.blogs) {
      const key = `blog_${blogId}`

      if (blogsById[key] !== undefined && blogsById[key].language === options.language) {
        // blog has already been selected and is using the primary language by locale
        continue
      }

      blogsById[key] = blog
    }
  }

  const blogs = Object.values(blogsById)

  return { blogs, count: blgs.count }
}

/**
 * Retrieves an blog details by the provided `blogId`
 * @param {number} blogId - Blog ID
 * @param {Object} [options] - Options
 * @param {string} options.language - Language of the blog translation
 * @returns {Promise<Object|null>} blog details for blog details page
 */
exports.details = async function details (blogId, options) {
  const blog = await Blogs.guest.detailsById(blogId, options)
  if (!blog) {
    throw new errors.domain.EntityNotFound(blogId, {
      model: 'Blogs',
      property: 'id'
    })
  }

  return blog
}

exports.getTrendingTags = async function getTrendingTags () {
  const now = DateTime.now()
  const twoWeeksAgo = now.minus({ weeks: 2 })
  let tags = await Tags.findAll({
    where: {
      lastUsedAt: {
        [Op.between]: [twoWeeksAgo.toFormat('yyyy-MM-dd HH:mm:ss.uZ'), now.toFormat('yyyy-MM-dd HH:mm:ss.uZ')]
      },
      trendingCount: { [Op.gt]: 0 }
    },
    order: [['lastUsedAt', 'DESC']]
  })

  if (!tags) {
    tags = await Tags.findAll({
      where: {
        lastUsedAt: {
          [Op.between]: [twoWeeksAgo.toFormat('X'), now.toFormat('X')]
        },
        totalCount: { [Op.gt]: 0 }
      },
      order: [['lastUsedAt', 'DESC']]
    })
  }

  const compareFn = (a, b) => {
    // check to see if the last mentioned is equal or less than an hour
    if (b.lastUsedAt - a.lastUsedAt <= 3600) {
      if (a.trendingCount < b.trendingCount) {
        return 1
      }

      if (a.trendingCount > b.trendingCount) {
        return -1
      }

      return 0
    }
    return 0
  }
  tags.sort(compareFn)

  return tags
}
