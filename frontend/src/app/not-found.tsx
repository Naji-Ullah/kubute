import { ButtonLink } from "@/components/button";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-sm px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-muted">There’s nothing at this address.</p>
      <ButtonLink href="/" variant="secondary" className="mt-8">
        Go home
      </ButtonLink>
    </div>
  );
}
