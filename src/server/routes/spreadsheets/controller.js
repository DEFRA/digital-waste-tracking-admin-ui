import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { paths } from '#/server/common/constants/paths.js'
import { config } from '#/config/config.js'
import joi from 'joi'
import { statusCodes } from '#/server/common/constants/status-codes.js'

const constructS3Client = () => {
  return new S3Client({
    region: config.get('aws.region'),
    endpoint: config.get('aws.s3Endpoint'),
    forcePathStyle: config.get('aws.forcePathStyle')
  })
}

const schema = joi.object({
  Key: joi.string().required(),
  Bucket: joi.string().required(),
  ChecksumMode: joi.string().valid('ENABLED', 'DISABLED')
})

const makeDeleteCommand = (Key) =>
  schema.validate({
    Key,
    Bucket: config.get('aws.bucketName'),
    ChecksumMode: config.get('aws.checksumMode')
  })

const deleteS3Object = async (command) => {
  const s3Client = constructS3Client()
  const request = new DeleteObjectCommand(command)
  return await s3Client.send(request)
}

export const deleteController = {
  options: {
    validate: {
      payload: joi.object({ key: joi.string().required() }),
      failAction: (request, h) =>
        h
          .view('spreadsheets/index', {
            pageTitle: 'Spreadsheets',
            paths,
            keyError: 'Key must be specified'
          })
          .code(statusCodes.badRequest)
          .takeover()
    }
  },
  async handler(request, h) {
    const command = makeDeleteCommand(request?.payload?.key)
    if (command.error) {
      return h
        .view('spreadsheets/index', {
          pageTitle: 'Spreadsheets',
          paths,
          keyError: `${command.error}`
        })
        .code(400)
    }
    try {
      await deleteS3Object(command.value)
      return h.redirect(paths.spreadsheetAdmin)
    } catch (e) {
      return h
        .view('spreadsheets/index', {
          pageTitle: 'Spreadsheets',
          paths,
          keyError: `${e}`
        })
        .code(400)
    }
  }
}

export const showController = {
  handler(request, h) {
    const d = { pageTitle: 'Spreadsheets', paths }
    let c = statusCodes.ok
    if (!config.get('aws.bucketName')) {
      d.keyError = 'Bucket name not configured'
      c = statusCodes.badRequest
    }
    return h.view('spreadsheets/index', d).code(c)
  }
}
