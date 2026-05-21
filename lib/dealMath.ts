/**
 * Deal calculation logic for the in-app settlement tool.
 *
 * Handles all 5 deal types:
 *   1. flat                — $X guaranteed, optional bonuses
 *   2. percentage_of_gross — X% of gross, no expense deductions
 *   3. vs                  — guarantee vs % of net, whichever greater
 *   4. percentage_of_net   — % of net after expenses (no guarantee floor)
 *   5. door                — artist gets net box office minus passed expenses
 *
 * Expense caps:
 *   - expenseCap:      ceiling on total expenses passed through to artist
 *   - hospitalityCap:  sub-ceiling on hospitality category specifically
 *
 * Bonuses are read from bonusesJson (structured). Bonuses that exist only
 * in dealNotesFreetext are invisible to this engine — hasFreeTextAmendment
 * flags when the freetext looks like it contains overrides or amendments.
 */

import type { Deal, Expense, TicketSale, Bonus, Comp } from "@/db/schema";

export type ExpenseLine = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  absorbedByVenue: boolean;
};

export type SettlementCalculation =
  | {
      supported: true;
      grossBoxOffice: number;
      netBoxOffice: number;
      /** Total expenses passed through to artist after all caps. */
      totalExpenses: number;
      /** Total expenses before any caps. */
      totalExpensesActual: number;
      totalToArtist: number;
      steps: { label: string; value: number; note?: string }[];
      finalFormula: string;
      bonusesApplied: { label: string; amount: number; reason: string }[];
      bonusesNotTriggered: { label: string; amount: number; reason: string }[];
      /** Every expense row on the show, for line-by-line display. */
      expenseLines: ExpenseLine[];
      /** Overall expense cap from deal, or null if none. */
      expenseCapApplied: number | null;
      /** Hospitality cap from deal, or null if no overage. */
      hospitalityCapApplied: number | null;
      /** Amount hospitality ran over cap (feeds into recoups). */
      hospitalityOverage: number;
      /** Net box office minus passed expenses. Null for flat/pct_of_gross. */
      netAfterExpenses: number | null;
      /** The guarantee floor used in a vs deal. Null for other types. */
      guaranteeFloor: number | null;
      /** The % payout before the vs comparison. Null for flat/door. */
      percentagePayout: number | null;
      /** Which side of a vs deal won. Null for non-vs types. */
      vsWinner: "guarantee" | "percentage" | null;
      /** True if dealNotesFreetext looks like it contains amendments not in structured fields. */
      hasFreeTextAmendment: boolean;
    }
  | {
      supported: false;
      reason: string;
      dealType: Deal["dealType"];
    };

interface CalcInput {
  deal: Deal;
  ticketSales: TicketSale[];
  expenses: Expense[];
  comps?: Comp[];
  venueCapacity?: number;
  ticketsSold?: number;
}

