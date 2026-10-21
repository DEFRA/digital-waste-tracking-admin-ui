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

/**
 * Service navigation mobile toggle
 * Shows/hides the navigation menu on mobile devices
 */
export function initServiceNavigation () {
  const toggleButton = document.querySelector('.js-service-navigation-toggle')
  const navList = document.getElementById('service-navigation-list')

  if (!toggleButton || !navList) {
    return
  }

  toggleButton.hidden = false

  toggleButton.addEventListener('click', function () {
    const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true'
    toggleButton.setAttribute('aria-expanded', String(!isExpanded))
    navList.classList.toggle('defra-service-navigation__list--open')
  })
}

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
initServiceNavigation()
