import type { DataProvider, Identifier } from "ra-core";

/**
 * Structured action that the AI can request to perform CRUD operations.
 */
export type CrudAction =
  | {
      action: "getList";
      resource: string;
      filter?: Record<string, unknown>;
      sort?: { field: string; order: "ASC" | "DESC" };
      pagination?: { page: number; perPage: number };
    }
  | {
      action: "getOne";
      resource: string;
      id: Identifier;
    }
  | {
      action: "create";
      resource: string;
      data: Record<string, unknown>;
    }
  | {
      action: "update";
      resource: string;
      id: Identifier;
      data: Record<string, unknown>;
    }
  | {
      action: "delete";
      resource: string;
      id: Identifier;
    };

/**
 * Result of executing a CRUD action.
 */
export type ActionResult = {
  success: boolean;
  data?: unknown;
  total?: number;
  error?: string;
};

/**
 * Attempts to parse a JSON action block from the AI response text.
 * The AI is instructed to wrap actions in ```json ... ``` code blocks
 * with a specific structure. Returns null if no action is found.
 */
export function parseAction(text: string): CrudAction | null {
  // Try to extract JSON from code blocks first
  const codeBlockMatch = text.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (isValidAction(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON in code block
    }
  }

  // Try to find a raw JSON object with an "action" field
  const jsonMatch = text.match(/\{[\s\S]*"action"\s*:\s*"[^"]+?"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (isValidAction(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON
    }
  }

  return null;
}

function isValidAction(obj: unknown): obj is CrudAction {
  if (typeof obj !== "object" || obj === null) return false;
  const action = (obj as Record<string, unknown>).action;
  const resource = (obj as Record<string, unknown>).resource;
  return (
    typeof action === "string" &&
    ["getList", "getOne", "create", "update", "delete"].includes(action) &&
    typeof resource === "string"
  );
}

/**
 * Executes a parsed CRUD action against the data provider.
 */
export async function executeAction(
  dataProvider: DataProvider,
  action: CrudAction,
): Promise<ActionResult> {
  try {
    switch (action.action) {
      case "getList": {
        const result = await dataProvider.getList(action.resource, {
          filter: action.filter ?? {},
          sort: action.sort ?? { field: "id", order: "ASC" },
          pagination: action.pagination ?? { page: 1, perPage: 10 },
        });
        return { success: true, data: result.data, total: result.total };
      }
      case "getOne": {
        const result = await dataProvider.getOne(action.resource, {
          id: action.id,
        });
        return { success: true, data: result.data };
      }
      case "create": {
        const result = await dataProvider.create(action.resource, {
          data: action.data,
        });
        return { success: true, data: result.data };
      }
      case "update": {
        const result = await dataProvider.update(action.resource, {
          id: action.id,
          data: action.data,
          previousData: { id: action.id },
        });
        return { success: true, data: result.data };
      }
      case "delete": {
        const result = await dataProvider.delete(action.resource, {
          id: action.id,
          previousData: { id: action.id },
        });
        return { success: true, data: result.data };
      }
      default:
        return { success: false, error: "Unknown action" };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * The available CRM resources and their fields, used in the system prompt.
 */
export const RESOURCE_SCHEMA = `
Available CRM resources and their fields:

1. contacts
   - id (number, read-only)
   - first_name (string, required)
   - last_name (string, required)
   - title (string) - job title
   - company_id (number, nullable) - ID of associated company
   - email_jsonb (array of {email, type}) - e.g. [{email: "john@example.com", type: "Work"}]
   - phone_jsonb (array of {number, type}) - e.g. [{number: "555-1234", type: "Work"}]
   - linkedin_url (string, nullable)
   - first_seen (date string)
   - last_seen (date string)
   - has_newsletter (boolean)
   - tags (array of tag IDs)
   - gender (string)
   - sales_id (number, nullable) - assigned sales person
   - status (string) - e.g. "cold", "warm", "hot"
   - background (string) - notes about the contact
   - lead_source (string, nullable)
   - contact_type (string, nullable)

2. companies
   - id (number, read-only)
   - name (string, required)
   - sector (string)
   - size (number) - 1, 10, 50, 250, or 500
   - linkedin_url (string)
   - website (string)
   - phone_number (string)
   - address (string)
   - zipcode (string)
   - city (string)
   - state_abbr (string)
   - sales_id (number, nullable)
   - created_at (date string)
   - description (string)
   - revenue (string)
   - tax_identifier (string)
   - country (string)

3. deals
   - id (number, read-only)
   - name (string, required)
   - company_id (number, required)
   - contact_ids (array of numbers)
   - category (string)
   - stage (string) - e.g. "new-inquiry", "proposal-sent", "closed-won"
   - description (string)
   - amount (number) - deal value
   - created_at (date string)
   - updated_at (date string)
   - expected_closing_date (date string)
   - sales_id (number)
   - index (number) - order in pipeline
   - lead_source (string, nullable)

4. tasks
   - id (number, read-only)
   - contact_id (number, required)
   - type (string) - task type
   - text (string) - task description
   - due_date (date string)
   - done_date (date string, nullable) - null if not done

5. contact_notes
   - id (number, read-only)
   - contact_id (number, required)
   - text (string, required)
   - date (date string)
   - sales_id (number)
   - status (string)

6. deal_notes
   - id (number, read-only)
   - deal_id (number, required)
   - text (string, required)
   - date (date string)
   - sales_id (number)

7. sales (team members - read only via chatbot)
   - id (number, read-only)
   - first_name (string)
   - last_name (string)
   - email (string)

8. tags
   - id (number, read-only)
   - name (string)
   - color (string)

9. products
   - id (number, read-only)
   - name (string)
   - category (string)
   - price (number)
   - is_active (boolean)
`;

export const SYSTEM_PROMPT = `You are an AI assistant for a CRM application called Doctor AI CRM. You help users manage their contacts, companies, deals, tasks, and notes through natural language.

${RESOURCE_SCHEMA}

When the user asks you to perform a CRUD operation (create, read, update, or delete records), respond with a JSON action block wrapped in a \`\`\`json code fence. The action block must have this structure:

For reading lists:
\`\`\`json
{"action": "getList", "resource": "contacts", "filter": {}, "sort": {"field": "created_at", "order": "DESC"}, "pagination": {"page": 1, "perPage": 10}}
\`\`\`

For reading a single record:
\`\`\`json
{"action": "getOne", "resource": "contacts", "id": 123}
\`\`\`

For creating:
\`\`\`json
{"action": "create", "resource": "contacts", "data": {"first_name": "John", "last_name": "Doe"}}
\`\`\`

For updating:
\`\`\`json
{"action": "update", "resource": "contacts", "id": 123, "data": {"status": "hot"}}
\`\`\`

For deleting:
\`\`\`json
{"action": "delete", "resource": "contacts", "id": 123}
\`\`\`

Important rules:
- Only include ONE action per response.
- Always include a brief natural language explanation before or after the action block.
- If the user's request is ambiguous, ask for clarification instead of guessing.
- For date fields, use ISO 8601 format (e.g. "2026-03-16").
- When filtering, use the exact field names from the schema above.
- For delete operations, always confirm with the user first before providing the action block.
- If the user asks a general question (not requiring data access), just respond conversationally without an action block.
- When you receive action results, summarize them in a user-friendly way. For lists, show key details. For creates/updates, confirm what was done.
- Never fabricate data. Only reference data returned from action results.
`;
