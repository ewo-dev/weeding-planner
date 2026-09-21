/** Joins truthy class-name entries with single spaces (no clsx/tailwind-merge dependency). */
export function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ')
}