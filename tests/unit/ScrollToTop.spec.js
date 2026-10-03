import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import ScrollToTop from "@/components/common/ScrollToTop.vue";

describe("ScrollToTop.vue", () => {
  let addEventListenerSpy;
  let removeEventListenerSpy;
  let scrollToSpy;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    scrollToSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should be hidden initially when scrollY is below threshold", () => {
    window.scrollY = 100;
    const wrapper = mount(ScrollToTop, {
      props: { threshold: 300 },
    });

    expect(wrapper.vm.isVisible).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("should become visible when scrollY exceeds threshold", async () => {
    const wrapper = mount(ScrollToTop, {
      props: { threshold: 300 },
    });

    expect(wrapper.vm.isVisible).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);

    window.scrollY = 350;
    window.dispatchEvent(new window.Event("scroll"));
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.isVisible).toBe(true);
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("should call window.scrollTo with smooth behavior when clicked", async () => {
    window.scrollY = 500;
    const wrapper = mount(ScrollToTop, {
      props: { threshold: 300 },
    });

    await wrapper.vm.$nextTick();

    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    await button.trigger("click");

    expect(scrollToSpy).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("should remove scroll event listener on unmount", () => {
    const wrapper = mount(ScrollToTop);
    expect(addEventListenerSpy).toHaveBeenCalledWith("scroll", expect.any(Function), { passive: true });

    wrapper.unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });

  it("should have accessible button attributes when rendered", async () => {
    window.scrollY = 500;
    const wrapper = mount(ScrollToTop);
    await wrapper.vm.$nextTick();

    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    expect(button.attributes("aria-label")).toBe("Kembali ke atas");
    expect(button.attributes("title")).toBe("Kembali ke atas");
    expect(button.attributes("type")).toBe("button");
  });
});
