import { APIResponse, errors, Response, Route } from "@playwright/test";

/** A fetched response held until it is released to the browser or disposed. */
export default class HeldApiResponse {
  private heldResponse?: APIResponse;
  private complete!: () => void;
  /** Resolves when the held route is released or aborted. */
  readonly completion: Promise<void>;
  /** The delivered browser response after a successful strict release. */
  browserResponse?: Response;

  constructor(
    private readonly route: Route,
    /** The fetched server response. Read its body before release or disposal. */
    readonly response: APIResponse,
    private readonly timeout: number,
    private readonly removeRoute: () => Promise<void>,
  ) {
    this.heldResponse = response;
    this.completion = new Promise<void>((resolve) => {
      this.complete = resolve;
    });
  }

  /** The intercepted browser request. */
  get request() {
    return this.route.request();
  }

  /** Delivers the response. Pass `true` to also verify browser delivery and completion. */
  async release(failIfNotReleased = false): Promise<void> {
    const heldResponse = this.heldResponse;
    if (!heldResponse) {
      throw new Error("The response has already been released or disposed.");
    }
    this.heldResponse = undefined;

    try {
      await this.route.fulfill({ response: heldResponse });
      if (failIfNotReleased) {
        const response = await waitWithTimeout(
          this.request.response(), this.timeout,
        );
        if (!response) {
          throw new Error(
            `The held response was not delivered: ${this.request.failure()?.errorText}`,
          );
        }
        this.browserResponse = response;
        const error = await waitWithTimeout(response.finished(), this.timeout);
        if (error) throw error;
        const failure = this.request.failure();
        if (failure) throw new Error(`The held request failed: ${failure.errorText}`);
      }
    } catch (error) {
      if (failIfNotReleased || !this.request.failure()) throw error;
    } finally {
      await this.cleanup(heldResponse);
    }
  }

  /** Aborts and cleans up an unreleased request. Safe to call after release. */
  async dispose(): Promise<void> {
    const heldResponse = this.heldResponse;
    if (!heldResponse) return;
    this.heldResponse = undefined;

    try {
      await this.route.abort();
    } finally {
      await this.cleanup(heldResponse);
    }
  }

  private async cleanup(response: APIResponse) {
    this.complete();
    try {
      await response.dispose();
    } finally {
      await this.removeRoute();
    }
  }
}

/** Waits for an operation with the configured API timeout; zero disables the timeout. */
export async function waitWithTimeout<T>(
  task: Promise<T>, timeout: number,
): Promise<T> {
  if (timeout === 0) return task;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new errors.TimeoutError(`API timeout of ${timeout}ms exceeded.`));
        }, timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
