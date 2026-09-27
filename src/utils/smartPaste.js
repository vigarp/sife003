function splitLineToParts(line) {
  if (line.includes("\t")) {
    return line.split("\t");
  }
  if (line.includes(";")) {
    return line.split(";");
  }
  if (line.includes(",")) {
    return line.split(",");
  }
  const spaceIdx = line.search(/\s/);
  if (spaceIdx > 0) {
    const first = line.slice(0, spaceIdx);
    const rest = line.slice(spaceIdx).trim();
    if (first && rest) {
      return [first, rest];
    }
  }
  return [];
}

function stripQuotes(str) {
  let s = str.trim();
  while (s.startsWith("'") || s.startsWith('"') || s.startsWith("`")) {
    s = s.slice(1);
  }
  while (s.endsWith("'") || s.endsWith('"') || s.endsWith("`")) {
    s = s.slice(0, -1);
  }
  return s.trim();
}

function isHeaderRow(nim, name) {
  const n = nim.toLowerCase();
  const nm = name.toLowerCase();
  return (
    n.includes("nim") ||
    nm.includes("nama") ||
    n === "no" ||
    n === "id" ||
    n === "nomor"
  );
}

function normalizeNimAndName(rawNim, rawName) {
  let nim = stripQuotes(rawNim);
  let name = stripQuotes(rawName);

  // Detect reversed order: Name in first col, numeric NIM in second col
  if (/^\d{6,}$/.test(name) && !/^\d{6,}$/.test(nim)) {
    const temp = nim;
    nim = name;
    name = temp;
  }

  return { nim, name };
}

export function parseExcelStudentText(rawText) {
  const text = (rawText || "").trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const results = [];
  const seenNims = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = splitLineToParts(trimmed);
    if (parts.length < 2) continue;

    const { nim, name } = normalizeNimAndName(parts[0], parts.slice(1).join(" "));

    if (!isHeaderRow(nim, name) && nim && name && !seenNims.has(nim)) {
      seenNims.add(nim);
      results.push({ nim, name });
    }
  }

  return results;
}
