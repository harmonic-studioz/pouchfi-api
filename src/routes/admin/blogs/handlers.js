'use strict'

/**
 * @typedef {import ("@models").dummyModel} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { sq, Sequelize: { QueryTypes } } = require('@models')

const Tags = db.tags
const Blogs = db.blogs

/**
 * Create a blog
 * @param {object} body request body
 * @param {string} body.title blog title
 * @param {string} body.content blog content
 * @param {string} body.link blog link
 */
exports.createBlog = async function createBlog (body) {
  const {
    title,
    content,
    link
  } = body

  const [blog, tags] = await Promise.all([
    Blogs.create({
      title,
      content,
      link
    }),
    extractTags(content)
  ])

  return { blog, tags }
}

/**
 * Extract hashtags from text
 * @param {string} text text to search for hashtags
 * @returns {Promise<string[]>} array of created tags
 */
async function extractTags (text) {
  const hashtags = []
  const hashtagRegex = /#([^`~!@$%^&*#()\-+=\\|/.,<>?'":;{}[\]* ]+)/gi
  if (hashtagRegex.test(text)) {
    hashtagRegex.lastIndex = 0
    let hashtag
    while ((hashtag = hashtagRegex.exec(text))) {
      hashtags.push(hashtag[1])
    }
  }

  for (let i = 0; i < hashtags.length; i++) {
    const tag = await Tags.findOne({
      where: { tag: hashtags[i] }
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
        type: QueryTypes.UPDATE
      })
    } else {
      await Tags.create({
        tag: hashtags[i]
      })
    }
  }

  return hashtags
}
