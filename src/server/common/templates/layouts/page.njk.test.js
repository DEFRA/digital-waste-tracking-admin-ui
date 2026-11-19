import { renderTemplate } from '#/test-helpers/component-helpers.js'

describe('Page Layout', () => {
  describe('Page title', () => {
    test('Should name the page, the environment and the service', () => {
      const $page = renderTemplate('layouts/page.njk', {
        pageTitle: 'Software providers',
        environmentName: 'Production',
        serviceName: 'DWT admin portal',
        getAssetPath: () => 'assets'
      })

      expect($page('title').text().trim()).toEqual(
        'Software providers - Production - DWT admin portal'
      )
    })
  })

  describe('Header environment tag', () => {
    test('Should have the red tag for Local environment', () => {
      const $page = renderTemplate('layouts/page.njk', {
        environmentName: 'Local',
        getAssetPath: () => 'assets'
      })

      const $tag = $page('.defra-header__environment strong')

      expect($tag.attr('class').trim()).toEqual('govuk-tag govuk-tag--red')
      expect($tag.text().trim()).toEqual('Local')
    })

    test('Should have the teal tag for External test environment', () => {
      const $page = renderTemplate('layouts/page.njk', {
        environmentName: 'External test',
        getAssetPath: () => 'assets'
      })

      expect(
        $page('.defra-header__environment strong').attr('class').trim()
      ).toContain('govuk-tag--teal')
    })

    test('Should have the purple tag for Production environment', () => {
      const $page = renderTemplate('layouts/page.njk', {
        environmentName: 'Production',
        getAssetPath: () => 'assets'
      })

      expect(
        $page('.defra-header__environment strong').attr('class').trim()
      ).toContain('govuk-tag--purple')
    })

    test('Should have no tag class for unknown environment', () => {
      const $page = renderTemplate('layouts/page.njk', {
        environmentName: 'Dev',
        getAssetPath: () => 'assets'
      })

      expect(
        $page('.defra-header__environment strong').attr('class').trim()
      ).toBe('govuk-tag')
    })

    test('Should take its text and its colour from the same environment name', () => {
      const $page = renderTemplate('layouts/page.njk', {
        // A page that names another environment, as the Software provider page
        // does, must not take its tag colour from it
        environment: 'local',
        environmentName: 'External test',
        getAssetPath: () => 'assets'
      })

      const $tag = $page('.defra-header__environment strong')

      expect($tag.text().trim()).toEqual('External test')
      expect($tag.attr('class').trim()).toEqual('govuk-tag govuk-tag--teal')
    })
  })
})
