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
    const bucket = request?.payload?.bucket
    const key = request?.payload?.key
    const validBucket = bucket ? bucket.matches(/-dwt-/) : false
    if (bucket && key && validBucket) {
      try {
        await deleteS3Object(bucket, key)
        return h.redirect(paths.spreadsheetAdmin)
      } catch (e) {
        return h.view('spreadsheets/index', {
          pageTitle: 'Spreadsheets',
          paths,
          bucketError: `${e}`
        })
      }
    }
    return h.view('spreadsheets/index', {
      pageTitle: 'Spreadsheets',
      paths,
      bucketError:
        bucket == null || !validBucket
          ? 'Bucket must be specified and contain `-dwt-`'
          : null,
      keyError: key == null ? 'Key must be specified' : null
    })
  }
}

export const showController = {
  handler(request, h) {
    return h.view('spreadsheets/index', { pageTitle: 'Spreadsheets', paths })
  }
}
