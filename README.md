# simple-api-playwright

[![npm](https://img.shields.io/npm/v/simple-api-playwright.svg)](https://www.npmjs.com/package/simple-api-playwright)
[![GitHub](https://img.shields.io/badge/github-repo-black.svg)](https://github.com/notNullThen/simple-api-playwright-nodejs)

Type-safe API testing with [Playwright](https://playwright.dev/). Request intercepts, type-safe endpoints, and dual-mode support for both API and UI tests.

Do API requests like this:

```typescript
const response = await api.createUser(user).request();
```

or API waits like this:

```typescript
const [, userResponse] = await Promise.all([
  page.click(loginButton),
  api.getUser(userId).wait(),
]);
```

## Installation

```bash
npm install --save-dev simple-api-playwright @playwright/test
```

## Usage

### Basic API Request

```typescript
import { APIClient } from "simple-api-playwright";
import { test } from "@playwright/test";

test("API request", async ({ request }) => {
  APIClient.setInitialConfig({
    baseURL: "https://api.example.com",
  });

  const client = new APIClient("https://api.example.com", {
    url: "/users/1",
    method: "GET",
  });

  const { responseBody } = await client.request(request);
  console.log(responseBody);
});
```

### Custom Endpoints

```typescript
import { APIEndpointBase } from "simple-api-playwright";

interface User {
  id: number;
  name: string;
}

class UsersAPI extends APIEndpointBase {
  async getUser(id: number) {
    return this.action<User>({
      url: `/users/${id}`,
      method: "GET",
    }).request();
  }

  async createUser(name: string) {
    return this.action<User>({
      url: "/users",
      method: "POST",
      body: { name },
    }).request();
  }
}

test("Custom endpoint", async ({ request }) => {
  const api = new UsersAPI(request);
  const { responseBody: user } = await api.getUser(1);
});
```

### UI Testing with Request Interception

Intercept network requests triggered by UI actions:

```typescript
test("Add to basket and verify", async ({ page }) => {
  const api = new UsersAPI(page);

  const [, loginResponse] = await Promise.all([
    page.click(loginButton),
    api.getUser(1).wait(),
  ]);

  expect(loginResponse.responseBody.id).toBe(1);
});
```

### Bearer Token Authentication

```typescript
APIClient.setBearerToken(request, "your-jwt-token");
```

## Features

- ✨ Type-safe HTTP requests with TypeScript generics
- 🎭 Dual-mode: Direct API calls or UI-based request interception
- 🔐 Built-in bearer token support
- ⚡ Minimal dependencies (Playwright peer dependency)
- 🌐 Works with Node.js, browser, ESM, and CommonJS

## API Reference

### APIClient

- `setInitialConfig(options)` - Set default base URL and timeouts
- `setBearerToken(context, token)` - Add bearer token to requests
- `request<T>(context)` - Execute direct request
- `wait<T>(context)` - Wait for intercepted request

### APIEndpointBase

- `action<T>(params)` - Define typed API endpoint action

## Documentation

For more examples and detailed API docs, see [GitHub](https://github.com/notNullThen/simple-api-playwright-nodejs).

## License

MIT © 2026 Jeno Pekarjuk
