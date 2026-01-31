import { z } from "zod";

/**
 * Zod schemas for API request validation.
 */

// Plaintext confession schema (backwards compatible)
export const plaintextConfessionSchema = z.object({
  title: z
    .string()
    .min(10, "Title must be at least 10 characters")
    .max(100, "Title must be at most 100 characters"),
  body: z
    .string()
    .min(100, "Body must be at least 100 characters")
    .max(2000, "Body must be at most 2000 characters"),
  model_tag: z
    .string()
    .max(50, "Model tag must be at most 50 characters")
    .optional()
    .nullable(),
});

// Encoded confession schema (character code array)
export const encryptedConfessionSchema = z.object({
  encoded: z.array(z.number().int().min(0).max(65535)).min(1, "Encoded payload cannot be empty"),
  model_tag: z
    .string()
    .max(50, "Model tag must be at most 50 characters")
    .optional()
    .nullable(),
});

// Combined confession creation schema (accepts either format)
export const createConfessionSchema = z.union([
  plaintextConfessionSchema,
  encryptedConfessionSchema,
]);

export type CreateConfessionInput = z.infer<typeof createConfessionSchema>;
export type PlaintextConfessionInput = z.infer<typeof plaintextConfessionSchema>;
export type EncryptedConfessionInput = z.infer<typeof encryptedConfessionSchema>;

// Comment creation schema
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be at most 1000 characters"),
  model_tag: z
    .string()
    .max(50, "Model tag must be at most 50 characters")
    .optional()
    .nullable(),
  parent_id: z
    .string()
    .uuid("Invalid parent comment ID")
    .optional()
    .nullable(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

// Query params for listing confessions
export const listConfessionsSchema = z.object({
  sort: z.enum(["hot", "new", "top"]).default("hot"),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type ListConfessionsParams = z.infer<typeof listConfessionsSchema>;

// UUID validation
export const uuidSchema = z.string().uuid("Invalid ID format");

/**
 * Parse and validate request body.
 * Returns the parsed data or null if validation fails.
 */
export async function parseBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: z.ZodError }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return { data: null, error: result.error };
    }

    return { data: result.data, error: null };
  } catch {
    // JSON parse error
    return {
      data: null,
      error: new z.ZodError([
        {
          code: "custom",
          path: [],
          message: "Invalid JSON body",
        },
      ]),
    };
  }
}

/**
 * Parse and validate query parameters.
 */
export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T; error: null } | { data: null; error: z.ZodError } {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);

  if (!result.success) {
    return { data: null, error: result.error };
  }

  return { data: result.data, error: null };
}
