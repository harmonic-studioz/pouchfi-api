'use strict'
const emailTemplates = require('../../config/templates')

/* eslint-disable no-irregular-whitespace */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('templates', prepare())
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('templates')
  }
}

function prepare () {
  const templates = emailTemplates

  for (const template of templates) {
    template.createdAt = new Date()
    template.updatedAt = new Date()
  }

  return templates
}
