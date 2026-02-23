import type { Client } from "./client.ts";

/** Credential represents an n8n credential */
export interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

/** CredentialWithData includes credential data for create/update */
export interface CredentialWithData extends Credential {
  data?: Record<string, unknown>;
}

/** CreateCredentialRequest represents a request to create a credential */
export interface CreateCredentialRequest {
  name: string;
  type: string;
  data: Record<string, unknown>;
}

/** UpdateCredentialRequest represents a request to update a credential */
export interface UpdateCredentialRequest {
  name?: string;
  type?: string;
  data?: Record<string, unknown>;
}

/** ListCredentialsOptions represents options for listing credentials */
export interface ListCredentialsOptions {
  limit?: number;
  cursor?: string;
}

/** ListCredentialsResponse represents the response from listing credentials */
export interface ListCredentialsResponse {
  data: Credential[];
  nextCursor?: string;
}

/** CredentialSchema represents the schema for a credential type */
export interface CredentialSchema {
  additionalProperties: boolean;
  properties: Record<string, CredentialSchemaProperty>;
  required?: string[];
  type: string;
}

/** CredentialSchemaProperty represents a property in a credential schema */
export interface CredentialSchemaProperty {
  type: string;
  default?: unknown;
  description?: string;
}

/** CredentialService handles credential API operations */
export class CredentialService {
  constructor(private readonly client: Client) {}

  /** ListCredentials lists credentials with optional filters */
  async listCredentials(opts?: ListCredentialsOptions): Promise<ListCredentialsResponse> {
    const params = new URLSearchParams();

    if (opts) {
      if (opts.limit && opts.limit > 0) {
        params.set("limit", String(opts.limit));
      }
      if (opts.cursor) {
        params.set("cursor", opts.cursor);
      }
    }

    const query = params.toString();
    const path = query ? `/credentials?${query}` : "/credentials";

    const data = await this.client.get(path);
    return JSON.parse(data) as ListCredentialsResponse;
  }

  /** CreateCredential creates a new credential */
  async createCredential(req: CreateCredentialRequest): Promise<Credential> {
    const path = "/credentials";
    const data = await this.client.post(path, req);
    return JSON.parse(data) as Credential;
  }

  /** UpdateCredential updates an existing credential */
  async updateCredential(id: string, req: UpdateCredentialRequest): Promise<Credential> {
    const path = `/credentials/${encodeURIComponent(id)}`;
    const data = await this.client.patch(path, req);
    return JSON.parse(data) as Credential;
  }

  /** DeleteCredential deletes a credential by ID */
  async deleteCredential(id: string): Promise<Credential> {
    const path = `/credentials/${encodeURIComponent(id)}`;
    const data = await this.client.delete(path);
    return JSON.parse(data) as Credential;
  }

  /** GetCredentialSchema gets the schema for a credential type */
  async getCredentialSchema(typeName: string): Promise<CredentialSchema> {
    const path = `/credentials/schema/${encodeURIComponent(typeName)}`;
    const data = await this.client.get(path);
    return JSON.parse(data) as CredentialSchema;
  }
}
