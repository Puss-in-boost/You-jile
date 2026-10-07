/** Read until an empty page, including when the server caps pages below our request. */
export async function readAllPages<T>(fetchPage: (from: number, to: number) => PromiseLike<T[]>, pageSize = 500): Promise<T[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) throw new Error("Invalid page size");
  const rows: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await fetchPage(offset, offset + pageSize - 1);
    if (!page.length) return rows;
    rows.push(...page);
    offset += page.length;
  }
}
