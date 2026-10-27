import { ref, computed } from "vue";
import scheduleData from "@/data/schedule.json";

// Build fast master lookup map
const masterMap = {};
scheduleData.master_mata_kuliah.forEach((m) => {
  masterMap[m.nama.trim().toLowerCase()] = m;
});

const semesterCode =
  scheduleData.akademik?.semester?.match(/\((\d+)\)/)?.[1] || "20261";
const kelasCode = scheduleData.akademik?.kelas || "03SIFE003";

// Helper to parse date range string (e.g. "21 – 26 September 2026")
const monthMap = {
  januari: 0,
  februari: 1,
  maret: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  agustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  desember: 11,
};

function parsePekanDateRange(dateStr) {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // Format: "31 Agustus – 5 September 2026"
  const matchTwo = clean.match(
    /^(\d+)\s+([a-zA-Z]+)\s+[–-]\s+(\d+)\s+([a-zA-Z]+)\s+(\d{4})$/
  );
  if (matchTwo) {
    const d1 = Number.parseInt(matchTwo[1], 10);
    const m1 = monthMap[matchTwo[2].toLowerCase()];
    const d2 = Number.parseInt(matchTwo[3], 10);
    const m2 = monthMap[matchTwo[4].toLowerCase()];
    const y = Number.parseInt(matchTwo[5], 10);
    return {
      start: new Date(y, m1, d1, 0, 0, 0),
      end: new Date(y, m2, d2, 23, 59, 59, 999),
    };
  }

  // Format: "21 – 26 September 2026"
  const matchOne = clean.match(
    /^(\d+)\s*[–-]\s*(\d+)\s+([a-zA-Z]+)\s+(\d{4})$/
  );
  if (matchOne) {
    const d1 = Number.parseInt(matchOne[1], 10);
    const d2 = Number.parseInt(matchOne[2], 10);
    const m = monthMap[matchOne[3].toLowerCase()];
    const y = Number.parseInt(matchOne[4], 10);
    return {
      start: new Date(y, m, d1, 0, 0, 0),
      end: new Date(y, m, d2, 23, 59, 59, 999),
    };
  }
  return null;
}

// Helpers for active week calculation
function findOngoingWeek(parsedWeeks, now) {
  return parsedWeeks.findIndex(({ range }) => range && now >= range.start && now <= range.end);
}

function findUpcomingBufferWeek(parsedWeeks, now) {
  for (let i = 0; i < parsedWeeks.length - 1; i++) {
    const currentEnd = parsedWeeks[i].range?.end;
    const nextStart = parsedWeeks[i + 1].range?.start;
    if (currentEnd && nextStart && now > currentEnd && now < nextStart) {
      return i + 1;
    }
  }
  return -1;
}

function getSemesterBoundFallback(parsedWeeks, now) {
  const firstStart = parsedWeeks[0]?.range?.start;
  const lastEnd = parsedWeeks[parsedWeeks.length - 1]?.range?.end;
  if (firstStart && now < firstStart) {
    return { detected: 0, status: "upcoming" };
  }
  if (lastEnd && now > lastEnd) {
    return { detected: parsedWeeks.length - 1, status: "ongoing" };
  }
  return { detected: 4, status: "ongoing" };
}

// Compute active week info with Sunday buffer zone
function computeActiveWeekInfo() {
  const now = new Date();
  const parsedWeeks = scheduleData.jadwal_per_pekan.map((p, idx) => ({
    idx,
    pekan: p.pekan,
    range: parsePekanDateRange(p.tanggal_daring),
  }));

  // 1. Inside any regular active week (Monday to Saturday)
  const ongoingIdx = findOngoingWeek(parsedWeeks, now);
  if (ongoingIdx !== -1) {
    return { detected: ongoingIdx, status: "ongoing" };
  }

  // 2. Buffer zone (Sunday between week i and week i+1)
  const upcomingIdx = findUpcomingBufferWeek(parsedWeeks, now);
  if (upcomingIdx !== -1) {
    return { detected: upcomingIdx, status: "upcoming" };
  }

  // 3. Semester bound fallbacks
  return getSemesterBoundFallback(parsedWeeks, now);
}

function getMaster(matkulName) {
  return masterMap[matkulName?.trim().toLowerCase()] || null;
}

function getLmsUrl(item, master) {
  if (!master?.kode) {
    return "https://mentari.unpam.ac.id/u-courses";
  }
  const pNum =
    item?.pertemuan && item.pertemuan.length > 0 ? item.pertemuan[0] : null;
  const accordParam = pNum ? `?accord_pertemuan=PERTEMUAN_${pNum}` : "";
  return `https://mentari.unpam.ac.id/u-courses/${semesterCode}-${kelasCode}-${master.kode}${accordParam}`;
}

function getPresensiUrl(master) {
  if (!master?.kode) {
    return "https://my.unpam.ac.id/presensi";
  }
  return `https://my.unpam.ac.id/presensi/pertemuan/${master.kode}/${kelasCode}/${semesterCode}`;
}

// Mapping from pekan name to 1-based semester week number (1 to 14) or exam names
export const PEKAN_TO_NUMBER_MAP = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  UTS: "UTS",
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
  XIII: 13,
  XIV: 14,
  UAS: "UAS",
};

