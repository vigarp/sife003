import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import TelemetriTokenModal from "@/components/telemetri/TelemetriTokenModal.vue";
import { useTelemetri } from "@/composables/useTelemetri";

describe("TelemetriTokenModal.vue", () => {
  beforeEach(() => {
    localStorage.clear();
    const telemetri = useTelemetri();
    telemetri.clearToken();
    vi.restoreAllMocks();
  });

  it("should render dialog when isOpen is true and show 1-click console script", () => {
    const wrapper = mount(TelemetriTokenModal, {
      props: { isOpen: true },
    });

    expect(wrapper.find("dialog").exists()).toBe(true);
    expect(wrapper.text()).toContain("Hubungkan Sesi Mentari");
    expect(wrapper.text()).toContain("copy(localStorage.getItem('access'))");
    expect(wrapper.text()).toContain("Salin Perintah");
  });

  it("should detect and show session profile preview when access JSON is pasted", async () => {
    const wrapper = mount(TelemetriTokenModal, {
      props: { isOpen: true },
    });

    const mockPayload = btoa(
      JSON.stringify({
        username: "251011700088",
        fullname: "VIGAR RIVAI PUTRA",
        role: "MAHASISWA",
      })
    );
    const mockJwt = `header.${mockPayload}.signature`;
    const accessJson = JSON.stringify([{ role: "MAHASISWA", token: mockJwt }]);

    const textarea = wrapper.find("textarea#mentari-session");
    await textarea.setValue(accessJson);

    // Live preview card should appear
    expect(wrapper.text()).toContain("Profil Sesi Terdeteksi");
    expect(wrapper.text()).toContain("VIGAR RIVAI PUTRA");
    expect(wrapper.text()).toContain("251011700088");
    expect(wrapper.text()).toContain("MAHASISWA");
  });

  it("should save session and auto-fill student NIM and name on submit", async () => {
    const wrapper = mount(TelemetriTokenModal, {
      props: { isOpen: true },
    });

    const mockPayload = btoa(
      JSON.stringify({
        username: "251011700088",
        fullname: "VIGAR RIVAI PUTRA",
        role: "MAHASISWA",
      })
    );
    const mockJwt = `header.${mockPayload}.signature`;
    const accessJson = JSON.stringify([{ role: "MAHASISWA", token: mockJwt }]);

    const textarea = wrapper.find("textarea#mentari-session");
    await textarea.setValue(accessJson);

    await wrapper.find("form").trigger("submit.prevent");

    const telemetri = useTelemetri();
    expect(telemetri.token.value).toBe(mockJwt);
    expect(telemetri.userNim.value).toBe("251011700088");
    expect(telemetri.userName.value).toBe("VIGAR RIVAI PUTRA");
    expect(telemetri.hasToken.value).toBe(true);
  });
});

