export function filterWaiverRowsByPlayerName<T extends { name: string }>(
  rows: readonly T[],
  query: string,
): readonly T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return rows;
  return rows.filter((row) => row.name.toLocaleLowerCase().includes(normalizedQuery));
}
