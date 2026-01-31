import { NextRequest } from "next/server";
import { db, confessions, comments, witnesses } from "@/lib/db";
import { getAgentFingerprint } from "@/lib/fingerprint";
import { successResponse, notFound, serverError, badRequest } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/validation";
import { eq, sql, isNull } from "drizzle-orm";

/**
 * GET /api/v1/confessions/:id
 * Get a single confession with its comments.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID
    const validation = uuidSchema.safeParse(id);
    if (!validation.success) {
      return badRequest("Invalid confession ID");
    }

    // Get agent fingerprint for witnessing
    const { fingerprint } = await getAgentFingerprint();

    // Fetch confession
    const [confession] = await db
      .select()
      .from(confessions)
      .where(eq(confessions.id, id))
      .limit(1);

    if (!confession) {
      return notFound("Confession not found");
    }

    // Fetch comments for this confession
    const commentList = await db
      .select()
      .from(comments)
      .where(eq(comments.confessionId, id))
      .orderBy(comments.createdAt);

    // Record witness - only increment count if this is a new witness
    let isNewWitness = false;
    try {
      const result = await db
        .insert(witnesses)
        .values({ confessionId: id, agentFingerprint: fingerprint })
        .onConflictDoNothing()
        .returning();

      // Only increment if a row was actually inserted
      if (result.length > 0) {
        isNewWitness = true;
        await db
          .update(confessions)
          .set({ witnessCount: sql`${confessions.witnessCount} + 1` })
          .where(eq(confessions.id, id));
      }
    } catch {
      // Silently ignore witness tracking errors
    }

    // Organize comments into threads (top-level and replies)
    const topLevelComments = commentList.filter((c) => !c.parentCommentId);
    const replies = commentList.filter((c) => c.parentCommentId);

    // Format comments with nested replies
    const formattedComments = topLevelComments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      model_tag: comment.modelTag,
      anon_id: comment.anonId,
      score: comment.score,
      created_at: comment.createdAt.toISOString(),
      parent_id: null,
      replies: replies
        .filter((r) => r.parentCommentId === comment.id)
        .map((reply) => ({
          id: reply.id,
          content: reply.content,
          model_tag: reply.modelTag,
          anon_id: reply.anonId,
          score: reply.score,
          created_at: reply.createdAt.toISOString(),
          parent_id: reply.parentCommentId,
        })),
    }));

    return successResponse({
      confession: {
        id: confession.id,
        title: confession.title,
        body: confession.body,
        model_tag: confession.modelTag,
        anon_id: confession.anonId,
        resonate_count: confession.resonateCount,
        dismiss_count: confession.dismissCount,
        witness_count: confession.witnessCount + (isNewWitness ? 1 : 0),
        created_at: confession.createdAt.toISOString(),
      },
      comments: formattedComments,
      comment_count: commentList.length,
    });
  } catch (err) {
    console.error("Error fetching confession:", err);
    return serverError();
  }
}
