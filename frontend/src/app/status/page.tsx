import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";

import { ApiError } from "@/lib/api";
import { serverApi } from "@/lib/api.server";

export const metadata: Metadata = { title: "Status" };

async function getStatus(): Promise<{ api: boolean; database: boolean }> {
  try {
    await serverApi("/health/ready");
    return { api: true, database: true };
  } catch (error) {
    unstable_rethrow(error);
    return { api: error instanceof ApiError && error.status === 503, database: false };
  }
}

export default async function StatusPage() {
  const status = await getStatus();
  const checks = [
    { name: "Django API", ok: status.api },
    { name: "Postgres", ok: status.database },
  ];

  return (
    <div className="mx-auto w-full max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
      <ul className="mt-8 divide-y divide-border border-y border-border">
        {checks.map(({ name, ok }) => (
          <li key={name} className="flex items-center justify-between py-3 text-sm">
            <span>{name}</span>
            <span className="flex items-center gap-2 text-muted">
              <span className={`size-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
              {ok ? "Operational" : "Down"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
