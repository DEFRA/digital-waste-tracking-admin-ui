import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { paths } from '#/server/common/constants/paths.js'
import { config } from '#/config/config.js'

const constructS3Client = () => {
  return new S3Client({
    region: config.get('aws.region'),
    endpoint: config.get('aws.s3Endpoint'),
    forcePathStyle: config.get('aws.forcePathStyle')
  })
}

const deleteS3Object = async (Bucket, Key) => {
  const s3Client = constructS3Client()
  const request = new DeleteObjectCommand({
    Bucket,
    Key,
    ChecksumMode: config.get('aws.checksumMode')
  })
  return await s3Client.send(request)
}

export const deleteController = {
  async handler(request, h) {
    const bucket = config.get('aws.bucketName')
    const key = request?.payload?.key
    if (bucket && key) {
      try {
        await deleteS3Object(bucket, key)
        return h.redirect(paths.spreadsheetAdmin)
      } catch (e) {
        return h.view('spreadsheets/index', {
          pageTitle: 'Spreadsheets',
          paths,
          keyError: `${e}`
        })
      }
    }
    return h.view('spreadsheets/index', {
      pageTitle: 'Spreadsheets',
      paths,
      keyError: key == null ? 'Key must be specified' : null
    })
  }
}

export const showController = {
  handler(request, h) {
    const d = { pageTitle: 'Spreadsheets', paths }
    if (!config.get('aws.bucketName')) {
      d.keyError = 'Bucket name not configured'
    }
    return h.view('spreadsheets/index', d)
  }
}
