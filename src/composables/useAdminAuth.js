import { ref, computed } from "vue";

const TOKEN_KEY = "03sife003_admin_token";
const token = ref(localStorage.getItem(TOKEN_KEY) || null);
const user = ref(null);
const loading = ref(false);
const error = ref(null);

export function useAdminAuth() {
  const isAuthenticated = computed(() => !!token.value);

  function setToken(newToken) {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      user.value = null;
    }
  }

  async function login(username, password) {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal melakukan login.");
      }
      setToken(data.data.token);
      user.value = data.data.user;
      return { success: true };
    } catch (err) {
      error.value = err.message;
      return { success: false, message: err.message };
    } finally {
      loading.value = false;
    }
  }

  async function checkAuth() {
    if (!token.value) {
      user.value = null;
      return false;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        user.value = data.data;
        return true;
      }
      setToken(null);
      return false;
    } catch {
      return false;
    }
  }

  function logout() {
    setToken(null);
  }

  async function changePassword(oldPassword, newPassword) {
    if (!token.value) throw new Error("Belum login");
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal mengganti password.");
    }
    return data;
  }

  const isAdmin = computed(() => {
    if (!user.value) return false;
    return Boolean(user.value.isAdmin || user.value.role === "pengurus" || user.value.role === "admin");
  });

  const isStudent = computed(() => {
    if (!user.value) return false;
    return !isAdmin.value;
  });

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isStudent,
    loading,
    error,
    login,
    logout,
    checkAuth,
    changePassword,
  };
}
