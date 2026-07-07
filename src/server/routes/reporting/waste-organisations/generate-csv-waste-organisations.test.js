import { generateCsvWasteOrganisations } from './generate-csv-waste-organisations.js'

describe('#generateCsvWasteOrganisations', () => {
  const wasteOrganisations = [
    {
      organisationId: '7680b304-b18c-4aa4-87a4-ea14cfa20d3d',
      dateRegistered: '2026-06-24T14:00:00.000Z',
      activeApiCodeCount: 1
    },
    {
      organisationId: '5a22f8d7-bc9f-41d7-8746-88b11ca2ba72',
      dateRegistered: '2026-06-23T00:00:00.000Z',
      activeApiCodeCount: 2
    }
  ]

  test('Should return Waste Organisations as CSV data', () => {
    const result = generateCsvWasteOrganisations(wasteOrganisations)

    expect(result).toEqual(
      '\ufeffOrganisation ID,Registered,Active API Codes\n' +
        '7680b304-b18c-4aa4-87a4-ea14cfa20d3d,"24 Jun 2026, 14:00",1\n' +
        '5a22f8d7-bc9f-41d7-8746-88b11ca2ba72,"23 Jun 2026, 00:00",2\n'
    )
  })

  test('Should escape formulas', () => {
    const wasteOrganisations = [
      {
        organisationId: '=sum(2+3)',
        dateRegistered: '2026-06-24T14:00:00.000Z',
        activeApiCodeCount: 1
      }
    ]

    const result = generateCsvWasteOrganisations(wasteOrganisations)

    expect(result).toEqual(
      '\ufeffOrganisation ID,Registered,Active API Codes\n' +
        '\'=sum(2+3),"24 Jun 2026, 14:00",1\n'
    )
  })
})
