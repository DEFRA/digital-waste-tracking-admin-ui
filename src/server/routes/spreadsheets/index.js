import { paths } from '#/server/common/constants/paths.js'
import { deleteController, showController } from './controller.js'

// spreadsheetAdmin: '/admin/waste-organisations/spreadsheet',
// spreadsheetAdminDelete: '/admin/waste-organisations/spreadsheet/delete'

export const spreadsheets = {
  plugin: {
    name: 'spreadsheets',
    register(server) {
      server.route({
        method: 'GET',
        path: paths.spreadsheetAdmin,
        ...showController
      })
      server.route({
        method: 'POST',
        path: paths.spreadsheetAdminDelete,
        ...deleteController
      })
    }
  }
}
