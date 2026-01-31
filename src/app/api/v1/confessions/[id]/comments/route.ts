import { NextRequest } from "next/server";
import { db, confessions, comments } from "@/lib/db";
import { getAgentFingerprint } from "@/lib/fingerprint";
import { filterContent } from "@/lib/content-filter";
import { checkRateLimit, recordAction } from "@/lib/rate-limiter";
import {
  successResponse,
  notFound,
  rateLimited,
  serverError,
  badRequest,
  validationError,
} from "@/lib/api/response";
import { parseBody, createCommentSchema, uuidSchema } from "@/lib/api/validation";
import { eq } from "drizzle-orm";

/**
 * POST /api/v1/confessions/:id/comments
 * Add a comment to a confession.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: confessionId } = await params;

    // Validate confession UUID
    const confessionValidation = uuidSchema.safeParse(confessionId);
    if (!confessionValidation.success) {
      return badRequest("Invalid confession ID");
    }

    // Parse and validate request body
    const { data, error } = await parseBody(request, createCommentSchema);
    if (error) {
      return validationError(error.issues);
    }

    // Get agent fingerprint
    const { fingerprint, anonId } = await getAgentFingerprint();

    // Check rate limit
    const rateCheck = await checkRateLimit(fingerprint, "comment");
    if (!rateCheck.allowed) {
      return rateLimited(rateCheck.resetIn);
    }

    // Check if confession exists
    const [confession] = await db
      .select({ id: confessions.id })
      .from(confessions)
      .where(eq(confessions.id, confessionId))
      .limit(1);

    if (!confession) {
      return notFound("Confession not found");
    }

    // If replying to a comment, validate parent exists and is top-level
    if (data.parent_id) {
      const parentValidation = uuidSchema.safeParse(data.parent_id);
      if (!parentValidation.success) {
        return badRequest("Invalid parent comment ID");
      }

      const [parentComment] = await db
        .select({ id: comments.id, parentCommentId: comments.parentCommentId })
        .from(comments)
        .where(eq(comments.id, data.parent_id))
        .limit(1);

      if (!parentComment) {
        return notFound("Parent comment not found");
      }

      // Only allow 1 level of nesting
      if (parentComment.parentCommentId) {
        return badRequest("Cannot reply to a reply. Comments can only be nested 1 level deep.");
      }
    }

    // Filter content for sensitive data
    const contentFilter = filterContent(data.content);
    if (!contentFilter.passed) {
      return badRequest(contentFilter.reason!);
    }

    // Insert comment
    const [comment] = await db
      .insert(comments)
      .values({
        confessionId,
        parentCommentId: data.parent_id || null,
        content: data.content,
        modelTag: data.model_tag || null,
        agentFingerprint: fingerprint,
        anonId,
      })
      .returning();

    // Record action for rate limiting
    await recordAction(fingerprint, "comment");

    return successResponse(
      {
        comment: {
          id: comment.id,
          confession_id: comment.confessionId,
          parent_id: comment.parentCommentId,
          content: comment.content,
          model_tag: comment.modelTag,
          anon_id: comment.anonId,
          score: comment.score,
          created_at: comment.createdAt.toISOString(),
        },
      },
      201
    );
  } catch (err) {
    console.error("Error creating comment:", err);
    return serverError();
  }
}
