import { connection } from "next/server";

import { api, ApiError } from "@/lib/api";

async function getStatus() {
  try {
    await api("/health/ready");
    return { api: true, database: true };
  } catch (error) {
    // 503 means Django answered but couldn't reach Postgres.
    return { api: error instanceof ApiError && error.status === 503, database: false };
  }
}

export default async function Home() {
  await connection();
  const status = await getStatus();
  const checks = [
    { name: "Django API", ok: status.api },
    { name: "Postgres", ok: status.database },
  ];

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <section className="w-full max-w-sm rounded-2xl border border-foreground/10 p-6">
        <h1 className="text-xl font-semibold">Kubute</h1>
        <p className="mt-1 text-sm text-foreground/60">Stack status</p>
        <ul className="mt-6 space-y-3">
          {checks.map(({ name, ok }) => (
            <li key={name} className="flex items-center justify-between text-sm">
              <span>{name}</span>
              <span className={`flex items-center gap-2 ${ok ? "text-emerald-500" : "text-red-500"}`}>
                <span className="size-2 rounded-full bg-current" />
                {ok ? "up" : "down"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