export function parseBonuses(deal: Deal): Bonus[] {
  if (!deal.bonusesJson) return [];
  try {
    const parsed = JSON.parse(deal.bonusesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const AMENDMENT_KEYWORDS = [
  "renegotiated",
  "updated",
  "amended",
  "revised",
  "phone call",
  "confirm before",
  "structured field still reflects",
  "see email",
  "per the deal memo",
];

function detectFreeTextAmendment(deal: Deal): boolean {
  if (!deal.dealNotesFreetext) return false;
  const lower = deal.dealNotesFreetext.toLowerCase();
  return AMENDMENT_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Calculate passed-through expenses applying hospitality sub-cap and overall cap.
 *
 * Order of operations:
 *   1. Hospitality total is capped at hospitalityCap (overage stays in recoups).
 *   2. Sum of all passed expenses (with capped hospitality) is capped at expenseCap.
 */
function calcExpenses(
  expenses: Expense[],
  hospitalityCap: number | null,
  expenseCap: number | null,
) {
  const nonAbsorbed = expenses.filter((e) => !e.absorbedByVenue);

  const hospitalityTotal = nonAbsorbed
    .filter((e) => e.category === "hospitality")
    .reduce((s, e) => s + e.amount, 0);

  const otherTotal = nonAbsorbed
    .filter((e) => e.category !== "hospitality")
    .reduce((s, e) => s + e.amount, 0);

  const hospitalityPassed =
    hospitalityCap != null
      ? Math.min(hospitalityTotal, hospitalityCap)
      : hospitalityTotal;

  const hospitalityOverage = hospitalityTotal - hospitalityPassed;

  const totalBeforeCap = hospitalityPassed + otherTotal;
  const totalPassed =
    expenseCap != null ? Math.min(totalBeforeCap, expenseCap) : totalBeforeCap;

  const totalActual = hospitalityTotal + otherTotal;

  return {
    totalActual,
    totalPassed,
    hospitalityOverage,
    hospitalityCapApplied:
      hospitalityCap != null && hospitalityOverage > 0 ? hospitalityCap : null,
    expenseCapApplied: expenseCap != null && totalPassed < totalBeforeCap ? expenseCap : null,
  };
}

function expenseLines(expenses: Expense[]): ExpenseLine[] {
  return expenses.map((e) => ({
    id: e.id,
    category: e.category,
    description: e.description,
    amount: e.amount,
    absorbedByVenue: e.absorbedByVenue,
  }));
}

export function calculateSettlement(input: CalcInput): SettlementCalculation {
  const { deal, ticketSales, expenses, comps, venueCapacity, ticketsSold } =
    input;

  // Comps that count toward gross (rare, deal-specific)
  const compGross = (comps ?? [])
    .filter((c) => c.countsTowardGross)
    .reduce((s, c) => s + c.count * c.faceValue, 0);

  const grossBoxOffice =
    ticketSales.reduce((sum, t) => sum + t.gross, 0) + compGross;
  const totalFees = ticketSales.reduce((sum, t) => sum + t.fees, 0);
  const netBoxOffice = grossBoxOffice - totalFees;

  const tickets =
    ticketsSold ?? ticketSales.reduce((sum, t) => sum + (t.qty ?? 0), 0);

  const hasFreeTextAmendment = detectFreeTextAmendment(deal);
  const lines = expenseLines(expenses);

  const expCalc = calcExpenses(
    expenses,
    deal.hospitalityCap ?? null,
    deal.expenseCap ?? null,
  );

  // ---------- flat ----------
  if (deal.dealType === "flat") {
    if (deal.guaranteeAmount == null) {
      return {
        supported: false,
        reason: "Flat deal is missing a guarantee amount.",
        dealType: deal.dealType,
      };
    }
    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    const total = deal.guaranteeAmount + bonusResult.totalApplied;

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses: expCalc.totalPassed,
      totalExpensesActual: expCalc.totalActual,
      totalToArtist: total,
      steps: [
        {
          label: "Flat guarantee",
          value: deal.guaranteeAmount,
          note: "Fixed amount — no expense deductions.",
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula: bonusResult.applied.length
        ? `$${deal.guaranteeAmount.toFixed(2)} guarantee + $${bonusResult.totalApplied.toFixed(2)} bonuses = $${total.toFixed(2)}`
        : `flat guarantee = $${deal.guaranteeAmount.toFixed(2)}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
      expenseLines: lines,
      expenseCapApplied: expCalc.expenseCapApplied,
      hospitalityCapApplied: expCalc.hospitalityCapApplied,
      hospitalityOverage: expCalc.hospitalityOverage,
      netAfterExpenses: null,
      guaranteeFloor: null,
      percentagePayout: null,
      vsWinner: null,
      hasFreeTextAmendment,
    };
  }

  // ---------- percentage of gross ----------
  if (deal.dealType === "percentage_of_gross") {
    if (deal.percentage == null) {
      return {
        supported: false,
        reason: "Percentage-of-gross deal is missing a percentage.",
        dealType: deal.dealType,
      };
    }
    const payout = grossBoxOffice * deal.percentage;
    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });
    const total = payout + bonusResult.totalApplied;

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses: expCalc.totalPassed,
      totalExpensesActual: expCalc.totalActual,
      totalToArtist: total,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        {
          label: `× ${(deal.percentage * 100).toFixed(0)}%`,
          value: payout,
          note: "Percentage of gross — no expense deductions.",
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula: bonusResult.applied.length
        ? `gross × ${(deal.percentage * 100).toFixed(0)}% + bonuses = $${total.toFixed(2)}`
        : `gross × ${(deal.percentage * 100).toFixed(0)}% = $${payout.toFixed(2)}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
      expenseLines: lines,
      expenseCapApplied: expCalc.expenseCapApplied,
      hospitalityCapApplied: expCalc.hospitalityCapApplied,
      hospitalityOverage: expCalc.hospitalityOverage,
      netAfterExpenses: null,
      guaranteeFloor: null,
      percentagePayout: payout,
      vsWinner: null,
      hasFreeTextAmendment,
    };
  }

  // ---------- vs (guarantee vs % of net or gross) ----------
  if (deal.dealType === "vs") {
    if (deal.percentage == null) {
      return {
        supported: false,
        reason: "Vs deal is missing a percentage.",
        dealType: deal.dealType,
      };
    }
    const guarantee = deal.guaranteeAmount ?? 0;
    const pctBasis = deal.percentageBasis ?? "net";

    const netAfterExpenses =
      pctBasis === "gross"
        ? grossBoxOffice
        : netBoxOffice - expCalc.totalPassed;

    const percentagePayout = netAfterExpenses * deal.percentage;
    const vsWinner: "guarantee" | "percentage" =
      percentagePayout >= guarantee ? "percentage" : "guarantee";
    const baseAmount = Math.max(percentagePayout, guarantee);

    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    const total = baseAmount + bonusResult.totalApplied;

    const basisLabel =
      pctBasis === "gross" ? "gross box office" : "net after expenses";

    const netStep =
      pctBasis === "net"
        ? [
            {
              label: "Less fees",
              value: -totalFees,
              note: "CC and platform fees.",
            },
            {
              label: "Net box office",
              value: netBoxOffice,
            },
            {
              label: `Less expenses (passed through)`,
              value: -expCalc.totalPassed,
              note: buildExpenseNote(expCalc),
            },
            {
              label: "Net after expenses",
              value: netAfterExpenses,
            },
          ]
        : [
            {
              label: "Less fees",
              value: -totalFees,
              note: "CC and platform fees — not deducted from % basis on this deal.",
            },
          ];

    const vsNote =
      vsWinner === "percentage"
        ? `% of ${basisLabel} ($${percentagePayout.toFixed(2)}) > guarantee ($${guarantee.toFixed(2)}) — % wins`
        : `Guarantee ($${guarantee.toFixed(2)}) > % of ${basisLabel} ($${percentagePayout.toFixed(2)}) — guarantee was floor`;

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses: expCalc.totalPassed,
      totalExpensesActual: expCalc.totalActual,
      totalToArtist: total,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        ...netStep,
        {
          label: `× ${(deal.percentage * 100).toFixed(0)}% of ${basisLabel}`,
          value: percentagePayout,
        },
        {
          label: vsWinner === "percentage" ? "vs guarantee (% wins)" : "vs guarantee (guarantee wins)",
          value: baseAmount,
          note: vsNote,
        },
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula:
        vsWinner === "percentage"
          ? `max(${(deal.percentage * 100).toFixed(0)}% × ${basisLabel}, $${guarantee}) = $${baseAmount.toFixed(2)}`
          : `max(${(deal.percentage * 100).toFixed(0)}% × ${basisLabel}, $${guarantee}) = $${baseAmount.toFixed(2)} (guarantee floor)`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
      expenseLines: lines,
      expenseCapApplied: expCalc.expenseCapApplied,
      hospitalityCapApplied: expCalc.hospitalityCapApplied,
      hospitalityOverage: expCalc.hospitalityOverage,
      netAfterExpenses,
      guaranteeFloor: guarantee,
      percentagePayout,
      vsWinner,
      hasFreeTextAmendment,
    };
  }

  // ---------- percentage of net ----------
  if (deal.dealType === "percentage_of_net") {
    if (deal.percentage == null) {
      return {
        supported: false,
        reason: "Percentage-of-net deal is missing a percentage.",
        dealType: deal.dealType,
      };
    }
    const guarantee = deal.guaranteeAmount ?? 0;
    const netAfterExpenses = netBoxOffice - expCalc.totalPassed;
    const percentagePayout = netAfterExpenses * deal.percentage;
    const baseAmount = guarantee > 0 ? Math.max(percentagePayout, guarantee) : percentagePayout;
    const vsWinner: "guarantee" | "percentage" | null =
      guarantee > 0
        ? percentagePayout >= guarantee
          ? "percentage"
          : "guarantee"
        : null;

    const bonusResult = applyBonuses(parseBonuses(deal), {
      gross: grossBoxOffice,
      tickets,
      capacity: venueCapacity,
    });

    const total = baseAmount + bonusResult.totalApplied;

    const guaranteeStep =
      guarantee > 0
        ? [
            {
              label:
                vsWinner === "percentage"
                  ? "vs guarantee (% wins)"
                  : "vs guarantee (guarantee wins)",
              value: baseAmount,
              note:
                vsWinner === "percentage"
                  ? `${(deal.percentage * 100).toFixed(0)}% ($${percentagePayout.toFixed(2)}) > guarantee ($${guarantee.toFixed(2)})`
                  : `Guarantee ($${guarantee.toFixed(2)}) > ${(deal.percentage * 100).toFixed(0)}% ($${percentagePayout.toFixed(2)}) — guarantee was floor`,
            },
          ]
        : [];

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses: expCalc.totalPassed,
      totalExpensesActual: expCalc.totalActual,
      totalToArtist: total,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        { label: "Less fees", value: -totalFees, note: "CC and platform fees." },
        { label: "Net box office", value: netBoxOffice },
        {
          label: "Less expenses (passed through)",
          value: -expCalc.totalPassed,
          note: buildExpenseNote(expCalc),
        },
        { label: "Net after expenses", value: netAfterExpenses },
        {
          label: `× ${(deal.percentage * 100).toFixed(0)}% of net`,
          value: percentagePayout,
        },
        ...guaranteeStep,
        ...bonusResult.applied.map((b) => ({
          label: b.label,
          value: b.amount,
          note: b.reason,
        })),
      ],
      finalFormula:
        guarantee > 0
          ? `max(${(deal.percentage * 100).toFixed(0)}% × net, $${guarantee}) = $${baseAmount.toFixed(2)}`
          : `${(deal.percentage * 100).toFixed(0)}% × net after expenses = $${percentagePayout.toFixed(2)}`,
      bonusesApplied: bonusResult.applied,
      bonusesNotTriggered: bonusResult.notTriggered,
      expenseLines: lines,
      expenseCapApplied: expCalc.expenseCapApplied,
      hospitalityCapApplied: expCalc.hospitalityCapApplied,
      hospitalityOverage: expCalc.hospitalityOverage,
      netAfterExpenses,
      guaranteeFloor: guarantee > 0 ? guarantee : null,
      percentagePayout,
      vsWinner,
      hasFreeTextAmendment,
    };
  }

  // ---------- door ----------
  if (deal.dealType === "door") {
    const netAfterExpenses = netBoxOffice - expCalc.totalPassed;

    return {
      supported: true,
      grossBoxOffice,
      netBoxOffice,
      totalExpenses: expCalc.totalPassed,
      totalExpensesActual: expCalc.totalActual,
      totalToArtist: netAfterExpenses,
      steps: [
        { label: "Gross box office", value: grossBoxOffice },
        { label: "Less fees", value: -totalFees, note: "CC and platform fees." },
        { label: "Net box office", value: netBoxOffice },
        {
          label: "Less expenses (passed through)",
          value: -expCalc.totalPassed,
          note: buildExpenseNote(expCalc),
        },
        {
          label: "Net to artist",
          value: netAfterExpenses,
          note: "Artist takes the door after expenses.",
        },
      ],
      finalFormula: `net box office − expenses = $${netAfterExpenses.toFixed(2)}`,
      bonusesApplied: [],
      bonusesNotTriggered: [],
      expenseLines: lines,
      expenseCapApplied: expCalc.expenseCapApplied,
      hospitalityCapApplied: expCalc.hospitalityCapApplied,
      hospitalityOverage: expCalc.hospitalityOverage,
      netAfterExpenses,
      guaranteeFloor: null,
      percentagePayout: null,
      vsWinner: null,
      hasFreeTextAmendment,
    };
  }

  // Should never reach here with valid dealType
  return {
    supported: false,
    dealType: deal.dealType,
    reason: `Unknown deal type: ${deal.dealType}`,
  };
}

function buildExpenseNote(expCalc: ReturnType<typeof calcExpenses>): string {
  const parts: string[] = [];
  if (expCalc.hospitalityCapApplied != null) {
    parts.push(
      `hospitality capped at $${expCalc.hospitalityCapApplied.toFixed(0)} (overage $${expCalc.hospitalityOverage.toFixed(0)} → see Recoups)`,
    );
  }
  if (expCalc.expenseCapApplied != null) {
    parts.push(`total capped at $${expCalc.expenseCapApplied.toFixed(0)}`);
  }
  return parts.length > 0 ? parts.join("; ") : "All expenses passed through.";
}

/** Evaluate a list of bonuses against the show's actual numbers. */
function applyBonuses(
  bonuses: Bonus[],
  ctx: { gross: number; tickets: number; capacity?: number },
) {
  const applied: { label: string; amount: number; reason: string }[] = [];
  const notTriggered: { label: string; amount: number; reason: string }[] = [];

  for (const b of bonuses) {
    if (b.type === "gross_threshold") {
      if (ctx.gross >= b.threshold) {
        applied.push({
          label: b.label,
          amount: b.amount,
          reason: `Gross $${ctx.gross.toLocaleString()} ≥ $${b.threshold.toLocaleString()}`,
        });
      } else {
        notTriggered.push({
          label: b.label,
          amount: b.amount,
          reason: `Gross $${ctx.gross.toLocaleString()} < $${b.threshold.toLocaleString()}`,
        });
      }
    } else if (b.type === "sellout") {
      if (ctx.capacity != null && ctx.tickets >= ctx.capacity * 0.95) {
        applied.push({
          label: b.label,
          amount: b.amount,
          reason: `${ctx.tickets} of ${ctx.capacity} sold`,
        });
      } else {
        notTriggered.push({
          label: b.label,
          amount: b.amount,
          reason:
            ctx.capacity != null
              ? `${ctx.tickets} of ${ctx.capacity} sold (sellout = ≥95%)`
              : "Capacity unknown — can't evaluate",
        });
      }
    } else if (b.type === "attendance_threshold") {
      if (ctx.tickets >= b.threshold) {
        applied.push({
          label: b.label,
          amount: b.amount,
          reason: `${ctx.tickets} ≥ ${b.threshold}`,
        });
      } else {
        notTriggered.push({
          label: b.label,
          amount: b.amount,
          reason: `${ctx.tickets} < ${b.threshold}`,
        });
      }
    } else if (b.type === "tier_ratchet") {
      notTriggered.push({
        label: b.label,
        amount: 0,
        reason:
          "Tier ratchet — requires manual calculation. Check the deal notes.",
      });
    }
  }

  return {
    applied,
    notTriggered,
    totalApplied: applied.reduce((s, b) => s + b.amount, 0),
  };
}
