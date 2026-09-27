import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useLastVisited } from "@/composables/useLastVisited";

describe("useLastVisited composable", () => {
  let lastVisited;

  beforeEach(() => {
    lastVisited = useLastVisited();
    lastVisited.clearVisited();
    lastVisited.initGlobalListeners();
  });

  afterEach(() => {
    lastVisited.cleanupGlobalListeners();
  });

  it("should set and verify visited button key", () => {
    expect(lastVisited.activeKey.value).toBeNull();
    expect(lastVisited.isVisited("btn-test-1")).toBe(false);

    lastVisited.setVisited("btn-test-1");
    expect(lastVisited.activeKey.value).toBe("btn-test-1");
    expect(lastVisited.isVisited("btn-test-1")).toBe(true);
    expect(lastVisited.isVisited("btn-test-2")).toBe(false);
  });

  it("should switch visited key when a new button is set", () => {
    lastVisited.setVisited("btn-test-1");
    expect(lastVisited.isVisited("btn-test-1")).toBe(true);

    lastVisited.setVisited("btn-test-2");
    expect(lastVisited.isVisited("btn-test-1")).toBe(false);
    expect(lastVisited.isVisited("btn-test-2")).toBe(true);
  });

  it("should clear visited state on clearVisited()", () => {
    lastVisited.setVisited("btn-test-1");
    expect(lastVisited.isVisited("btn-test-1")).toBe(true);

    lastVisited.clearVisited();
    expect(lastVisited.activeKey.value).toBeNull();
    expect(lastVisited.isVisited("btn-test-1")).toBe(false);
  });

  it("should reset visited state when Escape key is pressed", () => {
    lastVisited.setVisited("btn-test-1");
    expect(lastVisited.activeKey.value).toBe("btn-test-1");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(lastVisited.activeKey.value).toBeNull();
  });

  it("should reset visited state when clicking outside action buttons", () => {
    lastVisited.setVisited("btn-test-1");
    expect(lastVisited.activeKey.value).toBe("btn-test-1");

    // Click on arbitrary element outside
    const outsideDiv = document.createElement("div");
    document.body.appendChild(outsideDiv);
    outsideDiv.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(lastVisited.activeKey.value).toBeNull();
    document.body.removeChild(outsideDiv);
  });

  it("should NOT reset visited state when clicking an element with .action-link-btn", () => {
    lastVisited.setVisited("btn-test-1");

    const actionBtn = document.createElement("button");
    actionBtn.className = "action-link-btn";
    document.body.appendChild(actionBtn);

    actionBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(lastVisited.activeKey.value).toBe("btn-test-1");

    document.body.removeChild(actionBtn);
  });
});
