/**
 * simple-api-playwright-nodejs
 *
 * A lightweight, type-safe API testing framework built on Playwright.
 * Provides simple abstractions for making HTTP requests and intercepting
 * network responses in both API and UI tests.
 *
 * @packageDocumentation
 */

// Export public classes
export { default as APIClient } from "./client";
export { default as APIEndpointBase } from "./endpoint-base";

// Export public types
export type { HttpMethod, RequestParameters } from "./client";
export type { APIContext } from "./endpoint-base";
