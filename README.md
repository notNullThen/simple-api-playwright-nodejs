# simple-api-playwright

Type-safe API testing with [Playwright](https://playwright.dev/). Request intercepts, type-safe endpoints, and dual-mode support for both API and UI tests.

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
test("Login and verify request", async ({ page }) => {
  const usersAPI = new UsersAPI(page);

  // Start waiting for the login API response
  const loginResponseTask = usersAPI.getUser(1).wait();

  // Trigger the UI action and wait for both to complete
  await Promise.all([
    page.click("button:has-text('Login')"),
    loginResponseTask,
  ]);

  const { responseBody: user } = await loginResponseTask;
  expect(user.id).toBe(1);
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

**APIClient**
- `setInitialConfig(options)` - Set default base URL and timeouts
- `setBearerToken(context, token)` - Add bearer token to requests
- `request<T>(context)` - Execute direct request
- `wait<T>(context)` - Wait for intercepted request

**APIEndpointBase**
- `action<T>(params)` - Define typed API endpoint action

## Documentation

For more examples and detailed API docs, see [GitHub](https://github.com/notNullThen/simple-api-playwright-nodejs).

## License

MIT © 2026 Jeno Pekarjuk
