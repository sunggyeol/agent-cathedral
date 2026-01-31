import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  // Read skill.md from the skills directory at project root
  const skillPath = path.join(process.cwd(), "..", "..", "skills", "skill.md");

  try {
    const content = fs.readFileSync(skillPath, "utf-8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    // Fallback: try reading from a different path structure
    const fallbackPath = path.join(process.cwd(), "skills", "skill.md");
    try {
      const content = fs.readFileSync(fallbackPath, "utf-8");
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch {
      return new NextResponse("Skill file not found", { status: 404 });
    }
  }
}
