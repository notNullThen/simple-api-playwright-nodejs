# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - [1.0.5] - 2026-04-21

### Documentation

- README updated

## [1.0.0] - 2026-04-20

### Added

- Initial release of simple-api-playwright-nodejs
- `APIClient` - Core HTTP client for making API requests with Playwright
  - Support for all HTTP methods: GET, POST, PUT, DELETE, HEAD, PATCH
  - Bearer token authentication via `setBearerToken()`
  - Configurable status code validation
  - Request timeout configuration
  - URL normalization and path joining utilities
- `APIEndpointBase` - Abstract base class for creating custom API endpoint implementations
  - Type-safe endpoint definitions
  - Support for both direct API requests and UI-based response interception
  - Generic response typing
- `RequestParameters` type - Configuration object for requests
- `HttpMethod` type - Union type for HTTP methods
- `APIContext` type - Union type for Playwright contexts (Page | APIRequestContext)
- Multi-target builds:
  - CommonJS (.cjs)
  - ES Modules (.mjs)
  - Browser/UMD bundle
  - TypeScript declarations
- TypeDoc integration for API documentation generation
- Comprehensive README with usage examples and API reference
- Full TypeScript support with strict mode enabled

### Documentation

- Detailed README with quick start guide
- Usage examples for basic APIClient usage
- Examples for creating custom endpoint implementations
- Bearer token authentication examples
- HTTP method examples (GET, POST, PUT, PATCH, DELETE, HEAD)
- UI testing with response interception examples
- Configuration guide
- Error handling documentation
- TypeDoc for generated API documentation

[1.0.0]: https://github.com/notNullThen/simple-api-playwright-nodejs/releases/tag/v1.0.0
