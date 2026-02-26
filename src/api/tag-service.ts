import type { Client } from "./client.ts";
import { isConflictError } from "./errors.ts";
import type { ListTagsResponse, Tag, TagIDInput, TagInput } from "./types.ts";

/** ListTagsOptions represents options for listing tags */
export interface ListTagsOptions {
  limit?: number;
  cursor?: string;
}

/** TagService handles tag API operations */
export class TagService {
  constructor(private readonly client: Client) {}

  /** ListTags lists all tags with optional pagination */
  async listTags(opts?: ListTagsOptions): Promise<ListTagsResponse> {
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
    const path = query ? `/tags?${query}` : "/tags";

    const data = await this.client.get(path);
    return JSON.parse(data) as ListTagsResponse;
  }

  /** ListAllTags lists all tags with automatic pagination */
  async listAllTags(): Promise<Tag[]> {
    const allTags: Tag[] = [];
    const opts: ListTagsOptions = { limit: 250 };

    for (;;) {
      const resp = await this.listTags(opts);
      allTags.push(...resp.data);

      if (!resp.nextCursor) {
        break;
      }
      opts.cursor = resp.nextCursor;
    }

    return allTags;
  }

  /** GetTagByName finds a tag by name. Returns null if not found. */
  async getTagByName(name: string): Promise<Tag | null> {
    const tags = await this.listAllTags();
    const found = tags.find((tag) => tag.name === name);
    return found ?? null;
  }

  /** CreateTag creates a new tag */
  async createTag(input: TagInput): Promise<Tag> {
    const data = await this.client.post("/tags", input);
    return JSON.parse(data) as Tag;
  }

  /**
   * FindOrCreateTag finds a tag by name, or creates it if it doesn't exist.
   * Handles race conditions where another process may create the tag concurrently.
   */
  async findOrCreateTag(name: string): Promise<Tag | null> {
    // First, try to find existing tag
    const existingTag = await this.getTagByName(name);
    if (existingTag) {
      return existingTag;
    }

    // Tag doesn't exist, create it
    try {
      return await this.createTag({ name });
    } catch (err) {
      // Handle race condition: if another process created the tag,
      // we get a 409 Conflict. In this case, fetch the existing tag.
      if (isConflictError(err)) {
        return this.getTagByName(name);
      }
      throw err;
    }
  }

  /** GetTag retrieves a tag by ID */
  async getTag(id: string): Promise<Tag> {
    const path = `/tags/${encodeURIComponent(id)}`;
    const data = await this.client.get(path);
    return JSON.parse(data) as Tag;
  }

  /** UpdateTag updates an existing tag */
  async updateTag(id: string, input: TagInput): Promise<Tag> {
    const path = `/tags/${encodeURIComponent(id)}`;
    const data = await this.client.put(path, input);
    return JSON.parse(data) as Tag;
  }

  /** DeleteTag deletes a tag by ID */
  async deleteTag(id: string): Promise<void> {
    const path = `/tags/${encodeURIComponent(id)}`;
    await this.client.delete(path);
  }

  /** UpdateWorkflowTags updates the tags for a workflow (replaces all tags) */
  async updateWorkflowTags(workflowId: string, tagIds: TagIDInput[]): Promise<void> {
    const path = `/workflows/${encodeURIComponent(workflowId)}/tags`;
    await this.client.put(path, tagIds);
  }
}
