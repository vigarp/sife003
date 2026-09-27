import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatAgendaDeadline, useAgenda } from "@/composables/useAgenda";

describe("useAgenda composable", () => {
  describe("formatAgendaDeadline", () => {
    it("should format week_only deadline as 'Pekan X'", () => {
      const item = {
        pekan: 5,
        tipe_deadline: "week_only",
      };
      expect(formatAgendaDeadline(item)).toBe("Pekan 5");
    });

    it("should format date_only deadline with full Indonesian date", () => {
      const item = {
        pekan: 5,
        tipe_deadline: "date_only",
        tanggal: "2026-10-02",
      };
      expect(formatAgendaDeadline(item)).toBe("Jumat, 2 Oktober 2026");
    });

    it("should format datetime deadline with short month and WIB time", () => {
      const item = {
        pekan: 5,
        tipe_deadline: "datetime",
        tanggal: "2026-10-02",
        jam: "23:59",
      };
      expect(formatAgendaDeadline(item)).toBe("Jumat, 2 Okt • 23:59 WIB");
    });

    it("should fallback to 'Pekan X' if tanggal is missing", () => {
      const item = {
        pekan: 6,
        tipe_deadline: "datetime",
        tanggal: null,
      };
      expect(formatAgendaDeadline(item)).toBe("Pekan 6");
    });
  });

  describe("API methods", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      localStorage.clear();
    });

    it("should fetch agendas successfully", async () => {
      const mockAgendas = [
        { id: 1, pekan: 5, judul: "Tugas 1", mata_kuliah: "Rekayasa Web" },
      ];
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockAgendas }),
      });

      const { agendas, fetchAgendas, loading } = useAgenda();
      const res = await fetchAgendas(5);

      expect(global.fetch).toHaveBeenCalledWith("/api/agenda?pekan=5");
      expect(res).toEqual(mockAgendas);
      expect(agendas.value).toEqual(mockAgendas);
      expect(loading.value).toBe(false);
    });

    it("should handle fetch error gracefully", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const { agendas, fetchAgendas, error, loading } = useAgenda();
      const res = await fetchAgendas(5);

      expect(res).toEqual([]);
      expect(agendas.value).toEqual([]);
      expect(error.value).toBe("Network error");
      expect(loading.value).toBe(false);
    });
  });
});
