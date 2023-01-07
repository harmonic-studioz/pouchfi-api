'use strict'

/**
 * @typedef {import ("sequelize").Sequelize} Sequelize
 * @typedef {import ("sequelize").DataTypes} DataTypes
 *
 */

const _ = require('lodash')
const { QueryTypes } = require('sequelize')

const { IMAGE_TYPE } = require('@/src/constants')
const { convertLocaleToLanguage, escapeBackslash } = require('@/src/helpers')

const SEARCH_BLOGS_LIMIT = 18
const EXCLUDE_LANGUAGE_BY_LOCALE = {
  'en-us': ['ja'],
  'ja-jp': ['en']
}

/**
 *
 * @param {Sequelize} sequelize
 * @param {DataTypes} DataTypes
 * @returns
 */
module.exports = (sequelize, DataTypes) => {
  const Blogs = sequelize.define('blogs', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      unique: true,
      primaryKey: true
    },
    type: DataTypes.STRING,
    // flag to indicate if blog is available
    published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    needsReview: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    memo: {
      type: DataTypes.TEXT
    },
    history: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    languages: {
      type: DataTypes.ARRAY(DataTypes.ENUM(['en', 'ja', 'zh_hans', 'zh_hant']))
    },
    staffUid: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: sequelize.models.staffs
      }
    },
    lastPublishedAt: {
      type: DataTypes.DATE
    },
    lastReadAt: {
      type: DataTypes.DATE
    }
  }, {
    schema: 'public',
    freezeTableName: true
  })

  Blogs.associate = function associate (models) {
    Blogs.belongsToMany(models.tags, {
      through: models.kinds,
      onDelete: 'CASCADE',
      onUpdate: 'NO ACTION',
      as: 'tags',
      foreignKey: 'blogId'
    })

    Blogs.hasMany(models.blogTranslations, {
      foreignKey: 'blogId',
      sourceKey: 'id',
      as: 'translations'
    })

    Blogs.hasMany(models.images, {
      foreignKey: 'blogId',
      sourceKey: 'id',
      as: 'images'
    })

    Blogs.belongsTo(models.staffs, {
      foreignKey: 'staffUid',
      targetKey: 'uid',
      as: 'user'
    })
  }

  /**
   * Generates an ID that will be used when creating a blog
   * @returns {Promise<number>} The next available Blog ID
   */
  Blogs.generateId = async function generateId () {
    const row = await sequelize.query(`
      SELECT nextval(pg_get_serial_sequence('blogs', 'id'))::INTEGER AS id;
    `, {
      plain: true,
      type: QueryTypes.SELECT
    })

    return row.id
  }

  /**
   * Determine if staff has acces to the blog id.
   * @param {Number} blogId
   * @param {String} uid
   * @returns {Promise<Boolean>}
   */
  Blogs.belongsToStaff = async function belongsToStaff (blogId, uid) {
    const replacements = { uid, blogId }

    const row = await sequelize.query(`
      SELECT 1 AS exists
      FROM blogs
      WHERE
        blogs."staffUid" = :uid
        AND blogs.id = :blogId
      LIMIT 1
    `, {
      replacements,
      type: QueryTypes.SELECT,
      plain: true
    })

    if (row.length === 0) {
      return false
    }

    return row && row.exists === 1
  }

  /**
   * Get blog by language
   * @param {number} blogId blog ID
   * @param {string} language blog language
   */
  Blogs.findByLanguage = async function findByLanguage (blogId, language) {
    return sequelize.query(`
      SELECT
        blogs.id,
        blogs.published,
        blogs.type,
        translations.id AS "translationId",
        translations.language,
        translations.title,
        translations.content,
        to_json(array_remove(array_agg(DISTINCT images), NULL)) AS images,
        to_json(array_remove(array_agg(DISTINCT tags), NULL)) AS tags
      FROM
        blogs
      LEFT JOIN
        blogs.translations AS translations
        ON translations."blogId" = blogs.id
        AND translations.language = :language
      LEFT JOIN
        blogs.images
        ON images."blogId" = blogs.id
      LEFT JOIN
        kinds
        ON kinds."blogId" = :blogId
      LEFT JOIN
        tags
        ON tags.id = kinds."tagId"
      WHERE
        blogs.id = :blogId
      GROUP BY
        blogs.id,
        translations.id,
        translations.language,
        translations.content
    `, {
      replacements: { blogId, language },
      type: QueryTypes.SELECT,
      plain: true
    })
  }

  /**
   * List Blogs based on the provided filters
   *
   * @param {Object} filters - Query contains neccessary properties to filter the list
   * @param {number} filters.limit - Limit the number of blogs to return per page
   * @param {number} filters.page - Offset to be used
   * @param {string} filters.search - Search term to filter
   * @param {string} filters.provider - Provider to filter
   * @param {boolean} filters.providerStatus - Provider status to filter (inactive as true or false)
   * @param {string} filters.desc - Description to filter
   * @param {number[]} filters.tags - tags to filter
   * @param {string} filters.type - Type to filter
   * @param {boolean} filters.published - Available status to filter
   * @param {boolean} filters.needsReview - needsReview status to filter
   * @param {string} filters.languageFilter - language to filter by
   * @param {string[]} filters.date - Sort the paginated list by date
   * @param {string} filters.dateFilter - date field the date uses
   * @param {string} filters.memo - blog memo
   * @param {string} filters.field - field to sort by
   * @param {string} filters.order - Sort order
   * @param {Object} options - Options
   * @param {number} options.limit - Number of blogs to show per page
   * @param {number} options.offset -  offset
   * @param {string} options.userUid - logged in user uid
   * @param {string} options.role - logged in user role
   * @returns {Promise<Object>} Paginated list of Blogs
   */
  Blogs.paginate = async function paginate (filters, options) {
    const wheres = []

    const {
      sort = {
        field: filters.field || 'id',
        order: filters.order || 'asc'
      }
    } = filters

    const replacements = {
      limit: options.limit,
      offset: options.offset
    }

    if (filters.search) {
      wheres.push('LOWER(translations.title) LIKE LOWER(:search) OR blogs.id::varchar LIKE LOWER(:search)')
      replacements.search = '%' + escapeBackslash(filters.search) + '%'
    }

    if (filters.desc) {
      // search tags
      const tagSQL = await searchTags(filters.desc)

      wheres.push(`
        (LOWER(translations.title) LIKE LOWER(:desc)
        OR translations.content LIKE :desc
        ${tagSQL}
        )
      `)
      replacements.desc = '%' + filters.desc + '%'
    }

    if (filters.tags) {
      const tagSQL = await searchTagIds(filters.tags)
      if (tagSQL.length > 0) wheres.push(tagSQL)
      else {
        return {
          blogs: [],
          count: 0
        }
      }
    }

    if (filters.type) {
      wheres.push('blogs.type = :type')
      replacements.type = filters.type
    }

    if (filters.needsReview) {
      wheres.push('"blogs"."needsReview" = :needsReview')
      replacements.needsReview = filters.needsReview
    }

    if (filters.published) {
      wheres.push('blogs.published = :published')
      replacements.published = filters.published
    }

    if (filters.languageFilter) {
      wheres.push(`array_to_string(languages.codes, ',') like '%${filters.languageFilter}%'`)
    }

    if (filters.dateFilter && filters.date) {
      wheres.push(`blogs."${filters.dateFilter}" BETWEEN :startDate AND :endDate`)
      replacements.startDate = `${filters.date[0]} 00:00:00`
      replacements.endDate = `${filters.date[1]} 23:59:59`
    }

    if (filters.memo) {
      wheres.push('blogs.memo LIKE :memo')
      replacements.memo = '%' + escapeBackslash(filters.memo) + '%'
    }

    if (filters.provider) {
      // search owners
      const ownerSQL = await searchOwner(filters.provider)
      if (ownerSQL.length > 0) wheres.push(ownerSQL)
      else {
        return {
          blogs: [],
          count: 0
        }
      }
    }

    if (filters.providerStatus) {
      wheres.push(`blogs."staffUid" IN (
        SELECT staffs.uid FROM staffs
        WHERE staffs.inactive != :providerStatus
        AND staffs."deletedAt" IS NULL
      )`)
      replacements.providerStatus = filters.providerStatus
    }

    const joins = `
      -- languages
      LEFT JOIN LATERAL (
        SELECT
          array_agg(DISTINCT language) AS codes
        FROM
          blogs.translations
        WHERE
          translations."blogId" = blogs.id
      ) AS languages ON true
      LEFT JOIN blogs.translations
        ON translations."blogId" = blogs.id
        AND translations.language = COALESCE(languages.codes[1], 'en')
      LEFT JOIN staffs
        ON staffs.uid = blogs."staffUid"
    `

    let listSQL = `
      SELECT
        blogs.id,
        blogs.type,
        staffs.username as provider,
        blogs.published,
        languages.codes AS languages,
        translations.title,
        blogs."createdAt",
        GREATEST(blogs."updatedAt", translations."updatedAt") AS "updatedAt"
      FROM
        blogs
      ${joins}
    `

    let countSQL = `
      SELECT
        COUNT(DISTINCT blogs.id)::integer AS count
      FROM
        blogs
      ${joins}
    `

    if (wheres.length) {
      const where = wheres.join(' AND ')
      const whereClause = 'WHERE ' + where

      listSQL += whereClause
      countSQL += whereClause
    }

    listSQL += `
      GROUP BY
        blogs.id,
        languages.codes,
        translations.title,
        translations."updatedAt",
        staffs.username
      ORDER BY
        "${sort.field}" ${sort.order}
      LIMIT :limit OFFSET :offset
    `

    const queryOptions = {
      replacements,
      type: QueryTypes.SELECT
    }

    const [rowsForBlogs, rowForCount] = await Promise.all([
      sequelize.query(listSQL, queryOptions),
      sequelize.query(countSQL, Object.assign({ plain: true }, queryOptions))
    ])

    return {
      blogs: rowsForBlogs,
      count: rowForCount.count
    }
  }

  /**
   * Search tags
   * @param {string} desc string to search for
   * @returns {Promise<string>} sql for search
   */
  async function searchTags (desc) {
    const tagQuery = `
      SELECT
        kinds."blogId"
      FROM
        tags
      INNER JOIN
        kinds ON kinds."tagId" = tags.id
      WHERE
        LOWER(tags.tag) LIKE LOWER('%${desc}%')
    `

    const tagResults = await sequelize.query(tagQuery, { type: QueryTypes.SELECT })
    if (tagResults.length === 0) return ''

    let tagIdsQuery = '('
    for (let i = 0; i < tagResults.length; i++) {
      tagIdsQuery += `${tagResults[i].blogId}`
      if (i !== tagResults.length - 1) {
        tagIdsQuery += ','
      }
    }
    tagIdsQuery += ')'

    return `OR blogs.id IN ${tagIdsQuery}`
  }

  /**
   * Search tags Ids
   * @param {number[]} tags array of ids
   * @returns {Promise<string>} sql for search
   */
  async function searchTagIds (tags) {
    const tagQuery = `
      SELECT
        kinds."blogId"
      FROM
        tags
      INNER JOIN
        kinds ON kinds."tagId" = tags.id
      WHERE
        tags.id IN (:tags)
    `

    const tagResults = await sequelize.query(tagQuery, {
      type: QueryTypes.SELECT,
      replacements: { tags }
    })
    if (tagResults.length === 0) return ''

    let tagIdsQuery = '('
    for (let i = 0; i < tagResults.length; i++) {
      tagIdsQuery += `${tagResults[i].blogId}`
      if (i !== tagResults.length - 1) {
        tagIdsQuery += ','
      }
    }
    tagIdsQuery += ')'

    return `blogs.id IN ${tagIdsQuery}`
  }

  /**
   * Search blog owner
   * @param {string} desc string to search for
   * @returns {Promise<string>} sql for search
   */
  async function searchOwner (desc) {
    let ownerQuery = `
      SELECT
        blogs.id
      FROM
        blogs
      INNER JOIN
        staffs ON staffs.uid = blogs."staffUid"
      WHERE
    `
    if (isNaN(desc)) {
      ownerQuery += 'LOWER(staffs.username) LIKE LOWER(:stringProvider)'
    } else {
      ownerQuery += 'staffs.id::varchar = :provider'
    }

    const ownerResults = await sequelize.query(ownerQuery, {
      replacements: {
        provider: desc,
        stringProvider: '%' + desc + '%'
      },
      type: QueryTypes.SELECT
    })

    if (ownerResults.length === 0) return ''

    let ownerIdsQuery = '('
    for (let i = 0; i < ownerResults.length; i++) {
      ownerIdsQuery += `${ownerResults[i].id}`
      if (i !== ownerResults.length - 1) {
        ownerIdsQuery += ','
      }
    }
    ownerIdsQuery += ')'

    return `blogs.id IN ${ownerIdsQuery}`
  }

  Blogs.guest = {
    /**
     * Retrieves a blog from the provided `blogId`
     * @param {number} blogId - Blog ID
     * @param {Object} options - Options
     * @param {string} options.language - Language of the Blog translation
     * @returns {Promise<Object|null>} Blog
     */
    async detailsById (blogId, options) {
      const {
        language
      } = options
      const locale = `%${convertLocaleToLanguage(options.locale)}%`
      const [blog] = await Promise.all([
        sequelize.query(`
          SELECT
            "blogs"."id",
            "blogs"."type",
            "blogs"."published",
            "blogs"."languages",
            "blogs"."memo",
            jsonb_agg(
              jsonb_build_object(
                'id', "translations"."id",
                'title', "translations"."title",
                'language', "translations".language,
                'content', "translations"."content",
                'createdAt', "blogs"."createdAt",
                'updatedAt', GREATEST("blogs"."updatedAt", "translations"."updatedAt")
              )
            ) translations,

            (
              SELECT
                jsonb_agg(
                  json_build_object(
                    'id', "images"."id",
                    'path', "images"."path",
                    'type', "images"."type",
                    'caption', "images"."caption",
                    'position', "images"."position"
                  )
                )
              FROM
                "blogs"."images" AS "images"
              WHERE
                "images"."blogId" = "blogs"."id"
            ) images
          FROM "blogs"
          LEFT JOIN "blogs"."translations" AS "translations"
            ON "translations"."blogId" = "blogs"."id"
          WHERE
            array_to_string(blogs.languages, ', ') like :locale AND
            "blogs"."id" = :blogId AND
            "blogs"."published" = true
          GROUP BY
            "blogs"."id"
        `, {
          replacements: {
            blogId,
            locale
          },
          type: QueryTypes.SELECT,
          plain: true
        }),
        sequelize.query(`
          UPDATE blogs SET "lastReadAt" = CURRENT_TIMESTAMP WHERE id = :blogId
        `, {
          type: QueryTypes.UPDATE,
          replacements: { blogId }
        })
      ])

      if (!blog) {
        return null
      }

      /**
       * Blog mapped by translation's language
       */
      const translationsByLanguage = {}
      for (const $blog of blog.translations) {
        translationsByLanguage[$blog.language] = $blog
      }

      let translation

      if (blog.languages.includes(options.language) && translationsByLanguage[language]) {
        translation = translationsByLanguage[language]
      } else {
        const exclude = EXCLUDE_LANGUAGE_BY_LOCALE[options.locale]
        for (let i = 0; i < exclude.length; i++) {
          delete translationsByLanguage[exclude[i]]
        }

        // If page language is not present as blog
        //  language. Select translations by language priority
        //  English -> Japanese -> Chinese
        if (translationsByLanguage.en) {
          translation = translationsByLanguage.en
        } else if (translationsByLanguage.ja) {
          translation = translationsByLanguage.ja
        } else if (translationsByLanguage.zh_hant) {
          translation = translationsByLanguage.zh_hant
        } else {
          translation = translationsByLanguage.zh_hans
        }
      }

      const [
        tags
      ] = await Promise.all([
        // Get Destinations
        sequelize.models.kinds.listByBlogId(blogId)
      ])

      const blogDetail = {
        id: blog.id,
        published: blog.published,
        title: translation.title,
        content: translation.content,
        type: blog.type,
        createdAt: translation.createdAt,
        updatedAt: translation.updatedAt,
        tags,
        hero: '',
        thumbnail: '',
        gallery: [],
        languages: blog.languages,
        language: translation.language
      }

      // format images
      if (blog.images) {
        for (const row of blog.images) {
          const transformedImage = _.pick(row, ['path', 'caption', 'position'])
          if (row.type === IMAGE_TYPE.HERO) {
            blogDetail.hero = transformedImage
          } else if (row.type === IMAGE_TYPE.THUMBNAIL) {
            blogDetail.thumbnail = transformedImage
          } else {
            blogDetail.gallery.push(transformedImage)
          }
        }

        if (blogDetail.gallery.length) {
          blogDetail.gallery = _.sortBy(blogDetail.gallery, 'position')
        }
      }

      return blogDetail
    },

    /**
     * Retrieves an array of blogs from the provided `filters`
     * @param {object} filters - String of search keys
     * @param {Object} options - Options
     * @param {string} options.language - Language of the Blog translation
     * @param {string} options.locale -   locale is used for the language of results, language is used for filtering
     * @returns {Promise<Object>} Object with an Array of Blogs
     */
    async search (filters, options = {}) {
      const { idsSQL, listSQL, countSQL } = this.buildSearchSQL(filters, options)

      let queryArr
      if (filters.query) {
        queryArr = filters.query
          .split(' ')
          .map(word => word.trim().length ? `%${word.replace(/(_|%|\\)/g, '\\$1').toLowerCase()}%` : '')
      }
      const params = {
        replacements: {
          wildCardLocale: `%${convertLocaleToLanguage(options.locale)}%`,
          language: options.language?.split(','),
          locale: convertLocaleToLanguage(options.locale),
          limit: SEARCH_BLOGS_LIMIT,
          offset: (filters.page - 1) * SEARCH_BLOGS_LIMIT,
          tagIds: filters.tags?.split(',')?.map(Number),
          ...(Array.isArray(queryArr) && queryArr.length ? { queryArr } : {})
        },
        type: QueryTypes.SELECT
      }

      const results = await sequelize.query(idsSQL, Object.assign({ plain: true }, params))
      params.replacements.blogIds = results.blogIds

      const [rowsForBlogs, rowForCount] = await Promise.all([
        sequelize.query(listSQL, params),
        sequelize.query(countSQL, Object.assign({ plain: true }, params))
      ])

      return {
        results: rowsForBlogs,
        count: rowForCount.count
      }
    },

    /**
     *
     * @param {Object} filters - Filters
     * @param {string} [filters.query] - Search query
     * @param {string} [filters.tag] - tag
     * @param {string} [filters.sortBy] - sort by
     * @param {Object} options - Options
     * @param {string} [options.language] - Language filter
     * @returns {Object} - SQL queries
     */
    buildSearchSQL (filters, options) {
      const {
        query,
        tags,
        sortBy
      } = filters

      const {
        language
      } = options

      let idOrderBy = ''
      let orderBy = ''
      switch (sortBy) {
        default:
          orderBy = 'GREATEST(blogs."lastPublishedAt", blogs."lastReadAt") DESC'
          break
      }
      if (!idOrderBy) {
        idOrderBy = orderBy
      }

      const tagCondition = {
        where: '',
        select: `
          blogs.id IN (
            SELECT "blogId"
            FROM tags
            WHERE "blogId" IS NOT NULL
          )
        `
      }

      if (tags) {
        tagCondition.where = 'WHERE tags.id IN (:tagIds)'
      }

      let languageTranslationFilter
      if (language) {
        languageTranslationFilter = 'AND translations.language IN (:language)'
      } else {
        languageTranslationFilter = ''
      }

      const tagWith = `
        tags AS (
          SELECT
            tags.id,
            tags.tag,
            tags."tagMoji",
            kinds."blogId"
          FROM tags
          INNER JOIN
            kinds ON tags.id = kinds."tagId"
          ${tagCondition.where}
        )
      `

      const withs = []
      const whereFilters = []

      const hasAllFilters = tags

      whereFilters.push("array_to_string(blogs.languages, ', ') like :wildCardLocale")

      if (hasAllFilters) {
        withs.push(
          tagWith
        )
        whereFilters.push(
          tagCondition.select
        )
      } else {
        if (tags) {
          withs.push(tagWith)
          whereFilters.push(tagCondition.select)
        }
      }

      let searchQuery = ''
      let joinsForQuery = ''

      if (query) {
        searchQuery = `
          AND LOWER(
            concat_ws(
              ' ',
              translations.title,
              translations.content,
              tags.tag
            )
          ) LIKE ALL(ARRAY [:queryArr])
        `

        joinsForQuery += `
          LEFT JOIN kinds ON  kinds."blogId" = blogs.id
          LEFT JOIn tags ON tags.id = kinds."tagId"
        `
      }

      const whereFiltersSQL = whereFilters.length
        ? `(${whereFilters.join(' AND ')}) AND`
        : ''

      const whereClause = `
        ${whereFiltersSQL}
        (
          blogs.published = true
          -- Only show blog translations available to show
          AND blogs.languages::text[] && (
            SELECT array_agg(translations.language)::text[]
            FROM (
              SELECT language
              FROM blogs.translations
              WHERE "blogId" = blogs.id
            ) translations
          )

          ${searchQuery}
        )
      `

      const withClause = withs.length
        ? `WITH ${withs.join(', ')}`
        : ''

      const idsSQL = `
        SELECT array_agg(blogs.id) AS "blogIds"
        FROM (
          ${withClause}

          SELECT
            blogs.id
          FROM
            blogs
          INNER JOIN blogs.translations
            ON translations."blogId" = blogs.id
            ${languageTranslationFilter}
          ${joinsForQuery}
          WHERE
            ${whereClause}
          GROUP BY
            blogs.id
          ORDER BY
            blogs.published DESC,
            ${idOrderBy}
          LIMIT :limit OFFSET :offset
        ) AS blogs
      `

      const listSQL = `
        SELECT
          blogs.id,
          blogs.languages,
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'id', blogs.id,
              'title', translations.title,
              'language', translations.language,
              'published', blogs.published,
              'hero', (
                SELECT
                  images.path
                FROM
                  blogs.images AS images
                WHERE
                  images.type = 'hero'
                  AND images."blogId" = blogs.id
              ),
              'tagCount', "countTags".count,
              'tags', "countTags".tags
            )
          ) blogs
        FROM
          blogs
        INNER JOIN
          blogs.translations ON translations."blogId" = blogs.id
          ${languageTranslationFilter}
        LEFT JOIN LATERAL (
          SELECT
            COUNT(kinds."blogId") AS count,
            jsonb_agg(tags.tag) AS tags
          FROM kinds
          INNER JOIN tags ON tags.id = kinds."tagId"
          WHERE kinds."blogId" = blogs.id
        ) AS "countTags" ON true
        WHERE
          blogs.id IN (:blogIds)
        GROUP BY
          blogs.id
        ORDER BY
          blogs.published DESC,
          ${orderBy}
      `

      const countSQL = `
        ${withClause}
        SELECT
          COUNT(DISTINCT blogs.id)::integer AS count
        FROM
          blogs
        INNER JOIN blogs.translations
          ON translations."blogId" = blogs.id
          ${languageTranslationFilter}
        ${joinsForQuery}
        WHERE
          ${whereClause}
      `

      return {
        idsSQL,
        listSQL,
        countSQL
      }
    }
  }

  return Blogs
}
