import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthShell({ title, description, footer, children }: AuthShellProps) {
  return (
    <div className="mx-auto w-full max-w-sm px-6 py-16 sm:py-24">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <div className="mt-8">{children}</div>
      <p className="mt-6 text-sm text-muted">{footer}</p>
    </div>
  );
}
