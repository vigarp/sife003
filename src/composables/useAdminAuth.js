import { ref, computed } from "vue";

const TOKEN_KEY = "03sife003_admin_token";
const USER_KEY = "03sife003_admin_user";

function loadSavedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const token = ref(localStorage.getItem(TOKEN_KEY) || null);
const user = ref(loadSavedUser());
const loading = ref(false);
const error = ref(null);

export function useAdminAuth() {
  const isAuthenticated = computed(() => !!token.value);

  function setUser(newUser) {
    user.value = newUser;
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  function setToken(newToken) {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
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
      setUser(data.data.user);
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
      setUser(null);
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
        setUser(data.data);
        return true;
      }
      setToken(null);
      return false;
    } catch {
      return Boolean(user.value);
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
