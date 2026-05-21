import { getAllArtists } from "@/lib/queries";
import { formatShowDate } from "@/lib/format";

const GENRE_COLORS: Record<string, string> = {
  indie: "bg-brand-500",
  rock: "bg-rose-500",
  folk: "bg-amber-600",
  "singer-songwriter": "bg-amber-500",
  americana: "bg-amber-700",
  "alt-country": "bg-amber-600",
  jazz: "bg-sky-600",
  blues: "bg-sky-700",
  soul: "bg-amber-800",
  "r&b": "bg-rose-600",
  pop: "bg-rose-400",
  electronic: "bg-sky-500",
  punk: "bg-ink-700",
  metal: "bg-ink-800",
  hip_hop: "bg-ink-600",
  country: "bg-amber-500",
  bluegrass: "bg-brand-600",
  experimental: "bg-ink-500",
};

function genreColor(genre: string | null): string {
  if (!genre) return "bg-ink-300";
  const lower = genre.toLowerCase().replace(/[\s-]/g, "_");
  for (const [key, color] of Object.entries(GENRE_COLORS)) {
    if (lower.includes(key.replace(/[\s-]/g, "_"))) return color;
  }
  return "bg-ink-400";
}

export default async function ArtistsPage() {
  const rows = await getAllArtists();
  const filtered = rows.filter((r) => r.showCount > 0);

  const buckets = {
    frequent: filtered.filter((r) => r.showCount >= 4),
    regular: filtered.filter((r) => r.showCount >= 2 && r.showCount < 4),
    occasional: filtered.filter((r) => r.showCount === 1),
  };

  return (
    <div className="px-12 py-10 max-w-7xl">
      <div className="mb-16">
        <div className="eyebrow mb-3">Roster</div>
        <h1
          className="font-display text-[48px] font-medium text-ink-900 leading-[1.05]"
          style={{ letterSpacing: "-0.02em", fontOpticalSizing: "auto" }}
        >
          Artists
        </h1>
        <p className="text-[14px] text-ink-500 mt-3 max-w-xl leading-relaxed">
          {filtered.length} artists who have played The Crescent in the last 24
          months. Bucketed by frequency.
        </p>
      </div>

      <div className="space-y-16">
        <Bucket
          title="Frequent"
          subtitle="4+ shows in the window"
          rows={buckets.frequent}
        />
        <Bucket
          title="Regular"
          subtitle="2–3 shows in the window"
          rows={buckets.regular}
        />
        <Bucket
          title="Occasional"
          subtitle="1 show"
          rows={buckets.occasional}
        />
      </div>
    </div>
  );
}

function Bucket({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: Awaited<ReturnType<typeof getAllArtists>>;
}) {
  if (rows.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between mb-5">
        <h2
          className="font-display text-[24px] font-medium text-ink-900"
          style={{ letterSpacing: "-0.02em" }}
        >
          {title}{" "}
          <span className="text-ink-300 font-sans text-[14px] font-normal">
            ({rows.length})
          </span>
        </h2>
        <span className="text-[12px] text-ink-400">{subtitle}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map(({ artist, agent, agency, showCount, lastShowDate }) => (
          <div
            key={artist.id}
            className="group relative rounded-lg border border-ink-200/60 bg-white p-5 transition-all duration-150 hover:shadow-[0_4px_16px_rgba(26,24,20,0.06)] hover:-translate-y-0.5 hover:border-ink-200"
          >
            <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${genreColor(artist.genre)} opacity-60`} />
            <div className="text-[15px] font-medium text-ink-900 group-hover:text-brand-800 transition-colors leading-tight">
              {artist.name}
            </div>
            <div className="text-[11.5px] text-ink-400 capitalize mt-0.5">
              {artist.genre ?? "—"}
            </div>

            {/* Frequency dots */}
            <div className="flex items-center gap-1.5 mt-3">
              <div className="flex gap-[3px]">
                {Array.from({ length: Math.min(showCount, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-[5px] h-[5px] rounded-full ${genreColor(artist.genre)}`}
                  />
                ))}
                {showCount > 8 && (
                  <span className="text-[9px] text-ink-400 ml-0.5">+{showCount - 8}</span>
                )}
              </div>
              <span className="text-[11px] font-mono tabular text-ink-500 ml-1">
                {showCount} {showCount === 1 ? "show" : "shows"}
              </span>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100/60">
              <div className="text-[11px] text-ink-500 truncate pr-2">
                {agent ? (
                  <>
                    {agent.name}
                    {agency && (
                      <span className="text-ink-400"> · {agency.name}</span>
                    )}
                  </>
                ) : (
                  <span className="text-ink-300">No agent</span>
                )}
              </div>
              {lastShowDate && (
                <div className="text-[10.5px] font-mono tabular text-ink-400 shrink-0">
                  {formatShowDate(lastShowDate)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
