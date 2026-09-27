import { createRouter, createWebHistory } from "vue-router";
import HomeView from "@/views/HomeView.vue";
import AdminLoginView from "@/views/admin/AdminLoginView.vue";
import AdminDashboardView from "@/views/admin/AdminDashboardView.vue";

const routes = [
  {
    path: "/",
    name: "home",
    component: HomeView,
    meta: { title: "03SIFE003 - Portal Akademik & Jadwal Kuliah" },
  },
  {
    path: "/pengurus/login",
    name: "admin-login",
    component: AdminLoginView,
    meta: { title: "Login Pengurus - 03SIFE003" },
  },
  {
    path: "/pengurus",
    name: "admin-dashboard",
    component: AdminDashboardView,
    meta: {
      requiresAuth: true,
      title: "Zona Pengurus - 03SIFE003",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return { el: to.hash, behavior: "smooth" };
    }
    return { top: 0 };
  },
});

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = to.meta.title;
  }

  const token = localStorage.getItem("03sife003_admin_token");

  if (to.meta.requiresAuth && !token) {
    next({ name: "admin-login" });
  } else if (to.name === "admin-login" && token) {
    next({ name: "admin-dashboard" });
  } else {
    next();
  }
});

export default router;
