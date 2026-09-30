/**
 * Utility to extract latest timestamp from records and format it as relative time.
 */

export function parseUtcDate(timeStr) {
  if (!timeStr) return null;
  if (typeof timeStr === "string") {
    // If standard SQLite "YYYY-MM-DD HH:MM:SS" without T or timezone, treat as UTC
    const hasTimezone = timeStr.endsWith("Z") || timeStr.includes("+") || (timeStr.includes("T") && /[-+]\d{2}:?\d{2}$/.test(timeStr));
    let isoStr;
    if (timeStr.includes("T")) {
      isoStr = hasTimezone ? timeStr : `${timeStr}Z`;
    } else {
      isoStr = `${timeStr.replace(" ", "T")}Z`;
    }
    const d = new Date(isoStr);
    return Number.isNaN(d.getTime()) ? new Date(timeStr) : d;
  }
  const d = new Date(timeStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getLatestTimestamp(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  let maxTime = 0;
  for (const item of items) {
    const times = [item?.updated_at, item?.created_at];
    for (const timeVal of times) {
      if (!timeVal) continue;
      const parsed = parseUtcDate(timeVal);
      if (parsed && !Number.isNaN(parsed.getTime()) && parsed.getTime() > maxTime) {
        maxTime = parsed.getTime();
      }
    }
  }
  return maxTime > 0 ? new Date(maxTime) : null;
}

export function formatRelativeTime(date, now = Date.now()) {
  if (!date) return null;
  let targetDate;
  if (typeof date === "number") {
    targetDate = new Date(date);
  } else if (date instanceof Date) {
    targetDate = date;
  } else {
    targetDate = parseUtcDate(date);
  }

  if (!targetDate || Number.isNaN(targetDate.getTime())) return null;

  const nowMs = typeof now === "number" ? now : now.getTime();
  const diffSeconds = Math.max(0, Math.floor((nowMs - targetDate.getTime()) / 1000));

  // 1. < 60s: just now
  if (diffSeconds < 60) {
    return "just now";
  }

  // 2. < 3600s: x minutes ago
  if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return mins <= 1 ? "1 minute ago" : `${mins} minutes ago`;
  }

  // 3. < 86400s (24 hours): x hours ago
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return hours <= 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  // 4. 24h to < 48h: yesterday
  if (diffSeconds < 172800) {
    return "yesterday";
  }

  // 5. <= 7 days: x days ago
  const days = Math.floor(diffSeconds / 86400);
  if (days <= 7) {
    return `${days} days ago`;
  }

  // 6. > 7 days (lebih seminggu): tanggal dan waktu (e.g. 23 Sep 2026, 14:30)
  const d = targetDate;
  const day = d.getDate();
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}
