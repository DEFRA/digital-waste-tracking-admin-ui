import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  SkipLink,
  PasswordInput
} from 'govuk-frontend'
import { SortableTable } from '@ministryofjustice/frontend'

import { initCopy } from './components/copy.js'
import { initShowOnce } from './components/show-once.js'
import { initSingleSubmit } from './components/single-submit.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(SkipLink)
createAll(PasswordInput)
createAll(SortableTable)
initCopy()
initSingleSubmit()
initShowOnce()
