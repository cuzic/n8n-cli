/** ParamType represents the expected JSON type of a parameter value */
export type ParamType = "string" | "number" | "boolean" | "object" | "array" | "any";

/** ParamSchema describes validation rules for a single node parameter */
export interface ParamSchema {
  required?: boolean;
  type?: ParamType;
  allowedValues?: string[];
  nestedRequired?: string[];
}

/** NodeTypeSchema describes validation rules for a specific n8n node type */
export interface NodeTypeSchema {
  nodeType: string;
  minVersion?: number;
  maxVersion?: number;
  requiresCredentials?: boolean;
  params?: Record<string, ParamSchema>;
  conditionParam?: string;
  conditionValue?: string;
  optionsParams?: Record<string, ParamSchema>;
}

/** Static schema definitions for common node types */
const nodeTypeSchemas: NodeTypeSchema[] = [
  // n8n-nodes-base.code
  {
    nodeType: "n8n-nodes-base.code",
    params: { jsCode: { required: true, type: "string" } },
  },
  // n8n-nodes-base.slack (message mode, default)
  {
    nodeType: "n8n-nodes-base.slack",
    requiresCredentials: true,
    conditionParam: "resource",
    conditionValue: "",
    params: {
      channelId: {
        required: true,
        type: "object",
        nestedRequired: ["value"],
      },
    },
  },
  // n8n-nodes-base.slack (file mode)
  {
    nodeType: "n8n-nodes-base.slack",
    requiresCredentials: true,
    conditionParam: "resource",
    conditionValue: "file",
  },
  // n8n-nodes-base.executeWorkflow
  {
    nodeType: "n8n-nodes-base.executeWorkflow",
    params: {
      workflowId: {
        required: true,
        type: "object",
        nestedRequired: ["value"],
      },
    },
  },
  // @n8n/n8n-nodes-langchain.agent
  {
    nodeType: "@n8n/n8n-nodes-langchain.agent",
    params: {
      promptType: { required: true, type: "string" },
      text: { required: true, type: "string" },
    },
  },
  // n8n-nodes-base.scheduleTrigger
  {
    nodeType: "n8n-nodes-base.scheduleTrigger",
    params: { rule: { required: true, type: "object" } },
  },
  // n8n-nodes-base.googleBigQuery
  {
    nodeType: "n8n-nodes-base.googleBigQuery",
    requiresCredentials: true,
    params: {
      projectId: {
        required: true,
        type: "object",
        nestedRequired: ["value"],
      },
    },
  },
  // n8n-nodes-base.httpRequest
  {
    nodeType: "n8n-nodes-base.httpRequest",
    params: {
      url: { required: true, type: "string" },
      method: {
        type: "string",
        allowedValues: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
      },
    },
  },
  // n8n-nodes-base.webhook
  {
    nodeType: "n8n-nodes-base.webhook",
    params: {
      path: { required: true, type: "string" },
      httpMethod: {
        type: "string",
        allowedValues: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
      },
    },
  },
  // n8n-nodes-base.filter
  {
    nodeType: "n8n-nodes-base.filter",
    params: { conditions: { required: true, type: "object" } },
  },
  // n8n-nodes-base.if
  {
    nodeType: "n8n-nodes-base.if",
    params: { conditions: { required: true, type: "object" } },
  },
  // n8n-nodes-base.set (v3+)
  {
    nodeType: "n8n-nodes-base.set",
    minVersion: 3.0,
    params: { assignments: { required: true, type: "object" } },
  },
  // n8n-nodes-base.notion
  {
    nodeType: "n8n-nodes-base.notion",
    requiresCredentials: true,
    params: { resource: { required: true, type: "string" } },
  },
  // n8n-nodes-base.splitInBatches
  {
    nodeType: "n8n-nodes-base.splitInBatches",
    params: { batchSize: { type: "number" } },
  },
  // @n8n/n8n-nodes-langchain.lmChatGoogleVertex
  {
    nodeType: "@n8n/n8n-nodes-langchain.lmChatGoogleVertex",
    requiresCredentials: true,
    params: {
      modelName: { required: true, type: "string" },
      projectId: {
        required: true,
        type: "object",
        nestedRequired: ["value"],
      },
    },
  },
  // @n8n/n8n-nodes-langchain.outputParserStructured
  {
    nodeType: "@n8n/n8n-nodes-langchain.outputParserStructured",
    params: { inputSchema: { required: true, type: "string" } },
  },
];

/** Schema index: maps node type to its schemas */
const schemaIndex = new Map<string, NodeTypeSchema[]>();
for (const s of nodeTypeSchemas) {
  const existing = schemaIndex.get(s.nodeType) ?? [];
  existing.push(s);
  schemaIndex.set(s.nodeType, existing);
}

/** Returns all matching schemas for a given node type and version */
export function lookupSchemas(nodeType: string, typeVersion: number): NodeTypeSchema[] {
  const candidates = schemaIndex.get(nodeType);
  if (!candidates) return [];

  return candidates.filter((s) => {
    if (s.minVersion && typeVersion < s.minVersion) return false;
    if (s.maxVersion && typeVersion > s.maxVersion) return false;
    return true;
  });
}

/** Checks if a schema's condition matches the node's parameters */
export function matchesCondition(schema: NodeTypeSchema, params: Record<string, unknown>): boolean {
  if (!schema.conditionParam) return true;
  let paramVal = "";
  const v = params[schema.conditionParam];
  if (typeof v === "string") paramVal = v;
  return paramVal === (schema.conditionValue ?? "");
}
