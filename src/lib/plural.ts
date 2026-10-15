/** "1 job", "2 jobs" - English count + noun with the right form. */
export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
