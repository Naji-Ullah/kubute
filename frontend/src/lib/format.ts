const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

const numberFormat = new Intl.NumberFormat("en");

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

const ordinalRules = new Intl.PluralRules("en", { type: "ordinal" });
const ORDINAL_SUFFIXES: Record<Intl.LDMLPluralRule, string> = {
  zero: "th",
  one: "st",
  two: "nd",
  few: "rd",
  many: "th",
  other: "th",
};

export function ordinal(value: number): string {
  return `${value}${ORDINAL_SUFFIXES[ordinalRules.select(value)]}`;
}
