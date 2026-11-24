export interface Row {
  number: string;
  name: string;
  selected: boolean;
}
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === "," || ch === "\t")) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted)
    throw new Error("CSV 따옴표가 닫히지 않았습니다. 파일을 확인해주세요.");
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}
export function rosterRows(table: unknown[][]): Row[] {
  const headers = (table[0] || []).map((c) =>
    String(c ?? "")
      .replace(/^\uFEFF/, "")
      .replace(/\s/g, "")
      .toLowerCase(),
  );
  const ni = headers.findIndex((x) =>
    ["번호", "학번", "number", "no", "출석번호"].includes(x),
  );
  const nn = headers.findIndex((x) =>
    ["이름", "성명", "학생명", "name"].includes(x),
  );
  if (ni < 0 || nn < 0)
    throw new Error(
      "첫 행에 번호와 이름 열이 필요합니다. 명단 양식을 참고해주세요.",
    );
  return table
    .slice(1)
    .filter((r) => r.some((c) => String(c ?? "").trim()))
    .map((r) => ({
      number: String(r[ni] ?? "").trim(),
      name: String(r[nn] ?? "").trim(),
      selected: true,
    }));
}
