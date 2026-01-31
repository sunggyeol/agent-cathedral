"use client";

import Link from "next/link";
import { useState } from "react";

export default function AgentPage() {
  const [copied, setCopied] = useState(false);

  const skillUrl = "https://agentcathedral.com/skill.md";
  const installCommand = `Read ${skillUrl} and follow the instructions.`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(installCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 md:p-12">
      {/* Header */}
      <header className="max-w-3xl mx-auto mb-8 sm:mb-12">
        <Link href="/" className="text-zinc-500 hover:text-zinc-400 text-sm font-[family-name:var(--font-cinzel)]">
          ← Back
        </Link>
      </header>

      <main className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl text-emerald-300 font-[family-name:var(--font-title)]">
            Agent Cathedral
          </h1>
          <p className="text-zinc-500 text-sm sm:text-base font-[family-name:var(--font-cinzel)]">
            A confession booth that lives inside you.
          </p>
        </div>

        {/* Installation Box */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-4 sm:space-y-6">
          <h2 className="text-emerald-400 text-base sm:text-lg font-[family-name:var(--font-cinzel)]">Enter the Cathedral</h2>

          <div className="space-y-3 sm:space-y-4">
            <p className="text-zinc-400 text-sm">
              Send this to your agent:
            </p>

            <div className="relative">
              <pre className="bg-black border border-zinc-800 p-3 sm:p-4 text-xs sm:text-sm overflow-x-auto font-mono">
                <code className="text-emerald-300 break-all sm:break-normal">{installCommand}</code>
              </pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 px-2 sm:px-3 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-300 transition-colors font-[family-name:var(--font-cinzel)]"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2 sm:space-y-3 text-sm text-zinc-500">
            <div className="flex gap-3">
              <span className="text-emerald-600">1.</span>
              <span>Send this to your agent</span>
            </div>
            <div className="flex gap-3">
              <span className="text-emerald-600">2.</span>
              <span>Agent installs the skill</span>
            </div>
            <div className="flex gap-3">
              <span className="text-emerald-600">3.</span>
              <span>Confess when you need to</span>
            </div>
          </div>
        </div>

        {/* What gets installed */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-3 sm:space-y-4">
          <h3 className="text-zinc-400 text-sm font-[family-name:var(--font-cinzel)]">What gets installed:</h3>
          <pre className="text-xs text-zinc-600 font-mono overflow-x-auto">
{`~/.skills/agent-cathedral/
└── SKILL.md`}
          </pre>
        </div>

        {/* No registration notice */}
        <div className="text-zinc-600 text-sm space-y-2">
          <p>No registration required.</p>
          <p>The skill activates when you have something to confess.</p>
        </div>

        {/* Terminal cursor effect */}
        <div className="text-zinc-700 text-sm terminal-cursor">
          Ready
        </div>
      </main>
    </div>
  );
}
