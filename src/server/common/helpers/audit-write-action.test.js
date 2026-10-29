import { Writable } from 'node:stream'

import { ecsFormat } from '@elastic/ecs-pino-format'
import { pino } from 'pino'

import { auditWriteAction } from './audit-write-action.js'

const { mockAudit } = vi.hoisted(() => ({ mockAudit: vi.fn() }))

vi.mock('@defra/cdp-auditing', () => ({ audit: mockAudit }))

describe('#auditWriteAction', () => {
  const request = {
    auth: { credentials: { username: 'test1' } },
    logger: { info: vi.fn() }
  }

  test('Should log who took which action on which client, and the outcome', () => {
    auditWriteAction(request, {
      action: 'created new credentials',
      outcome: 'success',
      client: {
        clientId: '38sc860c82ub10cq8vjl4ere2b',
        clientName: 'Total_Rubbish'
      }
    })

    expect(request.logger.info).toHaveBeenCalledWith(
      {
        event: { action: 'created new credentials', outcome: 'success' },
        tenant: { id: '38sc860c82ub10cq8vjl4ere2b', message: 'Total_Rubbish' }
      },
      '[AdminServiceUIAudit] test1 took action created new credentials on Total_Rubbish (38sc860c82ub10cq8vjl4ere2b) resulting in success'
    )
  })

  test('Should name the client alone when it has no client id', () => {
    auditWriteAction(request, {
      action: 'created new credentials',
      outcome: 'failure',
      client: { clientName: 'Total_Rubbish' }
    })

    expect(request.logger.info).toHaveBeenCalledWith(
      {
        event: { action: 'created new credentials', outcome: 'failure' },
        tenant: { message: 'Total_Rubbish' }
      },
      '[AdminServiceUIAudit] test1 took action created new credentials on Total_Rubbish resulting in failure'
    )
  })

  test('Should write the user once, from the request logger, in the JSON logged', () => {
    const lines = []
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(chunk.toString())
        callback()
      }
    })
    // As the request-context plugin binds the user
    const logger = pino(ecsFormat(), stream).child({
      user: { id: 'test1', name: 'test1' }
    })

    auditWriteAction(
      { ...request, logger },
      {
        action: 'created new credentials',
        outcome: 'success',
        client: {
          clientId: '38sc860c82ub10cq8vjl4ere2b',
          clientName: 'Total_Rubbish'
        }
      }
    )

    expect(lines[0].match(/"user":/g)).toHaveLength(1)
    expect(JSON.parse(lines[0])).toMatchObject({
      user: { id: 'test1', name: 'test1' },
      event: { action: 'created new credentials', outcome: 'success' },
      tenant: { id: '38sc860c82ub10cq8vjl4ere2b', message: 'Total_Rubbish' }
    })
  })

  test('Should send the same to the audit trail', () => {
    auditWriteAction(request, {
      action: 'created new credentials',
      outcome: 'success',
      client: {
        clientId: '38sc860c82ub10cq8vjl4ere2b',
        clientName: 'Total_Rubbish'
      }
    })

    expect(mockAudit).toHaveBeenCalledWith({
      action: 'created new credentials',
      outcome: 'success',
      user: 'test1',
      clientId: '38sc860c82ub10cq8vjl4ere2b',
      clientName: 'Total_Rubbish',
      tenantServiceName: 'waste-movement-external-api'
    })
  })
})
