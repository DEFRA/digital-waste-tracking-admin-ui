import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getElementText } from '#/test-helpers/get-element-text.js'
import { JSDOM } from 'jsdom'
import { signedInAs } from '../../../../test-helpers/signed-in.js'

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide successful response when given a basic auth credential', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: signedInAs()
    })

    const { document } = new JSDOM(result).window
    const pageTitle = getElementText(document, 'app-heading-title')
    const pageBody = getElementText(document, 'app-page-body')

    expect(statusCode).toBe(statusCodes.ok)
    expect(document.title).toEqual('Home - Local - DWT admin portal')
    expect(pageTitle).toEqual('DWT admin portal')
    expect(pageBody.replace(/\s+/g, ' ')).toEqual(
      'This site allows the Digital waste tracking service team to: manage software provider credentials search waste organisations'
    )
    expect(
      [...document.querySelectorAll('main ul.govuk-list--bullet li')].map(
        (item) => item.textContent.trim()
      )
    ).toEqual([
      'manage software provider credentials',
      'search waste organisations'
    ])
    // Signed in, so the navigation, with this as the current page, and no
    // green line under the header
    expect(
      document
        .querySelector('header.defra-header')
        .classList.contains('app-defra-header--green-line')
    ).toBe(false)
    // One footer landmark
    expect(document.querySelectorAll('footer')).toHaveLength(1)
    expect(
      document
        .querySelector('.govuk-service-navigation__item--active')
        .textContent.trim()
    ).toEqual('DWT admin portal')
  })

  test('Should provide successful response when given a different basic auth credential', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: signedInAs('test2')
    })

    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should provide failed response when not given a basic auth credential', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.found)
  })
})
