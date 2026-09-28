import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import TurnstileWidget from "@/components/common/TurnstileWidget.vue";

describe("TurnstileWidget.vue", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.turnstile;
    document.getElementById("cf-turnstile-script")?.remove();
  });

  it("should mount properly with turnstile container", () => {
    const wrapper = mount(TurnstileWidget, {
      props: {
        siteKey: "1x00000000000000000000AA",
      },
    });

    expect(wrapper.find(".turnstile-wrapper").exists()).toBe(true);
  });

  it("should render widget when window.turnstile is available", () => {
    const mockRender = vi.fn().mockReturnValue("widget-123");
    window.turnstile = {
      render: mockRender,
      reset: vi.fn(),
      remove: vi.fn(),
    };

    mount(TurnstileWidget, {
      props: {
        siteKey: "1x00000000000000000000AA",
        theme: "dark",
      },
    });

    expect(mockRender).toHaveBeenCalled();
  });

  it("should invoke reset on exposed method", () => {
    const mockReset = vi.fn();
    window.turnstile = {
      render: vi.fn().mockReturnValue("widget-123"),
      reset: mockReset,
      remove: vi.fn(),
    };

    const wrapper = mount(TurnstileWidget, {
      props: {
        siteKey: "1x00000000000000000000AA",
      },
    });

    wrapper.vm.reset();
    expect(mockReset).toHaveBeenCalledWith("widget-123");
  });
});
