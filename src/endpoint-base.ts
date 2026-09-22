import { APIRequestContext, Page } from "@playwright/test";
import APIClient, { RequestParameters } from "./client";

/** A Playwright context supported by an API endpoint wrapper. */
export type APIContext = Page | APIRequestContext;

/**
 * APIEndpointBase - Abstract base class for creating API endpoint wrappers
 *
 * Extend this class to create specific endpoint implementations. It provides
 * a convenient interface for defining API operations with type-safe parameters
 * and responses.
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 *
 * class UsersAPI extends APIEndpointBase {
 *   async getUser(id: number) {
 *     return this.action<User>({
 *       url: `/users/${id}`,
 *       method: 'GET'
 *     }).request();
 *   }
 *
 *   async createUser(userData: Partial<User>) {
 *     return this.action<User>({
 *       url: '/users',
 *       method: 'POST',
 *       body: userData
 *     }).request();
 *   }
 * }
 *
 * // Usage
 * const usersAPI = new UsersAPI(context, 'https://api.example.com');
 * const result = await usersAPI.getUser(1);
 * ```
 */
export default abstract class APIEndpointBase {
  /**
   * Creates an endpoint wrapper.
   *
   * @param context A Playwright `Page` for browser-response waits or an `APIRequestContext` for
   * direct requests.
   * @param baseURL The API-specific base URL or path used by actions created by this endpoint.
   */
  constructor(
    private context: APIContext,
    private baseURL: string,
  ) {}

  /**
   * Creates a typed action for a specific endpoint operation.
   *
   * @typeParam T The expected response body type.
   * @param params Request and response-matching configuration.
   * @returns An action with `request()` and `wait()` methods.
   *
   * @example
   * ```typescript
   * const action = this.action<ResponseType>({
   *   url: '/endpoint',
   *   method: 'POST',
   *   body: { key: 'value' }
   * });
   *
   * // Use request() for API tests
   * const result = await action.request();
   *
   * // Use wait() for UI tests (will intercept network response)
   * const result = await action.wait();
   * ```
   */
  public action<T>(params: RequestParameters) {
    return {
      /**
       * Executes the request directly. Intended for API tests using an `APIRequestContext`.
       *
       * @returns The Playwright API response and its parsed body.
       */
      request: async () => {
        return await new APIClient(this.baseURL, params).request<T>(
          this.context as APIRequestContext,
        );
      },

      /**
       * Waits for a matching browser response. Intended for UI tests using a `Page`.
       * Empty, `null`, and malformed JSON response bodies are ignored.
       *
       * @returns The matching browser response and its parsed body.
       * @throws An error when the endpoint was not created with a Playwright `Page`.
       */
      wait: async () => {
        const isPage = "goto" in this.context;
        if (!isPage) {
          throw new Error(
            "You can use wait() only in the context of UI Tests (context should be of 'Page' type)",
          );
        }

        return await new APIClient(this.baseURL, params).wait<T>(
          this.context as Page,
        );
      },
    };
  }
}
