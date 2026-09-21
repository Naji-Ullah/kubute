import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:opacity-85",
  secondary: "border border-border hover:bg-subtle",
  ghost: "hover:bg-subtle",
};

export function buttonClass(variant: Variant = "primary", className = ""): string {
  return [
    "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    className,
  ].join(" ");
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant, className, ...props }: ButtonProps) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant };

export function ButtonLink({ variant, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
