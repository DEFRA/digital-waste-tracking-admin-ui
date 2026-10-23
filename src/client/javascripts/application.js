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
export function initServiceNavigation() {
  const toggleButton = document.querySelector(
    '.govuk-js-service-navigation-toggle'
  )
  const navList = document.getElementById('navigation')

  if (!toggleButton || !navList) {
    return
  }

  const mediaQuery = window.matchMedia('(max-width: 768px)')

  // Remove the 'aria-hidden' accessibility tag when the menu is shown
  // Required for browser accessibility checks
  function updateToggleVisibility() {
    if (mediaQuery.matches) {
      toggleButton.hidden = false
      toggleButton.removeAttribute('aria-hidden')
    } else {
      toggleButton.hidden = true
      toggleButton.setAttribute('aria-hidden', 'true')
    }
  }
  mediaQuery.addEventListener('change', updateToggleVisibility)
  updateToggleVisibility()

  toggleButton.addEventListener('click', function () {
    const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true'
    toggleButton.setAttribute('aria-expanded', String(!isExpanded))
    navList.classList.toggle('govuk-service-navigation__list--open')
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
