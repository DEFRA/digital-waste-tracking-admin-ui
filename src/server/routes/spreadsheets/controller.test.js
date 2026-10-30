import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { JSDOM } from 'jsdom'
import {
  requestBasicAuthTest1,
  userBasicAuthTest1
} from '#/test-helpers/constants.js'
import { paths } from '#/server/common/constants/paths.js'
import { randomUUID } from 'node:crypto'
import { config } from '#/config/config.js'

let mockSend = () => {
  return {
    Body: []
  }
}

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    async send() {
      return mockSend()
    }
  },
  DeleteObjectCommand: class {}
}))

describe('#spreadsheetController', () => {
  let server
  let oldBucket = null

  beforeAll(async () => {
    oldBucket = config.get('aws.bucketName')
    config.set('aws.bucketName', 'test-bucket')
    process.env.USER_BASIC_AUTH_TEST1 = userBasicAuthTest1

    server = await createServer()
    await server.initialize()
  })

  afterAll(() => {
    vi.clearAllMocks()
    config.set('aws.bucketName', oldBucket)
  })

  test('Should show the delete form', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: paths.spreadsheetAdmin,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })

    const document = new JSDOM(result).window.document

    expect(statusCode).toBe(statusCodes.ok)
    expect(document.title.trim()).toEqual('Spreadsheets - DWT admin portal')
  })

  test('Should the delete file', async () => {
    mockSend = () => ({
      Body: []
    })

    const { statusCode, result } = await server.inject({
      method: 'POST',
      url: paths.spreadsheetAdminDelete,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` },
      payload: { key: 'test' }
    })
    expect(result).toEqual('')
    expect(statusCode).toBe(statusCodes.found)
  })

  test('Should show a message when delete file errors', async () => {
    const errMsg = randomUUID()
    mockSend = () => {
      throw new Error(`fail ${errMsg}`)
    }

    const { statusCode, result } = await server.inject({
      method: 'POST',
      url: paths.spreadsheetAdminDelete,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` },
      payload: { key: 'test' }
    })
    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain(errMsg)
  })

  test('Should warn when the bucket is empty', async () => {
    config.set('aws.bucketName', '')
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: paths.spreadsheetAdmin,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` }
    })
    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('Bucket name not configured')
    config.set('aws.bucketName', 'test-bucket')
  })

  test('Should error when the bucket is empty', async () => {
    mockSend = () => ({
      Body: []
    })

    config.set('aws.bucketName', '')
    const { statusCode, result } = await server.inject({
      method: 'POST',
      url: paths.spreadsheetAdminDelete,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` },
      payload: { key: 'test' }
    })
    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toMatch(/Bucket[^<>]*is not allowed to be empty/)
    config.set('aws.bucketName', 'test-bucket')
  })

  test('Should show warn when the key is empty', async () => {
    mockSend = () => ({
      Body: []
    })

    const { statusCode, result } = await server.inject({
      method: 'POST',
      url: paths.spreadsheetAdminDelete,
      headers: { Authorization: `Basic ${requestBasicAuthTest1}` },
      payload: {}
    })
    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toContain('Key must be specified')
  })
})
