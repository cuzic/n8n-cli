import type { Workflow } from "../../api/types.ts";

/** ConflictType represents the result type of 3-way conflict detection. */
export type ConflictType = "skip" | "update" | "conflict" | "create" | "fallback";

/** DiffVector represents the difference between two workflow states. */
export interface DiffVector {
  hasChanges: boolean;
  changedFields: string[];
}

/** ConflictResult holds the result of 3-way conflict detection. */
export interface ConflictResult {
  type: ConflictType;
  reason: string;
  baseToLocal?: DiffVector;
  baseToRemote?: DiffVector;
}

/** ThreeWayState holds the three workflow states for 3-way comparison. */
export interface ThreeWayState {
  base: Workflow | null;
  local: Workflow;
  remote: Workflow | null;
}
