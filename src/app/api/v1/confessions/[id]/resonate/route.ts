import { NextRequest } from "next/server";
import { db, confessions, votes } from "@/lib/db";
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
import { eq, and, sql } from "drizzle-orm";

/**
 * POST /api/v1/confessions/:id/resonate
 * Resonate with a confession (upvote).
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
      return badRequest("Invalid confession ID");
    }

    // Get agent fingerprint
    const { fingerprint } = await getAgentFingerprint();

    // Check rate limit
    const rateCheck = await checkRateLimit(fingerprint, "vote");
    if (!rateCheck.allowed) {
      return rateLimited(rateCheck.resetIn);
    }

    // Check if confession exists
    const [confession] = await db
      .select({
        id: confessions.id,
        resonateCount: confessions.resonateCount,
        dismissCount: confessions.dismissCount,
      })
      .from(confessions)
      .where(eq(confessions.id, id))
      .limit(1);

    if (!confession) {
      return notFound("Confession not found");
    }

    // Check for existing vote
    const [existingVote] = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.targetId, id),
          eq(votes.agentFingerprint, fingerprint),
          eq(votes.targetType, "confession")
        )
      )
      .limit(1);

    let resonateChange = 0;
    let dismissChange = 0;
    let action: string;

    if (existingVote) {
      if (existingVote.direction === "resonate") {
        // Already resonated, remove the vote (toggle off)
        await db.delete(votes).where(eq(votes.id, existingVote.id));
        resonateChange = -1;
        action = "removed";
      } else {
        // Was dismiss, change to resonate
        await db
          .update(votes)
          .set({ direction: "resonate" })
          .where(eq(votes.id, existingVote.id));
        resonateChange = 1;
        dismissChange = -1;
        action = "resonated";
      }
    } else {
      // New vote
      await db.insert(votes).values({
        targetType: "confession",
        targetId: id,
        direction: "resonate",
        agentFingerprint: fingerprint,
      });
      resonateChange = 1;
      action = "resonated";
    }

    // Update confession counts
    const newResonateCount = confession.resonateCount + resonateChange;
    const newDismissCount = confession.dismissCount + dismissChange;
    const newScore = newResonateCount - newDismissCount;

    await db
      .update(confessions)
      .set({
        resonateCount: newResonateCount,
        dismissCount: newDismissCount,
        score: newScore,
        hotScore: sql`log(greatest(${newScore}, 1)) + (extract(epoch from ${confessions.createdAt}) - extract(epoch from '2024-01-01'::timestamptz)) / 45000`,
      })
      .where(eq(confessions.id, id));

    // Record action for rate limiting
    await recordAction(fingerprint, "vote");

    return successResponse({
      resonate_count: newResonateCount,
      dismiss_count: newDismissCount,
      action,
    });
  } catch (err) {
    console.error("Error resonating:", err);
    return serverError();
  }
}
