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
}
