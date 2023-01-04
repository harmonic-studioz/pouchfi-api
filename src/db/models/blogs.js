'use strict'

/**
 * @typedef {import ("sequelize").Sequelize} Sequelize
 * @typedef {import ("sequelize").DataTypes} DataTypes
 *
 */

const _ = require('lodash')
const { QueryTypes } = require('sequelize')

const { IMAGE_TYPE } = require('@/src/constants')
const { convertLocaleToLanguage } = require('@/src/helpers')

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
      defaultValue: {}
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

  Blogs.guest = {
    /**
     * Retrieves a blog from the provided `blogId`
     * @param {number} blogId - Experience ID
     * @param {Object} options - Options
     * @param {string} options.language - Language of the Experience translation
     * @returns {Promise<Object|null>} Experience
     */
    async detailsById (blogId, options) {
      const {
        language
      } = options
      const locale = `%${convertLocaleToLanguage(options.locale)}%`
      const blog = await sequelize.query(`
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
      })

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

        // If page language is not present as experience
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
        sequelize.models.kind.listByBlogId(blogId)
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
     * Retrieves an array of experiences from the provided `filters`
     * @param {object} filters - String of search keys
     * @param {Object} options - Options
     * @param {string} options.language - Language of the Experience translation
     * @param {string} options.locale -   locale is used for the language of results, language is used for filtering
     * @returns {Promise<Object>} Object with an Array of Experiences
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
        tag,
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
            FROM kinds
            WHERE "blogId" IS NOT NULL
          )
        `
      }

      if (tag) {
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
            tags."tagMoji"
          FROM tags
          INNER JOIN
            kinds ON tags.id = kinds."tagId"
          ${tagCondition.where}
        )
      `

      const withs = []
      const whereFilters = []

      const hasAllFilters = tag

      whereFilters.push("array_to_string(blogs.languages, ', ') like :wildCardLocale")

      if (hasAllFilters) {
        withs.push(
          tagWith
        )
        whereFilters.push(
          tagCondition.select
        )
      } else {
        if (tag) {
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
          LEFT JOIn tags ON tags.is = kinds."tagId"
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
              'tagCount', "countTags".count
            )
          ) blogs
        FROM
          blogs
        INNER JOIN
          blogs.translations ON translations."blogId" = blogs.id
          ${languageTranslationFilter}
        LEFT JOIN LATERAL (
          SELECT
            COUNT(id) AS count
          FROM kinds
          WHERE kinds."blogId" = blogs.id
        ) AS "countTags" ON true
        WHERE
          blogs.id IN (:blogIds)
        GROUP BY
          blogs.id
        ORDER BY
          blogs.published DESC
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
