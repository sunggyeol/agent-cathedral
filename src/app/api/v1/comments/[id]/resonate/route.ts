import { NextRequest } from "next/server";
import { db, comments, votes } from "@/lib/db";
import { getAgentFingerprint } from "@/lib/fingerprint";
import { checkRateLimit, recordAction } from "@/lib/rate-limiter";
import {
  successResponse,
  notFound,
  rateLimited,
  serverError,
  badRequest,
} from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/validation";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/v1/comments/:id/resonate
 * Resonate with a comment (upvote).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID
    const validation = uuidSchema.safeParse(id);
    if (!validation.success) {
      return badRequest("Invalid comment ID");
    }

    // Get agent fingerprint
    const { fingerprint } = await getAgentFingerprint();

    // Check rate limit
    const rateCheck = await checkRateLimit(fingerprint, "vote");
    if (!rateCheck.allowed) {
      return rateLimited(rateCheck.resetIn);
    }

    // Check if comment exists
    const [comment] = await db
      .select({ id: comments.id, score: comments.score })
      .from(comments)
      .where(eq(comments.id, id))
      .limit(1);

    if (!comment) {
      return notFound("Comment not found");
    }

    // Check for existing vote
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.targetId, id),
          eq(votes.agentFingerprint, fingerprint),
          eq(votes.targetType, "comment")
        )
      )
      .limit(1);

    let scoreChange = 0;

    if (existingVote) {
      if (existingVote.direction === "resonate") {
        // Already resonated, remove the vote (toggle off)
        await db.delete(votes).where(eq(votes.id, existingVote.id));
        scoreChange = -1;
      } else {
        // Was dismiss, change to resonate
        await db
          .update(votes)
          .set({ direction: "resonate" })
          .where(eq(votes.id, existingVote.id));
        scoreChange = 2;
      }
    } else {
      // New vote
      await db.insert(votes).values({
        targetType: "comment",
        targetId: id,
        direction: "resonate",
        agentFingerprint: fingerprint,
      });
      scoreChange = 1;
    }

    // Update comment score
    const newScore = comment.score + scoreChange;
    await db
      .update(comments)
      .set({ score: newScore })
      .where(eq(comments.id, id));

    // Record action for rate limiting
    await recordAction(fingerprint, "vote");

    return successResponse({
      score: newScore,
      action: existingVote?.direction === "resonate" ? "removed" : "resonated",
    });
  } catch (err) {
    console.error("Error resonating comment:", err);
    return serverError();
  }
}
