import { NetworkError, parseAPIError } from "./errors.ts";

/** Client is the n8n API client */
export class Client {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(baseURL: string, apiKey: string, timeoutMs = 30_000) {
    // Ensure baseURL doesn't have trailing slash
    let url = baseURL.replace(/\/+$/, "");

    // If base URL already includes /api/v1, don't add it again
    if (!url.endsWith("/api/v1")) {
      url = `${url}/api/v1`;
    }

    this.baseURL = url;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  /** doRequest performs an HTTP request with authentication */
  private async doRequest(method: string, path: string, body?: unknown): Promise<string> {
    const url = `${this.baseURL}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const init: RequestInit = {
        method,
        headers: {
          "X-N8N-API-KEY": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        signal: controller.signal,
      };

      if (body !== undefined) {
        init.body = JSON.stringify(body);
      }

      let resp: Response;
      try {
        resp = await fetch(url, init);
      } catch (err) {
        throw new NetworkError(err instanceof Error ? err : new Error(String(err)));
      }

      const respBody = await resp.text();

      if (resp.status >= 400) {
        throw parseAPIError(resp.status, respBody);
      }

      return respBody;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Get performs a GET request */
  async get(path: string): Promise<string> {
    return this.doRequest("GET", path);
  }

  /** Post performs a POST request */
  async post(path: string, body?: unknown): Promise<string> {
    return this.doRequest("POST", path, body);
  }

  /** Put performs a PUT request */
  async put(path: string, body?: unknown): Promise<string> {
    return this.doRequest("PUT", path, body);
  }

  /** Patch performs a PATCH request */
  async patch(path: string, body?: unknown): Promise<string> {
    return this.doRequest("PATCH", path, body);
  }

  /** Delete performs a DELETE request */
  async delete(path: string): Promise<string> {
    return this.doRequest("DELETE", path);
  }
}
