'use strict'

/**
 * @typedef {import ("@models").tokens} Model
 *
 */

/**
 * @type {Object.<string, Model>}
 */
const db = require('@models')
const { Cache } = require('@/src/classes/cache')
const { IMAGE_TYPE, LANG_FE } = require('@/src/constants')
const { ApiError } = require('@/src/classes/errors')
const SendMail = require('@/src/services/email/SendMail')
const { sq, Sequelize: { QueryTypes } } = require('@models')
const { transformedLimit, transformedPage, pagiParser, getLocale } = require('@/src/helpers')

const Tags = db.tags
const Blogs = db.blogs
const Images = db.images
const Translations = db.blogTranslations

/**
 * Retrieves the next available Blog ID
 * @param {Object} session - Express session
 * @param {number} [session.experienceId] - Existing Blog ID
 * @returns {Promise<number>} Blog ID
 */
exports.getNextId = async function getNextId (session) {
  if (session.blogId) {
    return session.blogId
  }

  const blogId = await Blogs.generateId()
  session.blogId = blogId

  return new Promise((resolve, reject) => {
    session.save((error) => {
      error ? reject(error) : resolve(blogId)
    })
  })
}

/**
 * Create a blog
 * @param {object} body request body
 * @param {string} body.title blog title
 * @param {string} body.content blog content
 * @param {Array} body.tags blog tags
 * @returns {Promise<object>}
 */
exports.createBlog = async function createBlog (blogId, body, user, session) {
  const {
    type,
    title,
    content,
    tags,
    language = LANG_FE.EN,
    hero,
    gallery
  } = body

  if (!blogId) blogId = await exports.getNextId(session)
  console.log({ blogId })

  const blog = await Blogs.create({
    id: blogId,
    type,
    staffUid: user.uid,
    needsReview: true,
    languages: [language]
  })

  const { translation, tags: returnedTags } = await sq.transaction(async t => {
    const options = { transaction: t }

    const [createdTranslation, createdTags] = await Promise.all([
      Translations.create({
        blogId,
        title,
        content,
        language
      }, options),
      extractTags(content, tags, options),
      Images.create({
        blogId,
        path: hero,
        type: IMAGE_TYPE.HERO,
        position: 0
      }, options),
      ...gallery.map((image, index) => Images.create({
        blogId,
        path: image,
        type: IMAGE_TYPE.GALLERY,
        position: index
      }))
    ])

    const translation = createdTranslation.toJSON()
    translation.id = blogId
    delete translation.blogId
    delete translation.createdAt
    delete translation.updatedAt

    for (let i = 0; i < createdTags.length; i++) {
      let tag = createdTags[i]
      tag.addBlog(blog)
      tag = tag.toClean()
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

exports.updatePermissions = async function updatePermissions (blogId, permissions, request) {
  const opts = {
    where: {
      id: blogId
    }
  }

  const record = await Blogs.findOne(opts)
  if (!record) {
    throw new ApiError(
      404,
      'invalid_request_error',
      'not_found',
      `${blogId} doesn'texist`
    )
  }

  const user = await record.getUser()
  const updates = {
    published: permissions.isPublished,
    needsReview: permissions.needsReview
  }

  if (permissions.isPublished !== undefined) {
    updates.lastPublishedAt = sq.literal('CURRENT_TIMESTAMP')
  }

  let previous, current, title
  for (const update in updates) {
    if (updates[update] !== undefined) {
      title = update
      const preparedTitle = `${title.charAt(0).toUpperCase() + title.slice(1)}`
      previous = `${preparedTitle} - ${updates[update] ? 'No' : 'Yes'}`
      current = `${preparedTitle} - ${updates[update] ? 'Yes' : 'No'}`
      break
    }
  }

  const args = {
    sections: [title],
    previous,
    current,
    timestamp: Date.now()
  }

  const history = record.history || []
  history.push(args)
  updates.history = history

  await Promise.all([
    Blogs.update(updates, opts),
    invalidateCache()
  ])

  // send published email to blog owner
  const language = getLocale(user.language && user.language.toLowerCase())
  if (permissions.isPublished && !record.lastPublishedAt) {
    SendMail.sendPublishedBlog(
      language,
      { id: blogId, user },
      request
    ).catch(err => { throw new Error(err) })
  } else if (permissions.isPublished) {
    SendMail.sendAvailableBlog(
      language,
      { user },
      request
    ).catch(err => { throw new Error(err) })
  }
}

async function invalidateCache () {
  return await Promise.all([
    Cache.forgetByPattern('*client_list*'),
    Cache.forgetByPattern('*blg_*')
  ])
}
