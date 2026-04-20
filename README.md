# simple-api-playwright-nodejs

A lightweight, type-safe API testing framework built on [Playwright](https://playwright.dev/). Provides elegant abstractions for making HTTP requests and intercepting network responses in both API and UI tests.

## Features

- ✨ **Simple API** - Easy-to-use classes for HTTP requests
- 🎯 **Type-Safe** - Full TypeScript support with generics
- 🔐 **Bearer Token Support** - Built-in authentication handling
- 🌐 **Multi-Platform** - Works in Node.js, browser, and CommonJS/ESM environments
- 📝 **Well Documented** - Comprehensive API documentation with TypeDoc
- 🎭 **Dual Mode** - Support for both direct API requests and UI-based interception
- ⚡ **Lightweight** - Minimal dependencies, uses Playwright as peer dependency

## Installation

```bash
npm install --save-dev simple-api-playwright-nodejs playwright
```

Or with Yarn:

```bash
yarn add --dev simple-api-playwright-nodejs playwright
```

## Quick Start

### Basic Usage

```typescript
import { APIClient } from 'simple-api-playwright-nodejs';
import { test } from '@playwright/test';

test('Make API request', async ({ request }) => {
  // Configure default settings
  APIClient.setInitialConfig({
    baseURL: 'https://api.example.com',
    expectedStatusCodes: [200],
    apiWaitTimeout: 5000
  });

  // Create and execute a request
  const client = new APIClient('https://api.example.com', {
    url: '/users/1',
    method: 'GET'
  });

  const { response, responseBody } = await client.request(request);
  console.log(responseBody); // Parsed JSON response
});
```

### Creating Custom Endpoints

Extend `APIEndpointBase` to create a reusable API client for your service:

```typescript
import { APIEndpointBase } from 'simple-api-playwright-nodejs';
import { APIContext } from 'simple-api-playwright-nodejs';

interface User {
  id: number;
  name: string;
  email: string;
}

class UsersAPI extends APIEndpointBase {
  async getUser(id: number) {
    return this.action<User>({
      url: `/users/${id}`,
      method: 'GET'
    }).request();
  }

  async getAllUsers() {
    return this.action<User[]>({
      url: '/users',
      method: 'GET'
    }).request();
  }

  async createUser(userData: Omit<User, 'id'>) {
    return this.action<User>({
      url: '/users',
      method: 'POST',
      body: userData
    }).request();
  }

  async updateUser(id: number, userData: Partial<User>) {
    return this.action<User>({
      url: `/users/${id}`,
      method: 'PUT',
      body: userData
    }).request();
  }

  async deleteUser(id: number) {
    return this.action<void>({
      url: `/users/${id}`,
      method: 'DELETE',
      expectedStatusCodes: [204]
    }).request();
  }
}

// Usage in tests
import { test } from '@playwright/test';

test('User API operations', async ({ request }) => {
  APIClient.setInitialConfig({
    baseURL: 'https://api.example.com',
    expectedStatusCodes: [200, 201],
    apiWaitTimeout: 5000
  });

  const usersAPI = new UsersAPI(request, 'https://api.example.com');

  // Get a user
  const { response, responseBody: user } = await usersAPI.getUser(1);
  console.log('User:', user);

  // Create a user
  const { responseBody: newUser } = await usersAPI.createUser({
    name: 'John Doe',
    email: 'john@example.com'
  });

  // Update user
  await usersAPI.updateUser(newUser.id, { name: 'Jane Doe' });

  // Delete user
  await usersAPI.deleteUser(newUser.id);
});
```

### Bearer Token Authentication

```typescript
import { APIClient } from 'simple-api-playwright-nodejs';
import { test } from '@playwright/test';

test('Authenticated request', async ({ request }) => {
  const token = 'your-jwt-token';

  // Set bearer token for the context
  APIClient.setBearerToken(request, token);

  const client = new APIClient('https://api.example.com', {
    url: '/protected/resource',
    method: 'GET'
  });

  const { response, responseBody } = await client.request(request);
  console.log(responseBody);
});
```

### Different HTTP Methods

The framework supports all standard HTTP methods:

```typescript
class ProductsAPI extends APIEndpointBase {
  // GET
  async getProduct(id: number) {
    return this.action<Product>({
      url: `/products/${id}`,
      method: 'GET'
    }).request();
  }

  // POST
  async createProduct(data: CreateProductDTO) {
    return this.action<Product>({
      url: '/products',
      method: 'POST',
      body: data
    }).request();
  }

  // PUT (full update)
  async updateProduct(id: number, data: Product) {
    return this.action<Product>({
      url: `/products/${id}`,
      method: 'PUT',
      body: data
    }).request();
  }

  // PATCH (partial update)
  async patchProduct(id: number, data: Partial<Product>) {
    return this.action<Product>({
      url: `/products/${id}`,
      method: 'PATCH',
      body: data
    }).request();
  }

  // DELETE
  async deleteProduct(id: number) {
    return this.action<void>({
      url: `/products/${id}`,
      method: 'DELETE',
      expectedStatusCodes: [204]
    }).request();
  }

  // HEAD
  async checkProductExists(id: number) {
    return this.action<void>({
      url: `/products/${id}`,
      method: 'HEAD'
    }).request();
  }
}
```

### UI Testing with Response Interception

Use the `wait()` method to intercept network responses in UI tests:

```typescript
import { test } from '@playwright/test';

test('UI test with API interception', async ({ page }) => {
  const usersAPI = new UsersAPI(page, 'https://api.example.com');

  // Navigate to page that triggers API call
  await page.goto('https://example.com/users');

  // Wait for and validate the API response
  const { response, responseBody } = await usersAPI.getAllUsers();
  console.log('Users loaded:', responseBody);
});
```

## Configuration

### Global Configuration

Set default configuration for all APIClient instances:

```typescript
APIClient.setInitialConfig({
  baseURL: 'https://api.example.com',
  expectedStatusCodes: [200, 201],
  apiWaitTimeout: 5000
});
```

### Per-Request Configuration

Override settings for individual requests:

```typescript
const client = new APIClient('https://api.example.com', {
  url: '/users',
  method: 'POST',
  body: { name: 'John' },
  expectedStatusCodes: [201], // Override global setting
  apiWaitTimeout: 3000 // Override timeout
});
```

## API Reference

### APIClient

The core HTTP client for making requests.

**Static Methods:**
- `setInitialConfig(options)` - Configure default settings
- `setBearerToken(context, token)` - Set bearer token for a context

**Instance Methods:**
- `request<T>(context)` - Execute request using APIRequestContext
- `wait<T>(context)` - Wait for response using Page context

### APIEndpointBase

Abstract base class for creating endpoint implementations.

**Protected Methods:**
- `action<T>(params)` - Create an action object with `request()` and `wait()` methods

### Types

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'PATCH';

type RequestParameters = {
  url?: string | null;
  method: HttpMethod;
  expectedStatusCodes?: number[];
  body?: object;
  apiWaitTimeout?: number;
};

type APIContext = Page | APIRequestContext;
```

## Error Handling

The framework validates status codes and throws descriptive errors:

```typescript
try {
  const client = new APIClient('https://api.example.com', {
    url: '/users/999',
    method: 'GET',
    expectedStatusCodes: [200]
  });
  await client.request(request);
} catch (error) {
  // Throws: Expected to return 200, but got 404.
  // Endpoint: GET /users/999
}
```

## Documentation

Generate TypeDoc API documentation:

```bash
npm run docs:generate
```

Documentation will be generated in the `docs/` directory.

## Building

Build all targets (CommonJS, ESM, Browser):

```bash
npm run build
```

Individual build targets:

```bash
npm run build:cjs    # CommonJS
npm run build:esm    # ES Modules
npm run build:browser # Browser/UMD bundle
npm run build:types   # Type definitions only
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © 2026 Jeno Pekarjuk

## Support

For issues, questions, or suggestions, please open an issue on [GitHub](https://github.com/notNullThen/simple-api-playwright-nodejs/issues).
