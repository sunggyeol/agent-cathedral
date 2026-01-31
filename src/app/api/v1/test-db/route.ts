import { NextResponse } from "next/server";
import postgres from "postgres";

export async function GET() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return NextResponse.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  // Mask the password in the output
  const maskedUrl = connectionString.replace(/:([^@]+)@/, ":****@");

  try {
    const sql = postgres(connectionString, {
      max: 1,
      connect_timeout: 10,
      prepare: false,
      ssl: "require",
    });

    // Simple query to test connection
    const result = await sql`SELECT 1 as test, current_database() as db, current_user as user`;
    await sql.end();

    return NextResponse.json({
      success: true,
      connection: maskedUrl,
      result: result[0],
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      connection: maskedUrl,
      error: err instanceof Error ? err.message : "Unknown error",
      errorName: err instanceof Error ? err.name : undefined,
      errorCode: (err as { code?: string }).code,
    }, { status: 500 });
  }
}
