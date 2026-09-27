import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import WeekNavigator from "@/components/schedule/WeekNavigator.vue";
import { useSchedule } from "@/composables/useSchedule";

describe("WeekNavigator.vue", () => {
  it("should render dropdown with options for all 16 weeks", () => {
    const wrapper = mount(WeekNavigator);
    const options = wrapper.findAll("select option");
    expect(options.length).toBe(16);
  });

  it("should disable previous button on week 0", async () => {
    const schedule = useSchedule();
    schedule.setWeek(0);

    const wrapper = mount(WeekNavigator);
    const prevBtn = wrapper.find('button[aria-label="Pekan Sebelumnya"]');
    expect(prevBtn.attributes("disabled")).toBeDefined();
  });

  it("should disable next button on the last week", async () => {
    const schedule = useSchedule();
    schedule.setWeek(schedule.allWeeks.length - 1);

    const wrapper = mount(WeekNavigator);
    const nextBtn = wrapper.find('button[aria-label="Pekan Selanjutnya"]');
    expect(nextBtn.attributes("disabled")).toBeDefined();
  });

  it("should change week when user selects an option", async () => {
    const schedule = useSchedule();
    const wrapper = mount(WeekNavigator);

    const select = wrapper.find("select");
    await select.setValue("4");

    expect(schedule.viewedWeekIndex.value).toBe(4);
  });
});
