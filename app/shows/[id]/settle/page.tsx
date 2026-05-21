import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileWarning,
  ArrowRight,
  Check,
  AlertTriangle,
  Mail,
  Pencil,
  XCircle,
  Wallet,
  TrendingUp,
  Info,
} from "lucide-react";
import { getShowById } from "@/lib/queries";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Field,
} from "@/components/ui/card";
import { StatusBadge, DealTypeBadge, PlainBadge } from "@/components/ui/badge";
import { calculateSettlement } from "@/lib/dealMath";
import { formatMoney, formatShowDateFull, formatPct } from "@/lib/format";
import type { Settlement, Recoup, TicketSale, Comp, TicketTier } from "@/db/schema";
import { Logomark } from "@/components/brand/logo";

const RECOUP_LABELS: Record<Recoup["category"], string> = {
  marketing: "Marketing",
  hospitality_overage: "Hospitality overage",
  production_overage: "Production overage",
  prior_advance: "Prior advance",
  damages: "Damages",
  other: "Other",
};

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  production: "Production",
  sound: "Sound",
  lights: "Lights",
  hospitality: "Hospitality",
  marketing: "Marketing",
  backline: "Backline",
  security: "Security",
  other: "Other",
};

export default async function SettlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getShowById(id);
  if (!data) notFound();

  const { show, artist, deal, ticketSales, expenses, settlement, recoups, comps } = data;

  if (!deal) {
    return (
      <div className="px-12 py-10 max-w-4xl">
        <BackLink showId={show.id} />
        <div className="text-[13px] text-ink-400">
          No deal entered for this show. Settlement can&apos;t run yet.
        </div>
      </div>
    );
  }

  const calc = calculateSettlement({
    deal,
    ticketSales,
    expenses,
    comps,
    venueCapacity: data.venue?.capacity ?? undefined,
  });

  const grossSoFar = ticketSales.reduce((sum, t) => sum + t.gross, 0);
  const totalFees = ticketSales.reduce((sum, t) => sum + t.fees, 0);
  const totalExpenses = expenses
    .filter((e) => !e.absorbedByVenue)
    .reduce((sum, e) => sum + e.amount, 0);

  const disputedRecoups = recoups.filter((r) => r.status === "disputed");
  const isDisputed =
    settlement?.status === "disputed" ||
    settlement?.status === "revised" ||
    !!settlement?.disputedAt;
  const disputedRecoupValue = disputedRecoups.reduce((s, r) => s + r.amount, 0);

  return (
    <div
      className={`px-12 py-10 max-w-7xl ${isDisputed ? "bg-gradient-to-b from-rose-50/30 via-canvas to-canvas" : ""}`}
    >
      <BackLink showId={show.id} />

      <div className="mb-20">
        <div className="flex items-center gap-1.5 mb-4">
          <StatusBadge status={show.status} />
          <DealTypeBadge type={deal.dealType} />
          {settlement?.status === "disputed" && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-medium ring-1 ring-inset bg-rose-50 text-rose-800 ring-rose-200/80">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
              </span>
              Disputed
            </span>
          )}
          {settlement?.status === "voided" && (
            <PlainBadge variant="default">Voided</PlainBadge>
          )}
        </div>
        <h1
          className="font-display text-[48px] font-medium text-ink-900 leading-[1.05]"
          style={{ letterSpacing: "-0.02em", fontOpticalSizing: "auto" }}
        >
          Settlement · {artist?.name}
        </h1>
        <div className="text-[14px] text-ink-400 mt-3">
          {formatShowDateFull(show.date)}
        </div>
      </div>

      {/* Disputed callout */}
      {isDisputed && disputedRecoupValue > 0 && (
        <div className="mb-8 rounded-lg border border-rose-200/60 bg-rose-50/40 p-5 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-700 mt-0.5 shrink-0" />
          <div>
            <div className="text-[13px] font-semibold text-rose-800">
              {disputedRecoups.length} recoup
              {disputedRecoups.length === 1 ? "" : "s"} in dispute ·{" "}
              {formatMoney(disputedRecoupValue)} contested
            </div>
            <p className="text-[12.5px] text-ink-600 mt-1 leading-relaxed">
              The artist team has flagged recoup line items. This settlement
              cannot be finalized until the dispute is resolved.
            </p>
          </div>
        </div>
      )}

      {settlement && (
        <LifecycleBar
          settlement={settlement}
          disputedRecoups={disputedRecoups.length}
        />
      )}

      <div className="space-y-6 mt-6">
        {!calc.supported ? (
          <UnsupportedDeal
            dealType={calc.dealType}
            deal={deal}
            existingSettlement={settlement}
            grossSoFar={grossSoFar}
            totalFees={totalFees}
            totalExpenses={totalExpenses}
            ticketCount={ticketSales.reduce((s, t) => s + (t.qty ?? 0), 0)}
            expenseRowCount={expenses.length}
          />
        ) : (
          <SupportedSettlement
            calc={calc}
            existingSettlement={settlement}
            dealNotesFreetext={deal.dealNotesFreetext}
            ticketSales={ticketSales}
            comps={comps}
            venueCapacity={data.venue?.capacity ?? null}
            showDate={show.date}
          />
        )}

        {recoups.length > 0 && <RecoupsSection recoups={recoups} />}

        {settlement && (settlement.signoffText || settlement.notes) && (
          <SignoffSection settlement={settlement} />
        )}
      </div>

      <div className="mt-16 pt-10 border-t border-ink-200/60">
        <div className="flex gap-4 items-start max-w-3xl">
          <Logomark size={40} className="shrink-0" />
          <div>
            <h2
              className="font-display text-[20px] font-medium text-ink-900 mb-2"
              style={{ letterSpacing: "-0.02em" }}
            >
              You&apos;re looking at the seam this case study is about.
            </h2>
            <p className="text-[13px] text-ink-500 leading-relaxed">
              Greenroom&apos;s in-app settlement tool was built early in the
              company&apos;s history, when most deals were flat guarantees.
              About 18% of customers actively use it; the other 82% — including
              most of the larger venues — default to spreadsheets. The CEO has
              flagged this as the company&apos;s biggest craft gap.{" "}
              <Link
                href="/context"
                className="text-brand-700 font-medium hover:text-brand-800 hover:underline inline-flex items-center gap-0.5"
              >
                Where to start <ArrowRight className="h-3 w-3" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BackLink({ showId }: { showId: string }) {
  return (
    <Link
      href={`/shows/${showId}`}
      className="inline-flex items-center gap-1 text-[12px] text-ink-400 hover:text-ink-900 mb-8 transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to show
    </Link>
  );
}

