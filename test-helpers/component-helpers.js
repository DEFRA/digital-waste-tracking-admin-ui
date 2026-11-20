import { fileURLToPath } from 'node:url'
import path from 'path'
import nunjucks from 'nunjucks'
import { load } from 'cheerio'
import { camelCase } from 'lodash'

import * as filters from '#/config/nunjucks/filters/filters.js'
import * as globals from '#/config/nunjucks/globals/globals.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const nunjucksTestEnv = nunjucks.configure(
  [
    path.normalize(
      path.resolve(dirname, '../node_modules/govuk-frontend/dist/')
    ),
    path.normalize(path.resolve(dirname, '../src/server/common/templates')),
    path.normalize(path.resolve(dirname, '../src/server/common/components'))
  ],
  {
    trimBlocks: true,
    lstripBlocks: true
  }
)

Object.entries(globals).forEach(([name, global]) => {
  nunjucksTestEnv.addGlobal(name, global)
})

Object.entries(filters).forEach(([name, filter]) => {
  nunjucksTestEnv.addFilter(name, filter)
})

/**
 * Renders a template that isn't a component, for its HTML to be checked.
 * @param {string} templateName - The template, as Nunjucks names it
 * @param {object} context - The variables the template renders with
 * @returns {import('cheerio').CheerioAPI} The page, to query
 */
export function renderTemplate(templateName, context) {
  const html = nunjucksTestEnv.render(templateName, context)
  return load(html)
}

/**
 * Renders a component's macro, for its HTML to be checked.
 * @param {string} componentName - The component, such as "heading"
 * @param {object} params - The macro's params
 * @param {string} [callBlock] - The block to call the macro with, if it takes one
 * @returns {import('cheerio').CheerioAPI} The component, to query
 */
export function renderComponent(componentName, params, callBlock) {
  const macroPath = `${componentName}/macro.njk`
  const macroName = `app${
    componentName.charAt(0).toUpperCase() + camelCase(componentName.slice(1))
  }`
  const macroParams = JSON.stringify(params, null, 2)
  let macroString = `{%- from "${macroPath}" import ${macroName} -%}`

  if (callBlock) {
    macroString += `{%- call ${macroName}(${macroParams}) -%}${callBlock}{%- endcall -%}`
  } else {
    macroString += `{{- ${macroName}(${macroParams}) -}}`
  }

  return load(nunjucksTestEnv.renderString(macroString, {}))
}
