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
        environment: 'Local',
        getAssetPath: () => 'assets'
      })

      expect(
        $page('.defra-header__environment strong').attr('class').trim()
      ).toContain('govuk-tag--red')
    })

    test('Should have the teal tag for External test environment', () => {
      const $page = renderTemplate('layouts/page.njk', {
        environment: 'External test',
        getAssetPath: () => 'assets'
      })

      expect(
        $page('.defra-header__environment strong').attr('class').trim()
      ).toContain('govuk-tag--teal')
    })

    test('Should have the purple tag for Production environment', () => {
      const $page = renderTemplate('layouts/page.njk', {
        environment: 'Production',
        getAssetPath: () => 'assets'
      })

      expect(
        $page('.defra-header__environment strong').attr('class').trim()
      ).toContain('govuk-tag--purple')
    })

    test('Should have no tag class for unknown environment', () => {
      const $page = renderTemplate('layouts/page.njk', {
        environment: 'Dev',
        getAssetPath: () => 'assets'
      })

      expect(
        $page('.defra-header__environment strong').attr('class').trim()
      ).toBe('govuk-tag')
    })
  })
})