type Stage = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  timestamp?: Date | null;
};

function LifecycleBar({
  settlement,
  disputedRecoups,
}: {
  settlement: Settlement;
  disputedRecoups: number;
}) {
  if (settlement.status === "voided") {
    return (
      <div className="rounded-lg border border-ink-200/80 bg-white px-5 py-4 flex items-center gap-3">
        <XCircle className="h-4 w-4 text-ink-400" />
        <div>
          <div className="text-[13px] font-medium text-ink-900">
            Settlement voided
          </div>
          <div className="text-[11.5px] text-ink-400 mt-0.5">
            The show was cancelled or the settlement was scrapped.
          </div>
        </div>
      </div>
    );
  }

  const stages: Stage[] = [
    {
      key: "draft",
      label: "Drafted",
      icon: Pencil,
      timestamp: settlement.draftedAt,
    },
    {
      key: "submitted",
      label: "Submitted",
      icon: Mail,
      timestamp: settlement.submittedAt,
    },
    {
      key: "review",
      label: "Reviewed",
      icon: TrendingUp,
      timestamp: settlement.reviewStartedAt,
    },
    {
      key: "signed",
      label: settlement.disputedAt ? "Finalized" : "Signed",
      icon: Check,
      timestamp: settlement.finalizedAt ?? settlement.signedAt,
    },
    {
      key: "paid",
      label: "Paid",
      icon: Wallet,
      timestamp: settlement.paidAt,
    },
  ];

  const currentIndex = (() => {
    switch (settlement.status) {
      case "draft":
        return 0;
      case "submitted":
        return 1;
      case "in_review":
        return 2;
      case "disputed":
      case "signed":
      case "revised":
      case "finalized":
        return 3;
      case "paid":
        return 4;
      default:
        return 0;
    }
  })();

  const isDisputed =
    settlement.status === "disputed" ||
    settlement.status === "revised" ||
    !!settlement.disputedAt;

  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="eyebrow text-[10px] text-ink-400">
            Settlement lifecycle
          </div>
          {isDisputed && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              {settlement.status === "disputed"
                ? "In dispute"
                : settlement.status === "revised"
                  ? "Revision sent"
                  : "Resolved after dispute"}
              {disputedRecoups > 0 && (
                <span className="text-rose-600">
                  · {disputedRecoups} disputed recoup
                  {disputedRecoups === 1 ? "" : "s"}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1 relative">
          <div className="absolute top-3.5 left-[10%] right-[10%] h-px bg-ink-200/60" />

          {stages.map((stage, i) => {
            const isComplete = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isFuture = i > currentIndex;
            const Icon = stage.icon;

            const stageDot = (() => {
              if (isComplete) return "bg-brand-700 ring-brand-700 text-white";
              if (isCurrent)
                return isDisputed
                  ? "bg-rose-50 ring-rose-500 text-rose-700"
                  : "bg-brand-50 ring-brand-700 text-brand-700";
              return "bg-white ring-ink-200/80 text-ink-300";
            })();

            return (
              <div
                key={stage.key}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`relative z-10 w-7 h-7 rounded-full ring-2 flex items-center justify-center ${stageDot}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div
                  className={`mt-2.5 text-[11px] font-medium leading-tight ${isFuture ? "text-ink-300" : "text-ink-900"}`}
                >
                  {stage.label}
                </div>
                <div className="text-[10px] text-ink-400 mt-0.5 font-mono tabular leading-tight min-h-[12px]">
                  {stage.timestamp
                    ? new Date(stage.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function UnsupportedDeal({
  dealType,
  deal,
  existingSettlement,
  grossSoFar,
  totalFees,
  totalExpenses,
  ticketCount,
  expenseRowCount,
}: {
  dealType: string;
  deal: NonNullable<Awaited<ReturnType<typeof getShowById>>>["deal"];
  existingSettlement: NonNullable<
    Awaited<ReturnType<typeof getShowById>>
  >["settlement"];
  grossSoFar: number;
  totalFees: number;
  totalExpenses: number;
  ticketCount: number;
  expenseRowCount: number;
}) {
  const friendly: Record<string, string> = {
    flat: "flat guarantee",
    percentage_of_gross: "percentage of gross",
    percentage_of_net: "percentage of net",
    vs: "vs deal",
    door: "door deal",
  };

  return (
    <>
      <Card accent="amber">
        <CardContent className="py-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200/80 mb-5">
            <FileWarning className="h-5 w-5 text-amber-700" />
          </div>
          <h2
            className="font-display text-[22px] font-medium text-ink-900 mb-2"
            style={{ letterSpacing: "-0.02em" }}
          >
            The in-app tool can&apos;t settle a {friendly[dealType] ?? dealType}{" "}
            yet.
          </h2>
          <p className="text-[13px] text-ink-500 max-w-md mx-auto leading-relaxed">
            Mariana would do this on a Google Sheet at 2am tonight. The inputs
            are below — but the math doesn&apos;t happen here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>What the system has</CardTitle>
            <CardDescription>
              The inputs Mariana would pull together to settle this show.
              They&apos;re here — but disconnected from the deal terms.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Field
              label="Gross box office"
              mono
              value={formatMoney(grossSoFar)}
            />
            <Field label="Fees" mono value={formatMoney(totalFees)} />
            <Field
              label="Net box office"
              mono
              value={formatMoney(grossSoFar - totalFees)}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Field label="Tickets sold" mono value={String(ticketCount)} />
            <Field
              label="Expenses (line items)"
              mono
              value={String(expenseRowCount)}
            />
            <Field
              label="Expenses (passed through)"
              mono
              value={formatMoney(totalExpenses)}
            />
          </div>

          {deal?.dealNotesFreetext && (
            <div className="mt-6">
              <div className="eyebrow text-[10px] text-ink-500 mb-2">
                Deal notes (free text — what Mariana actually trusts)
              </div>
              <div className="text-[12.5px] text-ink-800 bg-canvas-soft rounded-lg p-4 ring-1 ring-ink-200/60 leading-relaxed">
                {deal.dealNotesFreetext}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {existingSettlement?.totalToArtist != null && (
        <Card
          accent={existingSettlement.status === "disputed" ? "rose" : "brand"}
        >
          <CardHeader>
            <div>
              <CardTitle>Actually settled (off-platform)</CardTitle>
              <CardDescription>
                Mariana ran this in a spreadsheet. Here&apos;s the result that
                was logged back into Greenroom afterward.
              </CardDescription>
            </div>
            {existingSettlement.status === "disputed" ? (
              <PlainBadge variant="rose">Disputed</PlainBadge>
            ) : (
              <PlainBadge variant="brand">Signed</PlainBadge>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between py-2">
              <span className="text-[13px] text-ink-600">Total to artist</span>
              <span
                className="text-[32px] font-mono tabular font-semibold text-ink-900"
                style={{ letterSpacing: "-0.02em" }}
              >
                {formatMoney(existingSettlement.totalToArtist)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function SupportedSettlement({
  calc,
  existingSettlement,
  dealNotesFreetext,
  ticketSales,
  comps,
  venueCapacity,
  showDate,
}: {
  calc: Extract<ReturnType<typeof calculateSettlement>, { supported: true }>;
  existingSettlement: NonNullable<
    Awaited<ReturnType<typeof getShowById>>
  >["settlement"];
  dealNotesFreetext?: string | null;
  ticketSales: TicketSale[];
  comps: Comp[];
  venueCapacity: number | null;
  showDate: string;
}) {
  return (
    <>
      {/* Amendment warning */}
      {calc.hasFreeTextAmendment && (
        <div className="rounded-lg border border-amber-200/60 bg-amber-50/40 p-4 flex gap-3">
          <Info className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
          <div>
            <div className="text-[12.5px] font-semibold text-amber-800">
              Deal notes may contain amendments
            </div>
            <p className="text-[12px] text-ink-600 mt-0.5 leading-relaxed">
              The deal notes reference a renegotiation or update. Verify the
              freetext below against the structured fields before signing off.
            </p>
            {dealNotesFreetext && (
              <div className="mt-3 text-[11.5px] text-ink-700 bg-white/70 rounded-md p-3 ring-1 ring-amber-200/60 leading-relaxed">
                {dealNotesFreetext}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket reconciliation */}
      <TicketReconciliation
        ticketSales={ticketSales}
        comps={comps}
        venueCapacity={venueCapacity}
        showDate={showDate}
      />

      {/* Hero number */}
      <div className="text-center py-10 mb-2">
        <div className="eyebrow text-[10px] text-ink-400 mb-3">
          Total to artist
        </div>
        <div
          className="text-[72px] font-mono tabular font-bold text-ink-900 leading-none"
          style={{ letterSpacing: "-0.03em" }}
        >
          {formatMoney(calc.totalToArtist)}
        </div>
        {existingSettlement && (
          <div className="mt-3">
            {existingSettlement.status === "paid" ? (
              <PlainBadge variant="brand">Paid</PlainBadge>
            ) : existingSettlement.status === "signed" ||
              existingSettlement.status === "finalized" ? (
              <PlainBadge variant="brand">Signed</PlainBadge>
            ) : existingSettlement.status === "disputed" ? (
              <PlainBadge variant="rose">Disputed</PlainBadge>
            ) : null}
          </div>
        )}
        {existingSettlement?.totalToArtist != null &&
          existingSettlement.totalToArtist !== calc.totalToArtist && (
            <div className="text-[12px] text-ink-400 mt-2">
              Originally settled at{" "}
              <span className="font-mono tabular text-ink-600">
                {formatMoney(existingSettlement.totalToArtist)}
              </span>
            </div>
          )}
      </div>

      {/* Settlement worksheet */}
      <Card accent="brand">
        <CardHeader>
          <div>
            <CardTitle>Settlement worksheet</CardTitle>
            <CardDescription className="font-mono">
              {calc.finalFormula}
            </CardDescription>
          </div>
          {calc.vsWinner && (
            <PlainBadge variant={calc.vsWinner === "percentage" ? "brand" : "default"}>
              {calc.vsWinner === "percentage" ? "% wins" : "Guarantee floor"}
            </PlainBadge>
          )}
        </CardHeader>
        <CardContent className="divide-y divide-ink-100/80">
          {calc.steps.map((step, i) => (
            <Row
              key={i}
              label={step.label}
              value={formatMoney(step.value)}
              note={step.note}
              highlight={
                step.label.startsWith("vs guarantee") ||
                step.label.startsWith("Net to artist")
              }
            />
          ))}
          <div className="pt-3" />
          <div className="flex items-baseline justify-between py-3 font-semibold">
            <span className="text-[13px] text-ink-900">Total to artist</span>
            <span className="text-[18px] font-mono tabular text-ink-900">
              {formatMoney(calc.totalToArtist)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Expense breakdown */}
      {calc.expenseLines.length > 0 && (
        <ExpenseBreakdown
          lines={calc.expenseLines}
          totalActual={calc.totalExpensesActual}
          totalPassed={calc.totalExpenses}
          hospitalityCapApplied={calc.hospitalityCapApplied}
          hospitalityOverage={calc.hospitalityOverage}
          expenseCapApplied={calc.expenseCapApplied}
        />
      )}

      {/* Bonuses not triggered */}
      {calc.bonusesNotTriggered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bonuses not triggered</CardTitle>
            <CardDescription>
              Structured bonuses on this deal that didn&apos;t hit. Shown for
              transparency.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-ink-100/80">
            {calc.bonusesNotTriggered.map((b, i) => (
              <div
                key={i}
                className="py-3 flex items-baseline justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-[13px] text-ink-600">{b.label}</div>
                  <div className="text-[11.5px] text-ink-400 mt-0.5">
                    {b.reason}
                  </div>
                </div>
                <div className="text-[12.5px] text-ink-300 font-mono tabular line-through">
                  {formatMoney(b.amount)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function parseTiers(breakdownJson: string | null | undefined): TicketTier[] {
  if (!breakdownJson) return [];
  try {
    const parsed = JSON.parse(breakdownJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Shows per-tier rows when breakdown_json is present, otherwise falls back
 * to the single aggregate row so existing shows are never broken.
 */
function TierRows({
  ticketSales,
  gross,
}: {
  ticketSales: TicketSale[];
  gross: number;
}) {
  // Merge tiers across all ticket_sale rows (always 1 per show, but safe to merge)
  const allTiers = ticketSales.flatMap((ts) => parseTiers(ts.breakdownJson));
  const totalQty = ticketSales.reduce((s, t) => s + (t.qty ?? 0), 0);
  const avgPrice = totalQty > 0 ? gross / totalQty : 0;

  if (allTiers.length === 0) {
    // Aggregate fallback — no breakdown available
    return (
      <div className="flex items-baseline justify-between py-2.5">
        <div>
          <div className="text-[13px] text-ink-700">
            {totalQty.toLocaleString()} paid tickets
            {avgPrice > 0 && (
              <span className="text-ink-400 font-normal">
                {" "}× avg {formatMoney(avgPrice)}
              </span>
            )}
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5">
            No tier breakdown — ticketing integration sent totals only
          </div>
        </div>
        <div className="text-[13.5px] font-mono tabular text-ink-900">
          {formatMoney(gross)}
        </div>
      </div>
    );
  }

  // Per-tier rows + subtotal
  const tierSubtotal = allTiers.reduce((s, t) => s + t.qty * t.price, 0);
  const discrepancy = Math.abs(tierSubtotal - gross) > 0.5;

  return (
    <>
      {allTiers.map((t, i) => (
        <div key={i} className="flex items-baseline justify-between py-2">
          <div className="text-[13px] text-ink-700">
            <span className="font-medium">{t.tier}</span>
            <span className="text-ink-400 font-normal">
              {" "}
              {t.qty} × {formatMoney(t.price)}
            </span>
          </div>
          <div className="text-[13px] font-mono tabular text-ink-800">
            {formatMoney(t.qty * t.price)}
          </div>
        </div>
      ))}
      <div className="flex items-baseline justify-between py-2.5 border-t border-ink-100/80">
        <div>
          <div className="text-[13px] font-medium text-ink-900">
            Gross box office
            <span className="text-ink-400 font-normal ml-1.5">
              ({totalQty.toLocaleString()} tickets)
            </span>
          </div>
          {discrepancy && (
            <div className="text-[11px] text-amber-700 mt-0.5">
              Tier subtotal {formatMoney(tierSubtotal)} differs from recorded
              gross {formatMoney(gross)} — verify with ticketing system
            </div>
          )}
        </div>
        <div
          className={`text-[13.5px] font-mono tabular font-semibold ${discrepancy ? "text-amber-700" : "text-ink-900"}`}
        >
          {formatMoney(gross)}
        </div>
      </div>
    </>
  );
}

const COMP_CATEGORY_LABELS: Record<string, string> = {
  artist_gl: "Artist guest list",
  label: "Label / management",
  press: "Press",
  venue_staff: "Venue staff",
  sponsor: "Sponsor",
  promo: "Promo / radio",
  other: "Other",
};

function TicketReconciliation({
  ticketSales,
  comps,
  venueCapacity,
  showDate,
}: {
  ticketSales: TicketSale[];
  comps: Comp[];
  venueCapacity: number | null;
  showDate: string;
}) {
  const totalQty = ticketSales.reduce((s, t) => s + (t.qty ?? 0), 0);
  const gross = ticketSales.reduce((s, t) => s + t.gross, 0);
  const fees = ticketSales.reduce((s, t) => s + t.fees, 0);
  const net = gross - fees;
  const avgPrice = totalQty > 0 ? gross / totalQty : 0;
  const feeRate = gross > 0 ? fees / gross : 0;

  const totalComps = comps.reduce((s, c) => s + c.count, 0);
  const totalInRoom = totalQty + totalComps;
  const sellThrough = venueCapacity ? totalInRoom / venueCapacity : null;
  const paidSellThrough = venueCapacity ? totalQty / venueCapacity : null;

  // showDate is YYYY-MM-DD — format without timezone conversion.
  // captured_at is midnight UTC which renders as the previous day in local
  // time (Nashville is UTC−5/−6), so we use the show date string directly.
  const [year, month, day] = showDate.split("-").map(Number);
  const showDateObj = new Date(year, month - 1, day);
  const displayDate = showDateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Ticket reconciliation</CardTitle>
          <CardDescription>
            Box office · {displayDate}. Verify the gross before the math runs.
          </CardDescription>
        </div>
        {sellThrough !== null && (
          <PlainBadge variant={sellThrough >= 0.95 ? "brand" : "default"}>
            {formatPct(sellThrough)} full
          </PlainBadge>
        )}
      </CardHeader>
      <CardContent>
        {/* Sell-through bar */}
        {venueCapacity !== null && (
          <div className="mb-5">
            <div className="flex justify-between text-[11px] text-ink-500 mb-1.5">
              <span>
                <span className="font-mono tabular font-medium text-ink-900">{totalInRoom}</span>
                {" "}in room
                <span className="text-ink-300 mx-1.5">·</span>
                <span className="font-mono tabular">{totalQty}</span> paid
                <span className="text-ink-300 mx-1.5">+</span>
                <span className="font-mono tabular">{totalComps}</span> comps
              </span>
              <span className="font-mono tabular text-ink-500">
                cap {venueCapacity.toLocaleString()}
              </span>
            </div>
            <div className="relative h-2.5 rounded-full bg-ink-100/80 overflow-hidden">
              {/* Paid tickets — green */}
              {paidSellThrough !== null && (
                <div
                  className="absolute left-0 top-0 h-full bg-brand-600 rounded-full"
                  style={{ width: `${Math.min(paidSellThrough * 100, 100)}%` }}
                />
              )}
              {/* Comps on top — lighter */}
              {sellThrough !== null && paidSellThrough !== null && (
                <div
                  className="absolute top-0 h-full bg-brand-300/70"
                  style={{
                    left: `${Math.min(paidSellThrough * 100, 100)}%`,
                    width: `${Math.min((sellThrough - paidSellThrough) * 100, 100 - paidSellThrough * 100)}%`,
                  }}
                />
              )}
            </div>
            <div className="flex gap-4 mt-1.5">
              <span className="flex items-center gap-1 text-[10.5px] text-ink-400">
                <span className="inline-block w-2 h-2 rounded-full bg-brand-600" />
                Paid
              </span>
              <span className="flex items-center gap-1 text-[10.5px] text-ink-400">
                <span className="inline-block w-2 h-2 rounded-full bg-brand-300/70" />
                Comps
              </span>
            </div>
          </div>
        )}

        {/* Ticket rows — tier breakdown if available, aggregate fallback */}
        <div className="divide-y divide-ink-100/80">
          <TierRows ticketSales={ticketSales} gross={gross} />

          <div className="flex items-baseline justify-between py-2.5">
            <div>
              <div className="text-[13px] text-ink-600">CC / platform fees</div>
              <div className="text-[11.5px] text-ink-400 mt-0.5">
                {formatPct(feeRate)} of gross
              </div>
            </div>
            <div className="text-[13.5px] font-mono tabular text-ink-500">
              −{formatMoney(fees)}
            </div>
          </div>

          <div className="flex items-baseline justify-between py-2.5 font-semibold">
            <span className="text-[13px] text-ink-900">Net box office</span>
            <span className="text-[13.5px] font-mono tabular text-ink-900">
              {formatMoney(net)}
            </span>
          </div>
        </div>

        {/* Comps breakdown */}
        {comps.length > 0 && (
          <div className="mt-4 pt-4 border-t border-ink-100/80">
            <div className="eyebrow text-[10px] text-ink-400 mb-2.5">
              Comps — not counted toward gross
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
              {comps.map((c) => (
                <div key={c.id} className="flex justify-between text-[12px]">
                  <span className="text-ink-500">
                    {COMP_CATEGORY_LABELS[c.category] ?? c.category}
                    {c.countsTowardGross && (
                      <span className="ml-1 text-amber-700 font-medium">
                        (counts toward gross)
                      </span>
                    )}
                  </span>
                  <span className="font-mono tabular text-ink-700 ml-2">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[12.5px] font-medium mt-2.5 pt-2.5 border-t border-ink-100/60">
              <span className="text-ink-600">Total comps</span>
              <span className="font-mono tabular text-ink-900">{totalComps}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExpenseBreakdown({
  lines,
  totalActual,
  totalPassed,
  hospitalityCapApplied,
  hospitalityOverage,
  expenseCapApplied,
}: {
  lines: { id: string; category: string; description: string | null; amount: number; absorbedByVenue: boolean }[];
  totalActual: number;
  totalPassed: number;
  hospitalityCapApplied: number | null;
  hospitalityOverage: number;
  expenseCapApplied: number | null;
}) {
  const passed = lines.filter((l) => !l.absorbedByVenue);
  const absorbed = lines.filter((l) => l.absorbedByVenue);
  const venueSavings = totalActual - totalPassed;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Expense breakdown</CardTitle>
          <CardDescription>
            Every expense line on this show. Caps applied before passing to
            artist.
          </CardDescription>
        </div>
        {venueSavings > 0.01 && (
          <PlainBadge variant="default">
            Venue absorbed {formatMoney(venueSavings)}
          </PlainBadge>
        )}
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-ink-100/80">
          {passed.map((l) => (
            <div
              key={l.id}
              className="py-2.5 flex items-baseline justify-between gap-3"
            >
              <div className="min-w-0 flex items-baseline gap-2">
                <span className="text-[10.5px] font-medium text-ink-500 bg-ink-100/60 px-1.5 py-0.5 rounded capitalize">
                  {EXPENSE_CATEGORY_LABELS[l.category] ?? l.category}
                </span>
                {l.description && (
                  <span className="text-[12px] text-ink-500 truncate">
                    {l.description}
                  </span>
                )}
              </div>
              <div className="text-[12.5px] font-mono tabular text-ink-900 shrink-0">
                {formatMoney(l.amount)}
              </div>
            </div>
          ))}
        </div>

        {/* Cap summary */}
        <div className="mt-4 pt-4 border-t border-ink-100/80 space-y-2">
          {hospitalityCapApplied != null && (
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-amber-700">
                Hospitality cap ({formatMoney(hospitalityCapApplied)}) —
                overage {formatMoney(hospitalityOverage)} → Recoups
              </span>
              <span className="font-mono tabular text-amber-700">
                −{formatMoney(hospitalityOverage)}
              </span>
            </div>
          )}
          {expenseCapApplied != null && (
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-ink-500">
                Expense cap applied ({formatMoney(expenseCapApplied)}) — venue
                absorbs remainder
              </span>
              <span className="font-mono tabular text-ink-500">
                max {formatMoney(expenseCapApplied)}
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between text-[12.5px] font-medium pt-1">
            <span className="text-ink-700">Total passed through to artist</span>
            <span className="font-mono tabular text-ink-900">
              {formatMoney(totalPassed)}
            </span>
          </div>
        </div>

        {/* Absorbed by venue */}
        {absorbed.length > 0 && (
          <div className="mt-4 pt-4 border-t border-ink-100/80">
            <div className="eyebrow text-[10px] text-ink-400 mb-2">
              Absorbed by venue (not passed to artist)
            </div>
            <div className="divide-y divide-ink-100/40">
              {absorbed.map((l) => (
                <div
                  key={l.id}
                  className="py-2 flex items-baseline justify-between gap-3"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[10.5px] font-medium text-ink-400 bg-ink-100/40 px-1.5 py-0.5 rounded capitalize">
                      {EXPENSE_CATEGORY_LABELS[l.category] ?? l.category}
                    </span>
                    {l.description && (
                      <span className="text-[12px] text-ink-400">
                        {l.description}
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] font-mono tabular text-ink-400 line-through">
                    {formatMoney(l.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecoupsSection({ recoups }: { recoups: Recoup[] }) {
  const total = recoups.reduce((s, r) => s + r.amount, 0);
  const disputedTotal = recoups
    .filter((r) => r.status === "disputed")
    .reduce((s, r) => s + r.amount, 0);
  const hasDisputed = disputedTotal > 0;

  return (
    <Card accent={hasDisputed ? "rose" : undefined}>
      <CardHeader>
        <div>
          <CardTitle>Recoups</CardTitle>
          <CardDescription>
            Venue costs taken off the top before artist payment. Often the
            disputed line items in a settlement.
          </CardDescription>
        </div>
        <PlainBadge variant={hasDisputed ? "rose" : "default"}>
          {formatMoney(total)} total
        </PlainBadge>
      </CardHeader>
      <CardContent className="divide-y divide-ink-100/80">
        {recoups.map((r) => (
          <div
            key={r.id}
            className="py-3.5 grid grid-cols-[1fr_auto_auto] items-center gap-3"
          >
            <div className="min-w-0">
              <div className="text-[13px] text-ink-900 leading-tight">
                {r.label}
              </div>
              <div className="text-[11.5px] text-ink-400 mt-0.5">
                {RECOUP_LABELS[r.category]}
              </div>
            </div>
            <div>
              {r.status === "disputed" ? (
                <PlainBadge variant="rose">Disputed</PlainBadge>
              ) : r.status === "withdrawn" ? (
                <PlainBadge variant="default">Withdrawn</PlainBadge>
              ) : (
                <PlainBadge variant="brand">Agreed</PlainBadge>
              )}
            </div>
            <div className="text-[13.5px] font-mono tabular text-ink-900 text-right min-w-[80px]">
              {formatMoney(r.amount)}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SignoffSection({ settlement }: { settlement: Settlement }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign-off & notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {settlement.signoffText && (
          <div>
            <div className="eyebrow text-[10px] text-ink-500 mb-2">
              From the artist team
            </div>
            <div className="text-[13px] text-ink-800 bg-canvas-soft rounded-lg p-4 ring-1 ring-ink-200/60 leading-relaxed">
              &ldquo;{settlement.signoffText}&rdquo;
            </div>
          </div>
        )}
        {settlement.notes && (
          <div>
            <div className="eyebrow text-[10px] text-ink-500 mb-2">
              Mariana&apos;s settlement notes
            </div>
            <div className="text-[12.5px] text-ink-800 bg-canvas-soft rounded-lg p-4 ring-1 ring-ink-200/60 leading-relaxed">
              {settlement.notes}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  note,
  highlight = false,
}: {
  label: string;
  value: string;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-2.5 ${highlight ? "bg-brand-50/30 -mx-5 px-5 rounded" : ""}`}
    >
      <div>
        <div
          className={`text-[13px] ${highlight ? "font-semibold text-ink-900" : "text-ink-600"}`}
        >
          {label}
        </div>
        {note && (
          <div className="text-[11.5px] text-ink-400 mt-0.5 max-w-md leading-snug">
            {note}
          </div>
        )}
      </div>
      <div
        className={`text-[13.5px] font-mono tabular ${highlight ? "font-semibold text-ink-900" : "text-ink-900"}`}
      >
        {value}
      </div>
    </div>
  );
}
