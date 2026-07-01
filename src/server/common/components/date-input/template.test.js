import { renderComponent } from '#/test-helpers/component-helpers.js'

describe('Date Input Component', () => {
  let $dateInput
  let dateInputText

  describe('With caption', () => {
    beforeEach(() => {
      $dateInput = renderComponent('date-input', {
        id: 'date-from',
        legend: 'From date',
        hint: 'For example, 24 6 2026',
        dayValue: '01',
        monthValue: '06',
        yearValue: '2026',
        errors: {
          'date-from-Day': 'From date day is required'
        }
      })
      dateInputText = $dateInput('[data-testid="date-from"]').text().trim()
    })

    test('Should render app date input component', () => {
      expect($dateInput('[data-testid="date-from"]')).toHaveLength(1)
      expect($dateInput('[data-testid="date-from-day"]')).toHaveLength(1)
      expect($dateInput('[data-testid="date-from-month"]')).toHaveLength(1)
      expect($dateInput('[data-testid="date-from-year"]')).toHaveLength(1)
    })

    test('Should contain expected legend', () => {
      expect(dateInputText).toContain('From date')
    })

    test('Should contain expected hint', () => {
      expect(dateInputText).toContain('For example, 24 6 2026')
    })

    test('Should contain expected labels', () => {
      expect(dateInputText).toContain('Day')
      expect(dateInputText).toContain('Month')
      expect(dateInputText).toContain('Year')
    })

    test('Should contain expected error', () => {
      expect(dateInputText).toContain('From date day is required')
    })
  })
})
