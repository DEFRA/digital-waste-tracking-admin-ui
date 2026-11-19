// @vitest-environment jsdom

describe('#application', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.className = 'govuk-frontend-supported'
  })

  test('Should focus an alert that needs to be known about at once', async () => {
    document.body.innerHTML = `
      <main>
        <div role="alert" data-module="moj-alert" class="moj-alert moj-alert--error" aria-label="error: Sorry, there is a problem with the service">
          <h2 class="moj-alert__heading">Sorry, there is a problem with the service</h2>
        </div>
        <a href="/">Next</a>
      </main>
    `

    await import('./application.js')

    expect(document.activeElement).toBe(
      document.querySelector('[role="alert"]')
    )
  })

  test('Should leave focus alone for an alert that is read in order', async () => {
    document.body.innerHTML = `
      <main>
        <div role="region" class="moj-alert moj-alert--success" aria-label="success: Secret removed">
          <h2 class="moj-alert__heading">Secret removed</h2>
        </div>
      </main>
    `

    await import('./application.js')

    expect(document.activeElement).toBe(document.body)
  })
})
