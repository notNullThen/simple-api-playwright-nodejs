import { APIRequestContext, APIResponse, Page, Response } from "playwright";

let test: any = null;
try {
  test = require("@playwright/test").test;
} catch {
  // @playwright/test not available, test.step will be unavailable
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "PATCH";

export type RequestParameters = {
  url?: string | null;
  method: HttpMethod;
  expectedStatusCodes?: number[];
  body?: object;
  apiWaitTimeout?: number;
};

const tokenStorage = new WeakMap<object, string>();

/**
 * APIClient - Core HTTP client for making API requests using Playwright
 *
 * This is the main class for executing HTTP requests against an API endpoint.
 * It supports both direct API requests (via APIRequestContext) and UI-based
 * request interception (via Page context).
 *
 * @example
 * ```typescript
 * // Configure the client
 * APIClient.setInitialConfig({
 *   baseURL: 'https://api.example.com',
 *   expectedStatusCodes: [200],
 *   apiWaitTimeout: 5000
 * });
 *
 * // Make a request
 * const client = new APIClient('https://api.example.com', {
 *   url: '/users',
 *   method: 'GET',
 *   expectedStatusCodes: [200]
 * });
 *
 * const result = await client.request(apiRequestContext);
 * ```
 */
export default class APIClient {
  constructor(
    protected apiBaseURL: string,
    params: RequestParameters,
  ) {
    this.fullURL = this.connectUrlParts(this.apiBaseURL, params.url || "");
    this.route = this.fullURL.replace(this.connectUrlParts(APIClient.appBaseURL), "");
    this.method = params.method;
    this.expectedStatusCodes = params.expectedStatusCodes ?? APIClient.initialExpectedStatusCodes;
    this.apiWaitTimeout = params.apiWaitTimeout ?? APIClient.initialApiWaitTimeout;
    this.body = params.body;
  }

  protected static initialApiWaitTimeout: number;
  protected static initialExpectedStatusCodes: number[];
  protected static appBaseURL: string;

  protected apiWaitTimeout: number;
  protected expectedStatusCodes: number[];
  protected fullURL: string;
  protected route: string;
  protected method: HttpMethod;
  protected body?: object;

  /**
   * Configure default settings for all APIClient instances
   * @param options Configuration object with baseURL, expectedStatusCodes, and apiWaitTimeout
   */
  public static setInitialConfig(options: { apiWaitTimeout: number; expectedStatusCodes: number[]; baseURL: string }) {
    const { apiWaitTimeout, expectedStatusCodes, baseURL } = options;
    this.initialApiWaitTimeout = apiWaitTimeout;
    this.initialExpectedStatusCodes = expectedStatusCodes;
    this.appBaseURL = baseURL;
  }

  /**
   * Set Bearer token authentication for a specific context
   * @param context The context (APIRequestContext or Page) to associate with the token
   * @param token The bearer token (with or without "Bearer " prefix)
   */
  public static setBearerToken(context: object, token: string) {
    tokenStorage.set(context, this.formatBearerToken(token));
  }

  /**
   * Execute an API request using APIRequestContext
   * @param context The APIRequestContext from Playwright
   * @returns Object containing the response and parsed response body
   */
  public async request<T>(context: APIRequestContext) {
    return await this.executeRequest<T>(`Request ${this.method} "${this.route}", expect ${this.expectedStatusCodes.join(", ")}`, async () => {
      const response: APIResponse = await context.fetch(this.fullURL, {
        method: this.method,
        headers: {
          Authorization: tokenStorage.get(context) || "",
        },
        data: this.body,
        timeout: this.apiWaitTimeout,
      });

      this.validateStatusCode(response.status());
      return await this.getResponse<T>(response);
    });
  }

  /**
   * Wait for an API response using Page context (UI testing)
   * @param context The Page context from Playwright
   * @returns Object containing the response and parsed response body
   * @throws Error if context is not a Page (use this only in UI tests)
   */
  public async wait<T>(context: Page) {
    return await this.executeRequest<T>(`Wait for ${this.method} "${this.route}" ${this.expectedStatusCodes.join(", ")}`, async () => {
      const response = await context.waitForResponse(
        (response: Response) => {
          // Ignore trailing slash and casing differences
          const actualUrl = this.normalizeUrl(response.url());
          const expectedUrl = this.normalizeUrl(this.fullURL);
          const requestMethod = response.request().method();

          if (!actualUrl.toLowerCase().includes(expectedUrl.toLowerCase())) return false;
          if (requestMethod.toLowerCase() !== this.method.toLowerCase()) return false;
          return true;
        },
        { timeout: this.apiWaitTimeout },
      );

      this.validateStatusCode(response.status());
      return await this.getResponse<T>(response);
    });
  }

  private async executeRequest<T>(name: string, fn: () => Promise<{ response: APIResponse | Response; responseBody: T }>) {
    if (test?.step) {
      return await test.step(name, fn);
    }
    return await fn();
  }

  protected connectUrlParts(...parts: string[]) {
    const connectedParts = parts
      .filter((part) => part)
      .map((part) => this.normalizeUrl(part))
      .filter((part) => part.trim().length > 0)
      .join("/");

    return connectedParts;
  }

  protected normalizeUrl(url: string) {
    return this.removeLeadingSlash(this.removeTrailingSlash(url));
  }

  private static formatBearerToken(token: string) {
    const prefix = "Bearer " as const;
    return token.startsWith(prefix) ? token : prefix + token;
  }

  private removeTrailingSlash(url: string) {
    return url.endsWith("/") ? url.slice(0, -1) : url;
  }

  private removeLeadingSlash(url: string) {
    return url.startsWith("/") ? url.slice(1) : url;
  }

  private async getResponse<T>(response: APIResponse | Response) {
    const responseObject = await response.json();
    return { response, responseBody: responseObject as T };
  }

  private validateStatusCode(statusCode: number) {
    if (!this.expectedStatusCodes.includes(statusCode)) {
      throw new Error(
        `Expected to return ${this.expectedStatusCodes.join(", ")}, but got ${statusCode}.\nEndpoint: ${
          this.method
        } ${this.route} `,
      );
    }
  }
}
