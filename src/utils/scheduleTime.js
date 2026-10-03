/**
 * Utility functions for schedule time parsing and live ongoing session detection in WIB (UTC+7).
 */

/**
 * Parse a time range string like "07.40 - 09.20" or "07:40 - 09:20"
 * into startMinutes and endMinutes relative to midnight.
 * @param {string} timeStr
 * @returns {{ startMinutes: number, endMinutes: number } | null}
 */
export function parseTimeRange(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const match = timeStr.trim().match(/^(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})$/);
  if (!match) return null;

  const startHour = Number.parseInt(match[1], 10);
  const startMinute = Number.parseInt(match[2], 10);
  const endHour = Number.parseInt(match[3], 10);
  const endMinute = Number.parseInt(match[4], 10);

  return {
    startMinutes: startHour * 60 + startMinute,
    endMinutes: endHour * 60 + endMinute,
  };
}

/**
 * Get current day of week and minute of day in Asia/Jakarta timezone (WIB, UTC+7).
 * @param {Date} [date=new Date()]
 * @returns {{ isSaturday: boolean, currentMinutes: number, dayOfWeek: string, timeString: string }}
 */
export function getWibTime(date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jakarta",
      weekday: "short",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    let dayOfWeek = "";
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === "weekday") dayOfWeek = part.value;
      if (part.type === "hour") hour = Number.parseInt(part.value, 10);
      if (part.type === "minute") minute = Number.parseInt(part.value, 10);
    }

    return {
      isSaturday: dayOfWeek === "Sat",
      currentMinutes: hour * 60 + minute,
      dayOfWeek,
      timeString: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  } catch {
    // Fallback if Intl or Asia/Jakarta isn't available
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const wib = new Date(utc + 7 * 3600000);
    const hour = wib.getHours();
    const minute = wib.getMinutes();
    return {
      isSaturday: wib.getDay() === 6,
      currentMinutes: hour * 60 + minute,
      dayOfWeek: wib.getDay() === 6 ? "Sat" : "",
      timeString: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  }
}

/**
 * Determine if a schedule slot is currently ongoing right now in WIB.
 * @param {string} jamStr - e.g. "07.40 - 09.20"
 * @param {Object} [options]
 * @param {boolean} [options.isLuring=true]
 * @param {boolean} [options.isCurrentWeek=true]
 * @param {Date} [options.now]
 * @param {Object} [options.wibInfo]
 * @returns {boolean}
 */
export function isScheduleOngoing(jamStr, options = {}) {
  const { isLuring = true, isCurrentWeek = true, now, wibInfo } = options;

  if (!isLuring || !isCurrentWeek || !jamStr) {
    return false;
  }

  const range = parseTimeRange(jamStr);
  if (!range) return false;

  const wib = wibInfo || getWibTime(now);
  if (!wib.isSaturday) {
    return false;
  }

  return (
    wib.currentMinutes >= range.startMinutes &&
    wib.currentMinutes < range.endMinutes
  );
}

