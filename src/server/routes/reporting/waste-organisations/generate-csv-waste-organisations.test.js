import { generateCsvWasteOrganisations } from './generate-csv-waste-organisations.js'

const header =
  '\ufeffOrganisation name,Organisation ID,Local authority,Active API codes,Registered (UTC)\n'

describe('#generateCsvWasteOrganisations', () => {
  test('Should give the name and ID their own columns, in the order of the table', () => {
    const result = generateCsvWasteOrganisations([
      {
        organisationId: '7680b304-b18c-4aa4-87a4-ea14cfa20d3d',
        name: 'Deepdale Salvage Partners',
        isLocalAuthority: true,
        dateRegistered: '2026-06-24T14:00:00.000Z',
        activeApiCodeCount: 1
      },
      {
        organisationId: '5a22f8d7-bc9f-41d7-8746-88b11ca2ba72',
        dateRegistered: '2026-06-23T00:00:00.000Z',
        activeApiCodeCount: 2
      }
    ])

    expect(result).toEqual(
      header +
        'Deepdale Salvage Partners,7680b304-b18c-4aa4-87a4-ea14cfa20d3d,Yes,1,"24 Jun 2026, 14:00"\n' +
        ',5a22f8d7-bc9f-41d7-8746-88b11ca2ba72,Not known,2,"23 Jun 2026, 00:00"\n'
    )
  })

  test('Should escape formulas', () => {
    const result = generateCsvWasteOrganisations([
      {
        organisationId: 'org-1',
        name: '=sum(2+3)',
        isLocalAuthority: false,
        dateRegistered: '2026-06-24T14:00:00.000Z',
        activeApiCodeCount: 1
      }
    ])

    expect(result).toEqual(
      header + '\'=sum(2+3),org-1,No,1,"24 Jun 2026, 14:00"\n'
    )
  })
})
