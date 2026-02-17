import { describe, expect, it, mock } from "bun:test";
import { Client } from "../../src/api/client.ts";
import { APIError, ErrorCode, NetworkError } from "../../src/api/errors.ts";

function mockFetch(fn: (...args: unknown[]) => Promise<Response>): typeof fetch {
  return mock(fn) as unknown as typeof fetch;
}

describe("Client", () => {
  describe("base URL handling", () => {
    it("appends /api/v1 when not present", async () => {
      const fetched: string[] = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async (input) => {
        fetched.push(String(input));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      try {
        const client = new Client("https://n8n.example.com", "test-key");
        await client.get("/workflows");
        expect(fetched[0]).toBe("https://n8n.example.com/api/v1/workflows");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("does not double-append /api/v1", async () => {
      const fetched: string[] = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async (input) => {
        fetched.push(String(input));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      try {
        const client = new Client("https://n8n.example.com/api/v1", "test-key");
        await client.get("/workflows");
        expect(fetched[0]).toBe("https://n8n.example.com/api/v1/workflows");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("strips trailing slash from base URL", async () => {
      const fetched: string[] = [];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async (input) => {
        fetched.push(String(input));
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      try {
        const client = new Client("https://n8n.example.com/", "test-key");
        await client.get("/workflows");
        expect(fetched[0]).toBe("https://n8n.example.com/api/v1/workflows");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("auth header", () => {
    it("sends X-N8N-API-KEY header", async () => {
      let capturedHeaders: Headers | undefined;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async (_input, init) => {
        const opts = init as RequestInit | undefined;
        capturedHeaders = new Headers(opts?.headers);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      try {
        const client = new Client("https://n8n.example.com", "my-secret-key");
        await client.get("/workflows");
        expect(capturedHeaders?.get("X-N8N-API-KEY")).toBe("my-secret-key");
        expect(capturedHeaders?.get("Content-Type")).toBe("application/json");
        expect(capturedHeaders?.get("Accept")).toBe("application/json");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("HTTP methods", () => {
    it("sends correct method for POST", async () => {
      let capturedMethod = "";
      let capturedBody = "";
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async (_input, init) => {
        const opts = init as RequestInit | undefined;
        capturedMethod = opts?.method ?? "";
        capturedBody = typeof opts?.body === "string" ? opts.body : "";
        return new Response(JSON.stringify({ id: "123" }), { status: 200 });
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        await client.post("/workflows", { name: "test" });
        expect(capturedMethod).toBe("POST");
        expect(JSON.parse(capturedBody)).toEqual({ name: "test" });
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("sends correct method for PUT", async () => {
      let capturedMethod = "";
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async (_input, init) => {
        const opts = init as RequestInit | undefined;
        capturedMethod = opts?.method ?? "";
        return new Response(JSON.stringify({}), { status: 200 });
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        await client.put("/workflows/123", { name: "updated" });
        expect(capturedMethod).toBe("PUT");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("sends correct method for DELETE", async () => {
      let capturedMethod = "";
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async (_input, init) => {
        const opts = init as RequestInit | undefined;
        capturedMethod = opts?.method ?? "";
        return new Response("", { status: 200 });
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        await client.delete("/workflows/123");
        expect(capturedMethod).toBe("DELETE");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("sends correct method for PATCH", async () => {
      let capturedMethod = "";
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async (_input, init) => {
        const opts = init as RequestInit | undefined;
        capturedMethod = opts?.method ?? "";
        return new Response(JSON.stringify({}), { status: 200 });
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        await client.patch("/workflows/123", { active: true });
        expect(capturedMethod).toBe("PATCH");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe("error handling", () => {
    it("throws APIError with AUTH_ERROR for 401", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async () => {
        return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
      });

      try {
        const client = new Client("https://n8n.example.com", "bad-key");
        await expect(client.get("/workflows")).rejects.toThrow(APIError);

        try {
          await client.get("/workflows");
        } catch (e) {
          const err = e as APIError;
          expect(err.code).toBe(ErrorCode.AUTH_ERROR);
          expect(err.statusCode).toBe(401);
          expect(err.hint).toContain("API key");
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("throws APIError with NOT_FOUND for 404", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async () => {
        return new Response(JSON.stringify({ message: "Workflow not found" }), { status: 404 });
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        try {
          await client.get("/workflows/missing");
        } catch (e) {
          const err = e as APIError;
          expect(err.code).toBe(ErrorCode.NOT_FOUND);
          expect(err.statusCode).toBe(404);
          expect(err.message).toBe("Workflow not found");
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("throws APIError with CONFLICT_ERROR for 409", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async () => {
        return new Response(JSON.stringify({ message: "Resource already exists" }), {
          status: 409,
        });
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        try {
          await client.post("/tags", { name: "existing" });
        } catch (e) {
          const err = e as APIError;
          expect(err.code).toBe(ErrorCode.CONFLICT_ERROR);
          expect(err.statusCode).toBe(409);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("throws APIError with VALIDATION_ERROR for 400", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async () => {
        return new Response(JSON.stringify({ message: "Invalid input" }), { status: 400 });
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        try {
          await client.post("/workflows", {});
        } catch (e) {
          const err = e as APIError;
          expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
          expect(err.statusCode).toBe(400);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("throws APIError with SERVER_ERROR for 500", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async () => {
        return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        try {
          await client.get("/workflows");
        } catch (e) {
          const err = e as APIError;
          expect(err.code).toBe(ErrorCode.SERVER_ERROR);
          expect(err.statusCode).toBe(500);
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("throws NetworkError when fetch fails", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async () => {
        throw new Error("Connection refused");
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        await expect(client.get("/workflows")).rejects.toThrow(NetworkError);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("handles non-JSON error responses gracefully", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch(async () => {
        return new Response("Bad Gateway", { status: 502 });
      });

      try {
        const client = new Client("https://n8n.example.com", "key");
        try {
          await client.get("/workflows");
        } catch (e) {
          const err = e as APIError;
          expect(err.code).toBe(ErrorCode.SERVER_ERROR);
          expect(err.statusCode).toBe(502);
          expect(err.message).toContain("502");
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
