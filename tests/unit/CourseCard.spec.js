import { describe, it, expect, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import CourseCard from "@/components/schedule/CourseCard.vue";
import { useLastVisited } from "@/composables/useLastVisited";
import { useSchedule } from "@/composables/useSchedule";

describe("CourseCard.vue", () => {
  const sampleItem = {
    mata_kuliah: "ALJABAR LINEAR & MATRIKS",
    pertemuan: [1, 2],
  };

  const sampleMaster = {
    kode: "SIF0301",
    nama: "ALJABAR LINEAR & MATRIKS",
    sks: 3,
    dosen: "CHRISTIEN ROZALI S.Si., M.Kom.",
    jam: "07:30 - 10:00",
    kelompok: 1,
  };

  beforeEach(() => {
    const { clearVisited } = useLastVisited();
    clearVisited();
  });

  it("should render course title, lecturer, and SKS", () => {
    const wrapper = mount(CourseCard, {
      props: {
        item: sampleItem,
        master: sampleMaster,
        isLuring: false,
        weekIndex: 0,
      },
    });

    expect(wrapper.text()).toContain("ALJABAR LINEAR & MATRIKS");
    expect(wrapper.text()).toContain("CHRISTIEN ROZALI S.Si., M.Kom.");
    expect(wrapper.text()).toContain("3 SKS");
    expect(wrapper.text()).toContain("Pertemuan 1 & 2");
  });

  it("should render Mentari button for daring course with valid link", () => {
    const wrapper = mount(CourseCard, {
      props: {
        item: sampleItem,
        master: sampleMaster,
        isLuring: false,
        weekIndex: 0,
      },
    });

    const mentariBtn = wrapper.find(".btn-mentari");
    expect(mentariBtn.exists()).toBe(true);
    expect(mentariBtn.attributes("href")).toContain("mentari.unpam.ac.id");
    expect(mentariBtn.attributes("href")).toContain("SIF0301");
  });

  it("should NOT render Mentari button for luring course", () => {
    const wrapper = mount(CourseCard, {
      props: {
        item: sampleItem,
        master: sampleMaster,
        isLuring: true,
        weekIndex: 0,
      },
    });

    const mentariBtn = wrapper.find(".btn-mentari");
    expect(mentariBtn.exists()).toBe(false);
  });

  it("should render Cek Presensi button with valid link", () => {
    const wrapper = mount(CourseCard, {
      props: {
        item: sampleItem,
        master: sampleMaster,
        isLuring: false,
        weekIndex: 0,
      },
    });

    const presensiBtn = wrapper.find(".btn-presensi");
    expect(presensiBtn.exists()).toBe(true);
    expect(presensiBtn.attributes("href")).toContain("my.unpam.ac.id/presensi");
  });

  it("should apply last-visited ring when button is clicked", async () => {
    const wrapper = mount(CourseCard, {
      props: {
        item: sampleItem,
        master: sampleMaster,
        isLuring: false,
        weekIndex: 0,
      },
    });

    const mentariBtn = wrapper.find(".btn-mentari");
    expect(mentariBtn.classes()).not.toContain("btn-last-visited");
    expect(wrapper.classes()).not.toContain("card-last-visited");

    await mentariBtn.trigger("click");

    expect(mentariBtn.classes()).toContain("btn-last-visited");
    expect(wrapper.classes()).toContain("card-last-visited");
  });

  it("should render time badge for luring course", () => {
    const wrapper = mount(CourseCard, {
      props: {
        item: { ...sampleItem, jam: "07.40 - 09.20" },
        master: sampleMaster,
        isLuring: true,
        weekIndex: 0,
      },
    });

    expect(wrapper.text()).toContain("07.40 - 09.20");
    const badge = wrapper.find("span.shrink-0");
    expect(badge.exists()).toBe(true);
  });

  it("should expose isOngoingSession in component instance", () => {
    const { activeWeekIndex } = useSchedule();
    const wrapper = mount(CourseCard, {
      props: {
        item: { ...sampleItem, jam: "07.40 - 09.20" },
        master: sampleMaster,
        isLuring: true,
        weekIndex: activeWeekIndex,
      },
    });

    expect(wrapper.vm.isOngoingSession !== undefined).toBe(true);
  });
});
