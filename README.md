# simple-api-playwright

[![npm](https://img.shields.io/npm/v/simple-api-playwright.svg)](https://www.npmjs.com/package/simple-api-playwright)
[![NuGet](https://img.shields.io/nuget/v/SimpleApiPlaywright.svg)](https://www.nuget.org/packages/SimpleApiPlaywright/)
[![GitHub](https://img.shields.io/badge/github-repo-black.svg)](https://github.com/notNullThen/simple-api-playwright-nodejs)

Type-safe API testing with [Playwright](https://playwright.dev/). Request intercepts, type-safe endpoints, and dual-mode support for both API and UI tests.

Make API requests like this:

```typescript
const response = await api.createUser(user).request();
```

Or API waits like this:

```typescript
const [, userResponse] = await Promise.all([
  page.click(loginButton),
  api.getUser(userId).wait(),
]);
```

Before that, define your API endpoints like this:

```typescript
import { APIEndpointBase } from "simple-api-playwright";

export default class UsersAPI extends APIEndpointBase {
  constructor(context: APIContext) {
    super(context, "api/users");
  }

  getUser = async (id: string) =>
    this.action<User>({ url: `/users/${id}`, method: "GET" });

  createUser = async (body: User) =>
    this.action<User>({ url: "/users", method: "POST", body });
}
```

## Installation

```bash
npm install --save-dev simple-api-playwright @playwright/test
```

## Quick Start

1. **Configure APIClient:**

```typescript
import { APIClient } from "simple-api-playwright";

APIClient.setInitialConfig({
  baseURL: "https://api.example.com",
  apiWaitTimeout: 5000,
  expectedStatusCodes: [200, 201],
});

// Set bearer token for authenticated requests
APIClient.setBearerToken(request, "your-jwt-token");
```

2. **Create your API endpoint class:**

```typescript
import { APIEndpointBase } from "simple-api-playwright";

export default class UsersAPI extends APIEndpointBase {
  constructor(context: APIContext) {
    super(context, "api/users");
  }

  getUser = async (id: string) =>
    this.action<User>({ url: `/users/${id}`, method: "GET" });

  createUser = async (body: User) =>
    this.action<User>({ url: "/users", method: "POST", body });
}
```

3. **Use it in your tests:**

```typescript
import { test } from "@playwright/test";

test("fetch user", async ({ request }) => {
  const api = new UsersAPI(request);
  const { responseBody: user } = await api.getUser("some-id");
});
```

4. **With UI interactions:**

```typescript
test("click and verify", async ({ page }) => {
  const api = new UsersAPI(page);
  const [, response] = await Promise.all([
    page.click(loginButton),
    api.getUser("some-id").wait(),
  ]);
});
```

## Features

- ✨ Type-safe HTTP requests with TypeScript generics
- 🎭 Dual-mode: Direct API calls or UI-based request interception
- 🔐 Built-in bearer token support
- ⚡ Minimal dependencies (Playwright peer dependency)
- 🌐 Works with Node.js, browser, ESM, and CommonJS

## Authentication & Configuration

### Setting Global Configuration

The best place to configure `APIClient.setInitialConfig()` is in your `playwright.config.ts` file, so all tests automatically use consistent API settings:

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
import { APIClient } from "simple-api-playwright";

const additionalConfig = {
  apiWaitTimeout: 5 * 1000,
  expectedAPIResponseCodes: [200, 201],
};

APIClient.setInitialConfig({
  baseURL: "https://api.example.com",
  apiWaitTimeout: additionalConfig.apiWaitTimeout,
  expectedStatusCodes: additionalConfig.expectedAPIResponseCodes,
});

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: {
    baseURL: "https://api.example.com",
    actionTimeout: 5000,
  },
});
```

This ensures all tests and workers inherit the same configuration without repetition.

### Bearer Token Authentication

Set the bearer token for authenticated requests. Typically done after login in your test fixtures:

```typescript
const loginResponse = await loginPage.login(email, password);
const token = loginResponse.authentication.token;
APIClient.setBearerToken(request, token);
```

This is especially useful in parallel test workers where each worker needs separate authentication:

```typescript
export const test = baseTest.extend({
  page: async ({ page }, use) => {
    const context = page.context();
    const loginResponse = await loginToCurrentUser(context.request);

    const token = loginResponse.token;
    APIClient.setBearerToken(context.request, token);

    await use(page);
  },
});
```

## Parallel Worker Support

For parallel test execution, manage separate user accounts and authentication per worker:

```typescript
const createdUsers = new Map<number, User>();
const loginResponses = new Map<number, LoginResponse>();

export const test = baseTest.extend({
  createdUser: [
    async ({}, use) => {
      const workerIndex = test.info().workerIndex;
      await use(createdUsers.get(workerIndex));
    },
    { scope: "worker" },
  ],
  loginResponse: [
    async ({}, use) => {
      const workerIndex = test.info().workerIndex;
      const loginResponse = loginResponses.get(workerIndex);
      await use(loginResponse);
    },
    { scope: "worker" },
  ],
  page: async ({ page }, use) => {
    const context = page.context();
    const workerIndex = test.info().workerIndex;

    // Acquire user account for this worker
    const user = await acquireUserForWorker(context.request, workerIndex);

    // Login and set bearer token
    const loginResponse = await loginUser(context.request, user);
    APIClient.setBearerToken(context.request, loginResponse.token);

    createdUsers.set(workerIndex, user);
    loginResponses.set(workerIndex, loginResponse);

    await use(page);
  },
});
```

This ensures each parallel worker has its own authenticated session.

For more examples and detailed API docs, see [GitHub](https://github.com/notNullThen/simple-api-playwright-nodejs).

## License

MIT © 2026 Jeno Pekarjuk
