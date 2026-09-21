import { ButtonLink } from "@/components/button";
import { getOptionalUser } from "@/lib/auth";
import { homeFor } from "@/lib/user";

const STEPS = [
  { title: "Create", body: "Hosts write questions, mark the right answer and set a timer for each one." },
  { title: "Join", body: "Players sign up with a name, a username and the nickname everyone sees." },
  { title: "Play", body: "The host shares a code. Questions reach every player at once, and faster right answers score more." },
  { title: "Review", body: "Every game is saved, so players can look back at their scores and ranks." },
];

export default async function HomePage() {
  const user = await getOptionalUser();

  return (
    <>
      <section className="mx-auto w-full max-w-5xl px-6 py-24 sm:py-32">
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Ask a question. Watch the room answer.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted text-pretty">
          kubute runs live quizzes: build one, share a code, and see every answer and score as it happens.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {user ? (
            <ButtonLink href={homeFor(user).href}>{user.role === "host" ? "Your quizzes" : "Join a game"}</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/signup/host">Host a quiz</ButtonLink>
              <ButtonLink href="/signup/player" variant="secondary">
                Join as a player
              </ButtonLink>
            </>
          )}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <h2 className="text-sm font-medium text-muted">How it works</h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="font-mono text-sm text-muted">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-medium">{step.title}</h3>
                <p className="mt-2 text-sm text-muted text-pretty">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
