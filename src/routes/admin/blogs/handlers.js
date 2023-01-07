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
const { ApiError, domain } = require('@/src/classes/errors')
const SendMail = require('@/src/services/email/SendMail')
const { IMAGE_TYPE, LANG_FE } = require('@/src/constants')
const { pagiParser, getLocale } = require('@/src/helpers')
const { sq, Sequelize: { QueryTypes } } = require('@models')

const Tags = db.tags
const Blogs = db.blogs
const Kinds = db.kinds
const Images = db.images
const Translations = db.blogTranslations

/**
 * Retrieves the next available Blog ID
 * @param {Object} session - Express session
 * @param {number} [session.blogId] - Existing Blog ID
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

    const tagPromises = []
    for (let i = 0; i < createdTags.length; i++) {
      let tag = createdTags[i]
      tagPromises.push(tag.addBlog(blog))
      tag = tag.toClean()
    }
    await Promise.all(tagPromises)

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
 * @param {object} [blogId] blogId
 * @returns {Promise<object>} tags
 */
exports.listTags = async function listTags (blogId) {
  if (blogId) {
    const blog = await Blogs.findByPk(blogId)

    if (!blog) {
      throw new domain.EntityNotFound(blogId, {
        model: 'Blogs'
      })
    }

    return Kinds.listByBlogId(blogId)
  } else {
    return Tags.findAll()
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

/**
 * List Blogs based on the provided filters
 * @param {Object} query - Query contains neccessary properties to filter the list
 * @param {number} query.limit - Limit the number of blogs to return per page
 * @param {number} query.page - Offset to be used
 * @param {string} query.search - Search term to filter
 * @param {string} query.provider - Provider to filter
 * @param {boolean} query.providerStatus - Inactive provider status
 * @param {string} query.desc - Description to filter
 * @param {string} query.type - Type to filter
 * @param {string} query.languageFilter - language to filter by
 * @param {boolean} query.published - Published
 * @param {boolean} query.needsReview - needsReview status to filter status to filter
 * @param {string[]} query.date - Sort the paginated list by date
 * @param {string} query.dateFilter - date field the date uses
 * @param {string} query.memo - blog memo
 * @param {string} query.field - field to sort by
 * @param {string} query.order - Sort order
 * @param {Object} options - Options
 * @param {number} options.limit - Number of blogs to show per page
 * @param {number} options.page - `page` will be used to calculate the offset
 * @param {string} options.userUid - logged in user uid
 * @param {string} options.role - logged in user role
 * @returns {Promise<Object>} Paginated list of Blogs
 */
exports.list = async function list (query, options) {
  const {
    limit,
    page,
    userUid,
    role
  } = options

  const { blogs, count } = await Blogs.paginate(query, {
    limit,
    offset: limit * (page - 1),
    userUid,
    role
  })

  const paginated = {
    blogs,
    summary: {
      showing: [0, 0],
      total: count
    }
  }

  paginated.summary.showing = pagiParser(page, limit, blogs.length)

  return paginated
}

/**
 * Retrieves a blog from the provided `blogId`
 * @param {number} blogId - Blog ID
 * @param {Object} options - Options
 * @param {string} options.language - Locale for the packages
 * @returns {Promise<Object>} Retrieved Blog
 */
exports.get = async function get (blogId, options) {
  const blog = await Blogs.findByLanguage(blogId, options.language)

  if (!blog) {
    throw new ApiError(
      404,
      'invalid_request_error',
      'not_found',
      `ID: ${blogId} not found`
    )
  }

  return blog
}

/**
 * Updates the Blog basic information
 *
 * @param {number} blogId - Blog ID
 * @param {Object} body - Properties to be updated
 * @returns {Promise<Object>} Updated Blog
 */
exports.update = async function update (blogId, body, request = {}) {
  const blog = await Blogs.findByPk(blogId)

  if (!blog) {
    throw new ApiError(
      404,
      'invalid_request_error',
      'not_found',
      `${blogId} not found`
    )
  }

  const user = await blog.getUser()
  const blogTags = (await blog.getTags()).map(tag => tag.id)

  const tags = body.tags
  const tagPromises = []
  if (tags && Array.isArray(tags) && tags.length > 0) {
    // add new tags
    for (const tag of tags) {
      if (!blogTags.includes(tag)) {
        tagPromises.push(blog.addTag(tag))
      }
    }
    // remove old tags
    for (const tag of blogTags) {
      if (!tags.includes(tag)) {
        tagPromises.push(blog.removeTag(tag))
      }
    }
  }

  const updates = {
    title: body.title,
    content: body.content,
    needsReview: true,
    published: false,
    tags: body.tags
  }
  const language = body.language || LANG_FE.EN

  await sq.transaction(async t => {
    await blog.update(updates, {
      transaction: t
    })

    await Translations.update(updates, {
      where: { language, blogId },
      transaction: t
    })

    await Promise.all(tagPromises)

    // send email
    if (body.published !== undefined && user) {
      await sendStatusEmail(blog, user, request)
    }
  })

  await invalidateCache()

  return await exports.get(blogId, { language })
}

/**
 * Send status update email from the blog update.
 *
 * If the blog is being set as published, we check if
 * it was already published and send "blog available" email,
 * else we send a completed blog registration.
 *
 * If the blog is being set as unavailable,
 * we just send the unavailable email.
 *
 * @param {object} blog
 * @param {object} user
 * @param {object} request
 *
 * @returns {Promise<any>}
 */
async function sendStatusEmail (blog, user, request) {
  const { published } = request.body
  const { lastPublishedAt } = blog

  const lang = getLocale(user.language && user.language.toLowerCase())

  if (published) {
    if (lastPublishedAt) {
      return SendMail.sendAvailableBlog(lang, { user }, request)
    }

    return SendMail.sendCompletedBlog(lang, request)
  }

  return SendMail.sendUnavailableBlog(lang, { user }, request)
}

/**
 * Create a new tag
 * @param {string} tag tag to be added
 * @returns {Promise<object} created tag
 */
exports.createTag = async function createTag (tag) {
  const inst = await Tags.findOrCreate({
    where: { tag }
  })

  await Cache.forgetByPattern()

  return inst[0]
}

/**
 * Delete a tag
 * @param {number} tagId tag ID
 * @returns {Promise<void>}
 */
exports.deleteTag = async function deleteTag (tagId) {
  await Tags.destroy({
    where: { id: tagId }
  })
}

/**
 * Delete a blog
 * @param {number} blogId blog ID
 */
exports.deleteBlog = async function deleteBlog (blogId) {
  const blog = await Blogs.findByPk(blogId)

  if (!blog) {
    throw new ApiError(
      404,
      'invalid_request_error',
      'not_found',
      `${blogId} not found`
    )
  }

  await blog.destroy()
  await invalidateCache()
}
