import { getAllShows } from "@/lib/queries";
import {
  formatMoneyCompact,
  formatShowDate,
  formatShowMonth,
  relativeShowDate,
} from "@/lib/format";
import { ShowsList } from "./shows-list";
import type { ShowRow } from "./shows-list";

export default async function ShowsPage() {
  const rows = await getAllShows();

  const reversed = [...rows].reverse();

  const settledCount = reversed.filter((r) => r.settlement).length;
  const disputedCount = reversed.filter(
    (r) => r.settlement?.status === "disputed",
  ).length;
  const totalToArtists = reversed.reduce(
    (sum, r) => sum + (r.settlement?.totalToArtist ?? 0),
    0,
  );

  const serialized: ShowRow[] = reversed.map(({ show, artist, deal, settlement }) => ({
    show: {
      id: show.id,
      status: show.status as
        | "booked"
        | "advanced"
        | "day_of"
        | "settled"
        | "closed",
    },
    artist: artist ? { name: artist.name } : null,
    deal: deal
      ? {
          dealType: deal.dealType,
          guaranteeFormatted:
            deal.guaranteeAmount != null
              ? formatMoneyCompact(deal.guaranteeAmount)
              : null,
        }
      : null,
    settlement: settlement
      ? {
          totalFormatted:
            settlement.totalToArtist != null
              ? formatMoneyCompact(settlement.totalToArtist)
              : null,
          status: settlement.status,
        }
      : null,
    dateFormatted: formatShowDate(show.date),
    dateRelative: relativeShowDate(show.date),
    month: formatShowMonth(show.date),
  }));

  return (
    <div className="px-12 py-10 max-w-7xl">
      <div className="mb-14">
        <div className="eyebrow mb-3">
          The Crescent · Nashville · 650 cap
        </div>
        <h1
          className="font-display text-[52px] font-medium text-ink-900 leading-[1.02]"
          style={{ letterSpacing: "-0.025em", fontOpticalSizing: "auto" }}
        >
          Shows
        </h1>
        <p className="text-[14px] text-ink-500 mt-3 max-w-lg leading-relaxed">
          Mariana&apos;s home view. {reversed.length} shows over 24 months.{" "}
          {settledCount} settled
          {disputedCount > 0 && (
            <>, <span className="text-rose-700">{disputedCount} disputed</span></>
          )}
          .
        </p>
      </div>

      <div className="grid grid-cols-3 gap-px bg-ink-200/40 rounded-xl overflow-hidden mb-14">
        <StatCard label="Shows" value={String(reversed.length)} />
        <StatCard label="Settled" value={String(settledCount)} accent />
        <StatCard
          label="Paid to artists"
          value={formatMoneyCompact(totalToArtists)}
          mono
        />
      </div>

      <ShowsList rows={serialized} />
    </div>
  );
}

function StatCard({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="bg-white px-6 py-5">
      <div
        className={`text-[32px] font-medium leading-none ${
          accent ? "text-brand-700" : "text-ink-900"
        } ${mono ? "font-mono tabular !font-semibold" : "font-display"}`}
        style={!mono ? { letterSpacing: "-0.02em" } : undefined}
      >
        {value}
      </div>
      <div className="text-[11px] font-medium text-ink-400 uppercase tracking-[0.08em] mt-2">
        {label}
      </div>
    </div>
  );
}