export function getPekanNumber(pekanOrWeek) {
  if (pekanOrWeek === null || pekanOrWeek === undefined) return 1;
  if (typeof pekanOrWeek === "number") {
    return pekanOrWeek;
  }
  const str = typeof pekanOrWeek === "object" ? pekanOrWeek?.pekan : pekanOrWeek;
  if (typeof str === "number") {
    return str;
  }
  if (!str) return 1;
  const trimmed = String(str).trim();
  const upper = trimmed.toUpperCase();

  if (upper === "UTS" || upper === "PEKAN UTS") return "UTS";
  if (upper === "UAS" || upper === "PEKAN UAS") return "UAS";

  if (PEKAN_TO_NUMBER_MAP[trimmed] !== undefined) {
    return PEKAN_TO_NUMBER_MAP[trimmed];
  }
  if (PEKAN_TO_NUMBER_MAP[upper] !== undefined) {
    return PEKAN_TO_NUMBER_MAP[upper];
  }

  const cleanNum = upper.replace(/^PEKAN\s*/i, "");
  const parsedNum = Number.parseInt(cleanNum, 10);
  if (!Number.isNaN(parsedNum)) {
    return parsedNum;
  }

  const idx = scheduleData.jadwal_per_pekan.findIndex(
    (p) => p.pekan.toUpperCase() === upper || p.pekan === trimmed
  );
  if (idx !== -1) {
    const item = scheduleData.jadwal_per_pekan[idx];
    return PEKAN_TO_NUMBER_MAP[item.pekan] ?? (idx + 1);
  }
  return 1;
}

export function getPekanLabel(pekanOrWeek) {
  const p = getPekanNumber(pekanOrWeek);
  if (p === "UTS") return "Pekan UTS";
  if (p === "UAS") return "Pekan UAS";
  return `Pekan ${p}`;
}

const activeInfo = computeActiveWeekInfo();
const activeWeekIndex = activeInfo.detected;
const activeWeekStatus = ref(activeInfo.status);
const viewedWeekIndex = ref(activeWeekIndex);

export function useSchedule() {
  const allWeeks = scheduleData.jadwal_per_pekan;
  const currentWeek = computed(() => allWeeks[viewedWeekIndex.value]);

  const activeWeekNumber = computed(() =>
    getPekanNumber(allWeeks[activeWeekIndex])
  );
  const currentWeekNumber = computed(() =>
    getPekanNumber(allWeeks[viewedWeekIndex.value])
  );

  const isCurrentWeek = computed(
    () => viewedWeekIndex.value === activeWeekIndex
  );
  const isPastWeek = computed(() => viewedWeekIndex.value < activeWeekIndex);
  const isFutureWeek = computed(() => viewedWeekIndex.value > activeWeekIndex);

  function setWeek(idx) {
    if (idx >= 0 && idx < allWeeks.length) {
      viewedWeekIndex.value = idx;
    }
  }

  function prevWeek() {
    if (viewedWeekIndex.value > 0) {
      viewedWeekIndex.value--;
    }
  }

  function nextWeek() {
    if (viewedWeekIndex.value < allWeeks.length - 1) {
      viewedWeekIndex.value++;
    }
  }

  function resetToCurrentWeek() {
    viewedWeekIndex.value = activeWeekIndex;
  }

  // Partition Daring into Kelompok 1, Kelompok 2, and others (exams)
  function partitionDaring(pekan, weekIdx) {
    if (!pekan?.daring) return { k1: [], k2: [], other: [], k1Label: "", k2Label: "" };

    const k1 = [];
    const k2 = [];
    const other = [];

    pekan.daring.forEach((item) => {
      const master = getMaster(item.mata_kuliah);
      if (master?.kelompok === 1) {
        k1.push({ item, master });
      } else if (master?.kelompok === 2) {
        k2.push({ item, master });
      } else {
        other.push({ item, master });
      }
    });

    const isK1Tambahan =
      weekIdx < 7 && k1.every(({ master }) => master?.sks === 3);
    const k1Label = isK1Tambahan ? "Tambahan Online 3 SKS" : "Jadwal Daring Reguler";

    const isK2Tambahan =
      weekIdx > 7 && k2.every(({ master }) => master?.sks === 3);
    let k2Label = "Jadwal Daring Reguler";
    if (isK2Tambahan) {
      k2Label = "Tambahan Online 3 SKS";
    } else if (weekIdx < 7) {
      k2Label = "Daring Reguler";
    }

    return { k1, k2, other, k1Label, k2Label };
  }

  // Partition Luring into Kelompok 1, Kelompok 2, and others
  function partitionLuring(pekan) {
    if (!pekan?.luring) return { k1: [], k2: [], other: [] };

    const k1 = [];
    const k2 = [];
    const other = [];

    pekan.luring.forEach((item) => {
      const master = getMaster(item.mata_kuliah);
      if (master?.kelompok === 1) {
        k1.push({ item, master });
      } else if (master?.kelompok === 2) {
        k2.push({ item, master });
      } else {
        other.push({ item, master });
      }
    });

    return { k1, k2, other };
  }

  return {
    akademik: scheduleData.akademik,
    masterList: scheduleData.master_mata_kuliah,
    allWeeks,
    activeWeekIndex,
    activeWeekStatus,
    viewedWeekIndex,
    currentWeek,
    activeWeekNumber,
    currentWeekNumber,
    isCurrentWeek,
    isPastWeek,
    isFutureWeek,
    getMaster,
    getLmsUrl,
    getPresensiUrl,
    setWeek,
    prevWeek,
    nextWeek,
    getPekanNumber,
    getPekanLabel,
    resetToCurrentWeek,
    partitionDaring,
    partitionLuring,
  };
}
