import type { Metadata } from "next";

import { Pagination, parsePage } from "@/components/pagination";
import { serverApiOrNotFound } from "@/lib/api.server";
import { requireRole } from "@/lib/auth";
import { formatDate, formatNumber, ordinal } from "@/lib/format";
import type { HistoryEntry, Paginated } from "@/lib/types";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  await requireRole("player");
  const page = parsePage((await searchParams).page);
  const history = await serverApiOrNotFound<Paginated<HistoryEntry>>(`/games/history?page=${page}`);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">History</h1>

      {history.count === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="font-medium">No games yet</p>
          <p className="mt-1 text-sm text-muted">Your scores and ranks will show up here after you play.</p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {history.results.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{entry.quiz_title}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {formatDate(entry.finished_at)} · {entry.correct_answers}/{entry.question_count} correct
                </p>
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <p className="font-medium">
                  {entry.final_rank ? ordinal(entry.final_rank) : "–"}
                  <span className="font-normal text-muted"> of {entry.player_count}</span>
                </p>
                <p className="mt-0.5 text-sm text-muted">{formatNumber(entry.score)} pts</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination
        basePath="/history"
        page={page}
        hasPrevious={history.previous !== null}
        hasNext={history.next !== null}
      />
    </div>
  );
}
