import { parseISO } from 'date-fns'

/**
 * Gets Waste Organisations where the DefraID registration date is between a
 * from and to date.
 *
 * Currently mock data is returned and this will eventually be replaced by an
 * API request to get actual data.
 *
 * @param {ISOStringFormat} dateFrom - The date from
 * @param {ISOStringFormat} dateTo - The date to
 *
 * @returns {[{ organisationId: String, dateRegistered: String, activeApiCodeCount: Number }]} The Waste Organisations
 */
export function getWasteOrganisationsByDate(dateFrom, dateTo) {
  return [
    {
      organisationId: '7680b304-b18c-4aa4-87a4-ea14cfa20d3d',
      dateRegistered: '2026-06-24T00:00:00.000Z',
      activeApiCodeCount: 1
    },
    {
      organisationId: '5a22f8d7-bc9f-41d7-8746-88b11ca2ba72',
      dateRegistered: '2026-06-23T00:00:00.000Z',
      activeApiCodeCount: 2
    },
    {
      organisationId: '9b6aa1e6-ad70-4ea9-a58f-6b9ac925d96b',
      dateRegistered: '2026-06-22T00:00:00.000Z',
      activeApiCodeCount: 3
    },
    {
      organisationId: 'f5edcbe9-bf1e-4aaa-8e82-0c4531652b15',
      dateRegistered: '2026-06-21T00:00:00.000Z',
      activeApiCodeCount: 1
    },
    {
      organisationId: '5bcf7db1-a41c-473a-ae0e-360504657ad9',
      dateRegistered: '2026-06-20T00:00:00.000Z',
      activeApiCodeCount: 4
    },
    {
      organisationId: 'f813558f-d999-4259-b9c8-4dd0e82e56d0',
      dateRegistered: '2026-06-19T00:00:00.000Z',
      activeApiCodeCount: 3
    },
    {
      organisationId: '60c32422-a5ec-4b62-a627-057eecfe0d37',
      dateRegistered: '2026-06-18T00:00:00.000Z',
      activeApiCodeCount: 1
    },
    {
      organisationId: '3c3ae88f-475b-41dd-9d73-ca52ce6e812f',
      dateRegistered: '2026-06-17T00:00:00.000Z',
      activeApiCodeCount: 1
    },
    {
      organisationId: 'c71a266d-6bbf-44c9-bda7-64e25398b582',
      dateRegistered: '2026-06-16T00:00:00.000Z',
      activeApiCodeCount: 2
    },
    {
      organisationId: '2397f3d4-91a7-48d8-8932-1854a3e85185',
      dateRegistered: '2026-06-15T00:00:00.000Z',
      activeApiCodeCount: 4
    },
    {
      organisationId: '342e76a6-8de1-46ea-85e4-e95328043249',
      dateRegistered: '2026-06-14T00:00:00.000Z',
      activeApiCodeCount: 5
    }
  ].filter(
    ({ dateRegistered }) =>
      parseISO(dateRegistered) >= dateFrom && parseISO(dateRegistered) <= dateTo
  )
}
