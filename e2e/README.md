# E2E Tests

End-to-end tests using Playwright.

## Setup

Install Playwright browsers (one-time):
```bash
npx playwright install chromium
```

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Show report
npx playwright show-report
```

## Notes

- Tests run against `http://localhost:3000`
- Dev server starts automatically via `webServer` config
- Tests are designed to work without a seeded database (testing auth flows, API protection, navigation)
- For full integration tests with data, seed the database first: `npx prisma db seed`
