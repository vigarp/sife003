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
    /(\d+)\s+([a-zA-Z]+)\s*[–\-]\s*(\d+)\s+([a-zA-Z]+)\s+(\d{4})/
  );
  if (matchTwo) {
    const d1 = parseInt(matchTwo[1], 10);
    const m1 = monthMap[matchTwo[2].toLowerCase()];
    const d2 = parseInt(matchTwo[3], 10);
    const m2 = monthMap[matchTwo[4].toLowerCase()];
    const y = parseInt(matchTwo[5], 10);
    return {
      start: new Date(y, m1, d1, 0, 0, 0),
      end: new Date(y, m2, d2 + 1, 23, 59, 59, 999),
    };
  }

  // Format: "21 – 26 September 2026"
  const matchOne = clean.match(
    /(\d+)\s*[–\-]\s*(\d+)\s+([a-zA-Z]+)\s+(\d{4})/
  );
  if (matchOne) {
    const d1 = parseInt(matchOne[1], 10);
    const d2 = parseInt(matchOne[2], 10);
    const m = monthMap[matchOne[3].toLowerCase()];
    const y = parseInt(matchOne[4], 10);
    return {
      start: new Date(y, m, d1, 0, 0, 0),
      end: new Date(y, m, d2 + 1, 23, 59, 59, 999),
    };
  }
  return null;
}

// Compute active week index
function computeActiveWeekIndex() {
  const now = new Date();
  let detected = -1;

  scheduleData.jadwal_per_pekan.forEach((pekan, idx) => {
    const range = parsePekanDateRange(pekan.tanggal_daring);
    if (range && now >= range.start && now <= range.end) {
      detected = idx;
    }
  });

  if (detected === -1) {
    const firstRange = parsePekanDateRange(
      scheduleData.jadwal_per_pekan[0]?.tanggal_daring
    );
    const lastRange = parsePekanDateRange(
      scheduleData.jadwal_per_pekan[scheduleData.jadwal_per_pekan.length - 1]?.tanggal_daring
    );
    if (firstRange && now < firstRange.start) {
      detected = 0;
    } else if (lastRange && now > lastRange.end) {
      detected = scheduleData.jadwal_per_pekan.length - 1;
    } else {
      detected = 3; // Default to Pekan 4 if in semester bounds
    }
  }
  return detected;
}

const activeWeekIndex = computeActiveWeekIndex();
const viewedWeekIndex = ref(activeWeekIndex);

export function useSchedule() {
  const allWeeks = scheduleData.jadwal_per_pekan;
  const currentWeek = computed(() => allWeeks[viewedWeekIndex.value]);

  const isCurrentWeek = computed(
    () => viewedWeekIndex.value === activeWeekIndex
  );
  const isPastWeek = computed(() => viewedWeekIndex.value < activeWeekIndex);
  const isFutureWeek = computed(() => viewedWeekIndex.value > activeWeekIndex);

  function getMaster(matkulName) {
    return masterMap[matkulName?.trim().toLowerCase()] || null;
  }

  function getLmsUrl(item, master) {
    if (!master || !master.kode) {
      return "https://mentari.unpam.ac.id/u-courses";
    }
    const pNum =
      item.pertemuan && item.pertemuan.length > 0 ? item.pertemuan[0] : null;
    const accordParam = pNum ? `?accord_pertemuan=PERTEMUAN_${pNum}` : "";
    return `https://mentari.unpam.ac.id/u-courses/${semesterCode}-${kelasCode}-${master.kode}${accordParam}`;
  }

  function getPresensiUrl(master) {
    if (!master || !master.kode) {
      return "https://my.unpam.ac.id/presensi";
    }
    return `https://my.unpam.ac.id/presensi/pertemuan/${master.kode}/${kelasCode}/${semesterCode}`;
  }

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
    if (!pekan || !pekan.daring) return { k1: [], k2: [], other: [], k1Label: "", k2Label: "" };

    const k1 = [];
    const k2 = [];
    const other = [];

    pekan.daring.forEach((item) => {
      const master = getMaster(item.mata_kuliah);
      if (master && master.kelompok === 1) {
        k1.push({ item, master });
      } else if (master && master.kelompok === 2) {
        k2.push({ item, master });
      } else {
        other.push({ item, master });
      }
    });

    const isK1Tambahan =
      weekIdx < 7 && k1.every(({ master }) => master && master.sks === 3);
    const k1Label = isK1Tambahan ? "Tambahan Online 3 SKS" : "Jadwal Daring Reguler";

    const isK2Tambahan =
      weekIdx > 7 && k2.every(({ master }) => master && master.sks === 3);
    const k2Label = isK2Tambahan
      ? "Tambahan Online 3 SKS"
      : weekIdx < 7
        ? "Daring Reguler"
        : "Jadwal Daring Reguler";

    return { k1, k2, other, k1Label, k2Label };
  }

  // Partition Luring into Kelompok 1, Kelompok 2, and others
  function partitionLuring(pekan) {
    if (!pekan || !pekan.luring) return { k1: [], k2: [], other: [] };

    const k1 = [];
    const k2 = [];
    const other = [];

    pekan.luring.forEach((item) => {
      const master = getMaster(item.mata_kuliah);
      if (master && master.kelompok === 1) {
        k1.push({ item, master });
      } else if (master && master.kelompok === 2) {
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
    viewedWeekIndex,
    currentWeek,
    isCurrentWeek,
    isPastWeek,
    isFutureWeek,
    getMaster,
    getLmsUrl,
    getPresensiUrl,
    setWeek,
    prevWeek,
    nextWeek,
    resetToCurrentWeek,
    partitionDaring,
    partitionLuring,
  };
}
