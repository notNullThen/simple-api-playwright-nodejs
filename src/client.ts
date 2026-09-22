import {
  APIRequestContext,
  APIResponse,
  Page,
  Response,
  test,
} from "@playwright/test";

/** HTTP methods supported by API requests and browser-response waits. */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "PATCH";

/**
 * Configuration options for an API request or response interceptor.
 */
export type RequestParameters = {
  /**
   * The relative URL path or absolute URL of the API endpoint.
   */
  url?: string | null;
  /**
   * The HTTP method used for the request or response match.
   */
  method: HttpMethod;
  /**
   * The accepted response status codes. An unexpected status code causes an error.
   */
  expectedStatusCodes?: number[];
  /**
   * The request payload/body to send (for POST, PUT, PATCH, etc.).
   */
  body?: object;
  /**
   * The timeout in milliseconds for sending the request or waiting for a response. When omitted,
   * the globally configured timeout is used. Set to `0` to disable the Playwright timeout.
   */
  apiWaitTimeout?: number;
  /**
   * Whether browser responses must match the complete URL instead of containing the configured
   * URL. Leading and trailing slashes are ignored. Defaults to `false`.
   */
  exactUrlMatch?: boolean;
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
  /**
   * Creates a client for a single configured endpoint.
   *
   * @param apiBaseURL The API-specific base URL or path.
   * @param params Request and response-matching configuration.
   */
  constructor(
    protected apiBaseURL: string,
    params: RequestParameters,
  ) {
    this.fullURL = this.connectUrlParts(this.apiBaseURL, params.url || "");
    this.route = this.fullURL.replace(
      this.connectUrlParts(APIClient.appBaseURL),
      "",
    );
    this.method = params.method;
    this.expectedStatusCodes =
      params.expectedStatusCodes ?? APIClient.initialExpectedStatusCodes;
    this.apiWaitTimeout =
      params.apiWaitTimeout ?? APIClient.initialApiWaitTimeout;
    this.body = params.body;
    this.exactUrlMatch = params.exactUrlMatch ?? false;
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
  protected exactUrlMatch: boolean;

  /**
   * Configures the defaults used by subsequently created clients.
   *
   * @param options Global base URL, accepted status codes, and timeout. A timeout of `0` disables
   * the Playwright timeout.
   */
  public static setInitialConfig(options: {
    apiWaitTimeout: number;
    expectedStatusCodes: number[];
    baseURL: string;
  }) {
    const { apiWaitTimeout, expectedStatusCodes, baseURL } = options;
    this.initialApiWaitTimeout = apiWaitTimeout;
    this.initialExpectedStatusCodes = expectedStatusCodes;
    this.appBaseURL = baseURL;
  }

  /**
   * Sets Bearer-token authentication for a specific Playwright context.
   *
   * @param context The `APIRequestContext` or `Page` to associate with the token.
   * @param token The bearer token, with or without the `Bearer ` prefix.
   */
  public static setBearerToken(context: object, token: string) {
    tokenStorage.set(context, this.formatBearerToken(token));
  }

  /**
   * Executes the configured API request and parses its JSON response body.
   *
   * @typeParam T The expected response body type.
   * @param context The Playwright request context used to send the request.
   * @returns The Playwright API response and its parsed body.
   */
  public async request<T>(context: APIRequestContext) {
    return await this.executeRequest<T>(
      `Request ${this.method} "${this.route}", expect ${this.expectedStatusCodes.join(", ")}`,
      async () => {
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
      },
    );
  }

  /**
   * Waits for a browser response matching the configured URL and HTTP method.
   *
   * Matching responses with empty, `null`, or malformed JSON bodies are ignored. Waiting
   * continues until a response with a JSON body is found or Playwright times out while waiting
   * for another matching response.
   *
   * @typeParam T The expected response body type. TypeScript types are not available for runtime
   * shape validation, so valid JSON is returned as `T`.
   * @param context The Playwright page used to observe browser responses.
   * @returns The matching browser response and its parsed body.
   */
  public wait = async <T>(context: Page) =>
    await this.executeRequest<T>(
      `Wait for ${this.method} "${this.route}" ${this.expectedStatusCodes.join(", ")}`,
      async () => {
        while (true) {
          const response = await context.waitForResponse(
            (response: Response) => {
              // Ignore trailing slash and casing differences
              const actualUrl = this.normalizeUrl(response.url());
              const expectedUrl = this.normalizeUrl(this.fullURL);
              const requestMethod = response.request().method();

              const isMatch = this.exactUrlMatch
                ? actualUrl === expectedUrl
                : actualUrl.toLowerCase().includes(expectedUrl.toLowerCase());

              if (!isMatch) return false;
              if (requestMethod.toLowerCase() !== this.method.toLowerCase())
                return false;
              return true;
            },
            { timeout: this.apiWaitTimeout },
          );

          this.validateStatusCode(response.status());

          try {
            const result = await this.getResponse<T>(response);
            if (result.responseBody !== null) return result;
          } catch (error) {
            if (!(error instanceof SyntaxError)) throw error;
          }
        }
      },
    );

  private executeRequest = async <T>(
    name: string,
    fn: () => Promise<{ response: APIResponse | Response; responseBody: T }>,
  ) => await test.step(name, fn);

  /** Joins URL segments while normalizing their leading and trailing slashes. */
  protected connectUrlParts = (...parts: string[]) =>
    parts
      .filter((part) => part)
      .map((part) => this.normalizeUrl(part))
      .filter((part) => part.trim().length > 0)
      .join("/");

  /** Removes leading and trailing slashes from a URL or URL segment. */
  protected normalizeUrl = (url: string) =>
    this.removeLeadingSlash(this.removeTrailingSlash(url));

  private static formatBearerToken(token: string) {
    const prefix = "Bearer " as const;
    return token.startsWith(prefix) ? token : prefix + token;
  }

  private removeTrailingSlash = (url: string) =>
    url.endsWith("/") ? url.slice(0, -1) : url;

  private removeLeadingSlash = (url: string) =>
    url.startsWith("/") ? url.slice(1) : url;

  private async getResponse<T>(response: APIResponse | Response) {
    // Leaved const for debug ease
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
