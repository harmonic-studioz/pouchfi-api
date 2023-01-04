'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { sq, Sequelize: { QueryTypes } } = require('@models')
const { transformedLimit, transformedPage, pagiParser } = require('@/src/helpers')

const Tags = db.tags
const Blogs = db.blogs
const Translations = db.blogTranslations

/**
 * Create a blog
 * @param {object} body request body
 * @param {string} body.title blog title
 * @param {string} body.content blog content
 * @param {Array} body.tags blog tags
 * @returns {Promise<object>}
 */
exports.createBlog = async function createBlog (body, user) {
  const {
    type,
    title,
    content,
    tags,
    language
  } = body

  const blogId = await Blogs.generateId()

  const { translation, tags: returnedTags } = await sq.transaction(async t => {
    const options = { transaction: t }

    const [blog, createdTranslation, createdTags] = await Promise.all([
      Blogs.create({
        id: blogId,
        type,
        staffUis: user.uid,
        needsReview: true
      }, options),
      Translations.create({
        blogId,
        title,
        content,
        language
      }),
      extractTags(content, tags, options)
    ])

    const translation = createdTranslation.toJSON()
    translation.id = blogId

    for (let i = 0; i < createdTags.length; i++) {
      const tag = createdTags[i]
      tag.addBlog(blog)
    }

    return { blog, translation, tags: createdTags }
  })

  return { blog: translation, tags: returnedTags }
}

/**
 * Extract hashtags from text
 * @param {string} text text to search for hashtags
 * @param {Array<string>} hashtags text to search for hashtags
 * @param {object} options sequelize options
 * @returns {Promise<string[]>} array of created tags
 */
async function extractTags (text, hashtags, options) {
  const hashtagRegex = /#([^`~!@$%^&*#()\-+=\\|/.,<>?'":;{}[\]* ]+)/gi
  if (hashtagRegex.test(text)) {
    hashtagRegex.lastIndex = 0
    let hashtag
    while ((hashtag = hashtagRegex.exec(text))) {
      hashtags.push(hashtag[1])
    }
  }

  const finalTags = [...new Set(hashtags)]

  for (let i = 0; i < finalTags.length; i++) {
    let tag = await Tags.findOne({
      where: { tag: finalTags[i] }
    })
    if (tag) {
      await sq.query(`
        UPDATE public.tags SET
          "lastUsedAt" = now(),
          "trendingCount" = "trendingCount"::int + 1,
          "totalCount" = "totalCount"::int + 1
        WHERE
          tag = '${tag.tag}'
      `, {
        type: QueryTypes.UPDATE,
        plain: true
      })
      await tag.reload()
    } else {
      tag = await Tags.create({
        tag: finalTags[i]
      }, options)
    }
    finalTags[i] = tag
  }

  return finalTags
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
exports.listTags = async function listTags (query, props) {
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

  return {
    meta: props.meta,
    outlets
  }
}
