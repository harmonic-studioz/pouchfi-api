'use strict'

const errors = require('@/src/classes/errors')
const templates = require('@/src/config/templates')
const { replacePlaceholders, cleansingTemplate } = require('@/src/helpers/email')

exports.getTemplate = function (name) {
  const html = templates.find(template => template.name === name)

  if (!html) {
    throw errors.api.unprocessableEntity('Template not found!')
  }

  return {
    outlets: { html }
  }
}

exports.previewTemplate = function (name) {
  const html = templates.find(template => template.name === name)

  if (!html) {
    throw errors.api.unprocessableEntity('Template not found!')
  }

  let template = replacePlaceholders(html.fileTemplate, {})
  template = cleansingTemplate(template)

  return {
    html: template
  }
}
