import type { TagService } from "../api/tag-service.ts";
import type { Tag, TagIDInput } from "../api/types.ts";

/** MergeTagsResult represents the result of a tag merge operation. */
export interface MergeTagsResult {
  added: string[];
  existing: string[];
  allTags: Tag[];
}

/** TagMerger handles tag merging operations. */
export class TagMerger {
  constructor(private readonly tagService: TagService) {}

  /**
   * Merges local tags with remote tags (add-only strategy).
   * Ensures all tags exist (creates if needed) and returns the merged result.
   */
  async mergeTags(
    localTags: Tag[] | undefined,
    remoteTags: Tag[] | undefined,
    autoTags: string[],
  ): Promise<MergeTagsResult> {
    const result: MergeTagsResult = {
      added: [],
      existing: [],
      allTags: [],
    };

    // Build set of existing tag names (from remote)
    const existingTagNames = new Map<string, Tag>();
    for (const tag of remoteTags ?? []) {
      existingTagNames.set(tag.name, tag);
      result.allTags.push(tag);
    }

    // Collect all tag names to add (from local + auto tags)
    const tagsToAdd = new Set<string>();
    for (const tag of localTags ?? []) {
      tagsToAdd.add(tag.name);
    }
    for (const tagName of autoTags) {
      tagsToAdd.add(tagName);
    }

    // Process each tag to add
    for (const tagName of tagsToAdd) {
      if (existingTagNames.has(tagName)) {
        result.existing.push(tagName);
      } else {
        const tag = await this.tagService.findOrCreateTag(tagName);
        if (tag) {
          result.added.push(tagName);
          result.allTags.push(tag);
          existingTagNames.set(tagName, tag);
        }
      }
    }

    return result;
  }

  /** Applies the merged tags to a workflow. */
  async applyTags(workflowID: string, tags: Tag[]): Promise<void> {
    const tagIDs: TagIDInput[] = tags.filter((t) => t.id).map((t) => ({ id: t.id! }));
    await this.tagService.updateWorkflowTags(workflowID, tagIDs);
  }
}
