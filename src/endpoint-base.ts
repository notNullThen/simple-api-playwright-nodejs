import { APIRequestContext, Page } from "@playwright/test";
import APIClient, { RequestParameters } from "./client";

export type APIContext = Page | APIRequestContext;

/**
 * APIEndpointBase - Abstract base class for creating API endpoint wrappers
 *
 * Extend this class to create specific endpoint implementations. It provides
 * a convenient interface for defining API operations with type-safe parameters
 * and responses.
 *
 * @typeParam T - The context type (Page for UI tests, APIRequestContext for API tests)
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
  constructor(
    private context: APIContext,
    private baseURL: string,
  ) {}

  /**
   * Create an action for a specific endpoint operation
   * @param params Request parameters including URL, method, body, etc.
   * @returns Object with `request()` and `wait()` methods for executing the action
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
       * Execute the request directly (for API tests)
       * @returns Promise with response and parsed response body
       */
      request: async () => {
        return await new APIClient(this.baseURL, params).request<T>(this.context as APIRequestContext);
      },

      /**
       * Wait for the response to be intercepted (for UI tests only)
       * @returns Promise with response and parsed response body
       * @throws Error if context is not a Page
       */
      wait: async () => {
        const isPage = "goto" in this.context;
        if (!isPage) {
          throw new Error("You can use wait() only in the context of UI Tests (context should be of 'Page' type)");
        }

        return await new APIClient(this.baseURL, params).wait<T>(this.context as Page);
      },
    };
  }
}
