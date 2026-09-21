import type { ComponentProps } from "react";

export type FieldProps = ComponentProps<"input"> & { label: string; name: string; error?: string };

export const inputClass =
  "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted focus:border-foreground aria-invalid:border-red-500";

export function Field({ label, name, error, id = name, ...props }: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClass}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-red-500/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
