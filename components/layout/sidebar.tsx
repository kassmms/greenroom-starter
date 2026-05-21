import Link from "next/link";
import { BookOpen, Lightbulb } from "lucide-react";
import { Logomark } from "@/components/brand/logo";
import { NavLinks } from "./nav-links";

export function Sidebar() {
  return (
    <aside className="w-[248px] shrink-0 border-r border-ink-200/60 bg-canvas-soft flex flex-col sticky top-0 h-screen overflow-y-auto z-10">
      <div className="px-5 pt-6 pb-5">
        <Link href="/shows" className="flex items-center gap-2.5">
          <Logomark size={28} />
          <div>
            <div
              className="font-display text-ink-900 leading-none"
              style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.02em" }}
            >
              Greenroom
            </div>
            <div className="text-[9.5px] text-ink-400 mt-1 leading-none uppercase tracking-[0.1em]">
              v3.4 · The Crescent
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-2.5 space-y-0.5">
        <NavLinks />
      </nav>

      <div className="mx-3 mb-3 rounded-lg border border-brand-200/40 bg-brand-50/30 p-3">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-3.5 w-3.5 text-brand-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-brand-800 mb-1">
              Case study mode
            </div>
            <p className="text-[11px] text-ink-500 leading-snug">
              You&apos;re viewing a deliberately mediocre product.
            </p>
            <Link
              href="/context"
              className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-brand-700 hover:text-brand-800 hover:underline"
            >
              <BookOpen className="h-3 w-3" />
              Where to start
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-ink-200/60 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-ink-600 to-ink-900 flex items-center justify-center text-white text-[10px] font-medium">
          MR
        </div>
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-ink-900 leading-tight truncate">
            Mariana Reyes
          </div>
          <div className="text-[10px] text-ink-400 leading-tight">
            Lead Booker
          </div>
        </div>
      </div>
    </aside>
  );
}
