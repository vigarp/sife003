import scheduleData from "@/data/schedule.json";

const masterMap = {};
scheduleData.master_mata_kuliah.forEach((m) => {
  masterMap[m.nama.trim().toLowerCase()] = m;
});

/**
 * Format Mentari online courses for sharing via WhatsApp/clipboard.
 * @param {Object} pekan - A week object from scheduleData.jadwal_per_pekan
 * @param {number} weekIdx - The index of the week (0-indexed)
 * @returns {string}
 */
export function formatMentariShareText(pekan, weekIdx = 0) {
  if (!pekan || !pekan.daring || pekan.daring.length === 0) {
    return "Tidak ada jadwal Mentari online untuk pekan ini.";
  }

  const k1 = [];
  const k2 = [];
  const other = [];

  pekan.daring.forEach((item) => {
    const master = masterMap[item.mata_kuliah.trim().toLowerCase()];
    if (master?.kelompok === 1) k1.push({ item, master });
    else if (master?.kelompok === 2) k2.push({ item, master });
    else other.push({ item, master });
  });

  const isK1Tambahan = k1.length > 0 && weekIdx < 7 && k1.every(({ master }) => master?.sks === 3);
  const isK2Tambahan = k2.length > 0 && weekIdx > 7 && k2.every(({ master }) => master?.sks === 3);

  const lines = [];
  lines.push(`🌞 MENTARI (${pekan.tanggal_daring})`);

  if (k1.length > 0) {
    const k1Title = isK1Tambahan ? "• Kelompok 1 (Tambahan Online 3 SKS):" : "• Kelompok 1:";
    lines.push(k1Title);
    k1.forEach(({ item, master }) => {
      const p = item.pertemuan && item.pertemuan.length > 0 ? item.pertemuan.join(" & ") : "";
      const sksStr = isK2Tambahan ? ` (${master?.sks || 2} SKS)` : "";
      lines.push(`  - ${item.mata_kuliah}${sksStr} — Pertemuan ${p}`);
    });
  }

  if (k2.length > 0) {
    const k2Title = isK2Tambahan ? "• Kelompok 2 (Tambahan Online 3 SKS):" : "• Kelompok 2:";
    lines.push(k2Title);
    k2.forEach(({ item, master }) => {
      const p = item.pertemuan && item.pertemuan.length > 0 ? item.pertemuan.join(" & ") : "";
      const sksStr = isK1Tambahan ? ` (${master?.sks || 2} SKS)` : "";
      lines.push(`  - ${item.mata_kuliah}${sksStr} — Pertemuan ${p}`);
    });
  }

  if (other.length > 0) {
    lines.push("• Ujian / Agenda Lain:");
    other.forEach(({ item }) => {
      const p = item.pertemuan && item.pertemuan.length > 0 ? `Pertemuan ${item.pertemuan.join(" & ")}` : "Ujian Mentari";
      lines.push(`  - ${item.mata_kuliah} — ${p}`);
    });
  }

  lines.push("Cek jadwal, tugas dan kalender 👉 https://sife003.vercel.app");
  return lines.join("\n");
}

/**
 * Format agenda assignments for sharing via clipboard.
 * @param {Array} agendasList
 * @returns {string}
 */
export function formatAgendaShareText(agendasList) {
  if (!agendasList || agendasList.length === 0) {
    return "Tidak ada agenda tugas untuk pekan ini.";
  }

  const items = agendasList
    .map((item) => {
      const matkul = item.mata_kuliah ? item.mata_kuliah.trim() : "";
      const parts = [`*${matkul}*`, item.judul];
      if (item.keterangan && item.keterangan.trim()) {
        parts.push(item.keterangan.trim());
      }
      return parts.join("\n");
    })
    .join("\n\n");

  return `Tugas-Tugas:\n${items}`;
}

/**
 * Copy text to clipboard with fallback.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (typeof window === "undefined" || !text) return false;

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
}
