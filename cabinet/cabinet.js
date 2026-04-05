const SITE_ADMIN_BACKEND_CACHE_KEY = "klubnikaproject.site.backend.settings.v1";
const CATALOG_CART_STORAGE_KEY = "klubnika.catalog.cart.v1";
const MEMBER_SAVED_STORAGE_KEY = "klubnikaproject.cabinet.saved.v1";
const ADMIN_SESSION_STORAGE_KEY = "klubnikaproject.admin.session.v1";
const MEMBER_SESSION_STORAGE_KEY = "klubnikaproject.member.session.v1";
const DEFAULT_SETTINGS = {
  site: {
    projectName: "Klubnika Project",
    supportPhone: "+7 925 583-16-69",
    supportEmail: "info@klubnikaproject.ru",
    supportTelegram: "@patiev_admin",
    supportTelegramUrl: "https://t.me/patiev_admin",
  },
  integrations: {
    apiBase: "https://api.klubnikaproject.ru/site/v1",
  },
  crm: {
    enabled: false,
  },
};

const basePath = detectBasePath();
const cabinetRoutes = {
  shell: routePath("cabinet/"),
  login: routePath("cabinet/login/"),
  site: routePath(""),
  catalog: routePath("catalog/"),
  calc: routePath("calc/"),
  consultations: routePath("consultations/"),
  memberHub: routePath("account/"),
  memberCatalog: routePath("account/catalog/"),
  memberSpecial: routePath("account/special/"),
  admin: routePath("admin/"),
  calcAdmin: routePath("calc/admin/"),
  calcPricing: routePath("calc/pricing.json"),
};

const PRODUCT_BADGE_PRESETS = [
  { id: "recommended", label: "Recommended" },
  { id: "hit", label: "Hit" },
  { id: "new", label: "New" },
  { id: "sale", label: "Sale" },
  { id: "limited", label: "Limited" },
  { id: "project", label: "Project" },
];

const PRODUCT_COMPATIBILITY_PRESETS = [
  { id: "works_with", label: "Совместимо" },
  { id: "requires_check", label: "Нужна сверка" },
  { id: "requires_adapter", label: "Нужен адаптер" },
  { id: "not_recommended", label: "Не рекомендовано" },
];

const rubFormatter = new Intl.NumberFormat("ru-RU");

let settings = clone(DEFAULT_SETTINGS);
let currentSession = null;

document.addEventListener("DOMContentLoaded", async () => {
  settings = loadCachedSettings();
  await refreshSettings();

  const view = document.body.dataset.cabinetView || "shell";
  if (view === "login") {
    const session = await fetchActiveSession();
    if (session?.ok) {
      currentSession = session;
      redirectAuthenticatedSession(session);
      return;
    }
    bindLogin();
    return;
  }

  const session = await fetchActiveSession();
  if (!session?.ok) {
    redirectToLogin();
    return;
  }

  currentSession = session;
  renderUserChips(session);
  await renderCabinet(session);
  bindLogout();
});

function detectBasePath() {
  return window.location.pathname.startsWith("/klubnikaproject-next/") ? "/klubnikaproject-next/" : "/";
}

function routePath(relativePath = "") {
  return `${basePath}${String(relativePath).replace(/^\//, "")}`;
}

function resolvePublicPath(path = "") {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("data:")) return raw;
  return routePath(raw);
}

function cabinetSectionHref(sectionId, params = {}) {
  const search = new URLSearchParams({ section: sectionId });
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  return `${cabinetRoutes.shell}?${search.toString()}`;
}

function apiBase() {
  return detectRuntimeApiBase((settings.integrations?.apiBase || DEFAULT_SETTINGS.integrations.apiBase));
}

function isCrmEnabled() {
  return Boolean(settings.crm?.enabled);
}

function detectRuntimeApiBase(configuredBase) {
  const configured = String(configuredBase || "").trim().replace(/\/+$/, "");
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return "http://127.0.0.1:8010/v1";
  }
  return configured;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function merge(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) return patch;
  const output = { ...base };
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && output[key] && typeof output[key] === "object" && !Array.isArray(output[key])) {
      output[key] = merge(output[key], value);
    } else {
      output[key] = value;
    }
  });
  return output;
}

function loadCachedSettings() {
  try {
    const raw = window.localStorage.getItem(SITE_ADMIN_BACKEND_CACHE_KEY);
    if (!raw) return clone(DEFAULT_SETTINGS);
    return merge(clone(DEFAULT_SETTINGS), JSON.parse(raw));
  } catch {
    return clone(DEFAULT_SETTINGS);
  }
}

async function refreshSettings() {
  try {
    const response = await fetch(`${apiBase()}/public/settings`, { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const payload = await response.json();
    if (!payload?.settings) return;
    settings = merge(clone(DEFAULT_SETTINGS), payload.settings);
    window.localStorage.setItem(SITE_ADMIN_BACKEND_CACHE_KEY, JSON.stringify(payload.settings));
  } catch {
    // keep cached settings
  }
}

async function fetchJson(url, options = {}) {
  try {
    const method = String(options.method || "GET").toUpperCase();
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    const adminToken = readStoredSessionToken("admin");
    const memberToken = readStoredSessionToken("member");
    if (String(url).includes("/admin/") && adminToken && !headers["X-KP-Admin-Session"]) {
      headers["X-KP-Admin-Session"] = adminToken;
    }
    if (!String(url).includes("/admin/") && memberToken && !headers["X-KP-Member-Session"]) {
      headers["X-KP-Member-Session"] = memberToken;
    }
    if (!["GET", "HEAD"].includes(method) && !headers["X-KP-Requested-With"]) {
      headers["X-KP-Requested-With"] = "klubnikaproject";
    }
    const response = await fetch(url, {
      headers,
      credentials: "include",
      ...options,
    });
    if (!response.ok) {
      return { ok: false, status: response.status, text: await response.text() };
    }
    return { ok: true, data: await response.json() };
  } catch (error) {
    return { ok: false, status: 0, text: error.message || "network_error" };
  }
}

function readStoredSessionToken(accountType) {
  try {
    return window.localStorage.getItem(accountType === "admin" ? ADMIN_SESSION_STORAGE_KEY : MEMBER_SESSION_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeSessionToken(accountType, token) {
  try {
    const key = accountType === "admin" ? ADMIN_SESSION_STORAGE_KEY : MEMBER_SESSION_STORAGE_KEY;
    if (token) {
      window.localStorage.setItem(key, token);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage failures
  }
}

function clearSessionTokens() {
  storeSessionToken("admin", "");
  storeSessionToken("member", "");
}

async function fetchActiveSession() {
  const adminSession = await fetchJson(`${apiBase()}/admin/auth/session`);
  if (adminSession.ok) {
    const policy = await fetchJson(`${apiBase()}/admin/auth/access-policy`);
    return {
      ok: true,
      accountType: "admin",
      user: adminSession.data.user,
      policy: policy.ok ? policy.data.policy || {} : {},
    };
  }

  const memberSession = await fetchJson(`${apiBase()}/auth/session`);
  if (memberSession.ok) {
    const policy = await fetchJson(`${apiBase()}/auth/access-policy`);
    return {
      ok: true,
      accountType: "member",
      user: memberSession.data.user,
      policy: policy.ok ? policy.data.policy || {} : {},
    };
  }

  return null;
}

function bindLogin() {
  const form = document.getElementById("cabinet-login-form");
  const status = document.getElementById("cabinet-login-status");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const login = document.getElementById("cabinet-login-identity")?.value.trim() || "";
    const password = document.getElementById("cabinet-login-password")?.value || "";
    if (!login || !password) {
      if (status) status.textContent = "Введите логин и пароль, чтобы открыть кабинет.";
      return;
    }

    if (status) status.textContent = "Проверяем логин и открываем кабинет…";

    const adminLogin = await fetchJson(`${apiBase()}/admin/auth/password-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    if (adminLogin.ok) {
      storeSessionToken("admin", adminLogin.data?.session_token || "");
      storeSessionToken("member", "");
      const session = await fetchActiveSession();
      if (session?.ok) {
        currentSession = session;
        redirectAuthenticatedSession(session);
        return;
      }
    }

    const memberLogin = await fetchJson(`${apiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    if (memberLogin.ok) {
      storeSessionToken("member", memberLogin.data?.session_token || "");
      storeSessionToken("admin", "");
      const session = await fetchActiveSession();
      if (session?.ok) {
        currentSession = session;
        redirectAuthenticatedSession(session);
        return;
      }
    }

    if (status) status.textContent = "Не вошли. Проверьте логин и пароль.";
  });
}

function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search || ""}`;
  window.location.href = `${cabinetRoutes.login}?next=${encodeURIComponent(next)}`;
}

function redirectAuthenticatedSession(session) {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (isAllowedCabinetNext(next)) {
    window.location.href = next;
    return;
  }
  window.location.href = cabinetSectionHref(preferredSectionId(session));
}

function isAllowedCabinetNext(next) {
  if (!next || !next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  return true;
}

function renderUserChips(session) {
  const shellModel = buildCabinetShellModel(session);
  const role = String(session.policy?.role || session.user.user_role || session.user.role || session.accountType || "member").toLowerCase();
  const accessLabels = collectCabinetAccessLabels(session);
  const displayName = session.user.user_name || session.user.display_name || "Пользователь";
  const company = String(session.user.company || "").trim();
  const pillLabels = session.accountType === "admin"
    ? [
        { tone: "role", label: shellModel.roleLabel },
        { tone: "scope", label: `${shellModel.scopeCount} ${pluralizeRu(shellModel.scopeCount, "раздел", "раздела", "разделов")}` },
      ]
    : [
        { tone: "role", label: shellModel.roleLabel },
        { tone: "scope", label: `${shellModel.scopeCount} ${pluralizeRu(shellModel.scopeCount, "раздел", "раздела", "разделов")}` },
      ];

  document.body.dataset.cabinetRole = role;
  document.body.dataset.cabinetFamily = session.accountType === "admin" ? "admin" : "user";

  document.querySelectorAll("[data-cabinet-user]").forEach((target) => {
    target.innerHTML = `
      <div class="cabinet-access-card${session.accountType === "admin" ? " cabinet-access-card--admin" : ""}">
        <div class="cabinet-access-title">${session.accountType === "admin" ? "Рабочая зона" : "Ваш доступ"}</div>
        <div class="cabinet-user-main">
          <strong class="cabinet-user-name">${escapeHtml(displayName)}</strong>
          <span class="cabinet-user-note">${escapeHtml(session.accountType === "admin" ? (company || shellModel.identityNote) : buildMemberAccessPurpose(session))}</span>
        </div>
        <div class="cabinet-pill-row">
          ${pillLabels.map((item) => `<span class="cabinet-pill is-${escapeAttribute(item.tone)}">${escapeHtml(item.label)}</span>`).join("")}
        </div>
      </div>
    `;
  });

  document.querySelectorAll("[data-cabinet-greeting]").forEach((target) => {
    target.textContent = `Добрый день, ${displayName}`;
  });

  document.querySelectorAll("[data-cabinet-nav-label]").forEach((target) => {
    target.textContent = shellModel.navLabel;
  });

  document.querySelectorAll("[data-cabinet-rail-role]").forEach((target) => {
    target.textContent = shellModel.roleLabel;
  });

  applyCabinetShellModel(shellModel);
}

function humanizeCabinetRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  const labels = {
    admin: "Админ",
    owner: "Владелец",
    manager: "Менеджер",
    operator: "Оператор",
    buyer: "Покупатель",
    student: "Участник курса",
    member: "Покупатель",
  };
  return labels[normalized] || String(role || "Пользователь");
}

function humanizeCabinetScope(scope) {
  const normalized = String(scope || "").trim().toLowerCase();
  const labels = {
    crm: "CRM",
    catalog: "Каталог",
    special_pages: "Материалы",
    course_access: "Клубничный Хак",
    orders: "Заказы",
    documents: "Документы",
    calc_prices: "Цены калькулятора",
    site_settings: "Настройки сайта",
    catalog_settings: "Настройки каталога",
    users_manage: "Пользователи",
    integrations: "Интеграции",
    audit: "Аудит",
  };
  return labels[normalized] || String(scope || "").replace(/_/g, " ");
}

function humanizeCatalogKind(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["catalog", "product"].includes(normalized)) return "Каталог";
  if (["special", "special_page"].includes(normalized)) return "Полезный материал";
  if (["route", "page"].includes(normalized)) return "Полезная страница";
  if (["document", "file"].includes(normalized)) return "Документ";
  return value || "Раздел";
}

function buildMemberAccessPurpose(session) {
  const sections = getAllowedSections(session).map((item) => item.id);
  if (sections.includes("orders") || sections.includes("documents")) return "Заказы, документы и связь.";
  if (sections.includes("catalog") && sections.includes("requests")) return "Подбор, расчёт и следующий шаг.";
  if (sections.includes("catalog")) return "Подбор и связь с командой.";
  return "Главные шаги по вашему проекту.";
}

function humanizeCatalogPublicationStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "published") return "Опубликовано";
  if (normalized === "draft") return "Черновик";
  if (normalized === "hidden") return "Скрыто";
  if (normalized === "archived") return "Архив";
  return value || "Статус не указан";
}

function humanizeCatalogStockStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "in_stock") return "В наличии";
  if (normalized === "limited") return "Осталось мало";
  if (normalized === "preorder") return "Под заказ";
  if (normalized === "out_of_stock") return "Нет в наличии";
  return value || "Не указано";
}

function humanizeCatalogCtaMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "buy") return "Готово к покупке";
  if (normalized === "choose") return "Нужно уточнить";
  if (normalized === "consult") return "Полезно рядом";
  return value || "Режим не указан";
}

function pluralizeZones(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "зона";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "зоны";
  return "зон";
}

function buildCabinetHeadMeta(session, roleLabel, scopeCount) {
  if (session.accountType === "admin") {
    return `${roleLabel} · ${scopeCount} ${pluralizeZones(scopeCount)} команды`;
  }
  return `${roleLabel} · ${scopeCount} ${pluralizeRu(scopeCount, "раздел", "раздела", "разделов")} доступны`;
}

function buildCabinetRailMeta(session, scopeCount) {
  if (session.accountType === "admin") {
    return scopeCount
      ? `Показываем только рабочие зоны команды, открытые этой сессии.`
      : `Открыт базовый режим без дополнительных разделов.`;
  }
  return scopeCount
    ? `Здесь только разделы, которые нужны для подбора, заказа, документов и связи.`
    : `Базовый кабинет уже открыт. Новые разделы появятся по мере движения по проекту.`;
}

function collectCabinetAccessLabels(session) {
  const labels = [];
  if (session.accountType === "admin") {
    getAllowedSections(session).forEach((section) => {
      if (section?.label) labels.push(section.label);
    });
  } else {
    const routeAccess = session.policy?.route_access || {};
    const scopes = session.policy?.scopes || session.user?.scopes || [];
    if (routeAccess.catalog) labels.push("Подбор");
    if (routeAccess.special) labels.push("Материалы");
    scopes.forEach((scope) => {
      const label = humanizeCabinetScope(scope);
      if (label) labels.push(label);
    });
  }
  return Array.from(new Set(labels.filter(Boolean)));
}

function buildCabinetShellModel(session, activeSection = null) {
  const role = session.policy?.role || session.user.user_role || session.user.role || session.accountType || "member";
  const roleLabel = humanizeCabinetRole(role);
  const accessLabels = collectCabinetAccessLabels(session);
  const scopeCount = accessLabels.length;
  const section = activeSection || getAllowedSections(session)[0] || { id: "", label: "Главная", note: "Раздел ещё собирается." };

  if (session.accountType === "admin") {
    const breadcrumb = `Админка / ${section.label || "Сводка"}`;
    const topbarPrimary = buildAdminTopbarPrimaryAction(session, section.id);
    const contextActions = normalizeAdminContextActions(
      buildAdminContextActions(session, section.id),
      [topbarPrimary.href, cabinetRoutes.site],
    );

    return {
      roleLabel,
      scopeCount,
      navLabel: "Навигация",
      modeLabel: "Режим",
      title: section.label || "Сводка",
      breadcrumb,
      meta: buildCabinetHeadMeta(session, roleLabel, scopeCount),
      note: "Собранный admin-shell без публичной навигации и лишних дублей.",
      sectionLabel: section.label || "Раздел",
      sectionNote: section.note || "Раздел уже собран под текущий доступ.",
      focus: "Приоритет действий",
      focusNote: "Быстрые переходы и ближайшие действия по текущему разделу.",
      primaryActionLabel: "",
      primaryActionHref: "",
      secondaryActionLabel: contextActions[0]?.label || "",
      secondaryActionHref: contextActions[0]?.href || "",
      tertiaryActionLabel: contextActions[1]?.label || "",
      tertiaryActionHref: contextActions[1]?.href || "",
      topbarPrimaryActionLabel: topbarPrimary.label,
      topbarPrimaryActionHref: topbarPrimary.href,
      topbarSiteActionLabel: "Открыть сайт",
      topbarSiteActionHref: cabinetRoutes.site,
      identityNote: "Компактный контур для CRM, каталога, публикации и командного доступа.",
    };
  }

  const primarySection = sessionHasSection(session, "messages")
    ? { label: "Написать по проекту", href: cabinetSectionHref("messages") }
    : sessionHasSection(session, "requests")
      ? { label: "Открыть расчёт", href: cabinetSectionHref("requests") }
      : { label: "Разобрать задачу", href: cabinetRoutes.consultations };
  const secondarySection = section.id !== "catalog" && sessionHasSection(session, "catalog")
    ? { label: "Открыть подбор", href: cabinetSectionHref("catalog") }
    : sessionHasSection(session, "profile")
      ? { label: "Профиль и доставка", href: cabinetSectionHref("profile") }
      : { label: "Открыть каталог", href: cabinetRoutes.catalog };

  return {
    roleLabel,
    scopeCount,
    navLabel: "Разделы кабинета",
    modeLabel: "Доступ",
    title: section.label || "Главная",
    breadcrumb: `Кабинет / ${section.label || "Главная"}`,
    meta: buildCabinetHeadMeta(session, roleLabel, scopeCount),
    note: "Кабинет собран вокруг подбора, заказа, документов и связи с командой.",
    sectionLabel: section.label || "Главная",
    sectionNote: section.note || "Открываем раздел, который нужен прямо сейчас.",
    focus: section.id === "course" ? "Продолжить обучение" : "Следующий шаг",
    focusNote: section.id === "course"
      ? "Здесь только курс и связанные материалы."
      : "Кабинет должен быстро подсказывать, куда идти дальше.",
    primaryActionLabel: primarySection.label,
    primaryActionHref: primarySection.href,
    secondaryActionLabel: secondarySection.label,
    secondaryActionHref: secondarySection.href,
    tertiaryActionLabel: "",
    tertiaryActionHref: "",
    topbarPrimaryActionLabel: primarySection.label,
    topbarPrimaryActionHref: primarySection.href,
    topbarSiteActionLabel: "",
    topbarSiteActionHref: "",
    identityNote: "Спокойный кабинет для подбора, заказа, документов и поддержки.",
  };
}

function buildAdminContextActions(session, sectionId = "") {
  const actions = [];
  const pushIfAvailable = (label, targetSection) => {
    if (!targetSection || !sessionHasSection(session, targetSection) || actions.some((item) => item.href === cabinetSectionHref(targetSection))) return;
    actions.push({ label, href: cabinetSectionHref(targetSection) });
  };

  if (sectionId === "dashboard") {
    pushIfAvailable("Каталог", "catalog");
    pushIfAvailable("Цены калькулятора", "calc-prices");
  } else if (sectionId === "crm") {
    pushIfAvailable("Сводка", "dashboard");
    pushIfAvailable("Пользователи", "users");
  } else if (sectionId === "catalog") {
    pushIfAvailable("Цены калькулятора", "calc-prices");
    pushIfAvailable("Сайт и публикация", "site");
  } else if (sectionId === "calc-prices") {
    pushIfAvailable("Сводка", "dashboard");
    pushIfAvailable("Каталог", "catalog");
  } else if (sectionId === "users") {
    pushIfAvailable("CRM", "crm");
    pushIfAvailable("Аудит", "audit");
  } else if (sectionId === "audit") {
    pushIfAvailable("Пользователи", "users");
    pushIfAvailable("Сайт и публикация", "site");
  } else if (sectionId === "site") {
    pushIfAvailable("CRM", "crm");
    pushIfAvailable("Сводка", "dashboard");
  }

  if (actions.length < 2) {
    pushIfAvailable("Сводка", "dashboard");
    pushIfAvailable("CRM", "crm");
    pushIfAvailable("Каталог", "catalog");
  }

  return actions.slice(0, 2);
}

function normalizeAdminContextActions(actions = [], reservedHrefs = []) {
  const blocked = new Set((reservedHrefs || []).filter(Boolean));
  return (Array.isArray(actions) ? actions : [])
    .filter((item) => item?.href && item?.label && !blocked.has(item.href))
    .slice(0, 2);
}

function buildAdminTopbarPrimaryAction(session, sectionId = "") {
  const currentParams = new URLSearchParams(window.location.search);
  const crmMode = currentParams.get("mode") === "pipeline" ? "pipeline" : "overview";

  if (sectionId === "crm") {
    return crmMode === "pipeline"
      ? { label: "Открыть обзор", href: cabinetSectionHref("crm", { mode: "overview" }) }
      : { label: "Открыть воронку", href: cabinetSectionHref("crm", { mode: "pipeline" }) };
  }
  if (sectionId === "catalog") {
    return { label: "Открыть магазин", href: cabinetRoutes.catalog };
  }
  if (sectionId === "calc-prices") {
    return { label: "Открыть редактор", href: cabinetRoutes.calcAdmin };
  }
  if (sectionId === "site") {
    return { label: "Открыть сайт", href: cabinetRoutes.site };
  }
  if (sectionId === "users") {
    return sessionHasSection(session, "crm")
      ? { label: "Открыть CRM", href: cabinetSectionHref("crm") }
      : { label: "Открыть сводку", href: cabinetSectionHref("dashboard") };
  }
  if (sectionId === "audit") {
    return sessionHasSection(session, "dashboard")
      ? { label: "Открыть сводку", href: cabinetSectionHref("dashboard") }
      : { label: "Открыть сайт", href: cabinetRoutes.site };
  }

  return sessionHasSection(session, "crm")
    ? { label: "Открыть CRM", href: cabinetSectionHref("crm") }
    : sessionHasSection(session, "dashboard")
      ? { label: "Открыть сводку", href: cabinetSectionHref("dashboard") }
      : { label: "Открыть сайт", href: cabinetRoutes.site };
}

function applyMemberShellPatch(session, patch = {}) {
  if (session.accountType !== "member") return;
  const requestedSection = patch.sectionId || new URLSearchParams(window.location.search).get("section") || preferredSectionId(session);
  const section = getAllowedSections(session).find((item) => item.id === requestedSection) || null;
  applyCabinetShellModel({
    ...buildCabinetShellModel(session, section),
    ...patch,
  });
}

function applyCabinetShellModel(model) {
  setCabinetText("[data-cabinet-shell-mode-label]", model.modeLabel || "Режим");
  setCabinetText("[data-cabinet-shell-meta]", model.meta);
  setCabinetText("[data-cabinet-shell-section-label]", model.sectionLabel);
  setCabinetText("[data-cabinet-shell-section-note]", model.sectionNote);
  setCabinetText("[data-cabinet-admin-breadcrumb]", model.breadcrumb || "");
  setCabinetText("[data-cabinet-admin-title]", model.title || "");
  setCabinetText("[data-cabinet-rail-role]", model.roleLabel || "");
  setCabinetLink("[data-cabinet-shell-primary]", model.primaryActionLabel, model.primaryActionHref);
  setCabinetLink("[data-cabinet-shell-secondary]", model.secondaryActionLabel, model.secondaryActionHref);
  setCabinetLink("[data-cabinet-shell-tertiary]", model.tertiaryActionLabel, model.tertiaryActionHref);
  setCabinetLink("[data-cabinet-admin-primary-action]", model.topbarPrimaryActionLabel || model.primaryActionLabel, model.topbarPrimaryActionHref || model.primaryActionHref);
  setCabinetLink("[data-cabinet-admin-site-link]", model.topbarSiteActionLabel || "Открыть сайт", model.topbarSiteActionHref || cabinetRoutes.site);
}

function setCabinetText(selector, value) {
  document.querySelectorAll(selector).forEach((node) => {
    node.textContent = value || "";
  });
}

function setCabinetLink(selector, label, href) {
  document.querySelectorAll(selector).forEach((node) => {
    if (!(node instanceof HTMLAnchorElement)) return;
    node.textContent = label || "";
    if (href) {
      node.href = href;
      node.hidden = false;
    } else {
      node.hidden = true;
    }
  });
}

function bindLogout() {
  document.querySelectorAll("[data-cabinet-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (currentSession?.accountType === "admin") {
        await fetchJson(`${apiBase()}/admin/auth/logout`, { method: "POST" });
      } else {
        await fetchJson(`${apiBase()}/auth/logout`, { method: "POST" });
      }
      clearSessionTokens();
      window.location.href = cabinetRoutes.login;
    });
  });
}

async function renderCabinet(session) {
  const sections = getAllowedSections(session);
  const requestedSection = new URLSearchParams(window.location.search).get("section");
  const active = sections.find((section) => section.id === requestedSection)?.id || preferredSectionId(session);
  const nav = document.getElementById("cabinet-nav");
  const content = document.getElementById("cabinet-section-content");
  if (!nav || !content) return;

  nav.innerHTML = sections.map((section) => `
    <a class="cabinet-nav-link${section.id === active ? " is-active" : ""}" href="${escapeAttribute(cabinetSectionHref(section.id))}">
      <strong>${escapeHtml(section.label)}</strong>
      ${session.accountType === "admin" ? "" : `<span>${escapeHtml(section.note)}</span>`}
    </a>
  `).join("");

  const section = sections.find((item) => item.id === active) || sections[0];
  if (!section) {
    content.innerHTML = renderRuntimeEmpty("Кабинет", "Для этого аккаунта пока не собрано ни одного доступного раздела.", [
      { href: cabinetRoutes.site, label: "Вернуться на сайт", tone: "secondary" },
    ]);
    return;
  }

  applyCabinetShellModel(buildCabinetShellModel(session, section));
  content.dataset.section = section.id;
  content.innerHTML = '<div class="account-empty">Собираем раздел и проверяем живые данные…</div>';
  try {
    const html = await renderSection(session, section);
    if (content.dataset.section !== section.id) return;
    content.innerHTML = html;
    bindSectionRuntime(session, section.id);
  } catch (error) {
    if (content.dataset.section !== section.id) return;
    content.innerHTML = renderSectionUnavailable({
      kicker: section.label,
      title: section.label,
      message: `Не удалось собрать раздел: ${cleanupError(error.message || "runtime_error")}.`,
      primaryHref: sections[0] ? cabinetSectionHref(sections[0].id) : cabinetRoutes.site,
      primaryLabel: sections[0] ? `Открыть ${sections[0].label.toLowerCase()}` : "Вернуться на сайт",
      secondaryHref: cabinetRoutes.site,
      secondaryLabel: "На сайт",
    });
  }
}

function bindSectionRuntime(session, sectionId) {
  if (session.accountType === "admin" && sectionId === "users") {
    bindAdminUsersSection();
  }
  if (session.accountType === "admin" && sectionId === "catalog") {
    bindAdminCatalogSection();
  }
  if (session.accountType === "admin" && sectionId === "crm") {
    bindAdminCrmSection();
  }
  if (session.accountType === "admin" && sectionId === "audit") {
    bindAdminAuditSection();
  }
  if (session.accountType === "member" && sectionId === "messages") {
    bindMemberMessagesSection(session);
  }
  if (session.accountType === "member" && sectionId === "orders") {
    bindMemberOrdersSection(session);
  }
  if (session.accountType === "member" && sectionId === "profile") {
    bindMemberProfileSection(session);
  }
  if (session.accountType === "member" && sectionId === "cart") {
    bindMemberCartSection(session);
  }
  if (session.accountType === "admin") {
    bindAdminTopbarSearch(session);
  }
}

function preferredSectionId(session) {
  const sections = getAllowedSections(session);
  return sections[0]?.id || "overview";
}

function sessionHasSection(session, sectionId) {
  return getAllowedSections(session).some((section) => section.id === sectionId);
}

function currentSessionHasSection(sectionId) {
  return sessionHasSection(currentSession, sectionId);
}

function getAllowedSections(session) {
  if (session.accountType === "admin") {
    const allowed = new Set(session.policy?.sections || []);
    const scopes = new Set(session.policy?.scopes || []);
    return [
      allowed.has("dashboard") && {
        id: "dashboard",
        label: "Сводка",
        note: "Деньги, сигналы и ближайшие действия команды.",
      },
      (allowed.has("site") || allowed.has("pages") || allowed.has("forms") || allowed.has("seo") || allowed.has("integrations")) && {
        id: "site",
        label: "Сайт и публикация",
        note: "Публикация, формы, каналы и системные настройки.",
      },
      allowed.has("crm") && {
        id: "crm",
        label: "CRM",
        note: "Лиды, задачи, воронка и очередь команды.",
      },
      (allowed.has("catalog") || allowed.has("inventory")) && {
        id: "catalog",
        label: "Каталог",
        note: "Список товаров и редактор карточек.",
      },
      (scopes.has("calc_prices") || ["owner", "admin"].includes(session.policy?.role || "")) && {
        id: "calc-prices",
        label: "Цены калькулятора",
        note: "Цены и параметры расчёта.",
      },
      allowed.has("users") && {
        id: "users",
        label: "Пользователи",
        note: "Аккаунты и права доступа.",
      },
      allowed.has("audit") && {
        id: "audit",
        label: "Аудит",
        note: "Кто и что менял в системе.",
      },
    ].filter(Boolean);
  }

  const routeAccess = session.policy?.route_access || {};
  const scopes = new Set(session.policy?.scopes || session.user?.scopes || []);
  return [
    {
      id: "overview",
      label: "Главная",
      note: "Главное по заказам, документам и связи.",
    },
    routeAccess.catalog && {
      id: "catalog",
      label: "Каталог",
      note: "Позиции под вашу задачу и что из них уже можно брать.",
    },
    {
      id: "cart",
      label: "Корзина и сохранённое",
      note: "Текущая корзина и позиции, которые вы отложили.",
    },
    (routeAccess.special || routeAccess.catalog) && {
      id: "requests",
      label: "Расчёт и консультации",
      note: "Расчёт, консультации и полезные страницы.",
    },
    scopes.has("orders") && {
      id: "orders",
      label: "Заказы",
      note: "Ваши заказы и следующий шаг по ним.",
    },
    scopes.has("documents") && {
      id: "documents",
      label: "Документы",
      note: "Счета, спецификации и PDF по заказам.",
    },
    {
      id: "messages",
      label: "Сообщения",
      note: "Куда написать и как быстрее получить ответ.",
    },
    {
      id: "profile",
      label: "Профиль и доставка",
      note: "Контакты, доставка и уведомления.",
    },
    scopes.has("course_access") && {
      id: "course",
      label: "Клубничный Хак",
      note: "Оплаченный курс и уроки.",
    },
  ].filter(Boolean);
}

async function renderSection(session, section) {
  if (session.accountType === "member") {
    if (section.id === "overview") return renderMemberOverview(session);
    if (section.id === "catalog") return renderMemberCatalogSection(session);
    if (section.id === "cart") return renderMemberCartSection(session);
    if (section.id === "requests") return renderMemberRequestsSection(session);
    if (section.id === "course") return renderMemberCourseSection(session);
    if (section.id === "orders") return renderMemberOrdersSection(session);
    if (section.id === "documents") return renderMemberDocumentsSection(session);
    if (section.id === "messages") return renderMemberMessagesSection(session);
    if (section.id === "profile") return renderMemberProfileSection(session);
  }

  if (session.accountType === "admin") {
    if (section.id === "dashboard") return renderAdminDashboard(session);
    if (section.id === "catalog") return renderAdminCatalogSection(session);
    if (section.id === "crm") return renderCrmSection(session);
    if (section.id === "calc-prices") return renderCalcPricesSection(session);
    if (section.id === "site") return renderAdminSiteSection(session);
    if (section.id === "users") return renderAdminUsersSection(session);
    if (section.id === "audit") return renderAdminAuditSection(session);
  }

  return renderPlannedSection(section);
}

async function renderMemberOverview(session) {
  const bundle = await loadMemberProjectBundle(session);
  const { routeAccess, scopes, catalogItems, specialPages, documentPages } = bundle;
  const canOpenRequests = sessionHasSection(session, "requests");
  const canOpenOrders = sessionHasSection(session, "orders");
  const canOpenDocuments = sessionHasSection(session, "documents");
  const [profile, orders, messages] = await Promise.all([
    loadMemberProfile(session),
    canOpenOrders ? loadMemberOrders().catch(() => []) : Promise.resolve([]),
    loadMemberMessages().catch(() => []),
  ]);
  const cartEntries = Object.entries(loadMemberCart())
    .map(([productId, qty]) => {
      const product = catalogItems.find((item) => item.id === productId);
      return product ? { product, qty: Number(qty) || 0 } : null;
    })
    .filter(Boolean);
  const savedItems = loadMemberSaved(session)
    .map((productId) => catalogItems.find((item) => item.id === productId))
    .filter(Boolean);
  const profileCompleteness = getMemberProfileCompleteness(profile);
  const documentGroups = await Promise.all(
    (orders || []).slice(0, 3).map(async (order) => ({
      order,
      documents: canOpenDocuments ? await loadMemberOrderDocuments(order.id).catch(() => []) : [],
    })),
  );
  const overviewState = deriveMemberHomeState({
    profile,
    orders,
    messages,
    cartEntries,
    savedItems,
    catalogItems,
    specialPages,
    documentGroups,
    canOpenOrders,
    canOpenDocuments,
  });
  const latestTeamMessage = findLatestTeamMessage(messages);
  const latestOrder = orders[0] || null;
  const readyDocuments = documentGroups.reduce((sum, entry) => sum + entry.documents.filter((item) => ["ready", "sent"].includes(String(item.status || "").toLowerCase())).length, 0);
  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Главная</div>
        <h2 class="calc-card-title">Что делать сейчас</h2>
        <p class="sublead">Главный экран показывает ближайший шаг, доступные разделы и то, что уже готово для работы.</p>
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card cabinet-home-card--focus">
            <div class="cabinet-kicker">Главный шаг</div>
            <h3 class="calc-card-title">${escapeHtml(overviewState.title)}</h3>
            <p class="sublead">${escapeHtml(overviewState.description)}</p>
            <div class="cabinet-mini-list cabinet-mini-list--compact">
              <article class="cabinet-mini-card cabinet-mini-card--status">
                <strong>${escapeHtml(overviewState.statusLabel)}</strong>
                <span>${escapeHtml(overviewState.supportValue)}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Профиль</strong>
                <span>${profileCompleteness}/3 заполнено</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Документы</strong>
                <span>${readyDocuments ? `${readyDocuments} готовы` : "Пока готовятся"}</span>
              </article>
            </div>
            <div class="cabinet-home-actions">
              <a class="btn btn-primary" href="${escapeAttribute(overviewState.primaryHref)}">${escapeHtml(overviewState.primaryLabel)}</a>
              <a class="btn btn-secondary" href="${escapeAttribute(overviewState.secondaryHref)}">${escapeHtml(overviewState.secondaryLabel)}</a>
              ${canOpenOrders ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>` : `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Связь с командой</a>`}
            </div>
          </article>
          <section class="cabinet-section-grid">
            ${canOpenRequests ? `
              <article class="card card-pad cabinet-card cabinet-action-card">
                <div class="cabinet-kicker">Расчёт и консультации</div>
                <h3 class="calc-card-title">Разобрать задачу</h3>
                <p class="sublead">${specialPages.length ? `Уже открыто ${specialPages.length} ${pluralizeRu(specialPages.length, "страница", "страницы", "страниц")} с расчётом, консультацией и материалами.` : "Здесь можно начать с расчёта и консультации."}</p>
                <div class="cabinet-home-actions">
                  <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("requests"))}">Открыть раздел</a>
                </div>
              </article>
            ` : ""}
            ${canOpenOrders ? `
              <article class="card card-pad cabinet-card cabinet-action-card">
                <div class="cabinet-kicker">Заказы</div>
                <h3 class="calc-card-title">${latestOrder ? "Продолжить по заказу" : "Заказы появятся здесь"}</h3>
                <p class="sublead">${latestOrder ? escapeHtml(describeMemberOrderStatus(latestOrder, profileCompleteness).note) : "Как только вы соберёте первый заказ, он появится в этом разделе."}</p>
                <div class="cabinet-home-actions">
                  <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>
                </div>
              </article>
            ` : ""}
            ${canOpenDocuments ? `
              <article class="card card-pad cabinet-card cabinet-action-card">
                <div class="cabinet-kicker">Документы</div>
                <h3 class="calc-card-title">Файлы под рукой</h3>
                <p class="sublead">${readyDocuments ? `${readyDocuments} ${pluralizeRu(readyDocuments, "документ", "документа", "документов")} уже готовы к открытию.` : "Файлы пока не добавлены. Когда появятся счёт и спецификация, они будут здесь."}</p>
                <div class="cabinet-home-actions">
                  <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("documents"))}">Открыть документы</a>
                </div>
              </article>
            ` : ""}
            <article class="card card-pad cabinet-card cabinet-action-card">
              <div class="cabinet-kicker">Профиль и доставка</div>
              <h3 class="calc-card-title">Проверить данные</h3>
              <p class="sublead">${profileCompleteness === 3 ? "Контакты и доставка уже заполнены." : `Не хватает: ${getMemberProfileMissingFields(profile).join(", ")}.`}</p>
              <div class="cabinet-home-actions">
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Открыть профиль</a>
              </div>
            </article>
            <article class="card card-pad cabinet-card cabinet-action-card">
              <div class="cabinet-kicker">Сообщения</div>
              <h3 class="calc-card-title">${latestTeamMessage ? "Есть ответ от команды" : "Связь с командой"}</h3>
              <p class="sublead">${latestTeamMessage ? escapeHtml(latestTeamMessage.message || "Последний ответ уже в кабинете.") : "Пишите по подбору, заказу, документам и любым уточнениям."}</p>
              <div class="cabinet-home-actions">
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">${latestTeamMessage ? "Открыть диалог" : "Написать сообщение"}</a>
              </div>
            </article>
            ${!canOpenRequests && !canOpenOrders && !canOpenDocuments ? `
              <div class="account-empty">Кабинет уже готов для связи и профиля. Остальные разделы появятся, когда откроется следующий этап.</div>
            ` : ""}
          </section>
        </div>
      </div>
    </div>
  `;
}

async function renderMemberCatalogSection(session) {
  const bundle = await loadMemberProjectBundle(session);
  const { routeAccess, catalogItems: items, specialPages, documentPages } = bundle;
  const canOpenDocuments = sessionHasSection(session, "documents");
  const canOpenRequests = sessionHasSection(session, "requests");
  if (!items.length) {
    return renderRuntimeEmpty("Подбор и каталог", "В этом кабинете пока нет позиций, привязанных к вашей задаче.", [
      canOpenRequests
        ? { href: cabinetSectionHref("requests"), label: "Открыть расчёт и консультации", tone: "primary" }
        : { href: cabinetRoutes.calc, label: "Открыть калькулятор", tone: "primary" },
      { href: cabinetSectionHref("messages"), label: "Написать сообщение", tone: "secondary" },
    ]);
  }

  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean))).slice(0, 6);
  const primary = items.slice(0, 8);
  const firstReady = items.find((item) => String(item.cta_mode || "").toLowerCase() === "buy") || items[0];
  const needsClarification = items.find((item) => String(item.cta_mode || "").toLowerCase() !== "buy");
  const buyReadyCount = items.filter((item) => String(item.cta_mode || "").toLowerCase() === "buy").length;
  const verifyCount = items.length - buyReadyCount;
  const projectState = deriveMemberProjectState(bundle);
  const firstReference = specialPages.find((item) => !documentPages.includes(item)) || null;
  applyMemberShellPatch(session, {
    sectionId: "catalog",
    sectionNote: buyReadyCount
      ? `${buyReadyCount} ${pluralizeRu(buyReadyCount, "позиция", "позиции", "позиций")} уже готовы к покупке, ${verifyCount} лучше сверить.`
      : `${verifyCount} ${pluralizeRu(verifyCount, "позиция", "позиции", "позиций")} нужно обсудить перед покупкой.`,
  });

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Подбор и каталог</div>
        <h2 class="calc-card-title">Позиции для вашей задачи</h2>
        <p class="sublead">Здесь только нужные позиции: что уже готово к покупке, что лучше уточнить и что полезно держать рядом.</p>
      </div>
      <div class="cabinet-stat-grid cabinet-stat-grid--member">
        ${renderStatCard("Позиции", String(items.length), "в вашем списке")}
        ${renderStatCard("Готово к покупке", String(buyReadyCount), buyReadyCount ? "можно переходить к следующему шагу" : "сначала лучше уточнить")}
        ${renderStatCard("Нужно уточнить", String(verifyCount), verifyCount ? "есть позиции для сверки" : "список уже чистый")}
        ${renderStatCard("Файлы рядом", String(documentPages.length), documentPages.length ? "документы уже на месте" : "пока только товары и материалы")}
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Что делать сейчас</div>
            <h3 class="calc-card-title">С чего лучше начать</h3>
            <p class="sublead">${buyReadyCount ? "Сначала откройте то, что уже готово к покупке. Остальное уточняйте по ходу." : "Сейчас важнее уточнить список, чем покупать сразу."}</p>
            <div class="cabinet-phase-grid">
              <article class="cabinet-phase-card">
                <strong>Готово к покупке</strong>
                <span>${buyReadyCount ? `${buyReadyCount} ${pluralizeRu(buyReadyCount, "позиция", "позиции", "позиций")} можно брать без лишних шагов.` : "Пока нет позиций, которые можно брать без уточнения."}</span>
              </article>
              <article class="cabinet-phase-card">
                <strong>Нужно уточнить</strong>
                <span>${verifyCount ? `${verifyCount} ${pluralizeRu(verifyCount, "позиция", "позиции", "позиций")} лучше проверить с нами перед покупкой.` : "Проверок почти не осталось."}</span>
              </article>
              <article class="cabinet-phase-card">
                <strong>Полезно рядом</strong>
                <span>${documentPages.length ? "Документы уже рядом, не нужно искать их в переписке." : firstReference ? "Рядом есть полезные материалы для следующего шага." : "Пока рядом только каталог."}</span>
              </article>
            </div>
            <div class="cabinet-home-actions">
              <a class="btn btn-primary" href="${escapeAttribute(resolvePublicPath(firstReady?.path || cabinetRoutes.catalog))}">${escapeHtml(firstReady ? "Открыть первую готовую позицию" : "Открыть каталог")}</a>
              ${needsClarification ? `<a class="btn btn-secondary" href="${escapeAttribute(resolvePublicPath(needsClarification.path || cabinetRoutes.catalog))}">Открыть позицию и сверить</a>` : ""}
              ${documentPages.length && canOpenDocuments ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("documents"))}">Открыть документы</a>` : canOpenRequests ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("requests"))}">Заявки и расчёты</a>` : ""}
            </div>
            ${categories.length ? `<div class="cabinet-chip-row">${categories.map((item) => `<span class="account-note-chip">${escapeHtml(humanizeMemberCatalogCategory(item))}</span>`).join("")}</div>` : ""}
          </article>
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">Рабочие позиции</div>
            <h3 class="calc-card-title">Что уже есть в списке</h3>
            <div class="cabinet-list">
              <div class="cabinet-list-head cabinet-list-head--catalog">
                <span>Позиция</span>
                <span>Раздел</span>
                <span>Следующий шаг</span>
              </div>
              <div class="cabinet-list-body">
                ${primary.map(renderMemberCatalogRow).join("")}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;
}

async function renderMemberRequestsSection(session) {
  const items = await loadMemberSpecialPages();
  const routeAccess = session.policy?.route_access || {};
  const documentPages = collectMemberDocumentPages(items);
  const canOpenDocuments = sessionHasSection(session, "documents");
  const referencePages = items.filter((item) => !documentPages.includes(item));
  const firstReference = referencePages[0] || items[0] || null;
  applyMemberShellPatch(session, {
    sectionId: "requests",
    sectionNote: referencePages.length
      ? `${referencePages.length} ${pluralizeRu(referencePages.length, "полезная страница", "полезные страницы", "полезных страниц")} уже доступны для выбора следующего шага.`
      : "Здесь доступны калькулятор, разбор по задаче и полезные материалы.",
  });

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Расчёт и консультации</div>
        <h2 class="calc-card-title">Расчёт и консультации</h2>
        <p class="sublead">Здесь всё, что помогает принять решение: каталог, калькулятор, разбор по задаче и полезные материалы.</p>
      </div>
      <div class="cabinet-stat-grid cabinet-stat-grid--member">
        ${renderStatCard("Материалы", String(referencePages.length), referencePages.length ? "есть что открыть сейчас" : "пока доступен базовый маршрут")}
        ${renderStatCard("Калькулятор", "Доступен", "можно открыть в любой момент")}
        ${renderStatCard("Разбор по задаче", "Доступен", "команда поможет с подбором")}
        ${renderStatCard("Файлы", String(documentPages.length), documentPages.length ? "документы уже рядом" : "файлы пока не добавлены")}
        ${renderStatCard("Каталог", routeAccess.catalog ? "Открыт" : "Позже", routeAccess.catalog ? "позиции уже можно посмотреть" : "откроется по мере движения по проекту")}
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Что доступно сейчас</div>
            <h3 class="calc-card-title">С чего лучше начать</h3>
            <p class="sublead">${escapeHtml(firstReference?.summary || "Сначала выберите ближайший сценарий: расчёт, разбор по задаче или материалы по вашему проекту.")}</p>
            <div class="cabinet-home-actions">
              ${routeAccess.catalog ? `<a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("catalog"))}">Открыть каталог</a>` : `<a class="btn btn-primary" href="${escapeAttribute(cabinetRoutes.calc)}">Открыть калькулятор</a>`}
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.calc)}">Калькулятор</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.consultations)}">Разбор по задаче</a>
              ${documentPages.length && canOpenDocuments ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("documents"))}">Открыть документы</a>` : ""}
            </div>
          </article>
          <section class="cabinet-section-grid">
            ${routeAccess.catalog ? `
              <article class="card card-pad cabinet-card cabinet-action-card">
                <div class="cabinet-kicker">Каталог</div>
                <h3 class="calc-card-title">Продолжить подбор</h3>
                <p class="sublead">Здесь собраны позиции под вашу задачу и следующий шаг по каждой из них.</p>
                <div class="cabinet-home-actions">
                  <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("catalog"))}">Открыть каталог</a>
                </div>
              </article>
            ` : ""}
            <article class="card card-pad cabinet-card cabinet-action-card">
              <div class="cabinet-kicker">Калькулятор</div>
              <h3 class="calc-card-title">Посчитать проект</h3>
              <p class="sublead">Подходит, когда нужно быстро проверить размер, конфигурацию и ориентир по стоимости.</p>
              <div class="cabinet-home-actions">
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.calc)}">Открыть калькулятор</a>
              </div>
            </article>
            <article class="card card-pad cabinet-card cabinet-action-card">
              <div class="cabinet-kicker">Разбор по задаче</div>
              <h3 class="calc-card-title">Обсудить проект с командой</h3>
              <p class="sublead">Подходит, если нужно сверить подбор, состав заказа или следующий шаг по документам.</p>
              <div class="cabinet-home-actions">
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.consultations)}">Открыть разбор</a>
              </div>
            </article>
            <article class="card card-pad cabinet-card cabinet-action-card">
              <div class="cabinet-kicker">Полезные материалы</div>
              <h3 class="calc-card-title">${referencePages.length ? "Что уже можно открыть" : "Материалы появятся здесь"}</h3>
              <p class="sublead">${referencePages.length ? `${referencePages.length} ${pluralizeRu(referencePages.length, "материал", "материала", "материалов")} уже доступны по вашему проекту.` : "Когда по проекту появятся полезные материалы, они соберутся в этом разделе."}</p>
              <div class="cabinet-home-actions">
                ${firstReference ? `<a class="btn btn-secondary" href="${escapeAttribute(firstReference.path)}">Открыть материал</a>` : `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Написать команде</a>`}
              </div>
            </article>
          </section>
        </div>
      </div>
    </div>
  `;
}

async function renderMemberCourseSection(session) {
  const items = await loadMemberSpecialPages().catch(() => []);
  const canOpenRequests = sessionHasSection(session, "requests");
  const courseItems = items.filter((item) => {
    const probe = `${item.slug || ""} ${item.path || ""} ${item.title || ""}`.toLowerCase();
    return ["course", "klubhack", "хак"].some((token) => probe.includes(token));
  });
  const accountName = session.user.user_name || session.user.display_name || "Пользователь";
  const firstLesson = courseItems[0] || null;

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Клубничный Хак</div>
        <h2 class="calc-card-title">Клубничный Хак</h2>
        <p class="sublead">Здесь ваш оплаченный курс: уроки и материалы в одном кабинете с заказами и документами.</p>
      </div>
      <div class="cabinet-stat-grid cabinet-stat-grid--member">
        ${renderStatCard("Аккаунт", accountName, "доступ к курсу активен")}
        ${renderStatCard("Уроки", String(courseItems.length), courseItems.length ? "уже доступны" : "пока уроков нет")}
        ${renderStatCard("Доступ", "Оплачен", "видно только тем, у кого открыт course_access")}
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">С чего идти</div>
            <h3 class="calc-card-title">С чего продолжить</h3>
            <p class="sublead">${escapeHtml(firstLesson?.summary || "Здесь появится ближайший урок.")}</p>
            <div class="cabinet-home-actions">
              ${firstLesson ? `<a class="btn btn-primary" href="${escapeAttribute(firstLesson.path)}">Открыть ближайший урок</a>` : ""}
              ${canOpenRequests ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("requests"))}">Заявки и расчёты</a>` : `<a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.calc)}">Открыть расчёт</a>`}
            </div>
          </article>
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Что уже есть</div>
            <h3 class="calc-card-title">Доступные уроки</h3>
            <div class="cabinet-mini-list">
              ${courseItems.slice(0, 4).map(renderMemberSpecialCard).join("") || '<div class="account-empty">Уроков пока нет. Добавим их сюда.</div>'}
            </div>
          </article>
        </div>
      </div>
    </div>
  `;
}

async function renderMemberOrdersSection(session) {
  const routeAccess = session.policy?.route_access || {};
  const canOpenRequests = sessionHasSection(session, "requests");
  const canOpenDocuments = sessionHasSection(session, "documents");
  const canOpenOrders = sessionHasSection(session, "orders");
  const profile = await loadMemberProfile(session);
  const [catalogResult, specialResult, ordersResult] = await Promise.all([
    routeAccess.catalog ? loadMemberCatalogItems().catch(() => []) : Promise.resolve([]),
    routeAccess.special ? loadMemberSpecialPages().catch(() => []) : Promise.resolve([]),
    loadMemberOrders().catch(() => []),
  ]);
  const catalogItems = Array.isArray(catalogResult) ? catalogResult : [];
  const specialPages = Array.isArray(specialResult) ? specialResult : [];
  const orders = Array.isArray(ordersResult) ? ordersResult : [];
  const buyReady = catalogItems.filter((item) => String(item.cta_mode || "").toLowerCase() === "buy");
  const verifyFirst = catalogItems.filter((item) => String(item.cta_mode || "").toLowerCase() !== "buy");
  const firstBuyReady = buyReady[0] || null;
  const profileCompleteness = getMemberProfileCompleteness(profile);
  const selectedOrderId = new URLSearchParams(window.location.search).get("order");
  const activeOrder = orders.find((item) => String(item.id) === String(selectedOrderId)) || null;
  const activeOrdersCount = orders.filter((item) => !["completed", "cancelled"].includes(String(item.status || "").toLowerCase())).length;

  if (activeOrder) {
    const messages = await loadMemberMessages().catch(() => []);
    const activeOrderStatus = describeMemberOrderStatus(activeOrder, profileCompleteness);
    const activeOrderLeadSummary = buildOrderLeadSummary(activeOrder);
    const activeOrderDocuments = await loadMemberOrderDocuments(activeOrder.id).catch(() => []);
    const activeOrderMessages = filterMessagesForOrder(activeOrder, messages);
    const orderSubject = buildOrderMessageSubject(activeOrder);
    const orderStage = getMemberOrderStageModel(activeOrder, {
      profileCompleteness,
      documentsCount: activeOrderDocuments.length,
      messagesCount: activeOrderMessages.length,
      hasDocumentsSection: canOpenDocuments,
      hasOrdersSection: canOpenOrders,
      hasRequestsSection: canOpenRequests,
    });
    applyMemberShellPatch(session, {
      sectionId: "orders",
      sectionNote: `${activeOrder.title} · ${activeOrderStatus.label.toLowerCase()} · ${activeOrderDocuments.length} ${pluralizeRu(activeOrderDocuments.length, "файл", "файла", "файлов")}.`,
    });
    return `
      <div class="cabinet-section-stack">
        <div class="cabinet-section-intro">
          <div class="cabinet-kicker">Заказ</div>
          <h2 class="calc-card-title">${escapeHtml(activeOrder.title)}</h2>
          <p class="sublead">Здесь весь заказ: позиции, документы, переписка и что делать дальше.</p>
        </div>
        <div class="cabinet-home-grid cabinet-home-grid--single">
          <div class="cabinet-home-main">
            <article class="card card-pad cabinet-home-card">
              <div class="cabinet-kicker">Сводка</div>
              <h3 class="calc-card-title">Кратко по заказу</h3>
              <p class="sublead">${escapeHtml(activeOrder.note || activeOrderStatus.note)}</p>
              <div class="cabinet-mini-list cabinet-mini-list--compact">
                <article class="cabinet-mini-card cabinet-mini-card--status">
                  <strong>${escapeHtml(activeOrderStatus.label)}</strong>
                  <span>${escapeHtml(activeOrderStatus.note)}</span>
                </article>
                <article class="cabinet-mini-card">
                  <strong>${activeOrderDocuments.length} ${pluralizeRu(activeOrderDocuments.length, "документ", "документа", "документов")}</strong>
                  <span>${activeOrderDocuments.length ? "Файлы уже добавлены к заказу." : "Файлов пока нет в карточке заказа."}</span>
                </article>
                <article class="cabinet-mini-card">
                  <strong>${activeOrderMessages.length} ${pluralizeRu(activeOrderMessages.length, "сообщение", "сообщения", "сообщений")}</strong>
                  <span>${activeOrderMessages.length ? "Переписка уже тут же." : "Отдельной переписки по заказу ещё не было."}</span>
                </article>
                <article class="cabinet-mini-card">
                  <strong>${escapeHtml(activeOrderLeadSummary.title)}</strong>
                  <span>${escapeHtml(activeOrderLeadSummary.note)}</span>
                </article>
              </div>
              <div class="cabinet-home-actions">
              <a class="btn btn-primary" href="${escapeAttribute(orderStage.primaryHref)}">${escapeHtml(orderStage.primaryLabel)}</a>
              <a class="btn btn-secondary" href="${escapeAttribute(orderStage.secondaryHref)}">${escapeHtml(orderStage.secondaryLabel)}</a>
                ${orderStage.tertiaryHref ? `<a class="btn btn-secondary" href="${escapeAttribute(orderStage.tertiaryHref)}">${escapeHtml(orderStage.tertiaryLabel)}</a>` : ""}
              </div>
            </article>
            <section class="card card-pad cabinet-card cabinet-order-stage-card">
              <div class="cabinet-kicker">Следующий шаг</div>
              <h3 class="calc-card-title">${escapeHtml(orderStage.title)}</h3>
              <p class="sublead">${escapeHtml(orderStage.description)}</p>
              <div class="cabinet-stage-row">
                ${orderStage.steps.map((step) => `
                  <article class="cabinet-stage-chip cabinet-stage-chip--${escapeAttribute(step.state)}">
                    <strong>${escapeHtml(step.label)}</strong>
                    <span>${escapeHtml(step.note)}</span>
                  </article>
                `).join("")}
              </div>
              <ul class="cabinet-note-list">
                ${orderStage.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
              </ul>
            </section>
            <section class="card card-pad cabinet-card">
              <div class="cabinet-kicker">Позиции в заказе</div>
              <h3 class="calc-card-title">Что уже собрано в этом заказе</h3>
              ${activeOrder.line_items.length ? `
                <div class="cabinet-list">
                  <div class="cabinet-list-head cabinet-list-head--catalog">
                    <span>Позиция</span>
                    <span>Количество</span>
                    <span>Следующий шаг</span>
                  </div>
                  <div class="cabinet-list-body">
                    ${activeOrder.line_items.map((entry) => `
                      <article class="cabinet-list-row cabinet-list-row--catalog">
                        <div class="cabinet-list-cell">
                          <strong>${escapeHtml(entry.title)}</strong>
                          <span>${escapeHtml(entry.summary || "Позиция из текущей закупки")}</span>
                        </div>
                        <div class="cabinet-list-cell">
                          <strong>${escapeHtml(String(entry.qty))}</strong>
                          <span>${escapeHtml(humanizeMemberCatalogCategory(entry.category || ""))}</span>
                        </div>
                        <div class="cabinet-list-cell">
                          <strong><a href="${escapeAttribute(resolvePublicPath(entry.path))}">Открыть позицию</a></strong>
                          <span>Откройте товар и при необходимости поправьте состав.</span>
                        </div>
                      </article>
                    `).join("")}
                  </div>
                </div>
              ` : `<div class="account-empty">Позиции ещё не добавлены. Вернитесь в каталог и соберите заказ.</div>`}
            </section>
            <section class="card card-pad cabinet-card">
              <div class="cabinet-kicker">Документы по заказу</div>
              <h3 class="calc-card-title">Документы по этому заказу</h3>
              ${activeOrderDocuments.length ? `
                <div class="cabinet-list">
                  <div class="cabinet-list-head cabinet-list-head--catalog">
                    <span>Документ</span>
                    <span>Статус</span>
                    <span>Переход</span>
                  </div>
                  <div class="cabinet-list-body">
                    ${activeOrderDocuments.map(renderMemberOrderDocumentRow).join("")}
                  </div>
                </div>
              ` : `
                <div class="cabinet-mini-list">
                  <article class="cabinet-mini-card">
                    <strong>Документов пока нет</strong>
                    <span>Как только команда подготовит счёт или спецификацию, они появятся здесь.</span>
                  </article>
                </div>
                <div class="cabinet-home-actions">
                  <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Написать сообщение</a>
                  <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Открыть профиль</a>
                </div>
              `}
            </section>
            <section class="card card-pad cabinet-card" id="order-thread">
              <div class="cabinet-kicker">Связь по заказу</div>
              <h3 class="calc-card-title">Переписка по заказу</h3>
              ${activeOrderMessages.length ? `
                <div class="cabinet-message-list">
                  ${activeOrderMessages.slice(0, 4).map(renderMemberMessageItem).join("")}
                </div>
              ` : `<div class="account-empty">Переписки по этому заказу ещё нет. Напишите отсюда, если нужен следующий шаг.</div>`}
              <div class="cabinet-field-grid">
                <label class="cabinet-field">
                  <span class="cabinet-field-label">Тема</span>
                  <input class="admin-input" data-member-order-message-subject="${escapeAttribute(activeOrder.id)}" type="text" value="${escapeAttribute(orderSubject)}" />
                </label>
                <label class="cabinet-field cabinet-field--wide">
                  <span class="cabinet-field-label">Сообщение по заказу</span>
                  <textarea class="admin-textarea" data-member-order-message-body="${escapeAttribute(activeOrder.id)}" placeholder="Например: нужен счёт, нужна спецификация, когда отгрузка?"></textarea>
                </label>
              </div>
              <div class="cabinet-user-card-actions">
                <button class="btn btn-primary" type="button" data-member-order-message-send="${escapeAttribute(activeOrder.id)}">Отправить по заказу</button>
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Открыть все сообщения</a>
              </div>
              <div class="cabinet-users-status" data-member-order-message-status="${escapeAttribute(activeOrder.id)}"></div>
            </section>
            <article class="card card-pad cabinet-home-card">
              <div class="cabinet-kicker">Перед следующим шагом</div>
              <ul class="cabinet-note-list">
                <li>${profileCompleteness === 3 ? "Контакты и доставка заполнены, можно двигаться дальше." : "Добавьте email, телефон и адрес доставки в профиле."}</li>
                <li>${activeOrderDocuments.length ? "Документы уже рядом, открывайте прямо отсюда." : "Если нужен счёт или спецификация, напишите по заказу одним сообщением."}</li>
                <li>Если по позиции есть сомнение, лучше уточнить до покупки.</li>
              </ul>
              <div class="cabinet-home-actions">
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Назад к заказам</a>
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Связь по заказу</a>
              </div>
            </article>
          </div>
        </div>
      </div>
    `;
  }

  applyMemberShellPatch(session, {
    sectionId: "orders",
    sectionNote: orders.length
      ? `${activeOrdersCount} ${pluralizeRu(activeOrdersCount, "заказ", "заказа", "заказов")} сейчас в работе.`
      : "Когда появится первый заказ, он будет виден здесь.",
  });

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Заказы</div>
        <h2 class="calc-card-title">Ваши заказы</h2>
        <p class="sublead">Здесь видно, на каком этапе сейчас каждый заказ и что лучше сделать следующим шагом.</p>
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Следующий шаг</div>
            <h3 class="calc-card-title">${orders.length ? "Что важно перед заказом" : "Как появится первый заказ"}</h3>
            <p class="sublead">${orders.length ? "Проверьте профиль, состав заказа и документы. Так следующий шаг будет быстрее и без лишних уточнений." : "Сначала добавьте позиции в корзину или вернитесь к подбору. Первый заказ появится здесь автоматически."}</p>
            <div class="cabinet-home-actions">
              ${firstBuyReady ? `<a class="btn btn-primary" href="${escapeAttribute(firstBuyReady.path)}">Открыть первую готовую позицию</a>` : ""}
              ${canOpenRequests ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("requests"))}">Открыть заявки и расчёты</a>` : ""}
              ${orders.length && canOpenDocuments ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("documents"))}">Открыть документы</a>` : ""}
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Профиль и доставка</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("cart"))}">Корзина и сохранённое</a>
            </div>
          </article>
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Профиль и доставка</div>
            <h3 class="calc-card-title">Что лучше заполнить сейчас</h3>
            <div class="cabinet-mini-list">
              <article class="cabinet-mini-card">
                <strong>Email</strong>
                <span>${escapeHtml(profile.email || "Пока пусто. Добавьте email, чтобы получать счета и файлы.")}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Телефон</strong>
                <span>${escapeHtml(profile.phone || "Пока пусто. Без телефона сложнее быстро согласовать заказ.")}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Адрес доставки</strong>
                <span>${escapeHtml(profile.delivery_address || "Пока пусто. Добавьте адрес, чтобы не тормозить отгрузку.")}</span>
              </article>
            </div>
            <div class="cabinet-home-actions">
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Открыть профиль</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Написать в поддержку</a>
            </div>
          </article>
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">Список заказов</div>
            <h3 class="calc-card-title">Открытые и собранные заказы</h3>
            ${orders.length ? `
              <div class="cabinet-list">
                <div class="cabinet-list-head cabinet-list-head--catalog">
                  <span>Заказ</span>
                  <span>Статус</span>
                  <span>Переход</span>
                </div>
                <div class="cabinet-list-body">
                  ${orders.map((order) => renderMemberOrderRow(order, profileCompleteness)).join("")}
                </div>
              </div>
            ` : `
              <div class="cabinet-mini-list">
                <article class="cabinet-mini-card">
                  <strong>Заказов пока нет</strong>
                  <span>Когда вы соберёте первую корзину или согласуете подбор, заказ появится здесь.</span>
                </article>
              </div>
              <div class="cabinet-home-actions">
                <a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("cart"))}">Открыть корзину</a>
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("catalog"))}">Открыть каталог</a>
              </div>
            `}
          </section>
        </div>
      </div>
    </div>
  `;
}

async function renderMemberDocumentsSection(session) {
  const ordersResult = await loadMemberOrders().catch(() => []);
  const canOpenOrders = sessionHasSection(session, "orders");
  const orders = Array.isArray(ordersResult) ? ordersResult : [];
  const orderDocumentGroups = await Promise.all(
    orders.map(async (order) => ({
      order,
      documents: await loadMemberOrderDocuments(order.id).catch(() => []),
    })),
  );
  const totalOrderDocuments = orderDocumentGroups.reduce((sum, entry) => sum + entry.documents.length, 0);
  const readyOrderDocuments = orderDocumentGroups.reduce(
    (sum, entry) => sum + entry.documents.filter((item) => String(item.status || "").toLowerCase() === "ready").length,
    0,
  );
  const availableDocuments = orderDocumentGroups.flatMap(({ order, documents }) => (Array.isArray(documents) ? documents : [])
    .map((item) => ({
      ...item,
      orderTitle: order.title || `Заказ #${order.id || "—"}`,
      orderId: order.id,
      href: resolveOrderDocumentHref(item.file_url),
    }))
    .filter((item) => item.href));
  const pendingDocuments = Math.max(totalOrderDocuments - availableDocuments.length, 0);
  applyMemberShellPatch(session, {
    sectionId: "documents",
    sectionNote: availableDocuments.length
      ? `${availableDocuments.length} ${pluralizeRu(availableDocuments.length, "файл", "файла", "файлов")} уже можно скачать.`
      : "Документы появятся здесь, когда команда их подготовит.",
  });

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Документы</div>
        <h2 class="calc-card-title">Документы по заказам</h2>
        <p class="sublead">Счета, спецификации и PDF лежат здесь, чтобы вы открывали их в один клик.</p>
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Документы</div>
            <h3 class="calc-card-title">Доступные PDF по заказам</h3>
            <p class="sublead">Здесь лежат счёт, УПД, расчёт и другие файлы, которые уже можно открыть или скачать без перехода по карточкам.</p>
            <div class="cabinet-inline-meta">
              <span>${orders.length} ${pluralizeRu(orders.length, "заказ", "заказа", "заказов")}</span>
              <span>${availableDocuments.length} ${pluralizeRu(availableDocuments.length, "файл", "файла", "файлов")} доступно</span>
              <span>${pendingDocuments} ${pluralizeRu(pendingDocuments, "файл", "файла", "файлов")} готовится</span>
            </div>
            <div class="cabinet-home-actions">
              ${canOpenOrders ? `<a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>` : ""}
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Написать сообщение</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Открыть профиль</a>
            </div>
          </article>
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">Список документов</div>
            <h3 class="calc-card-title">Доступные файлы</h3>
            ${availableDocuments.length ? `
              <div class="cabinet-list cabinet-list--documents-window">
                <div class="cabinet-list-head cabinet-list-head--documents">
                  <span>Документ</span>
                  <span>Заказ</span>
                  <span>Готовность</span>
                  <span>Скачать</span>
                </div>
                <div class="cabinet-list-body">
                  ${availableDocuments.map(renderMemberAvailableDocumentRow).join("")}
                </div>
              </div>
            ` : orderDocumentGroups.length ? `
              <div class="cabinet-document-group-list">
                <article class="cabinet-mini-card">
                  <strong>Файлы ещё готовятся</strong>
                  <span>Как только команда добавит счёт, УПД или расчёт, они появятся здесь списком и будут доступны для скачивания.</span>
                </article>
              </div>
            ` : `
              <div class="cabinet-mini-list">
                <article class="cabinet-mini-card">
                  <strong>Заказов пока нет</strong>
                  <span>Когда появится первый заказ, его документы соберутся здесь одним списком.</span>
                </article>
              </div>
              <div class="cabinet-home-actions">
                ${canOpenOrders ? `<a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>` : ""}
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Проверить профиль</a>
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Написать сообщение</a>
              </div>
            `}
          </section>
        </div>
      </div>
    </div>
  `;
}

async function renderMemberCartSection(session) {
  const [profile, catalogItems] = await Promise.all([
    loadMemberProfile(session),
    loadMemberCatalogItems().catch(() => []),
  ]);
  const canOpenOrders = sessionHasSection(session, "orders");
  const cart = loadMemberCart();
  const savedIds = loadMemberSaved(session);
  const cartEntries = Object.entries(cart)
    .map(([productId, qty]) => {
      const product = catalogItems.find((item) => item.id === productId);
      return product ? { product, qty: Number(qty) || 0 } : null;
    })
    .filter(Boolean);
  const savedItems = savedIds
    .map((productId) => catalogItems.find((item) => item.id === productId))
    .filter(Boolean);
  const profileCompleteness = getMemberProfileCompleteness(profile);

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Корзина и сохранённое</div>
        <h2 class="calc-card-title">Корзина и сохранённое</h2>
        <p class="sublead">Здесь товары, которые вы уже выбрали или отложили на потом.</p>
      </div>
      <div class="cabinet-stat-grid cabinet-stat-grid--member">
        ${renderStatCard("В корзине", String(cartEntries.length), cartEntries.length ? "готово к сборке заказа" : "корзина пока пустая")}
        ${renderStatCard("Сохранено", String(savedItems.length), savedItems.length ? "отложили на потом" : "пока ничего не отложено")}
        ${renderStatCard("Профиль", `${profileCompleteness}/3`, profileCompleteness === 3 ? "всё заполнено" : "лучше дозаполнить")}
        ${renderStatCard("Каталог", String(catalogItems.length), catalogItems.length ? "позиции доступны" : "позиции пока не загружены")}
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">Корзина</div>
            <h3 class="calc-card-title">Текущие позиции к закупке</h3>
            ${cartEntries.length ? `
              <div class="cabinet-home-actions">
                ${canOpenOrders ? `<button class="btn btn-primary" type="button" data-member-create-order>Собрать заказ из корзины</button>` : `<a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Написать по корзине</a>`}
                ${canOpenOrders ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>` : `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Профиль и доставка</a>`}
              </div>
            ` : ""}
            ${cartEntries.length ? `
              <div class="cabinet-list">
                <div class="cabinet-list-head cabinet-list-head--catalog">
                  <span>Позиция</span>
                  <span>Количество</span>
                  <span>Что сделать</span>
                </div>
                <div class="cabinet-list-body">
                  ${cartEntries.map((entry) => `
                    <article class="cabinet-list-row cabinet-list-row--catalog">
                      <div class="cabinet-list-cell">
                        <strong>${escapeHtml(entry.product.title)}</strong>
                        <span>${escapeHtml(entry.product.summary || "Позиция в корзине")}</span>
                      </div>
                      <div class="cabinet-list-cell">
                        <strong>${escapeHtml(String(entry.qty))}</strong>
                        <span>${escapeHtml(humanizeMemberCatalogCategory(entry.product.category || entry.product.kind || ""))}</span>
                      </div>
                      <div class="cabinet-list-cell">
                        <strong><a href="${escapeAttribute(resolvePublicPath(entry.product.path))}">Открыть позицию</a></strong>
                        <span class="cabinet-inline-actions">
                          <button class="btn btn-ghost btn-ghost--small" type="button" data-member-cart-save="${escapeAttribute(entry.product.id)}">В сохранённое</button>
                          <button class="btn btn-ghost btn-ghost--small" type="button" data-member-cart-remove="${escapeAttribute(entry.product.id)}">Убрать</button>
                        </span>
                      </div>
                    </article>
                  `).join("")}
                </div>
              </div>
            ` : `
              <div class="cabinet-mini-list">
                <article class="cabinet-mini-card">
                  <strong>Корзина пока пустая</strong>
                  <span>Вернитесь в каталог с уже подобранными позициями или сохраните товары на потом.</span>
                </article>
              </div>
              <div class="cabinet-home-actions">
                <a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("catalog"))}">Открыть каталог</a>
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Написать по подбору</a>
              </div>
            `}
            ${cartEntries.length && !canOpenOrders ? `<div class="cabinet-inline-hint">Для этого доступа заказы не открыты. Если нужно собрать закупку, напишите нам из кабинета.</div>` : ""}
          </section>
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">Сохранённое</div>
            <h3 class="calc-card-title">Что отложили</h3>
            ${savedItems.length ? `
              <div class="cabinet-mini-list">
                ${savedItems.map((item) => `
                  <article class="cabinet-mini-card">
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${escapeHtml(item.summary || "Сохранённая позиция")}</span>
                    <div class="cabinet-home-actions">
                      <a class="btn btn-secondary" href="${escapeAttribute(resolvePublicPath(item.path))}">Открыть позицию</a>
                      <button class="btn btn-ghost btn-ghost--small" type="button" data-member-saved-move="${escapeAttribute(item.id)}">Вернуть в корзину</button>
                    </div>
                  </article>
                `).join("")}
              </div>
            ` : `
              <div class="cabinet-mini-list">
                <article class="cabinet-mini-card">
                  <strong>Пока ничего не отложено</strong>
                  <span>Когда сохраните интересные позиции, они появятся здесь и будут ждать следующего шага.</span>
                </article>
              </div>
            `}
          </section>
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Перед заказом</div>
            <h3 class="calc-card-title">Что проверить заранее</h3>
            <ul class="cabinet-note-list">
              <li>${profileCompleteness === 3 ? "Профиль заполнен, можно переходить к заказу." : "Добавьте email, телефон и адрес доставки."}</li>
              <li>Если сомневаетесь по позиции, напишите нам до оформления.</li>
            </ul>
            <div class="cabinet-home-actions">
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Профиль и доставка</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Связь</a>
            </div>
          </article>
        </div>
      </div>
    </div>
  `;
}

async function renderMemberMessagesSection(session) {
  const messages = await loadMemberMessages().catch(() => []);
  const supportPhone = settings.site?.supportPhone || DEFAULT_SETTINGS.site.supportPhone;
  const supportEmail = settings.site?.supportEmail || DEFAULT_SETTINGS.site.supportEmail;
  const supportTelegram = settings.site?.supportTelegram || DEFAULT_SETTINGS.site.supportTelegram;
  const supportTelegramUrl = settings.site?.supportTelegramUrl || DEFAULT_SETTINGS.site.supportTelegramUrl;
  const timeline = [...messages].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  const latestTeamMessage = findLatestTeamMessage(timeline);
  applyMemberShellPatch(session, {
    sectionId: "messages",
    sectionNote: latestTeamMessage
      ? `Есть свежий ответ от команды: ${formatAuditTimestamp(latestTeamMessage.created_at || "")}.`
      : "Диалог открыт. Напишите, если нужен следующий шаг по подбору, заказу или документам.",
  });

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Сообщения</div>
        <h2 class="calc-card-title">Связь с командой</h2>
        <p class="sublead">Здесь один человеческий диалог по подбору, заказу и документам без сложной тикетной логики.</p>
      </div>
      <section class="card card-pad cabinet-card cabinet-message-panel">
        <div class="cabinet-kicker">Диалог</div>
        <h3 class="calc-card-title">Один чат по проекту</h3>
        <div class="cabinet-message-shell">
          <div class="cabinet-message-window">
            ${timeline.length ? `
              <div class="cabinet-message-thread">
                ${timeline.map((item) => renderMemberMessageItem(item, latestTeamMessage?.id)).join("")}
              </div>
            ` : `
              <div class="cabinet-message-empty">
                <strong>Сообщений пока нет</strong>
                <span>Напишите вопрос по подбору, заказу или документам. Ответ появится здесь же.</span>
              </div>
            `}
          </div>
          <div class="cabinet-message-composer">
            <label class="cabinet-field">
              <span class="cabinet-field-label">Тема</span>
              <input class="admin-input" data-member-message-subject type="text" value="Вопрос по проекту" />
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Сообщение</span>
              <textarea class="admin-textarea" data-member-message-body placeholder="Коротко: что нужно сделать?"></textarea>
            </label>
            <div class="cabinet-message-composer__actions">
              <button class="btn btn-primary" type="button" data-member-message-send>Отправить сообщение</button>
            </div>
            <div class="cabinet-users-status" data-member-message-status></div>
          </div>
        </div>
      </section>
      <section class="cabinet-section-grid cabinet-section-grid--compact">
        <article class="card card-pad cabinet-card cabinet-action-card">
          <div class="cabinet-kicker">Другие контакты</div>
          <h3 class="calc-card-title">Если нужен быстрый канал</h3>
          <p class="sublead">Для срочного вопроса удобнее начать с Telegram. Email и звонок тоже остаются под рукой.</p>
          <div class="cabinet-home-actions">
            <a class="btn btn-primary" href="${escapeAttribute(supportTelegramUrl)}" target="_blank" rel="noreferrer">Открыть Telegram</a>
            <a class="btn btn-secondary" href="mailto:${escapeAttribute(supportEmail)}">Email</a>
            <a class="btn btn-secondary" href="tel:${escapeAttribute(supportPhone.replace(/[^\d+]/g, ""))}">Позвонить</a>
          </div>
        </article>
        <article class="card card-pad cabinet-card cabinet-action-card">
          <div class="cabinet-kicker">Чтобы ответить быстрее</div>
          <ul class="cabinet-note-list">
            <li>Коротко опишите задачу в одном-двух предложениях.</li>
            <li>По товару добавьте ссылку, артикул или список позиций.</li>
            <li>По документам сразу укажите, какой файл нужен.</li>
          </ul>
        </article>
      </section>
    </div>
  `;
}

async function renderMemberProfileSection(session) {
  const profile = await loadMemberProfile(session);
  const userName = session.user.display_name || session.user.user_name || "Пользователь";
  const missingFields = getMemberProfileMissingFields(profile);
  const profileReady = missingFields.length === 0;
  applyMemberShellPatch(session, {
    sectionId: "profile",
    sectionNote: profileReady
      ? "Контакты и доставка заполнены. Профиль не мешает следующему шагу."
      : `Нужно добавить: ${missingFields.join(", ")}.`,
  });

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Профиль и доставка</div>
        <h2 class="calc-card-title">Профиль и доставка</h2>
        <p class="sublead">Контакты и доставка нужны, чтобы быстро собрать заказ, подготовить документы и не тормозить следующий шаг.</p>
      </div>
      <section class="card card-pad cabinet-card cabinet-profile-summary">
        <div class="cabinet-document-group__head">
          <div>
            <div class="cabinet-kicker">Статус профиля</div>
            <h3 class="calc-card-title">${profileReady ? "Профиль готов к заказу" : "Профиль заполнен не до конца"}</h3>
            <p class="sublead">${profileReady ? "Контакты и доставка уже заполнены. Можно спокойно двигаться дальше по заказу." : `Сейчас мешает: ${missingFields.join(", ")}.`}</p>
          </div>
          <div class="cabinet-inline-meta">
            <span>${userName}</span>
            <span>${profileReady ? "Можно оформлять заказ" : "Лучше дозаполнить сейчас"}</span>
          </div>
        </div>
        <div class="cabinet-mini-list cabinet-mini-list--compact">
          <article class="cabinet-mini-card">
            <strong>Контакты</strong>
            <span>${profile.email && profile.phone ? "Email и телефон уже на месте." : "Добавьте email и телефон, чтобы мы могли быстро связаться."}</span>
          </article>
          <article class="cabinet-mini-card">
            <strong>Доставка</strong>
            <span>${profile.delivery_address ? "Адрес доставки уже указан." : "Без адреса доставки заказ будет дольше двигаться дальше."}</span>
          </article>
          <article class="cabinet-mini-card">
            <strong>Уведомления</strong>
            <span>${profile.newsletter ? "Обновления по заказам и документам включены." : "Уведомления можно включить ниже."}</span>
          </article>
        </div>
      </section>
      <section class="cabinet-profile-layout">
        <article class="card card-pad cabinet-card cabinet-profile-card">
          <div class="cabinet-kicker">Контакты</div>
          <h3 class="calc-card-title">Как с вами связаться</h3>
          <div class="cabinet-field-grid">
            <label class="cabinet-field">
              <span class="cabinet-field-label">Имя</span>
              <input class="admin-input" data-member-profile="display_name" type="text" value="${escapeAttribute(profile.display_name || "")}" />
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Email</span>
              <input class="admin-input" data-member-profile="email" type="email" value="${escapeAttribute(profile.email || "")}" />
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Телефон</span>
              <input class="admin-input" data-member-profile="phone" type="text" value="${escapeAttribute(profile.phone || "")}" />
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Компания</span>
              <input class="admin-input" data-member-profile="company" type="text" value="${escapeAttribute(profile.company || "")}" />
            </label>
          </div>
        </article>
        <article class="card card-pad cabinet-card cabinet-profile-card">
          <div class="cabinet-kicker">Доставка</div>
          <h3 class="calc-card-title">Куда отправлять заказ</h3>
          <div class="cabinet-field-grid">
            <label class="cabinet-field cabinet-field--wide">
              <span class="cabinet-field-label">Адрес доставки</span>
              <textarea class="admin-textarea" data-member-profile="delivery_address" placeholder="Город, улица, склад или пункт выдачи">${escapeHtml(profile.delivery_address || "")}</textarea>
            </label>
            <label class="cabinet-field cabinet-field--wide">
              <span class="cabinet-field-label">Комментарий к доставке</span>
              <textarea class="admin-textarea" data-member-profile="delivery_comment" placeholder="Например: кто принимает и когда удобно привезти">${escapeHtml(profile.delivery_comment || "")}</textarea>
            </label>
          </div>
        </article>
        <section class="card card-pad cabinet-card cabinet-profile-card cabinet-profile-card--settings">
          <div class="cabinet-kicker">Настройки</div>
          <h3 class="calc-card-title">Сохранение и уведомления</h3>
          <label class="cabinet-checkbox-row">
            <input data-member-profile="newsletter" type="checkbox" ${profile.newsletter ? "checked" : ""} />
            <span>Получать обновления по заказам и документам.</span>
          </label>
          <div class="cabinet-inline-hint">${profileReady ? "Данные уже выглядят достаточно полными для следующего шага." : `Перед заказом лучше добавить: ${missingFields.join(", ")}.`}</div>
          <div class="cabinet-user-card-actions">
            <button class="btn btn-primary" type="button" data-member-profile-save>Сохранить данные</button>
            <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Нужна помощь</a>
          </div>
          <div class="cabinet-users-status" data-member-profile-status></div>
        </section>
      </section>
    </div>
  `;
}

async function renderAdminDashboard(session) {
  const role = normalizeCabinetRole(session.policy?.role || session.user.user_role || session.user.role || "admin");
  const data = await loadAdminDashboardData();
  if (role === "operator") return renderOperatorDashboard(session, data);
  if (role === "manager") return renderManagerDashboard(session, data);
  return renderOwnerDashboard(session, data);
}

function renderOwnerDashboard(session, data) {
  const revenueHref = sessionHasSection(session, "crm") ? cabinetSectionHref("crm") : cabinetSectionHref("dashboard");
  const catalogHref = sessionHasSection(session, "catalog") ? cabinetSectionHref("catalog") : cabinetSectionHref("dashboard");
  const pricingHref = sessionHasSection(session, "calc-prices") ? cabinetSectionHref("calc-prices") : cabinetSectionHref("dashboard");
  const siteHref = sessionHasSection(session, "site") ? cabinetSectionHref("site") : cabinetRoutes.site;
  const usersHref = sessionHasSection(session, "users") ? cabinetSectionHref("users") : cabinetSectionHref("dashboard");
  const urgentItems = [
    {
      tone: data.overdueTasks.length ? "danger" : "ok",
      title: "Просроченные задачи",
      note: data.overdueTasks.length ? `${data.overdueTasks.length} требуют реакции команды.` : "Срочных задач сейчас нет.",
      cta: "Открыть CRM",
      href: revenueHref,
    },
    {
      tone: data.unassignedLeads.length ? "warning" : "ok",
      title: "Лиды без ответственного",
      note: data.unassignedLeads.length ? `${data.unassignedLeads.length} ждут назначения.` : "Все лиды уже закреплены.",
      cta: "Назначить owner",
      href: revenueHref,
    },
    {
      tone: data.duplicateLeads.length ? "warning" : "ok",
      title: "Дубли и чистота базы",
      note: data.duplicateLeads.length ? `${data.duplicateLeads.length} записи требуют ручной проверки.` : "Подозрительных дублей не видно.",
      cta: "Проверить поток",
      href: revenueHref,
    },
    {
      tone: data.priceCount ? "ok" : "warning",
      title: "Цены калькулятора",
      note: data.priceCount ? `${data.priceCount} позиций доступны для расчёта.` : "Pricing пока пустой, расчётам не на что опираться.",
      cta: "Открыть цены",
      href: pricingHref,
    },
    {
      tone: data.syncIssues ? "warning" : "ok",
      title: "Сайт и каналы",
      note: data.syncIssues ? "Нужно проверить публикацию, формы и маршрут в CRM." : "Публикация и каналы работают штатно.",
      cta: "Открыть сайт",
      href: siteHref,
    },
  ];

  const healthItems = [
    {
      label: "CRM",
      state: data.crmAvailable ? "В работе" : (isCrmEnabled() ? "Недоступна" : "Выключена"),
      tone: data.crmAvailable ? "ok" : "warning",
      note: data.crmAvailable ? `${data.leads.length} лидов в live-выборке.` : (isCrmEnabled() ? "Нужно проверить интеграцию." : "Раздел отключён в настройках."),
    },
    {
      label: "Каталог",
      state: data.catalogItems.length ? "Собран" : "Пусто",
      tone: data.catalogItems.length ? "ok" : "warning",
      note: data.catalogItems.length ? `${data.catalogItems.length} позиций в базе.` : "Нет позиций для работы команды.",
    },
    {
      label: "Калькулятор",
      state: data.priceCount ? "Готов" : "Требует прохода",
      tone: data.priceCount ? "ok" : "warning",
      note: data.priceCount ? "Ценовой файл читается." : "В pricing не найдено ни одной позиции.",
    },
    {
      label: "Качество данных",
      state: data.syncIssues ? `${data.syncIssues} сигналов` : "Чисто",
      tone: data.syncIssues ? "warning" : "ok",
      note: data.syncIssues ? "Есть расхождения в CRM-данных." : "Критичных сигналов не видно.",
    },
  ];

  return `
    <div class="cabinet-section-stack cabinet-admin-page cabinet-owner-dashboard">
      <div class="cabinet-section-intro cabinet-section-intro--dashboard cabinet-admin-page__intro">
        <div class="tag">Сводка владельца</div>
        <h2 class="calc-card-title">Где деньги и что требует реакции</h2>
        <p class="sublead">${data.crmAvailable ? "Сначала срочное, затем воронка, команда и системные сигналы." : "CRM сейчас не даёт live-картину, поэтому фокус на каталоге, ценах и состоянии системы."}</p>
      </div>

      <section class="cabinet-owner-kpi-strip cabinet-owner-kpi-strip--executive">
        <a class="card card-pad cabinet-owner-kpi cabinet-owner-kpi--money" href="${escapeAttribute(revenueHref)}">
          <span class="cabinet-owner-kpi__label">Новые лиды</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(data.newLeads))}</strong>
          <span class="cabinet-owner-kpi__note">${escapeHtml(data.crmAvailable ? "требуют первого ответа или прохода по воронке" : "CRM сейчас не даёт live-выборку")}</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi cabinet-owner-kpi--money" href="${escapeAttribute(revenueHref)}">
          <span class="cabinet-owner-kpi__label">Потенциал воронки</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(formatRub(data.pipelineValue))}</strong>
          <span class="cabinet-owner-kpi__note">${escapeHtml(data.pipelineValue > 0 ? "по активным сделкам и стадиям" : "в CRM пока не отмечены суммы по активным сделкам")}</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi cabinet-owner-kpi--money" href="${escapeAttribute(revenueHref)}">
          <span class="cabinet-owner-kpi__label">Оплачено</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(formatRub(data.paidRevenue))}</strong>
          <span class="cabinet-owner-kpi__note">${escapeHtml(data.paidRevenue > 0 ? "по оплаченной стадии и закрытым сделкам" : "в CRM пока не отмечены оплаты")}</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi cabinet-owner-kpi--alert" href="${escapeAttribute(revenueHref)}">
          <span class="cabinet-owner-kpi__label">Просрочено и без движения</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(data.overdueTasks.length + data.unassignedLeads.length))}</strong>
          <span class="cabinet-owner-kpi__note">задачи и сделки, которые требуют прохода сейчас</span>
        </a>
      </section>

      <section class="cabinet-owner-grid">
        <article class="card card-pad cabinet-owner-panel cabinet-owner-panel--focus cabinet-admin-widget">
          <div class="cabinet-kicker">Что делать сейчас</div>
          <h3 class="calc-card-title">Срочные действия</h3>
          <div class="cabinet-owner-action-list">
            ${urgentItems.map(renderOwnerActionRow).join("")}
          </div>
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Состояние системы</div>
          <h3 class="calc-card-title">Что в норме, а что требует проверки</h3>
          <div class="cabinet-owner-health-list">
            ${healthItems.map(renderOwnerHealthItem).join("")}
          </div>
        </article>
      </section>

      <section class="cabinet-owner-grid cabinet-owner-grid--secondary">
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Воронка и деньги</div>
          <h3 class="calc-card-title">Куда смотреть дальше</h3>
          ${data.pipelinePreview.length ? `
            <div class="cabinet-owner-stage-list">
              ${data.pipelinePreview.map(renderOwnerPipelineRow).join("")}
            </div>
          ` : `<div class="account-empty">Стадии ещё не вернулись из CRM.</div>`}
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Команда</div>
          <h3 class="calc-card-title">Нагрузка по команде</h3>
          ${data.ownerPreview.length ? `
            <div class="cabinet-owner-team-list">
              ${data.ownerPreview.map(renderCrmWorkloadItem).join("")}
            </div>
          ` : `<div class="account-empty">Нагрузка по команде появится, когда CRM вернёт owner-workload.</div>`}
        </article>
      </section>

      <section class="cabinet-owner-grid cabinet-owner-grid--secondary">
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Очередь</div>
          <h3 class="calc-card-title">Что застряло без движения</h3>
          ${data.queuePreview.length ? `
            <div class="cabinet-owner-queue-list">
              ${data.queuePreview.map(renderCrmQueueItem).join("")}
            </div>
          ` : `<div class="account-empty">Очередь пуста или CRM пока не вернула элементы.</div>`}
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Ключевые сигналы</div>
          <h3 class="calc-card-title">Что открыть после срочного</h3>
          <div class="cabinet-owner-signal-list">
            <article class="cabinet-owner-signal">
              <strong>Калькулятор</strong>
              <span>${escapeHtml(data.priceCount ? `В pricing ${data.priceCount} ценовых позиций.` : "Ценовой слой пуст, расчёт не на что опереть.")}</span>
            </article>
            <article class="cabinet-owner-signal">
              <strong>Последний лид</strong>
              <span>${escapeHtml(data.latestLead?.title || data.latestLead?.name || "Последний лид ещё не подгрузился.")}</span>
            </article>
            <article class="cabinet-owner-signal">
              <strong>Ближайшая задача</strong>
              <span>${escapeHtml(data.latestTask?.title || data.latestTask?.subject || data.latestTask?.text || "Следующая задача появится здесь, когда CRM её вернёт.")}</span>
            </article>
          </div>
          <div class="cabinet-home-actions cabinet-home-actions--compact">
            ${sessionHasSection(session, "crm") ? `<a class="btn btn-primary" href="${escapeAttribute(revenueHref)}">Открыть CRM</a>` : ""}
            ${sessionHasSection(session, "catalog") ? `<a class="btn btn-secondary" href="${escapeAttribute(catalogHref)}">Каталог</a>` : ""}
            ${sessionHasSection(session, "calc-prices") ? `<a class="btn btn-secondary" href="${escapeAttribute(pricingHref)}">Цены</a>` : ""}
            ${sessionHasSection(session, "users") ? `<a class="btn btn-secondary" href="${escapeAttribute(usersHref)}">Пользователи</a>` : ""}
          </div>
        </article>
      </section>
    </div>
  `;
}

function renderManagerDashboard(session, data) {
  const crmHref = sessionHasSection(session, "crm") ? cabinetSectionHref("crm") : cabinetSectionHref("dashboard");
  const newTasks = data.tasks.filter((task) => {
    const state = String(task.due_state || task.status || task.follow_up_state || "").toLowerCase();
    return state.includes("today") || state.includes("new") || state.includes("planned");
  });
  return `
    <div class="cabinet-section-stack cabinet-admin-page cabinet-owner-dashboard cabinet-manager-dashboard">
      <div class="cabinet-section-intro cabinet-section-intro--dashboard">
        <div class="tag">Сводка менеджера</div>
        <h2 class="calc-card-title">Кому ответить и что довести до денег</h2>
        <p class="sublead">Экран менеджера держит в фокусе реакцию, просрочку и ближайшие шаги по сделкам.</p>
      </div>
      <section class="cabinet-owner-kpi-strip">
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(crmHref)}">
          <span class="cabinet-owner-kpi__label">Новые лиды</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(data.newLeads))}</strong>
          <span class="cabinet-owner-kpi__note">кто ждёт первого ответа</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(crmHref)}">
          <span class="cabinet-owner-kpi__label">Просрочено</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(data.overdueTasks.length))}</strong>
          <span class="cabinet-owner-kpi__note">что нельзя потерять</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(crmHref)}">
          <span class="cabinet-owner-kpi__label">Без owner</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(data.unassignedLeads.length))}</strong>
          <span class="cabinet-owner-kpi__note">нужна фиксация ответственного</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(crmHref)}">
          <span class="cabinet-owner-kpi__label">Сегодня</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(newTasks.length))}</strong>
          <span class="cabinet-owner-kpi__note">задач на день</span>
        </a>
      </section>
      <section class="cabinet-owner-grid">
        <article class="card card-pad cabinet-owner-panel cabinet-owner-panel--focus cabinet-admin-widget">
          <div class="cabinet-kicker">Нужна реакция</div>
          <h3 class="calc-card-title">Сначала отвечаем и двигаем этап</h3>
          <div class="cabinet-owner-action-list">
            ${[
              { tone: data.overdueTasks.length ? "danger" : "ok", title: "Просроченные follow-up", note: data.overdueTasks.length ? `${data.overdueTasks.length} задач висят без реакции.` : "Просрочки сейчас нет.", cta: "Открыть CRM", href: crmHref },
              { tone: data.unassignedLeads.length ? "warning" : "ok", title: "Без owner", note: data.unassignedLeads.length ? `${data.unassignedLeads.length} лидов ждут закрепления.` : "Все лиды распределены.", cta: "Разобрать", href: crmHref },
              { tone: data.duplicateLeads.length ? "warning" : "ok", title: "Дубли", note: data.duplicateLeads.length ? `${data.duplicateLeads.length} кандидатов на дубли.` : "Подозрительных дублей не видно.", cta: "Проверить", href: crmHref },
            ].map(renderOwnerActionRow).join("")}
          </div>
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Ближайшие записи</div>
          <h3 class="calc-card-title">Лиды и задачи на сейчас</h3>
          <div class="cabinet-owner-team-list">
            ${data.leadPreview.slice(0, 2).map(renderCrmLeadItem).join("")}
            ${data.taskPreview.slice(0, 2).map(renderCrmTaskItem).join("")}
          </div>
        </article>
      </section>
    </div>
  `;
}

function renderOperatorDashboard(session, data) {
  const crmHref = sessionHasSection(session, "crm") ? cabinetSectionHref("crm") : cabinetSectionHref("dashboard");
  const usersHref = sessionHasSection(session, "users") ? cabinetSectionHref("users") : cabinetSectionHref("dashboard");
  const siteHref = sessionHasSection(session, "site") ? cabinetSectionHref("site") : cabinetSectionHref("dashboard");
  return `
    <div class="cabinet-section-stack cabinet-admin-page cabinet-owner-dashboard cabinet-operator-dashboard">
      <div class="cabinet-section-intro cabinet-section-intro--dashboard">
        <div class="tag">Сводка оператора</div>
        <h2 class="calc-card-title">Очередь, подтверждения и обработка</h2>
        <p class="sublead">Операторский экран держит в фокусе очередь, просрочку, назначения и ошибки обработки.</p>
      </div>
      <section class="cabinet-owner-kpi-strip">
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(crmHref)}">
          <span class="cabinet-owner-kpi__label">Очередь</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(data.queuePreview.length))}</strong>
          <span class="cabinet-owner-kpi__note">элементов в работе</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(crmHref)}">
          <span class="cabinet-owner-kpi__label">Просрочено</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(data.overdueTasks.length))}</strong>
          <span class="cabinet-owner-kpi__note">нужно снять сегодня</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(usersHref)}">
          <span class="cabinet-owner-kpi__label">Без owner</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(data.unassignedLeads.length))}</strong>
          <span class="cabinet-owner-kpi__note">требуют назначения</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(siteHref)}">
          <span class="cabinet-owner-kpi__label">Сигналы</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(data.syncIssues))}</strong>
          <span class="cabinet-owner-kpi__note">нужно проверить</span>
        </a>
      </section>
      <section class="cabinet-owner-grid">
        <article class="card card-pad cabinet-owner-panel cabinet-owner-panel--focus cabinet-admin-widget">
          <div class="cabinet-kicker">Очередь</div>
          <h3 class="calc-card-title">Что обработать первым</h3>
          ${data.queuePreview.length ? `
            <div class="cabinet-owner-queue-list">
              ${data.queuePreview.map(renderCrmQueueItem).join("")}
            </div>
          ` : `<div class="account-empty">Очередь сейчас пуста.</div>`}
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Проверки</div>
          <h3 class="calc-card-title">Что нельзя пропустить</h3>
          <div class="cabinet-owner-action-list">
            ${[
              { tone: data.overdueTasks.length ? "danger" : "ok", title: "Просроченные follow-up", note: data.overdueTasks.length ? `${data.overdueTasks.length} задач без реакции.` : "Просрочек сейчас нет.", cta: "Открыть CRM", href: crmHref },
              { tone: data.unassignedLeads.length ? "warning" : "ok", title: "Лиды без owner", note: data.unassignedLeads.length ? `${data.unassignedLeads.length} записей ждут назначения.` : "Все записи закреплены.", cta: "Пользователи", href: usersHref },
              { tone: data.syncIssues ? "warning" : "ok", title: "Системные сигналы", note: data.syncIssues ? `${data.syncIssues} проблемных сигнала в данных.` : "Критичных сигналов не видно.", cta: "Сайт и публикация", href: siteHref },
            ].map(renderOwnerActionRow).join("")}
          </div>
        </article>
      </section>
    </div>
  `;
}

async function renderAdminCatalogSection(session) {
  const [items, snapshot, adminProducts] = await Promise.all([
    loadAdminCatalogItems(),
    loadAdminCatalogSnapshot(),
    loadAdminCatalogProducts(),
  ]);
  const categories = extractSnapshotCategories(snapshot);
  const products = extractSnapshotProducts(snapshot);
  const selectedSlug = new URLSearchParams(window.location.search).get("product") || adminProducts[0]?.slug || "";
  const selectedProduct = selectedSlug ? adminProducts.find((item) => item.slug === selectedSlug) || null : null;
  const draftCount = adminProducts.filter((item) => String(item.status || "").toLowerCase() === "draft").length;
  const publishedCount = adminProducts.filter((item) => String(item.status || "").toLowerCase() === "published").length;
  const hiddenCount = adminProducts.filter((item) => String(item.status || "").toLowerCase() === "hidden").length;

  return `
    <div class="cabinet-section-stack cabinet-admin-page cabinet-admin-page--catalog">
      <div class="cabinet-section-intro cabinet-admin-page__intro">
        <div class="tag">Каталог</div>
        <h2 class="calc-card-title">Каталог и товары</h2>
        <p class="sublead">Слева поиск, фильтры и рабочий список. Справа только редактор выбранной карточки без плавающих конфликтов и лишней дробности.</p>
      </div>
      <section class="card card-pad cabinet-admin-toolbar">
        <div class="cabinet-admin-toolbar__main">
          <label class="cabinet-admin-search">
            <span>Поиск</span>
            <input class="admin-input" type="search" data-catalog-manager-search placeholder="Название, slug, артикул, категория" />
          </label>
          <div class="cabinet-admin-filter-row">
            <button class="cabinet-filter-chip is-active" type="button" data-catalog-filter="all">Все ${adminProducts.length}</button>
            <button class="cabinet-filter-chip" type="button" data-catalog-filter="published">Опубликовано ${publishedCount}</button>
            <button class="cabinet-filter-chip" type="button" data-catalog-filter="draft">Черновики ${draftCount}</button>
            <button class="cabinet-filter-chip" type="button" data-catalog-filter="hidden">Скрытые ${hiddenCount}</button>
            <span class="cabinet-filter-chip is-static">${categories.length} категорий</span>
          </div>
        </div>
        <div class="cabinet-admin-toolbar__actions">
          <button class="btn btn-secondary btn-ghost--small" type="button" data-catalog-toolbar-create>Новый черновик</button>
          <a class="btn btn-secondary btn-ghost--small" href="${escapeAttribute(cabinetRoutes.catalog)}" target="_blank" rel="noopener noreferrer">Открыть магазин</a>
        </div>
      </section>
      <section class="cabinet-admin-split">
        <article class="card card-pad cabinet-admin-widget cabinet-admin-split__master cabinet-catalog-master">
          <div class="cabinet-kicker">База товаров</div>
          <h3 class="calc-card-title">Список товаров</h3>
          <div class="cabinet-inline-meta">
            <span>${products.length} товаров в storefront</span>
            <span>${categories.length} категорий</span>
            <span>${selectedProduct ? `Открыт: ${selectedProduct.name || selectedProduct.slug}` : "Выберите карточку"}</span>
          </div>
          <div class="cabinet-list">
            <div class="cabinet-list-head cabinet-list-head--catalog">
              <span>Позиция</span>
              <span>Slug</span>
              <span>Статус</span>
            </div>
            <div class="cabinet-list-body" data-catalog-manager-list>
              ${adminProducts.map((item) => renderAdminCatalogManagerRow(item, selectedSlug)).join("")}
            </div>
          </div>
        </article>
        <div class="cabinet-admin-split__detail">
          ${selectedProduct ? renderAdminCatalogProductEditor(selectedProduct, adminProducts) : `
            <article class="card card-pad cabinet-admin-widget">
              <div class="cabinet-kicker">Редактор</div>
              <h3 class="calc-card-title">Выберите товар слева</h3>
              <p class="sublead">После выбора справа откроется карточка с основными данными, медиа, SEO, связями и публикацией.</p>
            </article>
          `}
        </div>
      </section>
    </div>
  `;
}

async function renderCrmSection(session) {
  if (!isCrmEnabled()) {
    return renderCrmDisabledState();
  }
  let crmBundle;
  try {
    crmBundle = await loadCrmBundle();
  } catch (error) {
    return renderCrmOfflineState();
  }
  const [crmUsers, ownerQueue, ownerWorkload, duplicateLeads, dataQuality] = await Promise.all([
    loadCrmUsers().catch(() => []),
    loadCrmOwnerQueue().catch(() => []),
    loadCrmOwnerWorkload().catch(() => []),
    loadCrmDuplicateLeads().catch(() => []),
    loadCrmDataQuality().catch(() => null),
  ]);
  const pipelines = crmBundle?.pipelines || [];
  const leads = crmBundle?.leads || [];
  const tasks = crmBundle?.tasks || [];
  const statusItem = crmBundle?.status?.item || crmBundle?.status?.integration || null;
  const overdueTasks = tasks.filter((task) => String(task.due_state || task.follow_up_state || "").toLowerCase() === "overdue");
  const unassignedLeads = leads.filter((lead) => !String(lead.owner_name || lead.owner || lead.owner_id || "").trim());
  const myTasks = tasks.filter((task) => String(task.owner_name || task.owner || "").trim());
  const pipelinePreview = pipelines.slice(0, 4);
  const ownerPreview = ownerWorkload.slice(0, 4);
  const queuePreview = ownerQueue.slice(0, 5);
  const leadPreview = leads.slice(0, 4);
  const taskPreview = tasks.slice(0, 4);
  const duplicatePreview = duplicateLeads.slice(0, 3);
  const duplicateCount = duplicateLeads.length;
  const syncIssues = readCrmHealthCount(dataQuality);
  const crmMode = new URLSearchParams(window.location.search).get("mode") === "pipeline" ? "pipeline" : "overview";
  const modeTabs = [
    { id: "overview", label: "Обзор", note: "сигналы и ближайшие действия" },
    { id: "pipeline", label: "Воронка", note: "kanban и рабочий проход" },
  ];
  const pipelineColumns = (pipelines.length ? pipelines : [{ title: "Новые" }, { title: "В работе" }, { title: "Счёт" }, { title: "Оплачено" }]).slice(0, 4);

  return `
    <div class="cabinet-section-stack cabinet-crm-grid cabinet-admin-page">
      <div class="cabinet-section-intro cabinet-admin-page__intro">
        <div class="tag">CRM</div>
        <h2 class="calc-card-title">${crmMode === "pipeline" ? "Воронка и рабочие карточки" : "Обзор CRM"}</h2>
        <p class="sublead">${crmMode === "pipeline" ? "Колонки, поиск и быстрый проход по лидам без перехода в отдельный экран." : "Что пришло, что просрочено и где нужна реакция прямо сейчас."}</p>
      </div>
      <section class="card card-pad cabinet-admin-toolbar">
        <div class="cabinet-admin-toolbar__main">
          <div class="cabinet-admin-tabs">
            ${modeTabs.map((tab) => `<a class="cabinet-admin-tab${crmMode === tab.id ? " is-active" : ""}" href="${escapeAttribute(cabinetSectionHref("crm", { mode: tab.id }))}">${escapeHtml(tab.label)}</a>`).join("")}
          </div>
          <label class="cabinet-admin-search">
            <span>Поиск</span>
            <input class="admin-input" type="search" data-crm-search placeholder="Лид, ответственный, стадия" />
          </label>
          <div class="cabinet-admin-filter-row">
            <button class="cabinet-filter-chip is-active" type="button" data-crm-filter="all">Все ${leads.length + tasks.length}</button>
            <button class="cabinet-filter-chip" type="button" data-crm-filter="new">Новые ${countCrmNewLeads(leads)}</button>
            <button class="cabinet-filter-chip" type="button" data-crm-filter="overdue">Просрочено ${overdueTasks.length}</button>
            <button class="cabinet-filter-chip" type="button" data-crm-filter="unassigned">Без ответственного ${unassignedLeads.length}</button>
          </div>
        </div>
        <div class="cabinet-admin-toolbar__actions">
          <a class="btn btn-secondary btn-ghost--small" href="${escapeAttribute(cabinetSectionHref("users"))}">Ответственные</a>
          <a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("crm", { mode: crmMode }))}">Обновить экран</a>
        </div>
      </section>
      <div class="cabinet-owner-kpi-strip cabinet-owner-kpi-strip--executive">
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(cabinetSectionHref("crm", { mode: "overview" }))}">
          <span class="cabinet-owner-kpi__label">Лиды</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(leads.length))}</strong>
          <span class="cabinet-owner-kpi__note">${countCrmNewLeads(leads)} новых</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi cabinet-owner-kpi--alert" href="${escapeAttribute(cabinetSectionHref("crm", { mode: "overview" }))}">
          <span class="cabinet-owner-kpi__label">Просрочено</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(overdueTasks.length))}</strong>
          <span class="cabinet-owner-kpi__note">требуют реакции</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(cabinetSectionHref("crm", { mode: "overview" }))}">
          <span class="cabinet-owner-kpi__label">Без ответственного</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(unassignedLeads.length))}</strong>
          <span class="cabinet-owner-kpi__note">очередь без ответственного</span>
        </a>
        <a class="card card-pad cabinet-owner-kpi" href="${escapeAttribute(cabinetSectionHref("crm", { mode: "pipeline" }))}">
          <span class="cabinet-owner-kpi__label">Воронка</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(pipelineColumns.length))}</strong>
          <span class="cabinet-owner-kpi__note">${duplicateCount} кандидатов на дубли</span>
        </a>
      </div>
      ${crmMode === "overview" ? `
        <section class="cabinet-owner-grid">
          <article class="card card-pad cabinet-owner-panel cabinet-owner-panel--focus cabinet-admin-widget">
            <div class="cabinet-kicker">Что делать сейчас</div>
            <h3 class="calc-card-title">Ближайшие действия</h3>
            <div class="cabinet-owner-action-list">
              ${[
                { tone: overdueTasks.length ? "danger" : "ok", title: "Просроченные задачи", note: overdueTasks.length ? `${overdueTasks.length} задач ждут реакции.` : "Срочных задач сейчас нет.", cta: "Открыть CRM", href: cabinetSectionHref("crm", { mode: "overview" }) },
                { tone: unassignedLeads.length ? "warning" : "ok", title: "Лиды без ответственного", note: unassignedLeads.length ? `${unassignedLeads.length} лидов ждут закрепления.` : "Все лиды уже назначены.", cta: "Назначить", href: cabinetSectionHref("users") },
                { tone: duplicateCount ? "warning" : "ok", title: "Чистота базы", note: duplicateCount ? `${duplicateCount} кандидатов на дубли.` : "Подозрительных дублей не видно.", cta: "Проверить", href: cabinetSectionHref("crm", { mode: "overview" }) },
              ].map(renderOwnerActionRow).join("")}
            </div>
          </article>
          <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
            <div class="cabinet-kicker">Статус CRM</div>
            <h3 class="calc-card-title">Сигналы и поток</h3>
            <div class="cabinet-owner-health-list">
              ${[
                { label: "Интеграция", state: statusItem ? "Онлайн" : "Проверить", tone: statusItem ? "ok" : "warning", note: statusItem ? "CRM отвечает и отдаёт выборку." : "Статус не прочитался." },
                { label: "Очередь", state: queuePreview.length ? `${queuePreview.length} в очереди` : "Пусто", tone: queuePreview.length ? "warning" : "ok", note: queuePreview.length ? "Есть лиды, которые лучше разобрать сейчас." : "Очередь сейчас чистая." },
                { label: "Качество данных", state: syncIssues ? `${syncIssues} сигналов` : "Чисто", tone: syncIssues ? "warning" : "ok", note: syncIssues ? "Есть проблемы в CRM-данных." : "Критичных сигналов не видно." },
              ].map(renderOwnerHealthItem).join("")}
            </div>
          </article>
        </section>
        <section class="cabinet-owner-grid cabinet-owner-grid--secondary">
          <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
            <div class="cabinet-kicker">Лиды</div>
            <h3 class="calc-card-title">Новые и без ответственного</h3>
            <div class="cabinet-mini-list cabinet-mini-list--tight" data-crm-search-scope="cards">
              ${leadPreview.slice(0, 4).map((lead) => renderCrmLeadCard(lead)).join("")}
            </div>
          </article>
          <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
            <div class="cabinet-kicker">Задачи</div>
            <h3 class="calc-card-title">Просрочка и ближайшие касания</h3>
            <div class="cabinet-mini-list cabinet-mini-list--tight" data-crm-search-scope="cards">
              ${taskPreview.slice(0, 4).map((task) => renderCrmTaskCard(task)).join("")}
            </div>
          </article>
        </section>
      ` : `
        <section class="cabinet-owner-grid">
          <article class="card card-pad cabinet-owner-panel cabinet-owner-panel--focus cabinet-admin-widget">
            <div class="cabinet-kicker">Следующий проход</div>
            <h3 class="calc-card-title">Как идти по воронке сейчас</h3>
            <div class="cabinet-owner-action-list">
              ${[
                { tone: overdueTasks.length ? "danger" : "ok", title: "Снять просрочку", note: overdueTasks.length ? `${overdueTasks.length} задач мешают движению по стадиям.` : "Просроченные задачи не мешают текущему проходу.", cta: "Обзор CRM", href: cabinetSectionHref("crm", { mode: "overview" }) },
                { tone: unassignedLeads.length ? "warning" : "ok", title: "Назначить ответственных", note: unassignedLeads.length ? `${unassignedLeads.length} лидов нельзя провести дальше без owner.` : "Все карточки уже закреплены.", cta: "Пользователи", href: cabinetSectionHref("users") },
                { tone: duplicateCount ? "warning" : "ok", title: "Проверить дубли", note: duplicateCount ? `${duplicateCount} кандидатов на дубли мешают чистому канбану.` : "Дубли не мешают рабочему проходу.", cta: "Обзор CRM", href: cabinetSectionHref("crm", { mode: "overview" }) },
              ].map(renderOwnerActionRow).join("")}
            </div>
          </article>
          <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
            <div class="cabinet-kicker">Срез по потоку</div>
            <h3 class="calc-card-title">Что видно до открытия карточек</h3>
            <div class="cabinet-owner-health-list">
              ${[
                { label: "Колонки", state: `${pipelineColumns.length}`, tone: "ok", note: "Базовая канбан-структура уже собрана." },
                { label: "Очередь", state: queuePreview.length ? `${queuePreview.length} в очереди` : "Чисто", tone: queuePreview.length ? "warning" : "ok", note: queuePreview.length ? "Есть карточки, которые лучше разобрать до канбана." : "Лишнего навеса над воронкой нет." },
                { label: "Команда", state: ownerPreview.length ? `${ownerPreview.length} owner` : "Нет данных", tone: ownerPreview.length ? "ok" : "warning", note: ownerPreview.length ? "Нагрузка по owner уже видна." : "CRM не вернула owner-workload." },
              ].map(renderOwnerHealthItem).join("")}
            </div>
          </article>
        </section>
        <section class="card card-pad cabinet-admin-widget cabinet-crm-kanban-shell">
          <div class="cabinet-kicker">Воронка</div>
          <h3 class="calc-card-title">Воронка лидов</h3>
          <div class="cabinet-crm-kanban">
            ${pipelineColumns.map((column) => {
              const stageLeads = leads.filter((lead) => crmStageMatches(column, lead)).slice(0, 5);
              return `
                <section class="cabinet-crm-column">
                  <header class="cabinet-crm-column__head">
                    <strong>${escapeHtml(column.title || column.name || column.code || "Стадия")}</strong>
                    <span>${escapeHtml(String(stageLeads.length))}</span>
                  </header>
                  <div class="cabinet-crm-column__body" data-crm-search-scope="cards">
                    ${stageLeads.length ? stageLeads.map((lead) => renderCrmLeadCard(lead)).join("") : `<div class="cabinet-empty">Пусто</div>`}
                  </div>
                </section>
              `;
            }).join("")}
          </div>
        </section>
      `}
    </div>
  `;
}

function renderCrmLeadCard(lead) {
  const title = lead.name || lead.title || lead.request_name || `Лид #${lead.id || "—"}`;
  const summary = lead.request_type || lead.message || lead.note || "Без краткого описания";
  const owner = lead.owner_name || lead.owner || "Без ответственного";
  const stage = lead.status_name || lead.status_code || lead.status || lead.pipeline_stage || "Без стадии";
  const amount = readCrmMoneyValue(lead);
  const searchIndex = [title, summary, owner, stage, lead.phone, lead.email, lead.telegram].filter(Boolean).join(" ").toLowerCase();
  const tags = [
    countCrmNewLeads([lead]) ? "new" : "",
    !String(lead.owner_name || lead.owner || lead.owner_id || "").trim() ? "unassigned" : "",
  ].filter(Boolean).join(" ");

  return `
    <article class="cabinet-crm-card" data-crm-card data-crm-search-index="${escapeAttribute(searchIndex)}" data-crm-tags="${escapeAttribute(tags)}">
      <div class="cabinet-crm-card__main">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(summary)}</span>
      </div>
      <div class="cabinet-inline-meta">
        <span>${escapeHtml(owner)}</span>
        <span>${escapeHtml(stage)}</span>
        ${amount > 0 ? `<span>${escapeHtml(formatRub(amount))}</span>` : ""}
      </div>
    </article>
  `;
}

function renderCrmTaskCard(task) {
  const title = task.title || task.subject || task.text || "Задача CRM";
  const entity = task.lead_name || task.lead_title || task.entity_name || "Без привязки к лиду";
  const owner = task.owner_name || task.owner || "Без ответственного";
  const dueState = String(task.due_state || task.follow_up_state || task.status || "planned").toLowerCase();
  const dueLabel = dueState === "overdue" ? "Просрочено" : task.due_state || task.follow_up_state || task.status || "Запланировано";
  const searchIndex = [title, entity, owner, dueLabel].filter(Boolean).join(" ").toLowerCase();
  const tags = [
    dueState === "overdue" ? "overdue" : "",
  ].filter(Boolean).join(" ");

  return `
    <article class="cabinet-crm-card cabinet-crm-card--task" data-crm-card data-crm-search-index="${escapeAttribute(searchIndex)}" data-crm-tags="${escapeAttribute(tags)}">
      <div class="cabinet-crm-card__main">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(entity)}</span>
      </div>
      <div class="cabinet-inline-meta">
        <span>${escapeHtml(owner)}</span>
        <span>${escapeHtml(dueLabel)}</span>
      </div>
    </article>
  `;
}

function crmStageMatches(column, lead) {
  const stageLabel = String(column?.title || column?.name || column?.code || "").trim().toLowerCase();
  const leadStage = [
    lead?.status_name,
    lead?.status_code,
    lead?.status,
    lead?.pipeline_stage,
    lead?.pipeline_name,
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);
  if (!stageLabel) return true;
  if (!leadStage.length) return stageLabel.includes("нов");
  return leadStage.some((value) => value === stageLabel || value.includes(stageLabel) || stageLabel.includes(value));
}

function applyCrmCardFilters() {
  const searchField = document.querySelector("[data-crm-search]");
  const activeFilter = document.querySelector("[data-crm-filter].is-active")?.dataset.crmFilter || "all";
  const needle = String(searchField?.value || "").trim().toLowerCase();

  document.querySelectorAll("[data-crm-card]").forEach((card) => {
    const searchIndex = String(card.getAttribute("data-crm-search-index") || "");
    const tags = String(card.getAttribute("data-crm-tags") || "");
    const matchesSearch = !needle || searchIndex.includes(needle);
    const matchesFilter = activeFilter === "all" || tags.split(/\s+/).includes(activeFilter);
    card.hidden = !(matchesSearch && matchesFilter);
  });

  document.querySelectorAll(".cabinet-crm-column").forEach((column) => {
    const visible = Array.from(column.querySelectorAll("[data-crm-card]")).some((card) => !card.hidden);
    const empty = column.querySelector(".cabinet-empty");
    column.classList.toggle("is-empty", !visible);
    if (empty) empty.hidden = visible;
  });
}

function bindAdminCrmSection() {
  const searchField = document.querySelector("[data-crm-search]");
  if (searchField) {
    searchField.addEventListener("input", applyCrmCardFilters);
  }
  document.querySelectorAll("[data-crm-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-crm-filter]").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      applyCrmCardFilters();
    });
  });
  applyCrmCardFilters();
}

function bindAdminAuditSection() {
  const apply = () => applyAdminAuditFilters();
  document.querySelectorAll("[data-audit-filter]").forEach((field) => {
    field.addEventListener("input", apply);
    field.addEventListener("change", apply);
  });
  document.querySelectorAll("[data-audit-segment]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-audit-segment]").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      apply();
    });
  });
  apply();
}

function applyAdminAuditFilters() {
  const action = String(document.querySelector('[data-audit-filter="action"]')?.value || "").trim();
  const actor = String(document.querySelector('[data-audit-filter="actor"]')?.value || "").trim();
  const area = String(document.querySelector('[data-audit-filter="area"]')?.value || "").trim();
  const from = String(document.querySelector('[data-audit-filter="from"]')?.value || "").trim();
  const to = String(document.querySelector('[data-audit-filter="to"]')?.value || "").trim();
  const segment = document.querySelector("[data-audit-segment].is-active")?.dataset.auditSegment || "all";
  let visibleCount = 0;

  document.querySelectorAll("[data-audit-row]").forEach((row) => {
    const rowAction = String(row.getAttribute("data-audit-action") || "");
    const rowActor = String(row.getAttribute("data-audit-actor") || "");
    const rowArea = String(row.getAttribute("data-audit-area") || "");
    const rowDate = String(row.getAttribute("data-audit-date") || "");
    const rowSegment = String(row.getAttribute("data-audit-segment") || "");
    const matches =
      (!action || rowAction === action)
      && (!actor || rowActor === actor)
      && (!area || rowArea === area)
      && (segment === "all" || rowSegment === segment)
      && (!from || (rowDate && rowDate >= from))
      && (!to || (rowDate && rowDate <= to));
    row.hidden = !matches;
    if (matches) visibleCount += 1;
  });

  const counter = document.querySelector("[data-audit-visible-count]");
  if (counter) counter.textContent = `${visibleCount} видно`;
}

function bindAdminTopbarSearch(session) {
  const field = document.querySelector("[data-cabinet-admin-search]");
  if (!field || field.dataset.adminSearchBound) return;
  field.dataset.adminSearchBound = "true";

  const mirrorLocalSearch = () => {
    const localSearch = document.querySelector("[data-catalog-manager-search], [data-crm-search], [data-user-search]");
    if (!localSearch || localSearch === field) return false;
    localSearch.value = field.value;
    localSearch.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  };

  field.addEventListener("input", () => {
    mirrorLocalSearch();
  });

  field.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const query = String(field.value || "").trim().toLowerCase();
    if (!query) return;
    if (mirrorLocalSearch()) return;
    const nextSection = getAllowedSections(session).find((section) => {
      const haystack = `${section.label || ""} ${section.note || ""}`.toLowerCase();
      return haystack.includes(query);
    });
    if (nextSection) {
      window.location.href = cabinetSectionHref(nextSection.id);
    }
  });
}

function renderCrmOfflineState() {
  return `
    <div class="cabinet-section-stack cabinet-crm-grid">
      <div class="cabinet-section-intro">
        <div class="tag">CRM</div>
        <h2 class="calc-card-title">Поток лидов</h2>
        <p class="sublead">Подключение сейчас недоступно.</p>
      </div>
      <article class="card card-pad cabinet-home-card cabinet-crm-primary">
        <div class="cabinet-kicker">Статус</div>
        <h3 class="calc-card-title">Данные пока не загружены</h3>
        <div class="cabinet-inline-hint">Раздел открыт, но подключение недоступно.</div>
        <div class="cabinet-home-actions">
          ${currentSessionHasSection("dashboard") ? `<a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("dashboard"))}">Назад</a>` : ""}
        </div>
      </article>
    </div>
  `;
}

function renderCrmDisabledState() {
  return `
    <div class="cabinet-section-stack cabinet-crm-grid">
      <div class="cabinet-section-intro">
        <div class="tag">CRM</div>
        <h2 class="calc-card-title">Поток лидов</h2>
        <p class="sublead">Раздел выключен в настройках.</p>
      </div>
      <article class="card card-pad cabinet-home-card cabinet-crm-primary">
        <div class="cabinet-kicker">Статус</div>
        <h3 class="calc-card-title">Раздел отключён</h3>
        <div class="cabinet-inline-hint">Включите его в backend, чтобы увидеть лиды и задачи.</div>
        <div class="cabinet-home-actions">
          ${currentSessionHasSection("dashboard") ? `<a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("dashboard"))}">Назад</a>` : ""}
          ${currentSessionHasSection("site") ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("site"))}">Настройки</a>` : ""}
        </div>
      </article>
    </div>
  `;
}

async function renderCalcPricesSection(session) {
  const pricing = await loadCalcPricing().catch(() => null);
  const pricingAvailable = Boolean(pricing);
  const optionGroups = Array.isArray(pricing?.optionGroups) ? pricing.optionGroups : [];
  const presets = Array.isArray(pricing?.presets) ? pricing.presets : [];
  const constants = pricing?.constants ? Object.keys(pricing.constants).length : 0;
  const inputs = pricing?.inputs ? Object.keys(pricing.inputs).length : 0;
  const topDrivers = [...optionGroups]
    .filter((item) => Number(item.unitPrice || 0) > 0)
    .sort((a, b) => Number(b.unitPrice || 0) - Number(a.unitPrice || 0))
    .slice(0, 6);
  const defaultInputs = Object.entries(pricing?.inputs || {}).slice(0, 6);
  const constantPreview = flattenPricingConstantPreview(pricing?.constants || {}).slice(0, 6);
  const missingDrivers = optionGroups.filter((item) => !(Number(item.unitPrice || 0) > 0)).slice(0, 6);
  const includedByDefault = optionGroups.filter((item) => item.includedByDefault);

  return `
    <div class="cabinet-section-stack cabinet-admin-page cabinet-admin-page--pricing">
      <div class="cabinet-section-intro cabinet-admin-page__intro">
        <div class="tag">Цены калькулятора</div>
        <h2 class="calc-card-title">Цены калькулятора</h2>
        <p class="sublead">${pricingAvailable ? "Здесь видно, что сильнее всего влияет на расчёт: ценовые драйверы, константы, вводные по умолчанию и пустые места модели." : "Файл pricing сейчас не прочитался. Редактор всё равно можно открыть отдельно."}</p>
      </div>
      <div class="cabinet-stat-grid">
        ${renderStatCard("Драйверы", String(optionGroups.length), "ценовые группы и опции")}
        ${renderStatCard("Константы", String(constants), "структурные параметры модели")}
        ${renderStatCard("Вводные", String(inputs), "стартовые значения")}
        ${renderStatCard("Пресеты", String(presets.length), "готовые размеры")}
      </div>
      <section class="cabinet-owner-grid">
        <article class="card card-pad cabinet-owner-panel cabinet-owner-panel--focus cabinet-admin-widget">
          <div class="cabinet-kicker">Что влияет сильнее всего</div>
          <h3 class="calc-card-title">Главные драйверы расчёта</h3>
          ${topDrivers.length ? `
            <div class="cabinet-mini-list cabinet-mini-list--tight">
              ${topDrivers.map((item) => renderCalcPriceItem(item)).join("")}
            </div>
          ` : `<div class="account-empty">${pricingAvailable ? "В модели нет ни одного драйвера с ценой. Проверьте optionGroups." : "Не удалось прочитать pricing.json из этого окружения."}</div>`}
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Что включено по умолчанию</div>
          <h3 class="calc-card-title">Базовый состав модели</h3>
          <div class="cabinet-mini-list cabinet-mini-list--tight">
            ${includedByDefault.length
              ? includedByDefault.slice(0, 6).map((item) => `
                <article class="cabinet-mini-card">
                  <strong>${escapeHtml(item.label || item.id || "Опция")}</strong>
                  <span>${escapeHtml(item.note || "Входит в стартовый расчёт")} · ${escapeHtml(formatRub(Number(item.unitPrice || 0)))}</span>
                </article>
              `).join("")
              : '<div class="account-empty">В pricing нет групп, включённых по умолчанию.</div>'}
          </div>
        </article>
      </section>
      <section class="cabinet-owner-grid cabinet-owner-grid--secondary">
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Вводные</div>
          <h3 class="calc-card-title">Стартовые значения калькулятора</h3>
          <div class="cabinet-mini-list cabinet-mini-list--tight">
            ${defaultInputs.map(([key, value]) => {
              const meta = getCalcInputMeta(key);
              return `
                <article class="cabinet-mini-card">
                  <strong>${escapeHtml(meta.label)}</strong>
                  <span>${escapeHtml(`${formatPricingValue(value)} ${meta.unit}`.trim())} · ${escapeHtml(meta.note)}</span>
                </article>
              `;
            }).join("")}
          </div>
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Константы</div>
          <h3 class="calc-card-title">Какие блоки держат модель</h3>
          <div class="cabinet-mini-list cabinet-mini-list--tight">
            ${constantPreview.length
              ? constantPreview.map((item) => `
                <article class="cabinet-mini-card">
                  <strong>${escapeHtml(item.label)}</strong>
                  <span>${escapeHtml(item.value)}</span>
                </article>
              `).join("")
              : '<div class="account-empty">Константы не прочитались.</div>'}
          </div>
        </article>
      </section>
      <section class="cabinet-owner-grid cabinet-owner-grid--secondary">
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Что ещё пусто</div>
          <h3 class="calc-card-title">Позиции, которые стоит проверить</h3>
          <div class="cabinet-mini-list cabinet-mini-list--tight">
            ${missingDrivers.length
              ? missingDrivers.map((item) => `
                <article class="cabinet-mini-card">
                  <strong>${escapeHtml(item.label || item.id || "Опция")}</strong>
                  <span>${escapeHtml(item.note || "Цена пока не указана")} · unitPrice = 0</span>
                </article>
              `).join("")
              : '<div class="account-empty">Явно пустых драйверов цены не видно.</div>'}
          </div>
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Быстрые действия</div>
          <h3 class="calc-card-title">Куда идти после этого экрана</h3>
          <div class="cabinet-owner-action-list">
            ${[
              { tone: topDrivers.length ? "ok" : "warning", title: "Проверить дорогие группы", note: topDrivers.length ? `Сверьте ${topDrivers.length} самых тяжёлых драйверов с реальной экономикой.` : "Сначала задайте unitPrice у optionGroups.", cta: "Редактор pricing", href: cabinetRoutes.calcAdmin },
              { tone: presets.length ? "ok" : "warning", title: "Сверить пресеты", note: presets.length ? `${presets.length} базовых размеров влияют на стартовую конфигурацию.` : "В модели нет пресетов.", cta: "Калькулятор", href: cabinetRoutes.calc },
              { tone: constants ? "ok" : "warning", title: "Проверить константы", note: constants ? `${constants} блоков управляют геометрией, энергией и экономикой.` : "Константы не загружены.", cta: "Сводка", href: cabinetSectionHref("dashboard") },
            ].map(renderOwnerActionRow).join("")}
          </div>
        </article>
      </section>
      <div class="account-actions">
        <a class="btn btn-primary" href="${escapeAttribute(cabinetRoutes.calcAdmin)}">Открыть редактор pricing.json</a>
        <a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.calc)}">Открыть калькулятор</a>
        ${sessionHasSection(session, "dashboard") ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("dashboard"))}">Открыть кабинет</a>` : ""}
      </div>
    </div>
  `;
}

function readCalcPricingDriverCount(pricing) {
  const directItems = Array.isArray(pricing?.items) ? pricing.items.length : 0;
  if (directItems) return directItems;
  return Array.isArray(pricing?.optionGroups) ? pricing.optionGroups.length : 0;
}

function getCalcInputMeta(key) {
  const labels = {
    a0: { label: "Ширина помещения", unit: "м", note: "влияет на число рядов" },
    a1: { label: "Длина помещения", unit: "м", note: "влияет на число секций" },
    a2: { label: "Высота помещения", unit: "м", note: "влияет на плотность посадки" },
    a3: { label: "Цена 1 кВт", unit: "руб/кВт", note: "влияет на энергетику" },
    a4: { label: "Аренда", unit: "руб/м²", note: "влияет на ежемесячную экономику" },
    a5: { label: "Цена ягоды", unit: "руб/кг", note: "влияет на выручку" },
  };
  return labels[key] || { label: key, unit: "", note: "значение по умолчанию" };
}

function formatPricingValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
  }
  return String(value ?? "");
}

function flattenPricingConstantPreview(constants = {}) {
  return Object.entries(constants).map(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const inner = Object.entries(value).slice(0, 2).map(([innerKey, innerValue]) => `${innerKey}: ${formatPricingValue(innerValue)}`).join(" · ");
      return { label: key, value: inner || "объект параметров" };
    }
    if (Array.isArray(value)) {
      return { label: key, value: `${value.length} ${pluralizeRu(value.length, "элемент", "элемента", "элементов")}` };
    }
    return { label: key, value: formatPricingValue(value) };
  });
}

async function renderAdminSiteSection(session) {
  const response = await fetchJson(`${apiBase()}/admin/settings`);
  const settingsAvailable = response.ok;
  const settingsPayload = settingsAvailable ? (response.data.settings || {}) : {};
  const pages = Array.isArray(settingsPayload.pages) ? settingsPayload.pages : [];
  const forms = settingsPayload.forms || {};
  const seo = settingsPayload.seo || {};
  const crm = settingsPayload.crm || {};
  const integrations = settingsPayload.integrations || {};
  const site = settingsPayload.site || {};
  const publishedPages = pages.filter((item) => String(item.status || "").toLowerCase() === "published").length;
  const enabledFormFields = [
    forms.collectEmail,
    forms.collectPhone,
    forms.collectTelegram,
    forms.collectStage,
  ].filter(Boolean).length;
  const visiblePages = pages.slice(0, 5);
  const extraPages = Math.max(0, pages.length - visiblePages.length);
  const seoReady = Boolean(seo.canonicalOrigin) && Boolean(seo.includeSitemap);
  const formReady = Boolean(forms.primaryChannel || forms.mode);
  const crmReady = Boolean(crm.enabled || crm.primaryChannel || forms.primaryChannel);
  const integrationReady = Boolean(integrations.catalogSource || integrations.futureCms);

  return `
    <div class="cabinet-section-stack cabinet-admin-page">
      <div class="cabinet-section-intro cabinet-admin-page__intro">
        <div class="tag">Сайт и настройки</div>
        <h2 class="calc-card-title">Сайт и публикация</h2>
        <p class="sublead">${settingsAvailable ? "Публикация, формы, маршрут заявки и каналы связаны в один рабочий экран без справочных блоков." : "Настройки backend сейчас не ответили. Можно открыть публичный сайт и вернуться к разделу позже."}</p>
      </div>
      <div class="cabinet-owner-kpi-strip cabinet-owner-kpi-strip--executive">
        <article class="card card-pad cabinet-owner-kpi">
          <span class="cabinet-owner-kpi__label">Страницы</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(pages.length))}</strong>
          <span class="cabinet-owner-kpi__note">${publishedPages} опубликовано</span>
        </article>
        <article class="card card-pad cabinet-owner-kpi">
          <span class="cabinet-owner-kpi__label">Форма</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String(enabledFormFields))}</strong>
          <span class="cabinet-owner-kpi__note">${humanizeBoolean(forms.openTelegramAfterCopy)} авто-переход в Telegram</span>
        </article>
        <article class="card card-pad cabinet-owner-kpi">
          <span class="cabinet-owner-kpi__label">CRM</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(crm.primaryChannel || forms.primaryChannel || "manual")}</strong>
          <span class="cabinet-owner-kpi__note">${crm.enabled ? "канал включён" : "ручной режим"}</span>
        </article>
        <article class="card card-pad cabinet-owner-kpi ${crmReady && seoReady && formReady ? "" : "cabinet-owner-kpi--alert"}">
          <span class="cabinet-owner-kpi__label">Каналы</span>
          <strong class="cabinet-owner-kpi__value">${escapeHtml(String([seoReady, formReady, crmReady, integrationReady].filter(Boolean).length))}/4</strong>
          <span class="cabinet-owner-kpi__note">готово к рабочей публикации</span>
        </article>
      </div>
      <section class="cabinet-owner-grid">
        <article class="card card-pad cabinet-owner-panel cabinet-owner-panel--focus cabinet-admin-widget">
          <div class="cabinet-kicker">Управление публикацией</div>
          <h3 class="calc-card-title">Что проверить перед выпуском</h3>
          <div class="cabinet-owner-action-list">
            ${[
              {
                tone: seoReady ? "ok" : "warning",
                title: "SEO и индексация",
                note: seoReady ? `canonical ${seo.canonicalOrigin}` : "Нужно проверить canonical origin и sitemap.",
                cta: "Открыть настройки",
                href: cabinetRoutes.site,
              },
              {
                tone: formReady ? "ok" : "warning",
                title: "Форма захвата",
                note: formReady ? `${enabledFormFields} полей, режим ${forms.mode || "backend_submit"}.` : "Не подтверждён режим формы или канал отправки.",
                cta: "Проверить форму",
                href: cabinetRoutes.site,
              },
              {
                tone: crmReady ? "ok" : "warning",
                title: "Маршрут заявки в CRM",
                note: crmReady ? `Канал ${crm.primaryChannel || forms.primaryChannel || "manual"} активен.` : "Маршрут заявки нужно проверить вручную.",
                cta: "Проверить маршрут",
                href: cabinetSectionHref("crm"),
              },
            ].map(renderOwnerActionRow).join("")}
          </div>
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Статус каналов</div>
          <h3 class="calc-card-title">Сайт, формы, CRM, интеграции</h3>
          <div class="cabinet-owner-health-list">
            ${[
              { label: "Сайт", state: site.primaryDomain || site.publicUrl || "домен не задан", tone: publishedPages ? "ok" : "warning", note: publishedPages ? `${publishedPages} страниц уже опубликовано.` : "Нужна публикация хотя бы одной страницы." },
              { label: "Формы", state: formReady ? "Готово" : "Проверить", tone: formReady ? "ok" : "warning", note: `${enabledFormFields} полей · ${humanizeBoolean(forms.openTelegramAfterCopy)} авто-переход.` },
              { label: "CRM", state: crmReady ? "Маршрут собран" : "Проверить", tone: crmReady ? "ok" : "warning", note: crm.note || "Заявка должна уходить в CRM без ручных шагов." },
              { label: "Интеграции", state: integrationReady ? "Подключены" : "Не заданы", tone: integrationReady ? "ok" : "warning", note: `${integrations.catalogSource || "источник каталога не задан"} · ${integrations.futureCms || "CMS не задана"}` },
            ].map(renderOwnerHealthItem).join("")}
          </div>
        </article>
      </section>
      <section class="cabinet-owner-grid cabinet-owner-grid--secondary">
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget cabinet-site-pages-card">
          <div class="cabinet-kicker">Публикация</div>
          <h3 class="calc-card-title">Опубликованные страницы</h3>
          <div class="cabinet-site-page-list">
            ${visiblePages.length ? visiblePages.map(renderSitePageRow).join("") : `<div class="account-empty">${settingsAvailable ? "Список страниц пока не загрузился." : "Backend-настройки не прочитались, поэтому список страниц сейчас недоступен."}</div>`}
          </div>
          ${extraPages ? `<div class="cabinet-inline-hint">Ещё ${extraPages} страниц в полном списке.</div>` : ""}
        </article>
        <article class="card card-pad cabinet-owner-panel cabinet-admin-widget">
          <div class="cabinet-kicker">Быстрые переходы</div>
          <h3 class="calc-card-title">Куда идти дальше</h3>
          <div class="cabinet-mini-list cabinet-mini-list--tight">
            <article class="cabinet-mini-card">
              <strong>Публичный сайт</strong>
              <span>${escapeHtml(site.projectName || "Klubnika Project")} · ${escapeHtml(site.primaryDomain || site.publicUrl || "домен не задан")}</span>
            </article>
            <article class="cabinet-mini-card">
              <strong>Форма заявки</strong>
              <span>${escapeHtml(forms.mode || "backend_submit")} · канал ${escapeHtml(forms.primaryChannel || "manual")}</span>
            </article>
            <article class="cabinet-mini-card">
              <strong>Интеграции</strong>
              <span>${escapeHtml(integrations.catalogSource || "источник каталога не задан")} · ${escapeHtml(integrations.futureCms || "CMS не задана")}</span>
            </article>
          </div>
          <div class="cabinet-home-actions">
            <a class="btn btn-primary" href="${escapeAttribute(cabinetRoutes.site)}">Открыть сайт</a>
            <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("crm"))}">Открыть CRM</a>
          </div>
        </article>
      </section>
    </div>
  `;
}

async function renderAdminUsersSection(session) {
  const response = await fetchJson(`${apiBase()}/admin/users`);
  if (!response.ok) {
    return renderSectionUnavailable({
      kicker: "Пользователи",
      title: "Пользователи и доступы",
      message: `Раздел пользователей сейчас не ответил: ${cleanupError(response.text || `HTTP ${response.status}`)}.`,
      primaryHref: currentSessionHasSection("dashboard") ? cabinetSectionHref("dashboard") : "",
      primaryLabel: "Назад",
      secondaryHref: currentSessionHasSection("site") ? cabinetSectionHref("site") : "",
      secondaryLabel: "Открыть настройки сайта",
    });
  }
  const users = response.data.items || [];
  const memberUsers = users.filter((item) => item.account_type === "member");
  const ordersByUser = Object.fromEntries(
    await Promise.all(
      memberUsers.map(async (user) => [user.id, await loadAdminUserOrders(user.id).catch(() => [])]),
    ),
  );
  const documentsByOrder = Object.fromEntries(
    await Promise.all(
      Object.values(ordersByUser)
        .flat()
        .map(async (order) => [order.id, await loadAdminOrderDocuments(order.id).catch(() => [])]),
    ),
  );
  const activeUsers = users.filter((item) => item.is_active);
  const courseUsers = users.filter((item) => Array.isArray(item.scopes) && item.scopes.includes("course_access"));
  const adminUsers = users.filter((item) => item.account_type === "admin").length;
  const inactiveUsers = users.length - activeUsers.length;
  const selectedUserId = String(new URLSearchParams(window.location.search).get("user") || users[0]?.id || "");
  const selectedUser = users.find((user) => String(user.id) === selectedUserId) || users[0] || null;

  return `
    <div class="cabinet-section-stack cabinet-admin-page cabinet-admin-page--users">
      <div class="cabinet-section-intro cabinet-admin-page__intro">
        <div class="tag">Пользователи</div>
        <h2 class="calc-card-title">Пользователи и доступы</h2>
        <p class="sublead">Слева список аккаунтов, справа живая карточка пользователя с доступами, заказами, сообщениями и активностью.</p>
      </div>
      <section class="card card-pad cabinet-admin-toolbar">
        <div class="cabinet-admin-toolbar__main">
          <label class="cabinet-admin-search">
            <span>Поиск</span>
            <input class="admin-input" type="search" data-user-search placeholder="Имя, email, slug, роль" />
          </label>
          <div class="cabinet-admin-filter-row">
            <button class="cabinet-filter-chip is-active" type="button" data-user-filter="all">Все ${users.length}</button>
            <button class="cabinet-filter-chip" type="button" data-user-filter="admin">Команда ${adminUsers}</button>
            <button class="cabinet-filter-chip" type="button" data-user-filter="member">Клиенты ${memberUsers.length}</button>
            <button class="cabinet-filter-chip" type="button" data-user-filter="inactive">Выключены ${inactiveUsers}</button>
            <button class="cabinet-filter-chip" type="button" data-user-filter="course">С курсом ${courseUsers.length}</button>
          </div>
        </div>
        <div class="cabinet-admin-toolbar__actions">
          <button class="btn btn-primary" type="button" data-cabinet-user-create>Создать пользователя</button>
        </div>
      </section>
      <section class="cabinet-admin-split">
        <article class="card card-pad cabinet-admin-widget cabinet-admin-split__master cabinet-users-master">
          <div class="cabinet-kicker">Аккаунты</div>
          <h3 class="calc-card-title">Кто сейчас в системе</h3>
          <div class="cabinet-inline-meta">
            <span>${activeUsers.length} активных</span>
            <span>${adminUsers} в команде</span>
            <span>${courseUsers.length} с курсом</span>
          </div>
          <div class="cabinet-list">
            <div class="cabinet-list-head cabinet-list-head--users">
              <span>Пользователь</span>
              <span>Тип</span>
              <span>Доступ</span>
              <span>Статус</span>
            </div>
            <div class="cabinet-list-body" data-user-list>
              ${users.map((user) => renderAdminUserListRow(user, selectedUserId)).join("")}
            </div>
          </div>
        </article>
        <div class="cabinet-admin-split__detail">
          ${selectedUser
            ? renderAdminUserDetail(selectedUser, ordersByUser[selectedUser.id] || [], documentsByOrder)
            : `
              <article class="card card-pad cabinet-admin-widget">
                <div class="cabinet-kicker">Карточка</div>
                <h3 class="calc-card-title">Выберите пользователя слева</h3>
                <p class="sublead">Справа откроются аккаунт, доступ, заказы, сообщения и активность.</p>
              </article>
            `}
          <div class="cabinet-users-status" data-cabinet-users-status></div>
        </div>
      </section>
    </div>
  `;
}

async function renderAdminAuditSection(session) {
  const response = await fetchJson(`${apiBase()}/admin/audit-events?limit=60`);
  if (!response.ok) {
    return renderSectionUnavailable({
      kicker: "Аудит",
      title: "Последние действия",
      message: `Аудит сейчас не ответил: ${cleanupError(response.text || `HTTP ${response.status}`)}.`,
      primaryHref: currentSessionHasSection("dashboard") ? cabinetSectionHref("dashboard") : "",
      primaryLabel: "Назад",
      secondaryHref: currentSessionHasSection("site") ? cabinetSectionHref("site") : "",
      secondaryLabel: "Открыть сайт и настройки",
    });
  }
  const items = response.data.items || [];
  const actorCount = new Set(items.map((item) => item.actor_name || item.actor_id || "system")).size;
  const areaCount = new Set(items.map((item) => item.area || "system")).size;
  const latestTs = items[0]?.created_at || items[0]?.createdAt || "";
  const actionOptions = Array.from(new Set(items.map((item) => humanizeAuditAction(item.action)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  const actorOptions = Array.from(new Set(items.map((item) => item.actor_name || "Система").filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  const areaOptions = Array.from(new Set(items.map((item) => humanizeAuditArea(item.area)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ru"));
  const segmentCounts = {
    auth: items.filter((item) => getAuditSegment(item) === "auth").length,
    content: items.filter((item) => getAuditSegment(item) === "content").length,
    access: items.filter((item) => getAuditSegment(item) === "access").length,
    crm: items.filter((item) => getAuditSegment(item) === "crm").length,
  };

  return `
    <div class="cabinet-section-stack cabinet-admin-page cabinet-admin-page--audit">
      <div class="cabinet-section-intro cabinet-admin-page__intro">
        <div class="tag">Аудит</div>
        <h2 class="calc-card-title">Аудит и последние действия</h2>
        <p class="sublead">Это уже не просто лента. Здесь можно сузить события по типу, зоне, исполнителю и периоду.</p>
      </div>
      <div class="cabinet-stat-grid">
        ${renderStatCard("События", String(items.length), "в текущей рабочей выборке")}
        ${renderStatCard("Зоны", String(areaCount), "слоёв системы попали в аудит")}
        ${renderStatCard("Участники", String(actorCount), "кто оставил след в последних событиях")}
        ${renderStatCard("Последнее", latestTs ? formatAuditTimestamp(latestTs) : "пусто", latestTs ? "самое свежее событие" : "событий пока нет")}
      </div>
      <section class="card card-pad cabinet-admin-toolbar cabinet-audit-toolbar">
        <div class="cabinet-admin-toolbar__main">
          <div class="cabinet-admin-filter-row cabinet-audit-segments">
            <button class="cabinet-filter-chip is-active" type="button" data-audit-segment="all">Все ${items.length}</button>
            <button class="cabinet-filter-chip" type="button" data-audit-segment="auth">Авторизация ${segmentCounts.auth}</button>
            <button class="cabinet-filter-chip" type="button" data-audit-segment="content">Контент ${segmentCounts.content}</button>
            <button class="cabinet-filter-chip" type="button" data-audit-segment="access">Доступы ${segmentCounts.access}</button>
            <button class="cabinet-filter-chip" type="button" data-audit-segment="crm">CRM ${segmentCounts.crm}</button>
          </div>
          <div class="cabinet-field-grid cabinet-field-grid--audit">
            <label class="cabinet-field">
              <span class="cabinet-field-label">Тип события</span>
              <select class="admin-select" data-audit-filter="action">
                <option value="">Все</option>
                ${actionOptions.map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}
              </select>
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Кто</span>
              <select class="admin-select" data-audit-filter="actor">
                <option value="">Все</option>
                ${actorOptions.map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}
              </select>
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Зона</span>
              <select class="admin-select" data-audit-filter="area">
                <option value="">Все</option>
                ${areaOptions.map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join("")}
              </select>
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">С даты</span>
              <input class="admin-input" type="date" data-audit-filter="from" />
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">По дату</span>
              <input class="admin-input" type="date" data-audit-filter="to" />
            </label>
          </div>
        </div>
        <div class="cabinet-admin-toolbar__actions">
          <span class="cabinet-filter-chip is-static" data-audit-visible-count>${items.length} видно</span>
        </div>
      </section>
      <section class="card card-pad cabinet-card">
        <div class="tag">Лента событий</div>
        <h3 class="calc-card-title">Последние события</h3>
        <div class="cabinet-list">
          <div class="cabinet-list-head cabinet-list-head--audit">
            <span>Событие</span>
            <span>Кто</span>
            <span>Время</span>
          </div>
          <div class="cabinet-list-body">
            ${items.length ? items.map(renderAuditItem).join("") : '<div class="account-empty">Событий пока нет.</div>'}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderPlannedSection(section) {
  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">${escapeHtml(section.label)}</div>
        <h2 class="calc-card-title">${escapeHtml(section.label)}</h2>
        <p class="sublead">${escapeHtml(section.note)}</p>
      </div>
      <article class="card card-pad cabinet-card">
        <div class="tag">Следующий этап</div>
        <h3 class="calc-card-title">Этот раздел ещё не собран до конца</h3>
        <p class="sublead">Архитектура уже зафиксирована, но сам экран ещё не доведён до рабочего состояния.</p>
        <div class="cabinet-home-actions">
          ${currentSessionHasSection("dashboard") ? `<a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("dashboard"))}">Назад в обзор</a>` : ""}
          ${currentSessionHasSection("site") ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("site"))}">Открыть сайт и настройки</a>` : ""}
        </div>
      </article>
    </div>
  `;
}

function renderSectionUnavailable({
  kicker,
  title,
  message,
  primaryHref = "",
  primaryLabel = "",
  secondaryHref = "",
  secondaryLabel = "",
}) {
  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">${escapeHtml(kicker || title || "Раздел")}</div>
        <h2 class="calc-card-title">${escapeHtml(title || "Раздел временно недоступен")}</h2>
        <p class="sublead">${escapeHtml(message || "Этот раздел сейчас не ответил.")}</p>
      </div>
      <article class="card card-pad cabinet-card">
        <div class="tag">Что делать</div>
        <h3 class="calc-card-title">Рабочий fallback</h3>
        <p class="sublead">Проблема не должна останавливать весь кабинет. Вернитесь в соседний рабочий раздел и проверьте этот экран позже.</p>
        <div class="cabinet-home-actions">
          ${primaryHref && primaryLabel ? `<a class="btn btn-primary" href="${escapeAttribute(primaryHref)}">${escapeHtml(primaryLabel)}</a>` : ""}
          ${secondaryHref && secondaryLabel ? `<a class="btn btn-secondary" href="${escapeAttribute(secondaryHref)}">${escapeHtml(secondaryLabel)}</a>` : ""}
        </div>
      </article>
    </div>
  `;
}

async function loadMemberCatalogItems() {
  const response = await fetchJson(`${apiBase()}/member/catalog/items`);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return [];
    }
    throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  }
  return response.data.items || [];
}

async function loadMemberSpecialPages() {
  const response = await fetchJson(`${apiBase()}/member/special-pages`);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return [];
    }
    throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  }
  return response.data.items || [];
}

async function loadAdminCatalogItems() {
  const response = await fetchJson(`${apiBase()}/admin/catalog/items`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data.items || [];
}

async function loadAdminCatalogProducts() {
  const response = await fetchJson(`${apiBase()}/admin/catalog/products`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data.items || [];
}

async function loadAdminCatalogProductMedia(slug) {
  const response = await fetchJson(`${apiBase()}/admin/catalog/products/${encodeURIComponent(slug)}/media`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data.items || [];
}

async function uploadAdminCatalogProductMedia(slug, file) {
  const headers = { Accept: "application/json", "X-KP-Requested-With": "klubnikaproject" };
  const adminToken = readStoredSessionToken("admin");
  if (adminToken) headers["X-KP-Admin-Session"] = adminToken;
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${apiBase()}/admin/catalog/products/${encodeURIComponent(slug)}/media`, {
    method: "POST",
    credentials: "include",
    headers,
    body,
  });
  if (!response.ok) {
    throw new Error(cleanupError(await response.text() || `HTTP ${response.status}`));
  }
  const data = await response.json();
  return data.item || null;
}

async function deleteAdminCatalogProductMedia(slug, filename) {
  const response = await fetchJson(`${apiBase()}/admin/catalog/products/${encodeURIComponent(slug)}/media/${encodeURIComponent(filename)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return true;
}

async function saveAdminCatalogProduct(slug, payload) {
  const response = await fetchJson(`${apiBase()}/admin/catalog/products/${encodeURIComponent(slug)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data.product || null;
}

async function loadAdminSettings() {
  const response = await fetchJson(`${apiBase()}/admin/settings`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data.settings || {};
}

async function loadAdminCatalogSnapshot() {
  const response = await fetchJson(`${apiBase()}/admin/catalog/snapshot`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data.snapshot || {};
}

async function loadCrmBundle() {
  const [statusResponse, pipelinesResponse, leadsResponse, tasksResponse] = await Promise.all([
    fetchJson(`${apiBase()}/admin/crm/status`),
    fetchJson(`${apiBase()}/admin/crm/pipelines`),
    fetchJson(`${apiBase()}/admin/crm/leads?${new URLSearchParams({ limit: "8" })}`),
    fetchJson(`${apiBase()}/admin/crm/tasks?${new URLSearchParams({ limit: "8" })}`),
  ]);

  if (!statusResponse.ok && !pipelinesResponse.ok && !leadsResponse.ok && !tasksResponse.ok) {
    throw new Error("CRM недоступна для текущей сессии.");
  }

  return {
    status: statusResponse.ok ? statusResponse.data : {},
    pipelines: pipelinesResponse.ok ? pipelinesResponse.data.items || [] : [],
    leads: leadsResponse.ok ? leadsResponse.data.items || [] : [],
    tasks: tasksResponse.ok ? tasksResponse.data.items || [] : [],
  };
}

async function loadCrmUsers() {
  const response = await fetchJson(`${apiBase()}/admin/crm/users`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data.items || [];
}

async function loadCrmOwnerQueue() {
  const response = await fetchJson(`${apiBase()}/admin/crm/owner-queue?${new URLSearchParams({ limit: "8" })}`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return extractCrmItems(response.data);
}

async function loadCrmOwnerWorkload() {
  const response = await fetchJson(`${apiBase()}/admin/crm/owner-workload`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return extractCrmItems(response.data);
}

async function loadCrmDuplicateLeads() {
  const response = await fetchJson(`${apiBase()}/admin/crm/duplicate-leads?${new URLSearchParams({ limit: "6", status_filter: "open" })}`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return extractCrmItems(response.data);
}

async function loadCrmDataQuality() {
  const response = await fetchJson(`${apiBase()}/admin/crm/data-quality`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data || null;
}

async function loadCalcPricing() {
  const response = await fetchJson(cabinetRoutes.calcPricing, { credentials: "same-origin" });
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data || {};
}

async function loadAdminDashboardData() {
  const [catalogItems, pricing] = await Promise.all([
    loadAdminCatalogItems().catch(() => []),
    loadCalcPricing().catch(() => null),
  ]);

  let crmBundle = null;
  let ownerQueue = [];
  let ownerWorkload = [];
  let duplicateLeads = [];
  let dataQuality = null;

  if (isCrmEnabled()) {
    crmBundle = await loadCrmBundle().catch(() => null);
    if (crmBundle) {
      [ownerQueue, ownerWorkload, duplicateLeads, dataQuality] = await Promise.all([
        loadCrmOwnerQueue().catch(() => []),
        loadCrmOwnerWorkload().catch(() => []),
        loadCrmDuplicateLeads().catch(() => []),
        loadCrmDataQuality().catch(() => null),
      ]);
    }
  }

  const crmAvailable = isCrmEnabled() && Boolean(crmBundle);
  const leads = crmBundle?.leads || [];
  const tasks = crmBundle?.tasks || [];
  const pipelines = crmBundle?.pipelines || [];
  const overdueTasks = tasks.filter((task) => String(task.due_state || task.follow_up_state || task.status || "").toLowerCase() === "overdue");
  const unassignedLeads = leads.filter((lead) => !String(lead.owner_name || lead.owner || lead.owner_id || "").trim());
  const todayTasks = tasks.filter((task) => {
    const state = String(task.due_state || task.follow_up_state || task.status || "").toLowerCase();
    return state.includes("today") || state.includes("new") || state.includes("planned");
  });
  const paidPipelineStage = pipelines.find((item) => {
    const probe = `${item.title || ""} ${item.name || ""} ${item.code || ""}`.toLowerCase();
    return ["оплач", "won", "closed", "paid", "выигр"].some((token) => probe.includes(token));
  });
  const paidRevenue = paidPipelineStage ? readCrmStageValue(paidPipelineStage) : leads.reduce((total, lead) => {
    const probe = `${lead.status_name || ""} ${lead.status_code || ""} ${lead.pipeline_stage || ""}`.toLowerCase();
    return ["оплач", "won", "paid", "closed"].some((token) => probe.includes(token))
      ? total + readCrmMoneyValue(lead)
      : total;
  }, 0);

  return {
    catalogItems,
    pricing,
    crmBundle,
    crmAvailable,
    leads,
    tasks,
    pipelines,
    ownerQueue,
    ownerWorkload,
    duplicateLeads,
    dataQuality,
    leadPreview: leads.slice(0, 4),
    taskPreview: tasks.slice(0, 4),
    pipelinePreview: pipelines.slice(0, 4),
    queuePreview: ownerQueue.slice(0, 5),
    ownerPreview: ownerWorkload.slice(0, 4),
    overdueTasks,
    todayTasks,
    unassignedLeads,
    newLeads: countCrmNewLeads(leads),
    pipelineValue: sumCrmLeadPotential(leads),
    paidRevenue,
    syncIssues: readCrmHealthCount(dataQuality),
    priceCount: readCalcPricingDriverCount(pricing),
    latestLead: leads[0] || null,
    latestTask: tasks[0] || null,
  };
}

function extractSnapshotCategories(snapshot) {
  if (Array.isArray(snapshot.categories)) return snapshot.categories;
  if (Array.isArray(snapshot.sections)) return snapshot.sections;
  return [];
}

function extractSnapshotProducts(snapshot) {
  if (Array.isArray(snapshot.products)) return snapshot.products;
  if (Array.isArray(snapshot.items)) return snapshot.items;
  return [];
}

function renderStatCard(label, value, note = "") {
  return `
    <article class="card card-pad cabinet-stat-card">
      <span class="cabinet-stat-label">${escapeHtml(label)}</span>
      <strong class="cabinet-stat-value">${escapeHtml(value)}</strong>
      ${note ? `<span class="cabinet-stat-note">${escapeHtml(note)}</span>` : ""}
    </article>
  `;
}

function renderOwnerActionRow(item) {
  return `
    <a class="cabinet-owner-action cabinet-owner-action--${escapeAttribute(item.tone || "neutral")}" href="${escapeAttribute(item.href || cabinetSectionHref("dashboard"))}">
      <div class="cabinet-owner-action__copy">
        <strong>${escapeHtml(item.title || "Действие")}</strong>
        <span>${escapeHtml(item.note || "")}</span>
      </div>
      <span class="cabinet-owner-action__cta">${escapeHtml(item.cta || "Открыть")}</span>
    </a>
  `;
}

function renderOwnerHealthItem(item) {
  return `
    <article class="cabinet-owner-health cabinet-owner-health--${escapeAttribute(item.tone || "neutral")}">
      <div class="cabinet-owner-health__main">
        <strong>${escapeHtml(item.label || "Система")}</strong>
        <span>${escapeHtml(item.note || "")}</span>
      </div>
      <span class="cabinet-owner-health__state">${escapeHtml(item.state || "Проверить")}</span>
    </article>
  `;
}

function renderOwnerPipelineRow(item) {
  const count = readCrmStageCount(item);
  const amount = readCrmStageValue(item);
  return `
    <article class="cabinet-owner-stage">
      <div class="cabinet-owner-stage__main">
        <strong>${escapeHtml(item.title || item.name || item.code || "Стадия")}</strong>
        <span>${escapeHtml(count ? `${count} ${pluralizeRu(count, "лид", "лида", "лидов")}` : "количество пока не вернулось")}</span>
      </div>
      <span class="cabinet-owner-stage__value">${escapeHtml(formatRub(amount))}</span>
    </article>
  `;
}

function renderMemberCatalogCard(item) {
  return `
    <article class="card card-pad account-card">
      <div class="tag">${escapeHtml(humanizeCatalogKind(item.kind || item.category || "catalog"))}</div>
      <h3 class="calc-card-title">${escapeHtml(item.title)}</h3>
      <p class="sublead">${escapeHtml(item.summary || "Без описания")}</p>
      <div class="account-item-meta">
        <span>${escapeHtml(humanizeMemberCatalogCategory(item.category || item.kind || ""))}</span>
        <span>${escapeHtml(humanizeCatalogPublicationStatus(item.status || "published"))}</span>
      </div>
      <div class="account-actions">
        <a class="btn btn-primary" href="${escapeAttribute(resolvePublicPath(item.path))}">Открыть страницу</a>
      </div>
    </article>
  `;
}

function renderMemberCatalogRow(item) {
  const selectionState = describeMemberSelectionState(item.cta_mode);
  return `
    <article class="cabinet-list-row cabinet-list-row--catalog">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.summary || "Без описания")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(humanizeMemberCatalogCategory(item.category || ""))}</strong>
        <span>${escapeHtml(humanizeCatalogKind(item.kind || "catalog"))}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(selectionState.label)}</strong>
        <span>${escapeHtml(selectionState.note)} <a href="${escapeAttribute(resolvePublicPath(item.path))}">Открыть позицию</a></span>
      </div>
    </article>
  `;
}

function renderMemberSpecialCard(item) {
  const contentLabel = humanizeCatalogKind(item.kind || "route");
  return `
    <article class="card card-pad account-card">
      <div class="tag">${escapeHtml(contentLabel)}</div>
      <h3 class="calc-card-title">${escapeHtml(item.title)}</h3>
      <p class="sublead">${escapeHtml(item.summary || "Без описания")}</p>
      <div class="account-actions">
        <a class="btn btn-secondary" href="${escapeAttribute(resolvePublicPath(item.path))}">${escapeHtml(contentLabel === "Полезная страница" ? "Открыть страницу" : "Открыть материал")}</a>
      </div>
    </article>
  `;
}

function renderMemberDocumentRow(item) {
  return `
    <article class="cabinet-list-row cabinet-list-row--catalog">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.summary || "Документ по заказу или задаче")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(humanizeCatalogKind(item.kind || "document"))}</strong>
        <span>${escapeHtml(item.slug || item.path || "файл")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>Открыть файл</strong>
        <span><a href="${escapeAttribute(resolvePublicPath(item.path))}">Перейти</a></span>
      </div>
    </article>
  `;
}

function humanizeOrderDocumentType(value) {
  const type = String(value || "").toLowerCase();
  if (type === "invoice") return "Счёт";
  if (type === "upd") return "УПД";
  if (type === "calculation") return "Расчёт";
  if (type === "specification") return "Спецификация";
  if (type === "pdf") return "PDF";
  if (type === "checklist") return "Чек-лист";
  return "Документ";
}

function humanizeOrderDocumentStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status === "ready") return "Готов";
  if (status === "sent") return "Отправлен";
  return "Готовится";
}

function resolveOrderDocumentHref(fileUrl) {
  const raw = String(fileUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return routePath(raw);
}

function renderOrderDocumentStatusChip(status) {
  return `<span class="cabinet-document-status cabinet-document-status--${escapeAttribute(String(status || "draft").toLowerCase())}">${escapeHtml(humanizeOrderDocumentStatus(status))}</span>`;
}

function renderMemberOrderDocumentRow(item) {
  const href = resolveOrderDocumentHref(item.file_url);
  return `
    <article class="cabinet-list-row cabinet-list-row--catalog">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.title || "Документ")}</strong>
        <span>${escapeHtml(humanizeOrderDocumentType(item.document_type))}${item.file_size ? ` · ${escapeHtml(item.file_size)}` : ""}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${renderOrderDocumentStatusChip(item.status)}</strong>
        <span>${escapeHtml(formatAuditTimestamp(item.updated_at || item.created_at || ""))}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${href ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener">Открыть файл</a>` : "Ссылка ещё не добавлена"}</strong>
        <span>${href ? "Файл открывается в новой вкладке." : "Добавьте ссылку, и файл появится здесь."}</span>
      </div>
    </article>
  `;
}

function renderMemberAvailableDocumentRow(item) {
  const href = resolveOrderDocumentHref(item.file_url || item.href);
  const timestamp = formatAuditTimestamp(item.updated_at || item.created_at || "");
  return `
    <article class="cabinet-list-row cabinet-list-row--documents">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.title || humanizeOrderDocumentType(item.document_type) || "Документ")}</strong>
        <span>${escapeHtml(humanizeOrderDocumentType(item.document_type))}${item.file_size ? ` · ${escapeHtml(item.file_size)}` : ""}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.orderTitle || `Заказ #${item.orderId || "—"}`)}</strong>
        <span>${item.orderId ? `Заказ #${escapeHtml(String(item.orderId))}` : "Текущий заказ"}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${renderOrderDocumentStatusChip(item.status || "ready")}</strong>
        <span>${escapeHtml(timestamp || "Файл уже доступен")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong><a href="${escapeAttribute(href)}" download target="_blank" rel="noopener">Скачать PDF</a></strong>
        <span>${escapeHtml(item.file_size || "PDF")}</span>
      </div>
    </article>
  `;
}

function getOrderDocumentLatestStatus(documents) {
  const items = Array.isArray(documents) ? documents : [];
  const firstSent = items.find((item) => String(item.status || "").toLowerCase() === "sent");
  if (firstSent) return firstSent.status;
  const firstReady = items.find((item) => String(item.status || "").toLowerCase() === "ready");
  if (firstReady) return firstReady.status;
  return items[0]?.status || "draft";
}

function renderMemberOrderDocumentGroup(order, documents, profileCompleteness) {
  const items = Array.isArray(documents) ? documents : [];
  const orderStatus = describeMemberOrderStatus(order, profileCompleteness);
  const readiness = describeMemberDocumentReadiness(items);
  return `
    <article class="card card-pad cabinet-card cabinet-document-group">
      <div class="cabinet-document-group__head">
        <div>
          <div class="cabinet-kicker">Заказ</div>
          <h3 class="calc-card-title">${escapeHtml(order.title)}</h3>
          <p class="sublead">${escapeHtml(order.note || orderStatus.note)}</p>
        </div>
        <div class="cabinet-inline-meta">
          <span>${items.length} ${pluralizeRu(items.length, "документ", "документа", "документов")}</span>
          <span>${escapeHtml(readiness.label)}</span>
        </div>
      </div>
      <div class="cabinet-inline-hint">${escapeHtml(readiness.note)}</div>
      ${items.length ? `
        <div class="cabinet-list">
          <div class="cabinet-list-head cabinet-list-head--catalog">
            <span>Документ</span>
            <span>Статус</span>
            <span>Переход</span>
          </div>
          <div class="cabinet-list-body">
            ${items.map(renderMemberOrderDocumentRow).join("")}
          </div>
        </div>
      ` : `<div class="account-empty">Документов по этому заказу пока нет. Когда счёт, спецификация или PDF будут готовы, они появятся здесь.</div>`}
      <div class="cabinet-inline-actions">
        <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("orders", { order: order.id }))}">Открыть заказ</a>
      </div>
    </article>
  `;
}

function buildOrderMessageSubject(order) {
  return `Заказ #${order?.id || "—"} · ${order?.title || "Текущий заказ"}`;
}

function getMemberOrderStageModel(order, context = {}) {
  const profileCompleteness = Number(context.profileCompleteness || 0);
  const documentsCount = Number(context.documentsCount || 0);
  const messagesCount = Number(context.messagesCount || 0);
  const hasDocumentsSection = Boolean(context.hasDocumentsSection);
  const hasOrdersSection = Boolean(context.hasOrdersSection);
  const hasRequestsSection = Boolean(context.hasRequestsSection);
  const lineCount = Array.isArray(order?.line_items) ? order.line_items.length : 0;
  const status = String(order?.status || "").toLowerCase();

  const steps = [
    { id: "collect", label: "Состав", note: lineCount ? `${lineCount} ${pluralizeRu(lineCount, "позиция", "позиции", "позиций")}` : "ещё не собран" },
    { id: "confirm", label: "Подтверждение", note: status === "submitted" || status === "confirmed" || status === "shipped" || status === "completed" ? "идёт" : "не запущено" },
    { id: "docs", label: "Документы", note: documentsCount ? `${documentsCount} ${pluralizeRu(documentsCount, "файл", "файла", "файлов")}` : "ещё не готовы" },
    { id: "delivery", label: "Отгрузка", note: status === "shipped" || status === "completed" ? "идёт / завершена" : "пока впереди" },
  ];

  const applyStates = (currentId) => steps.map((step) => {
    const orderIds = ["collect", "confirm", "docs", "delivery"];
    const currentIndex = orderIds.indexOf(currentId);
    const stepIndex = orderIds.indexOf(step.id);
    let state = "upcoming";
    if (stepIndex < currentIndex) state = "done";
    if (step.id === currentId) state = "current";
    return { ...step, state };
  });

  if (!lineCount) {
    return {
      title: "Сначала соберите заказ",
      description: "В заказе пока нет позиций. Добавьте товары, и можно двигаться дальше.",
      primaryLabel: "Открыть корзину",
      primaryHref: cabinetSectionHref("cart"),
      secondaryLabel: hasRequestsSection ? "Открыть расчёт" : "Профиль и доставка",
      secondaryHref: hasRequestsSection ? cabinetSectionHref("requests") : cabinetSectionHref("profile"),
      tertiaryLabel: "",
      tertiaryHref: "",
      notes: [
        "Добавьте товары в корзину и соберите заказ.",
        "Если есть сомнение по позиции, лучше уточнить до покупки.",
      ],
      steps: applyStates("collect"),
    };
  }

  if (status === "draft") {
    if (profileCompleteness < 3) {
      return {
        title: "Заполните профиль",
        description: "Заказ уже собран, но без контактов и адреса доставки мы не сможем быстро его обработать.",
        primaryLabel: "Профиль и доставка",
        primaryHref: cabinetSectionHref("profile"),
        secondaryLabel: "Открыть корзину",
        secondaryHref: cabinetSectionHref("cart"),
        tertiaryLabel: "Связь по заказу",
        tertiaryHref: "#order-thread",
        notes: [
          "Нужны email, телефон и адрес доставки.",
          "После этого можно сразу подтверждать заказ.",
        ],
        steps: applyStates("collect"),
      };
    }
    return {
      title: "Подтвердите заказ",
      description: "Список уже собран. Напишите нам по заказу, чтобы мы запустили следующий шаг.",
      primaryLabel: "Написать по заказу",
      primaryHref: "#order-thread",
      secondaryLabel: "Профиль и доставка",
      secondaryHref: cabinetSectionHref("profile"),
      tertiaryLabel: documentsCount && hasDocumentsSection ? "Документы рядом" : "",
      tertiaryHref: documentsCount && hasDocumentsSection ? cabinetSectionHref("documents") : "",
      notes: [
        messagesCount ? "Переписка уже есть, продолжайте в том же треде." : "Напишите по заказу прямо из этого экрана.",
        "После подтверждения здесь появятся документы.",
      ],
      steps: applyStates("confirm"),
    };
  }

  if (status === "submitted") {
    return {
      title: "Заказ на подтверждении",
      description: "Мы уже проверяем заказ. Все уточнения лучше писать в этом же треде.",
      primaryLabel: "Открыть связь по заказу",
      primaryHref: "#order-thread",
      secondaryLabel: "Профиль и доставка",
      secondaryHref: cabinetSectionHref("profile"),
      tertiaryLabel: documentsCount && hasDocumentsSection ? "Документы рядом" : "",
      tertiaryHref: documentsCount && hasDocumentsSection ? cabinetSectionHref("documents") : "",
      notes: [
        "Нужно уточнить состав или сроки, пишите прямо здесь.",
        "Как только заказ подтвердим, добавим документы.",
      ],
      steps: applyStates("confirm"),
    };
  }

  if (status === "confirmed") {
    return {
      title: documentsCount ? "Проверьте документы" : "Запросите документы",
      description: documentsCount
        ? "Заказ подтверждён. Теперь главное здесь документы и финальные шаги."
        : "Заказ подтверждён, но документов пока нет. Напишите нам и запросите счёт или спецификацию.",
      primaryLabel: documentsCount && hasDocumentsSection ? "Открыть документы" : "Запросить документы",
      primaryHref: documentsCount && hasDocumentsSection ? cabinetSectionHref("documents") : "#order-thread",
      secondaryLabel: "Связь по заказу",
      secondaryHref: "#order-thread",
      tertiaryLabel: "Профиль и доставка",
      tertiaryHref: cabinetSectionHref("profile"),
      notes: [
        documentsCount ? "Документы уже привязаны к заказу и открываются сразу." : "Если документов нет, лучше сразу написать по заказу.",
        "Дальше заказ уходит в отгрузку или на короткое уточнение.",
      ],
      steps: applyStates("docs"),
    };
  }

  if (status === "shipped") {
    return {
      title: "Заказ в отгрузке",
      description: "Сейчас держите под рукой документы и переписку по доставке.",
      primaryLabel: documentsCount && hasDocumentsSection ? "Открыть документы" : "Открыть связь по заказу",
      primaryHref: documentsCount && hasDocumentsSection ? cabinetSectionHref("documents") : "#order-thread",
      secondaryLabel: "Связь по заказу",
      secondaryHref: "#order-thread",
      tertiaryLabel: "Профиль и доставка",
      tertiaryHref: cabinetSectionHref("profile"),
      notes: [
        "Если что-то меняется по доставке, напишите об этом в сообщении.",
        "После завершения здесь останутся документы и переписка.",
      ],
      steps: applyStates("delivery"),
    };
  }

  return {
    title: "Заказ завершён",
    description: "Этот экран остаётся как история заказа: документы, сообщения и состав.",
    primaryLabel: documentsCount && hasDocumentsSection ? "Открыть документы" : "Открыть сообщения",
    primaryHref: documentsCount && hasDocumentsSection ? cabinetSectionHref("documents") : cabinetSectionHref("messages"),
    secondaryLabel: hasOrdersSection ? "Открыть все заказы" : "Профиль и доставка",
    secondaryHref: hasOrdersSection ? cabinetSectionHref("orders") : cabinetSectionHref("profile"),
    tertiaryLabel: "",
    tertiaryHref: "",
    notes: [
      "Документы и переписка останутся здесь.",
      "Если нужен новый этап, удобнее создать новый заказ.",
    ],
    steps: applyStates("delivery"),
  };
}

function humanizeOrderLeadDeliveryStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "succeeded") return "Заявка принята в работу";
  if (normalized === "failed") return "Нужно проверить заявку";
  if (normalized === "disabled") return "Обрабатываем вручную";
  return "Ждём следующий шаг";
}

function buildOrderLeadSummary(order) {
  const lineCount = Array.isArray(order?.line_items) ? order.line_items.length : 0;
  const deliveryLabel = humanizeOrderLeadDeliveryStatus(order?.lead_delivery_status || "");
  return {
    title: lineCount ? `${lineCount} ${pluralizeRu(lineCount, "позиция", "позиции", "позиций")} в заказе` : "Заказ собирается",
    note: `${deliveryLabel}.`,
  };
}

function filterMessagesForOrder(order, messages) {
  const items = Array.isArray(messages) ? messages : [];
  const orderIdToken = `#${order?.id || ""}`;
  const titleProbe = normalizeProbe(order?.title || "");
  return items.filter((item) => {
    const subject = String(item?.subject || "");
    const subjectProbe = normalizeProbe(subject);
    return (
      (orderIdToken && subject.includes(orderIdToken))
      || (titleProbe && subjectProbe.includes(titleProbe))
    );
  });
}

function renderMemberOrderRow(order, profileCompleteness) {
  const orderStatus = describeMemberOrderStatus(order, profileCompleteness);
  const leadSummary = buildOrderLeadSummary(order);
  return `
    <article class="cabinet-list-row cabinet-list-row--catalog">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(order.title)}</strong>
        <span>${escapeHtml(order.note || orderStatus.note)}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(orderStatus.label)}</strong>
        <span>${order.line_items.length ? `${order.line_items.length} ${pluralizeRu(order.line_items.length, "позиция", "позиции", "позиций")}` : "без позиций"}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong><a href="${escapeAttribute(cabinetSectionHref("orders", { order: order.id }))}">Открыть заказ</a></strong>
        <span>${escapeHtml(leadSummary.note)}</span>
      </div>
    </article>
  `;
}

function normalizeProbe(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function describeMemberOrderStatus(order, profileCompleteness) {
  const status = String(order?.status || "").toLowerCase();
  const lineCount = Array.isArray(order?.line_items) ? order.line_items.length : 0;
  if (status === "submitted") {
    return { label: "В работе", note: "Заказ уже принят и сейчас обрабатывается." };
  }
  if (status === "confirmed") {
    return { label: "Готовится", note: "Подтверждение уже есть. Дальше подготовим документы и следующий шаг." };
  }
  if (status === "shipped") {
    return { label: "Отгружается", note: "Заказ уже движется к доставке." };
  }
  if (status === "completed") {
    return { label: "Готово", note: "Заказ завершён. Документы и история остаются здесь." };
  }
  if (!lineCount) {
    return { label: "Собирается", note: "Заказ пока пустой и ещё собирается." };
  }
  if (profileCompleteness < 3) {
    return { label: "Ждём данные", note: "Позиции собраны, но не хватает контактов и доставки." };
  }
  return { label: "Собирается", note: "Состав собран, можно переходить к следующему шагу." };
}

function renderAdminCatalogCard(item) {
  return `
    <article class="card card-pad account-card">
      <div class="tag">${escapeHtml(humanizeCatalogKind(item.category || item.kind || "catalog"))}</div>
      <h3 class="calc-card-title">${escapeHtml(item.title || item.name || "Без названия")}</h3>
      <p class="sublead">${escapeHtml(item.summary || item.shortDescription || "Рабочая запись каталога")}</p>
      <div class="account-item-meta">
        <span>${escapeHtml(item.slug || "без slug")}</span>
        <span>${escapeHtml(humanizeCatalogPublicationStatus(item.status || "published"))}</span>
      </div>
    </article>
  `;
}

function renderAdminCatalogRow(item) {
  return `
    <article class="cabinet-list-row cabinet-list-row--catalog">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.title || item.name || "Без названия")}</strong>
        <span>${escapeHtml(item.summary || item.shortDescription || "Рабочая запись каталога")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.slug || "без slug")}</strong>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(humanizeCatalogPublicationStatus(item.status || "published"))}</strong>
        <span>${escapeHtml(humanizeCatalogKind(item.category || item.kind || "catalog"))}</span>
      </div>
    </article>
  `;
}

function renderAdminCatalogManagerRow(item, selectedSlug = "") {
  const isSelected = item.slug === selectedSlug;
  const searchIndex = [
    item.name || item.title || "",
    item.slug || "",
    item.article || "",
    item.category_slug || item.category || "",
    item.short_description || item.summary || "",
  ].join(" ").toLowerCase();
  return `
    <article class="cabinet-list-row cabinet-list-row--catalog${isSelected ? " is-selected" : ""}" data-catalog-manager-row data-catalog-search-index="${escapeAttribute(searchIndex)}" data-catalog-status="${escapeAttribute(String(item.status || "published").toLowerCase())}">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.name || item.title || "Без названия")}</strong>
        <span>${escapeHtml(item.short_description || item.summary || "Рабочая запись товара")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.slug || "без slug")}</strong>
        <span>${escapeHtml(item.article || "без артикула")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(humanizeCatalogPublicationStatus(item.status || "published"))}</strong>
        <span><a href="${escapeAttribute(cabinetSectionHref("catalog", { product: item.slug }))}">${isSelected ? "Открыт в редакторе" : "Редактировать"}</a></span>
      </div>
    </article>
  `;
}

function buildCatalogProductOptions(products = [], currentSlug = "") {
  return (products || [])
    .filter((item) => item?.slug && item.slug !== currentSlug)
    .map((item) => `<option value="${escapeAttribute(item.slug)}">${escapeHtml(item.name || item.slug)}</option>`)
    .join("");
}

function renderCatalogBadgeControls(currentBadges) {
  const selected = new Set((currentBadges || []).map((item) => String(item || "").trim()).filter(Boolean));
  const customBadges = Array.from(selected).filter((item) => !PRODUCT_BADGE_PRESETS.some((preset) => preset.id === item));
  return `
    <div class="cabinet-badge-grid">
      ${PRODUCT_BADGE_PRESETS.map((badge) => `
        <label class="cabinet-choice-chip">
          <input type="checkbox" data-catalog-badge-preset value="${escapeAttribute(badge.id)}" ${selected.has(badge.id) ? "checked" : ""} />
          <span>${escapeHtml(badge.label)}</span>
        </label>
      `).join("")}
    </div>
    <label class="cabinet-field cabinet-field--wide">
      <span class="cabinet-field-label">Дополнительные бейджи</span>
      <input class="admin-input" type="text" data-catalog-product-field="badges_custom" value="${escapeAttribute(customBadges.join(", "))}" placeholder="custom-one, custom-two" />
    </label>
  `;
}

function resolveCatalogMediaHref(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  return routePath(raw.replace(/^\//, ""));
}

function getCatalogUploadedMediaFilename(slug, value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, window.location.origin);
    const match = parsed.pathname.match(/\/v1\/public\/catalog\/media\/([^/]+)\/([^/]+)$/);
    if (!match) return "";
    if (decodeURIComponent(match[1]) !== String(slug || "").trim()) return "";
    return decodeURIComponent(match[2]);
  } catch {
    return "";
  }
}

function renderCatalogImageRow(image = "") {
  const resolved = resolveCatalogMediaHref(image);
  return `
    <div class="cabinet-repeater-row cabinet-repeater-row--media" data-catalog-collection-item="images" draggable="true">
      <div class="cabinet-media-card">
        <div class="cabinet-media-preview">
          <div class="cabinet-media-preview__head">
            <span class="cabinet-media-order-badge" data-catalog-image-order>01</span>
            <div class="cabinet-media-preview__chips">
              <span class="cabinet-media-cover-badge" data-catalog-image-cover hidden>Обложка</span>
              <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-image-action="drag">Потянуть</button>
            </div>
          </div>
          ${resolved ? `<img src="${escapeAttribute(resolved)}" alt="" loading="lazy" data-catalog-image-preview />` : `<div class="cabinet-media-preview__empty" data-catalog-image-preview-empty>Нет превью</div>`}
        </div>
        <div class="cabinet-media-main">
          <div class="cabinet-media-copy">
            <strong data-catalog-image-title>Изображение товара</strong>
            <span>Первое фото становится обложкой карточки и каталога.</span>
          </div>
          <label class="cabinet-field cabinet-field--wide">
            <span class="cabinet-field-label">Файл / URL</span>
            <input class="admin-input" type="text" data-catalog-collection-field="value" value="${escapeAttribute(image)}" placeholder="assets/catalog/example.webp" />
          </label>
          <div class="cabinet-media-footer">
            <div class="cabinet-inline-meta cabinet-media-meta">
              <span>Перетащите карточки мышкой, чтобы поменять порядок.</span>
            </div>
            <div class="cabinet-media-actions">
              <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-image-action="first">Сделать первым</button>
              <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-image-action="up">Выше</button>
              <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-image-action="down">Ниже</button>
              <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-image-action="remove">Убрать</button>
              <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-image-action="delete-file">Удалить файл</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCatalogAttributeRow(item = {}) {
  return `
    <div class="cabinet-repeater-row" data-catalog-collection-item="attributes">
      <div class="cabinet-field-grid cabinet-field-grid--catalog">
        <label class="cabinet-field">
          <span class="cabinet-field-label">Название</span>
          <input class="admin-input" type="text" data-catalog-collection-field="label" value="${escapeAttribute(item.label || "")}" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Значение</span>
          <input class="admin-input" type="text" data-catalog-collection-field="value" value="${escapeAttribute(item.value || "")}" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Ключ</span>
          <input class="admin-input" type="text" data-catalog-collection-field="key" value="${escapeAttribute(item.key || "")}" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Группа</span>
          <input class="admin-input" type="text" data-catalog-collection-field="group" value="${escapeAttribute(item.group || "")}" placeholder="Характеристики" />
        </label>
      </div>
      <div class="cabinet-repeater-row__actions">
        <label class="cabinet-choice-chip">
          <input type="checkbox" data-catalog-collection-field="filterable" ${item.filterable ? "checked" : ""} />
          <span>Участвует в фильтре</span>
        </label>
        <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-collection-remove>Убрать</button>
      </div>
    </div>
  `;
}

function renderCatalogDocumentRow(item = {}) {
  return `
    <div class="cabinet-repeater-row" data-catalog-collection-item="documents">
      <div class="cabinet-field-grid cabinet-field-grid--catalog">
        <label class="cabinet-field">
          <span class="cabinet-field-label">Название</span>
          <input class="admin-input" type="text" data-catalog-collection-field="title" value="${escapeAttribute(item.title || "")}" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Размер</span>
          <input class="admin-input" type="text" data-catalog-collection-field="fileSize" value="${escapeAttribute(item.fileSize || "")}" placeholder="124 KB" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">ID</span>
          <input class="admin-input" type="text" data-catalog-collection-field="id" value="${escapeAttribute(item.id || "")}" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Файл / URL</span>
          <input class="admin-input" type="text" data-catalog-collection-field="fileUrl" value="${escapeAttribute(item.fileUrl || "")}" placeholder="catalog/files/spec.txt" />
        </label>
      </div>
      <div class="cabinet-repeater-row__actions">
        <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-collection-remove>Убрать</button>
      </div>
    </div>
  `;
}

function renderCatalogFaqRow(item = {}) {
  return `
    <div class="cabinet-repeater-row" data-catalog-collection-item="faq">
      <div class="cabinet-field-grid cabinet-field-grid--catalog">
        <label class="cabinet-field cabinet-field--wide">
          <span class="cabinet-field-label">Вопрос</span>
          <input class="admin-input" type="text" data-catalog-collection-field="question" value="${escapeAttribute(item.question || "")}" />
        </label>
        <label class="cabinet-field cabinet-field--wide">
          <span class="cabinet-field-label">Ответ</span>
          <textarea class="admin-textarea" rows="3" data-catalog-collection-field="answer">${escapeHtml(item.answer || "")}</textarea>
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Дата вопроса</span>
          <input class="admin-input" type="text" data-catalog-collection-field="askedAt" value="${escapeAttribute(item.askedAt || "")}" placeholder="2026-02-11" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Дата ответа</span>
          <input class="admin-input" type="text" data-catalog-collection-field="answeredAt" value="${escapeAttribute(item.answeredAt || "")}" placeholder="2026-02-11" />
        </label>
      </div>
      <div class="cabinet-repeater-row__actions">
        <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-collection-remove>Убрать</button>
      </div>
    </div>
  `;
}

function renderCatalogRelatedRow(item = {}) {
  return `
    <div class="cabinet-repeater-row" data-catalog-collection-item="related_products">
      <div class="cabinet-field-grid cabinet-field-grid--catalog">
        <label class="cabinet-field">
          <span class="cabinet-field-label">Slug товара</span>
          <input class="admin-input" type="text" data-catalog-collection-field="slug" value="${escapeAttribute(item.slug || "")}" list="catalog-related-options" placeholder="row-fan-ec-60" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Подпись</span>
          <input class="admin-input" type="text" data-catalog-collection-field="label" value="${escapeAttribute(item.label || "")}" placeholder="Что показать рядом в карточке" />
        </label>
      </div>
      <div class="cabinet-repeater-row__actions">
        <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-collection-remove>Убрать</button>
      </div>
    </div>
  `;
}

function renderCatalogCompatibilityRow(item = {}) {
  return `
    <div class="cabinet-repeater-row" data-catalog-collection-item="compatibility">
      <div class="cabinet-field-grid cabinet-field-grid--catalog">
        <label class="cabinet-field">
          <span class="cabinet-field-label">Товар / slug</span>
          <input class="admin-input" type="text" data-catalog-collection-field="target_slug" value="${escapeAttribute(item.target_slug || item.targetSlug || "")}" list="catalog-compatibility-options" placeholder="fittings-kit-module" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Режим</span>
          <select class="admin-select" data-catalog-collection-field="relation">
            ${PRODUCT_COMPATIBILITY_PRESETS.map((preset) => `<option value="${preset.id}" ${(item.relation || "works_with") === preset.id ? "selected" : ""}>${preset.label}</option>`).join("")}
          </select>
        </label>
        <label class="cabinet-field cabinet-field--wide">
          <span class="cabinet-field-label">Комментарий</span>
          <textarea class="admin-textarea" rows="2" data-catalog-collection-field="note" placeholder="Например: проверяем диаметр линии и крепление до отгрузки.">${escapeHtml(item.note || "")}</textarea>
        </label>
      </div>
      <div class="cabinet-repeater-row__actions">
        <button class="btn btn-ghost btn-ghost--small" type="button" data-catalog-collection-remove>Убрать</button>
      </div>
    </div>
  `;
}

function renderCatalogCollectionSection({ kicker, title, note, type, addLabel, content }) {
  return `
    <section class="cabinet-editor-section">
      <div class="cabinet-editor-section__head">
        <div>
          <div class="cabinet-kicker">${escapeHtml(kicker)}</div>
          <h4 class="calc-card-title">${escapeHtml(title)}</h4>
        </div>
        <button class="btn btn-secondary btn-ghost--small" type="button" data-catalog-collection-add="${escapeAttribute(type)}">${escapeHtml(addLabel)}</button>
      </div>
      <p class="cabinet-inline-hint">${escapeHtml(note)}</p>
      <div class="cabinet-repeater" data-catalog-collection="${escapeAttribute(type)}">${content}</div>
    </section>
  `;
}

function renderCatalogMediaSection(product) {
  const images = Array.isArray(product.images) && product.images.length ? product.images : [""];
  return `
    <section class="cabinet-editor-section cabinet-editor-section--media">
      <div class="cabinet-editor-section__head">
        <div>
          <div class="cabinet-kicker">Медиа</div>
          <h4 class="calc-card-title">Галерея товара</h4>
        </div>
        <div class="cabinet-media-toolbar">
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden data-catalog-media-input="${escapeAttribute(product.slug)}" />
          <button class="btn btn-primary" type="button" data-catalog-media-pick="${escapeAttribute(product.slug)}">Загрузить фото</button>
          <button class="btn btn-secondary btn-ghost--small" type="button" data-catalog-collection-add="images">Добавить вручную</button>
        </div>
      </div>
      <div class="cabinet-media-dropzone">
        <div class="cabinet-media-dropzone__copy">
          <strong>Перетащите файлы сюда или загрузите их кнопкой выше</strong>
          <span>Поддерживаются JPG, PNG, WEBP и GIF. Главное фото, порядок и состав галереи управляются в одном месте.</span>
        </div>
        <div class="cabinet-media-dropzone__meta">
          <span>1. Загрузите фото</span>
          <span>2. Поставьте главное первым</span>
          <span>3. Сохраните карточку</span>
        </div>
      </div>
      <div class="cabinet-users-status cabinet-product-editor__status" data-catalog-media-status="${escapeAttribute(product.slug)}"></div>
      <div class="cabinet-repeater" data-catalog-collection="images">${images.map(renderCatalogImageRow).join("")}</div>
    </section>
  `;
}

function renderCatalogCollapsibleSection({ kicker, title, note, content, open = false }) {
  return `
    <details class="cabinet-editor-section cabinet-editor-section--collapsible"${open ? " open" : ""}>
      <summary class="cabinet-editor-section__summary">
        <div class="cabinet-editor-section__summary-copy">
          <div class="cabinet-kicker">${escapeHtml(kicker)}</div>
          <h4 class="calc-card-title">${escapeHtml(title)}</h4>
        </div>
        <span class="cabinet-editor-section__summary-state">${open ? "Свернуть" : "Развернуть"}</span>
      </summary>
      <div class="cabinet-editor-section__body">
        ${note ? `<p class="cabinet-inline-hint">${escapeHtml(note)}</p>` : ""}
        ${content}
      </div>
    </details>
  `;
}

function renderAdminCatalogProductEditor(product, adminProducts = []) {
  const attributes = Array.isArray(product.attributes) && product.attributes.length ? product.attributes : [{}];
  const documents = Array.isArray(product.documents) && product.documents.length ? product.documents : [{}];
  const faq = Array.isArray(product.faq) && product.faq.length ? product.faq : [{}];
  const relatedProducts = Array.isArray(product.related_products) && product.related_products.length ? product.related_products : [{}];
  const compatibility = Array.isArray(product.compatibility) && product.compatibility.length ? product.compatibility : [{}];
  const productOptions = buildCatalogProductOptions(adminProducts, product.slug);
  return `
    <article class="card card-pad cabinet-card cabinet-product-editor" data-catalog-product-editor="${escapeAttribute(product.slug)}">
      <div class="cabinet-product-editor__head">
        <div class="cabinet-product-editor__copy">
          <div class="cabinet-kicker">Редактор товара</div>
          <h3 class="calc-card-title">${escapeHtml(product.name || product.slug || "Товар")}</h3>
          <div class="cabinet-inline-meta">
            <span>${escapeHtml(product.slug || "")}</span>
            <span>${escapeHtml(product.category_slug || "без категории")}</span>
            <span>${escapeHtml(product.path || "без публичного пути")}</span>
          </div>
        </div>
        <div class="cabinet-product-editor__summary">
          <article class="cabinet-mini-card">
            <strong>Публикация</strong>
            <span>${escapeHtml(humanizeCatalogPublicationStatus(product.status || "published"))} · ${escapeHtml(humanizeCatalogStockStatus(product.stock_status || "in_stock"))}</span>
          </article>
          <article class="cabinet-mini-card">
            <strong>Медиа</strong>
            <span>${Array.isArray(product.images) ? product.images.length : 0} ${pluralizeRu(Array.isArray(product.images) ? product.images.length : 0, "файл", "файла", "файлов")}</span>
          </article>
          <article class="cabinet-mini-card">
            <strong>Структура</strong>
            <span>${(product.attributes || []).length} хар-к · ${(product.documents || []).length} документов · ${(product.faq || []).length} FAQ</span>
          </article>
          <article class="cabinet-mini-card">
            <strong>Связи</strong>
            <span>${(product.related_products || []).length} связанных · ${(product.compatibility || []).length} совместимостей</span>
          </article>
        </div>
      </div>

      <div class="cabinet-product-editor__stickybar">
        <div class="cabinet-product-editor__stickycopy">
          <strong>${escapeHtml(product.name || product.slug || "Товар")}</strong>
          <span>Сохраняйте изменения без прокрутки к концу формы.</span>
        </div>
        <div class="cabinet-product-editor__actions">
          <button class="btn btn-primary" type="button" data-catalog-product-save="${escapeAttribute(product.slug)}">Сохранить товар</button>
          <a class="btn btn-secondary" href="${escapeAttribute(resolvePublicPath(product.path || cabinetRoutes.catalog))}" target="_blank" rel="noopener noreferrer">Открыть публичную страницу</a>
          <div class="cabinet-users-status cabinet-product-editor__status" data-catalog-product-status></div>
        </div>
      </div>

      <div class="cabinet-admin-tabs cabinet-admin-tabs--editor">
        <button class="cabinet-admin-tab is-active" type="button" data-catalog-editor-tab="main">Основное</button>
        <button class="cabinet-admin-tab" type="button" data-catalog-editor-tab="media">Медиа</button>
        <button class="cabinet-admin-tab" type="button" data-catalog-editor-tab="seo">SEO</button>
        <button class="cabinet-admin-tab" type="button" data-catalog-editor-tab="relations">Связи</button>
        <button class="cabinet-admin-tab" type="button" data-catalog-editor-tab="publish">Наличие и публикация</button>
      </div>

      <section class="cabinet-product-editor__panel is-active" data-catalog-editor-panel="main">
        <div class="cabinet-field-grid">
          <label class="cabinet-field">
            <span class="cabinet-field-label">Название</span>
            <input class="admin-input" type="text" data-catalog-product-field="name" value="${escapeAttribute(product.name || "")}" />
          </label>
          <label class="cabinet-field">
            <span class="cabinet-field-label">Артикул</span>
            <input class="admin-input" type="text" data-catalog-product-field="article" value="${escapeAttribute(product.article || "")}" />
          </label>
          <label class="cabinet-field">
            <span class="cabinet-field-label">Цена</span>
            <input class="admin-input" type="number" step="1" data-catalog-product-field="price" value="${escapeAttribute(product.price ?? "")}" />
          </label>
          <label class="cabinet-field">
            <span class="cabinet-field-label">Старая цена</span>
            <input class="admin-input" type="number" step="1" data-catalog-product-field="old_price" value="${escapeAttribute(product.old_price ?? "")}" />
          </label>
          <label class="cabinet-field cabinet-field--wide">
            <span class="cabinet-field-label">Короткое описание</span>
            <textarea class="admin-textarea" rows="3" data-catalog-product-field="short_description">${escapeHtml(product.short_description || "")}</textarea>
          </label>
          <label class="cabinet-field cabinet-field--wide">
            <span class="cabinet-field-label">Полное описание</span>
            <textarea class="admin-textarea" rows="7" data-catalog-product-field="full_description">${escapeHtml(product.full_description || "")}</textarea>
          </label>
          <label class="cabinet-field cabinet-field--wide">
            <span class="cabinet-field-label">Бейджи карточки</span>
            ${renderCatalogBadgeControls(product.badges || [])}
          </label>
        </div>
        ${renderCatalogCollectionSection({
          kicker: "Характеристики",
          title: "Что показывать в карточке и фильтрах",
          note: "Каждая характеристика живёт отдельной записью: label, value, key и группа.",
          type: "attributes",
          addLabel: "Добавить характеристику",
          content: attributes.map(renderCatalogAttributeRow).join(""),
        })}
      </section>

      <section class="cabinet-product-editor__panel" data-catalog-editor-panel="media" hidden>
        ${renderCatalogMediaSection(product)}
        ${renderCatalogCollectionSection({
          kicker: "Документы",
          title: "Файлы рядом с товаром",
          note: "Паспорта, чек-листы и спецификации храним здесь, а не в описании.",
          type: "documents",
          addLabel: "Добавить документ",
          content: documents.map(renderCatalogDocumentRow).join(""),
        })}
      </section>

      <section class="cabinet-product-editor__panel" data-catalog-editor-panel="seo" hidden>
        <section class="cabinet-editor-section">
          <div class="cabinet-editor-section__head">
            <div>
              <div class="cabinet-kicker">SEO</div>
              <h4 class="calc-card-title">Поиск и сниппет</h4>
            </div>
          </div>
          <p class="cabinet-inline-hint">Здесь только SEO-текст для поиска и сниппета.</p>
          <div class="cabinet-field-grid">
            <label class="cabinet-field cabinet-field--wide">
              <span class="cabinet-field-label">SEO title</span>
              <input class="admin-input" type="text" data-catalog-product-field="seo_title" value="${escapeAttribute(product.seo_title || "")}" />
            </label>
            <label class="cabinet-field cabinet-field--wide">
              <span class="cabinet-field-label">SEO description</span>
              <textarea class="admin-textarea" rows="3" data-catalog-product-field="seo_description">${escapeHtml(product.seo_description || "")}</textarea>
            </label>
          </div>
        </section>
        <section class="cabinet-editor-section">
          <div class="cabinet-editor-section__head">
            <div>
              <div class="cabinet-kicker">FAQ</div>
              <h4 class="calc-card-title">Вопросы и ответы</h4>
            </div>
            <button class="btn btn-secondary btn-ghost--small" type="button" data-catalog-collection-add="faq">Добавить вопрос</button>
          </div>
          <p class="cabinet-inline-hint">Этот блок снимает повторяющиеся вопросы ещё до переписки.</p>
          <div class="cabinet-repeater" data-catalog-collection="faq">${faq.map(renderCatalogFaqRow).join("")}</div>
        </section>
      </section>

      <section class="cabinet-product-editor__panel" data-catalog-editor-panel="relations" hidden>
        <section class="cabinet-editor-section">
          <div class="cabinet-editor-section__head">
            <div>
              <div class="cabinet-kicker">Связи</div>
              <h4 class="calc-card-title">Связанные товары</h4>
            </div>
            <button class="btn btn-secondary btn-ghost--small" type="button" data-catalog-collection-add="related_products">Добавить связанную позицию</button>
          </div>
          <p class="cabinet-inline-hint">Сюда складываем соседние позиции, которые логично показывать рядом: модуль, комплект, следующий шаг.</p>
          <div class="cabinet-repeater" data-catalog-collection="related_products">${relatedProducts.map((item) => renderCatalogRelatedRow(item)).join("")}</div>
        </section>
        <section class="cabinet-editor-section">
          <div class="cabinet-editor-section__head">
            <div>
              <div class="cabinet-kicker">Совместимость</div>
              <h4 class="calc-card-title">Проверки совместимости</h4>
            </div>
            <button class="btn btn-secondary btn-ghost--small" type="button" data-catalog-collection-add="compatibility">Добавить правило</button>
          </div>
          <p class="cabinet-inline-hint">Короткие пометки: с чем совместимо, где нужна проверка и когда нужен адаптер.</p>
          <div class="cabinet-repeater" data-catalog-collection="compatibility">${compatibility.map((item) => renderCatalogCompatibilityRow(item)).join("")}</div>
        </section>
      </section>

      <section class="cabinet-product-editor__panel" data-catalog-editor-panel="publish" hidden>
        <section class="cabinet-editor-section">
          <div class="cabinet-editor-section__head">
            <div>
              <div class="cabinet-kicker">Наличие и публикация</div>
              <h4 class="calc-card-title">Статус карточки</h4>
            </div>
          </div>
          <div class="cabinet-field-grid">
            <label class="cabinet-field">
              <span class="cabinet-field-label">Статус страницы</span>
              <select class="admin-select" data-catalog-product-field="status">
                ${["published", "draft", "hidden"].map((status) => `<option value="${status}" ${product.status === status ? "selected" : ""}>${escapeHtml(humanizeCatalogPublicationStatus(status))}</option>`).join("")}
              </select>
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Наличие</span>
              <select class="admin-select" data-catalog-product-field="stock_status">
                ${["in_stock", "limited", "preorder", "out_of_stock"].map((status) => `<option value="${status}" ${product.stock_status === status ? "selected" : ""}>${escapeHtml(humanizeCatalogStockStatus(status))}</option>`).join("")}
              </select>
            </label>
          </div>
        </section>
      </section>

      <datalist id="catalog-related-options">${productOptions}</datalist>
      <datalist id="catalog-compatibility-options">${productOptions}</datalist>
    </article>
  `;
}

function renderSitePageRow(item) {
  return `
    <article class="cabinet-site-page-row">
      <div class="cabinet-site-page-main">
        <strong>${escapeHtml(item.label || item.id || "Без имени")}</strong>
        <span>${escapeHtml(item.goal || item.id || "страница")} · ${escapeHtml(item.primaryCta || "Без CTA")}</span>
      </div>
      <div class="cabinet-site-page-meta">
        <span class="cabinet-site-page-cta">${escapeHtml(item.secondaryCta || "Без второй кнопки")}</span>
        <span class="cabinet-site-page-status">${escapeHtml(humanizeCatalogPublicationStatus(item.status || "draft"))}</span>
      </div>
    </article>
  `;
}

function renderAdminUserRow(user) {
  const scopes = Array.isArray(user.scopes) ? user.scopes : [];
  return `
    <article class="cabinet-list-row cabinet-list-row--users">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(user.display_name || user.slug || "Без имени")}</strong>
        <span>${escapeHtml(user.email || "Без email")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(user.account_type || "user")}</strong>
        <span>${escapeHtml(user.role || "member")}</span>
      </div>
      <div class="cabinet-list-cell">
        ${scopes.length ? `<div class="cabinet-chip-row">${scopes.slice(0, 4).map((scope) => `<span class="account-note-chip">${escapeHtml(humanizeCabinetScope(scope))}</span>`).join("")}</div>` : '<span>Базовый доступ</span>'}
      </div>
      <div class="cabinet-list-cell">
        <strong>${user.is_active ? "Активен" : "Выключен"}</strong>
        <span>${escapeHtml(formatAuditTimestamp(user.updated_at || user.created_at || ""))}</span>
      </div>
    </article>
  `;
}

function renderAdminOrderDocumentEditor(order, documents) {
  const items = Array.isArray(documents) ? documents : [];
  const clientStage = getMemberOrderStageModel(order, {
    profileCompleteness: 3,
    documentsCount: items.length,
    messagesCount: 0,
  });
  return `
    <section class="cabinet-order-document-card">
      <div class="cabinet-document-group__head">
        <div>
          <div class="cabinet-kicker">Заказ</div>
          <h4 class="calc-card-title">${escapeHtml(order.title)}</h4>
          <p class="sublead">${escapeHtml(order.note || "Документы будут жить прямо рядом с этим заказом.")}</p>
        </div>
        <div class="cabinet-inline-meta">
          <span>${items.length} ${pluralizeRu(items.length, "документ", "документа", "документов")}</span>
          <span>${escapeHtml(describeMemberOrderStatus(order, 3).label)}</span>
        </div>
      </div>
      <div class="cabinet-field-grid cabinet-field-grid--catalog">
        <label class="cabinet-field">
          <span class="cabinet-field-label">Статус заказа</span>
          <select class="admin-select" data-admin-order-status="${order.id}">
            ${["draft", "submitted", "confirmed", "shipped", "completed"].map((status) => `<option value="${status}" ${String(order.status || "draft").toLowerCase() === status ? "selected" : ""}>${describeMemberOrderStatus({ ...order, status }, 3).label}</option>`).join("")}
          </select>
        </label>
        <label class="cabinet-field cabinet-field--wide">
          <span class="cabinet-field-label">Комментарий к заказу</span>
          <textarea class="admin-textarea" data-admin-order-note="${order.id}" rows="3" placeholder="Что уже подтверждено, чего ждём дальше">${escapeHtml(order.note || "")}</textarea>
        </label>
      </div>
      <article class="cabinet-mini-card">
        <strong>${escapeHtml(clientStage.title)}</strong>
        <span>${escapeHtml(clientStage.description)}</span>
      </article>
      <div class="cabinet-user-card-actions cabinet-user-card-actions--utility">
        <button class="btn btn-secondary" type="button" data-admin-order-save="${order.id}">Сохранить статус заказа</button>
      </div>
      ${items.length ? `
        <div class="cabinet-order-document-list">
          ${items.map((item) => `
            <article class="cabinet-order-document-editor" data-order-document-editor="${escapeAttribute(item.id)}">
              <div class="cabinet-field-grid">
                <label class="cabinet-field">
                  <span class="cabinet-field-label">Название</span>
                  <input class="admin-input" data-order-document-existing-title="${item.id}" type="text" value="${escapeAttribute(item.title || "")}" />
                </label>
                <label class="cabinet-field">
                  <span class="cabinet-field-label">Тип</span>
                  <select class="admin-select" data-order-document-existing-type="${item.id}">
                    ${["invoice", "specification", "pdf", "checklist", "other"].map((type) => `<option value="${type}" ${item.document_type === type ? "selected" : ""}>${humanizeOrderDocumentType(type)}</option>`).join("")}
                  </select>
                </label>
                <label class="cabinet-field cabinet-field--wide">
                  <span class="cabinet-field-label">Ссылка на файл</span>
                  <input class="admin-input" data-order-document-existing-url="${item.id}" type="text" value="${escapeAttribute(item.file_url || "")}" />
                </label>
                <label class="cabinet-field">
                  <span class="cabinet-field-label">Размер</span>
                  <input class="admin-input" data-order-document-existing-size="${item.id}" type="text" value="${escapeAttribute(item.file_size || "")}" placeholder="148 KB" />
                </label>
                <label class="cabinet-field">
                  <span class="cabinet-field-label">Статус</span>
                  <select class="admin-select" data-order-document-existing-status="${item.id}">
                    ${["draft", "ready", "sent"].map((status) => `<option value="${status}" ${item.status === status ? "selected" : ""}>${humanizeOrderDocumentStatus(status)}</option>`).join("")}
                  </select>
                </label>
              </div>
              <div class="cabinet-user-card-actions cabinet-user-card-actions--utility">
                <button class="btn btn-secondary" type="button" data-order-document-save="${item.id}">Сохранить документ</button>
                ${item.file_url ? `<a class="btn btn-secondary" href="${escapeAttribute(resolveOrderDocumentHref(item.file_url))}" target="_blank" rel="noopener">Открыть файл</a>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      ` : `<div class="account-empty">Для этого заказа документы ещё не добавлены.</div>`}
      <div class="cabinet-field-grid cabinet-field-grid--catalog">
        <label class="cabinet-field">
          <span class="cabinet-field-label">Название</span>
          <input class="admin-input" data-order-document-title="${order.id}" type="text" placeholder="Счёт на оплату" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Тип</span>
          <select class="admin-select" data-order-document-type="${order.id}">
            ${["invoice", "specification", "pdf", "checklist", "other"].map((type) => `<option value="${type}">${humanizeOrderDocumentType(type)}</option>`).join("")}
          </select>
        </label>
        <label class="cabinet-field cabinet-field--wide">
          <span class="cabinet-field-label">Ссылка на файл</span>
          <input class="admin-input" data-order-document-url="${order.id}" type="text" placeholder="documents/order-12/invoice.pdf" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Размер</span>
          <input class="admin-input" data-order-document-size="${order.id}" type="text" placeholder="148 KB" />
        </label>
        <label class="cabinet-field">
          <span class="cabinet-field-label">Статус</span>
          <select class="admin-select" data-order-document-status="${order.id}">
            ${["draft", "ready", "sent"].map((status) => `<option value="${status}">${humanizeOrderDocumentStatus(status)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="cabinet-user-card-actions cabinet-user-card-actions--utility">
        <button class="btn btn-primary" type="button" data-order-document-create="${order.id}">Добавить документ</button>
      </div>
    </section>
  `;
}

const CABINET_SCOPE_OPTIONS = [
  { id: "crm", label: "CRM", group: "Команда" },
  { id: "catalog", label: "Каталог", group: "Контент" },
  { id: "special_pages", label: "Материалы", group: "Контент" },
  { id: "orders", label: "Заказы", group: "Клиентский путь" },
  { id: "documents", label: "Документы", group: "Клиентский путь" },
  { id: "course_access", label: "Клубничный Хак", group: "Клиентский путь" },
  { id: "calc_prices", label: "Цены калькулятора", group: "Система" },
  { id: "site_settings", label: "Сайт", group: "Система" },
  { id: "catalog_settings", label: "Настройки каталога", group: "Система" },
  { id: "users_manage", label: "Пользователи", group: "Система" },
  { id: "integrations", label: "Интеграции", group: "Система" },
  { id: "audit", label: "Аудит", group: "Система" },
];

function getScopeOptionsForAccountType(accountType = "member") {
  const normalized = String(accountType || "member").toLowerCase();
  if (normalized === "admin") {
    return CABINET_SCOPE_OPTIONS.filter((item) => ["Команда", "Контент", "Система"].includes(item.group));
  }
  return CABINET_SCOPE_OPTIONS.filter((item) => ["Контент", "Клиентский путь"].includes(item.group));
}

function renderAdminUserListRow(user, selectedUserId = "") {
  const scopes = Array.isArray(user.scopes) ? user.scopes : [];
  const isSelected = String(user.id) === String(selectedUserId);
  const searchIndex = [
    user.display_name,
    user.email,
    user.slug,
    user.role,
    user.account_type,
    ...scopes,
  ].filter(Boolean).join(" ").toLowerCase();
  const tags = [
    String(user.account_type || "").toLowerCase(),
    user.is_active ? "active" : "inactive",
    scopes.includes("course_access") ? "course" : "",
  ].filter(Boolean).join(" ");

  return `
    <article class="cabinet-list-row cabinet-list-row--users${isSelected ? " is-selected" : ""}" data-user-row data-user-search-index="${escapeAttribute(searchIndex)}" data-user-tags="${escapeAttribute(tags)}">
      <div class="cabinet-list-cell">
        <strong><a href="${escapeAttribute(cabinetSectionHref("users", { user: user.id }))}">${escapeHtml(user.display_name || user.slug || "Без имени")}</a></strong>
        <span>${escapeHtml(user.email || user.slug || "Без email")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(user.account_type === "admin" ? "Команда" : "Клиент")}</strong>
        <span>${escapeHtml(humanizeCabinetRole(user.role || user.account_type || "member"))}</span>
      </div>
      <div class="cabinet-list-cell">
        ${scopes.length ? `<div class="cabinet-chip-row">${scopes.slice(0, 3).map((scope) => `<span class="account-note-chip">${escapeHtml(humanizeCabinetScope(scope))}</span>`).join("")}</div>` : "<span>Базовый доступ</span>"}
      </div>
      <div class="cabinet-list-cell">
        <strong>${user.is_active ? "Активен" : "Выключен"}</strong>
        <span>${escapeHtml(formatAuditTimestamp(user.updated_at || user.created_at || ""))}</span>
      </div>
    </article>
  `;
}

function renderScopeCheckboxGrid(user) {
  const scopes = new Set(Array.isArray(user.scopes) ? user.scopes : []);
  const options = getScopeOptionsForAccountType(user.account_type || "member");
  const groups = Array.from(new Set(options.map((item) => item.group)));
  return `
    <div class="cabinet-permission-grid">
      ${groups.map((group) => `
        <section class="cabinet-permission-group">
          <div class="cabinet-kicker">${escapeHtml(group)}</div>
          <div class="cabinet-permission-group__items">
            ${options
              .filter((item) => item.group === group)
              .map((item) => `
                <label class="cabinet-choice-chip">
                  <input type="checkbox" data-user-scope="${escapeAttribute(user.id)}" value="${escapeAttribute(item.id)}" ${scopes.has(item.id) ? "checked" : ""} />
                  <span>${escapeHtml(item.label)}</span>
                </label>
              `).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;
}

function renderAdminUserDetail(user, orders = [], documentsByOrder = {}) {
  const scopes = Array.isArray(user.scopes) ? user.scopes : [];
  const roleOptions = getRoleOptionsForAccountType(user.account_type || "member");
  const accountOptions = ["admin", "member"];
  const documentsCount = orders.reduce((sum, order) => sum + (documentsByOrder[order.id] || []).length, 0);

  return `
    <article class="card card-pad cabinet-card cabinet-user-detail" data-cabinet-user-card="${escapeAttribute(user.id)}">
      <div class="cabinet-user-editor__head">
        <div class="cabinet-user-editor__identity">
          <strong>${escapeHtml(user.display_name || user.slug || "Без имени")}</strong>
          <span>${escapeHtml(user.email || user.slug || "Без email")}</span>
        </div>
        <div class="cabinet-chip-row">
          <span class="account-note-chip">${escapeHtml(user.account_type === "admin" ? "Команда" : "Клиент")}</span>
          <span class="account-note-chip">${escapeHtml(humanizeCabinetRole(user.role || user.account_type || "member"))}</span>
          <span class="account-note-chip">${user.is_active ? "Активен" : "Выключен"}</span>
          <span class="account-note-chip">${user.has_password ? "Пароль задан" : "Без пароля"}</span>
        </div>
      </div>

      <div class="cabinet-user-detail__summary">
        <article class="cabinet-mini-card">
          <strong>Доступ</strong>
          <span>${scopes.length ? `${scopes.length} ${pluralizeRu(scopes.length, "раздел", "раздела", "разделов")} и сценариев` : "Базовый доступ без дополнительных разделов"}</span>
        </article>
        <article class="cabinet-mini-card">
          <strong>Заказы и документы</strong>
          <span>${orders.length} ${pluralizeRu(orders.length, "заказ", "заказа", "заказов")} · ${documentsCount} ${pluralizeRu(documentsCount, "документ", "документа", "документов")}</span>
        </article>
        <article class="cabinet-mini-card">
          <strong>Активность</strong>
          <span>Создан ${escapeHtml(formatAuditTimestamp(user.created_at || "")) || "недавно"} · обновлён ${escapeHtml(formatAuditTimestamp(user.updated_at || user.created_at || ""))}</span>
        </article>
      </div>

      <div class="cabinet-admin-tabs cabinet-admin-tabs--editor">
        <button class="cabinet-admin-tab is-active" type="button" data-user-detail-tab="account">Аккаунт</button>
        <button class="cabinet-admin-tab" type="button" data-user-detail-tab="access">Доступ</button>
        <button class="cabinet-admin-tab" type="button" data-user-detail-tab="orders">Заказы и документы</button>
        <button class="cabinet-admin-tab" type="button" data-user-detail-tab="messages">Сообщения</button>
        <button class="cabinet-admin-tab" type="button" data-user-detail-tab="activity">Активность</button>
      </div>

      <section class="cabinet-product-editor__panel is-active" data-user-detail-panel="account">
        <div class="cabinet-field-grid">
          <label class="cabinet-field">
            <span class="cabinet-field-label">Имя</span>
            <input class="admin-input" data-user-name="${user.id}" type="text" value="${escapeAttribute(user.display_name || "")}" />
          </label>
          <label class="cabinet-field">
            <span class="cabinet-field-label">Email</span>
            <input class="admin-input" data-user-email="${user.id}" type="text" value="${escapeAttribute(user.email || "")}" />
          </label>
          <label class="cabinet-field">
            <span class="cabinet-field-label">Роль</span>
            <select class="admin-select" data-user-role="${user.id}">
              ${roleOptions.map((role) => `<option value="${role}" ${user.role === role ? "selected" : ""}>${humanizeCabinetRole(role)}</option>`).join("")}
            </select>
          </label>
          <label class="cabinet-field">
            <span class="cabinet-field-label">Тип аккаунта</span>
            <select class="admin-select" data-user-account-type="${user.id}">
              ${accountOptions.map((accountType) => `<option value="${accountType}" ${user.account_type === accountType ? "selected" : ""}>${accountType === "admin" ? "Команда" : "Клиент"}</option>`).join("")}
            </select>
          </label>
          <label class="cabinet-checkbox-row cabinet-checkbox-row--field">
            <input class="admin-input" data-user-active="${user.id}" type="checkbox" ${user.is_active ? "checked" : ""} />
            <span>Аккаунт активен</span>
          </label>
        </div>
        <div class="cabinet-user-card-actions">
          <button class="btn btn-primary" type="button" data-user-save="${user.id}">Сохранить карточку</button>
          <button class="btn btn-secondary" type="button" data-user-password="${user.id}">Задать пароль</button>
          <button class="btn btn-secondary" type="button" data-user-klubhack="${user.id}">Выдать Клубничный Хак</button>
        </div>
      </section>

      <section class="cabinet-product-editor__panel" data-user-detail-panel="access" hidden>
        <section class="cabinet-editor-section">
          <div class="cabinet-editor-section__head">
            <div>
              <div class="cabinet-kicker">Права</div>
              <h4 class="calc-card-title">Какие разделы открыты</h4>
            </div>
          </div>
          <p class="cabinet-inline-hint">Вместо raw-строки доступы собираются чекбоксами по группам.</p>
          ${renderScopeCheckboxGrid(user)}
        </section>
      </section>

      <section class="cabinet-product-editor__panel" data-user-detail-panel="orders" hidden>
        <section class="cabinet-editor-section">
          <div class="cabinet-editor-section__head">
            <div>
              <div class="cabinet-kicker">Заказы и документы</div>
              <h4 class="calc-card-title">Что привязано к пользователю</h4>
            </div>
          </div>
          ${user.account_type === "member"
            ? (orders.length
              ? orders.map((order) => renderAdminOrderDocumentEditor(order, documentsByOrder[order.id] || [])).join("")
              : `<div class="cabinet-mini-card"><strong>Заказов пока нет</strong><span>Когда пользователь соберёт первую закупку, здесь появятся заказы и документы.</span></div>`)
            : `<div class="cabinet-mini-card"><strong>Заказы не используются</strong><span>Для команды этот таб служит только для единообразия detail-layout.</span></div>`}
        </section>
      </section>

      <section class="cabinet-product-editor__panel" data-user-detail-panel="messages" hidden>
        <section class="cabinet-editor-section">
          <div class="cabinet-editor-section__head">
            <div>
              <div class="cabinet-kicker">Сообщения</div>
              <h4 class="calc-card-title">Быстрый ответ в кабинет</h4>
            </div>
          </div>
          <p class="cabinet-inline-hint">Используйте короткий human-readable ответ, а не системный комментарий.</p>
          <label class="cabinet-field">
            <span class="cabinet-field-label">Сообщение</span>
            <textarea class="admin-textarea" data-user-message-body="${user.id}" rows="5" placeholder="Коротко опишите следующий шаг для клиента или команды"></textarea>
          </label>
          <div class="cabinet-user-card-actions">
            <button class="btn btn-secondary" type="button" data-user-message-send="${user.id}">Отправить сообщение</button>
          </div>
        </section>
      </section>

      <section class="cabinet-product-editor__panel" data-user-detail-panel="activity" hidden>
        <section class="cabinet-editor-section">
          <div class="cabinet-editor-section__head">
            <div>
              <div class="cabinet-kicker">Активность</div>
              <h4 class="calc-card-title">Состояние аккаунта</h4>
            </div>
          </div>
          <div class="cabinet-mini-list cabinet-mini-list--tight">
            <article class="cabinet-mini-card">
              <strong>Slug</strong>
              <span>${escapeHtml(user.slug || "не задан")}</span>
            </article>
            <article class="cabinet-mini-card">
              <strong>Последнее обновление</strong>
              <span>${escapeHtml(formatAuditTimestamp(user.updated_at || user.created_at || ""))}</span>
            </article>
            <article class="cabinet-mini-card">
              <strong>Пароль</strong>
              <span>${user.has_password ? "Задан и готов к входу" : "Ещё не установлен"}</span>
            </article>
            <article class="cabinet-mini-card">
              <strong>Разделы</strong>
              <span>${scopes.length ? scopes.map((scope) => humanizeCabinetScope(scope)).join(", ") : "Базовый доступ"}</span>
            </article>
          </div>
        </section>
      </section>
    </article>
  `;
}

function renderAdminUserEditor(user, orders = [], documentsByOrder = {}) {
  const scopes = Array.isArray(user.scopes) ? user.scopes : [];
  const roleOptions = getRoleOptionsForAccountType(user.account_type || "member");
  const accountOptions = ["admin", "member"];
  return `
    <article class="cabinet-user-editor" data-cabinet-user-card="${escapeAttribute(user.id)}">
      <div class="cabinet-user-editor__head">
        <div class="cabinet-user-editor__identity">
          <strong>${escapeHtml(user.display_name || user.slug || "Без имени")}</strong>
          <span>${escapeHtml(user.email || user.slug || "Без email")}</span>
        </div>
        <div class="cabinet-chip-row">
          <span class="account-note-chip">${escapeHtml(user.account_type || "user")}</span>
          <span class="account-note-chip">${escapeHtml(user.role || "member")}</span>
          <span class="account-note-chip">${user.is_active ? "Активен" : "Выключен"}</span>
          <span class="account-note-chip">${user.has_password ? "Пароль задан" : "Без пароля"}</span>
        </div>
      </div>
      <div class="cabinet-user-editor__layout">
        <div class="cabinet-user-editor__settings">
          <div class="cabinet-kicker">Доступ</div>
          <div class="cabinet-field-grid">
            <label class="cabinet-field">
              <span class="cabinet-field-label">Имя</span>
              <input class="admin-input" data-user-name="${user.id}" type="text" value="${escapeAttribute(user.display_name || "")}" />
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Email</span>
              <input class="admin-input" data-user-email="${user.id}" type="text" value="${escapeAttribute(user.email || "")}" />
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Роль</span>
              <select class="admin-select" data-user-role="${user.id}">
                ${roleOptions.map((role) => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`).join("")}
              </select>
            </label>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Тип аккаунта</span>
              <select class="admin-select" data-user-account-type="${user.id}">
                ${accountOptions.map((accountType) => `<option value="${accountType}" ${user.account_type === accountType ? "selected" : ""}>${accountType}</option>`).join("")}
              </select>
            </label>
            <label class="cabinet-field cabinet-field--wide">
              <span class="cabinet-field-label">Доступы</span>
              <textarea class="admin-textarea" data-user-scopes="${user.id}" rows="2" placeholder="catalog, special_pages, crm">${escapeHtml(scopes.join(", "))}</textarea>
            </label>
            <label class="cabinet-checkbox-row cabinet-checkbox-row--field">
              <input class="admin-input" data-user-active="${user.id}" type="checkbox" ${user.is_active ? "checked" : ""} />
              <span>Аккаунт активен</span>
            </label>
          </div>
        </div>
        <aside class="cabinet-user-editor__utility">
          <div class="cabinet-mini-card">
            <strong>Быстрые действия</strong>
            <span>Сохраните карточку, откройте Клубничный Хак для оплативших и при необходимости задайте новый пароль.</span>
          </div>
          <div class="cabinet-user-card-actions">
            <button class="btn btn-primary" type="button" data-user-save="${user.id}">Сохранить</button>
            <button class="btn btn-secondary" type="button" data-user-klubhack="${user.id}">Выдать Клубничный Хак</button>
            <button class="btn btn-secondary" type="button" data-user-password="${user.id}">Задать пароль</button>
          </div>
          <label class="cabinet-field">
            <span class="cabinet-field-label">Сообщение в кабинет</span>
            <textarea class="admin-textarea" data-user-message-body="${user.id}" rows="3" placeholder="Короткий ответ или комментарий для пользователя"></textarea>
          </label>
          <div class="cabinet-user-card-actions cabinet-user-card-actions--utility">
            <button class="btn btn-secondary" type="button" data-user-message-send="${user.id}">Отправить сообщение</button>
          </div>
        </aside>
      </div>
      ${user.account_type === "member" ? `
        <section class="cabinet-user-editor__orders">
          <div class="cabinet-kicker">Заказы и документы</div>
          <h3 class="calc-card-title">Файлы, привязанные к заказам пользователя</h3>
          ${orders.length ? orders.map((order) => renderAdminOrderDocumentEditor(order, documentsByOrder[order.id] || [])).join("") : `
            <div class="cabinet-mini-card">
              <strong>Заказов пока нет</strong>
              <span>Когда пользователь соберёт первую закупку, здесь можно будет добавить счёт, спецификацию и PDF прямо к заказу.</span>
            </div>
          `}
        </section>
      ` : ""}
    </article>
  `;
}

function renderMemberMessageItem(item, latestTeamMessageId = null) {
  const isStaff = String(item.sender_type || "").toLowerCase() === "staff";
  const isLatestTeam = isStaff && latestTeamMessageId != null && String(item.id) === String(latestTeamMessageId);
  return `
    <article class="cabinet-message-card${isStaff ? " cabinet-message-card--staff" : " cabinet-message-card--user"}${isLatestTeam ? " cabinet-message-card--latest" : ""}">
      <strong>${escapeHtml(item.subject || (isStaff ? "Ответ команды" : "Ваше сообщение"))}</strong>
      <span>${escapeHtml(item.message || "")}</span>
      <div class="cabinet-inline-meta">
        <span>${escapeHtml(isStaff ? item.sender_name || "Команда" : "Вы")}</span>
        <span>${escapeHtml(formatAuditTimestamp(item.created_at || ""))}</span>
      </div>
    </article>
  `;
}

function renderCrmLeadItem(lead) {
  return `
    <article class="cabinet-mini-card">
      <strong>#${escapeHtml(lead.id)} · ${escapeHtml(lead.name || "Без имени")}</strong>
      <span>${escapeHtml(lead.request_type || lead.message || "Без краткого описания")}</span>
      <div class="cabinet-inline-meta">
        <span>${escapeHtml(lead.owner_name || "Без owner")}</span>
        <span>${escapeHtml(lead.status_name || lead.status_code || "Без стадии")}</span>
      </div>
    </article>
  `;
}

function renderCrmTaskItem(task) {
  return `
    <article class="cabinet-mini-card">
      <strong>${escapeHtml(task.title || task.subject || task.text || "Задача CRM")}</strong>
      <span>${escapeHtml(task.lead_name || task.lead_title || task.entity_name || "Без привязки к лиду")}</span>
      <div class="cabinet-inline-meta">
        <span>${escapeHtml(task.owner_name || "Без owner")}</span>
        <span>${escapeHtml(task.due_state || task.status || "planned")}</span>
      </div>
    </article>
  `;
}

function renderCrmPipelineItem(item) {
  return `
    <article class="cabinet-mini-card">
      <strong>${escapeHtml(item.title || item.name || item.slug || "Стадия CRM")}</strong>
      <span>${escapeHtml(item.code || item.pipeline_code || "pipeline")}</span>
    </article>
  `;
}

function renderCrmOwnerItem(item) {
  return `
    <article class="cabinet-mini-card">
      <strong>${escapeHtml(item.display_name || item.name || item.slug || "Пользователь CRM")}</strong>
      <span>${escapeHtml(item.role || item.email || "owner")}</span>
    </article>
  `;
}

function renderCrmWorkloadItem(item) {
  const ownerName = item.owner_name || item.display_name || item.name || item.slug || "Ответственный";
  const openCount = item.open_count ?? item.lead_count ?? item.active_count ?? item.count ?? 0;
  const overdueCount = item.overdue_count ?? item.overdue ?? item.late_count ?? 0;
  return `
    <article class="cabinet-mini-card">
      <strong>${escapeHtml(ownerName)}</strong>
      <span>${escapeHtml(`${openCount} в работе · ${overdueCount} просрочено`)}</span>
    </article>
  `;
}

function renderCrmQueueItem(item) {
  const title = item.lead_name || item.name || item.title || `Лид #${item.lead_id || item.id || "—"}`;
  const source = item.source || item.request_type || item.pipeline_name || "очередь CRM";
  const owner = item.owner_name || item.owner || "без ответственного";
  return `
    <article class="cabinet-mini-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(source)}</span>
      <div class="cabinet-inline-meta">
        <span>${escapeHtml(owner)}</span>
      </div>
    </article>
  `;
}

function renderCrmDuplicateItem(item) {
  const title = item.title || item.name || item.lead_name || `Дубль #${item.id || item.duplicate_id || "—"}`;
  const status = item.status || item.status_filter || "open";
  const note = item.reason || item.note || item.canonical_name || "нужно посмотреть вручную";
  return `
    <article class="cabinet-mini-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(note)}</span>
      <div class="cabinet-inline-meta">
        <span>${escapeHtml(status)}</span>
      </div>
    </article>
  `;
}

function renderCalcPriceItem(item) {
  return `
    <article class="cabinet-mini-card">
      <strong>${escapeHtml(item.label || item.name || `Позиция ${item.id}`)}</strong>
      <span>${escapeHtml(item.note || item.type || "драйвер расчёта")} · ${formatRub(Number(item.unitPrice || 0))}</span>
    </article>
  `;
}

function renderAuditItem(item) {
  const action = humanizeAuditAction(item.action);
  const area = humanizeAuditArea(item.area);
  const targetType = humanizeAuditTarget(item.target_type);
  const actor = item.actor_name || "Система";
  const createdAt = item.created_at || item.createdAt || "";
  let isoDate = "";
  if (createdAt) {
    try {
      isoDate = new Date(createdAt).toISOString().slice(0, 10);
    } catch {}
  }
  const segment = getAuditSegment(item);
  return `
    <article class="cabinet-list-row cabinet-list-row--audit" data-audit-row data-audit-action="${escapeAttribute(action)}" data-audit-actor="${escapeAttribute(actor)}" data-audit-area="${escapeAttribute(area)}" data-audit-date="${escapeAttribute(isoDate)}" data-audit-segment="${escapeAttribute(segment)}">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(action)} · ${escapeHtml(area)}</strong>
        <span>${escapeHtml(targetType)}${item.target_id ? ` · ${escapeHtml(item.target_id)}` : ""}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(actor)}</strong>
        <span>${escapeHtml(humanizeActorRole(item.actor_role || ""))}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(formatAuditTimestamp(createdAt))}</strong>
      </div>
    </article>
  `;
}

function getAuditSegment(item) {
  const action = String(item?.action || "").toLowerCase();
  const area = String(item?.area || "").toLowerCase();
  if (action.includes("login") || action.includes("logout") || area === "auth") return "auth";
  if (area === "crm" || String(item?.target_type || "").toLowerCase() === "lead") return "crm";
  if (area === "users" || action.includes("password")) return "access";
  return "content";
}

function humanizeAuditAction(value) {
  const action = String(value || "").toLowerCase();
  if (!action) return "Действие";
  if (action.includes("login")) return "Вход";
  if (action.includes("logout")) return "Выход";
  if (action.includes("create")) return "Создание";
  if (action.includes("update")) return "Изменение";
  if (action.includes("delete")) return "Удаление";
  if (action.includes("sync")) return "Синхронизация";
  if (action.includes("password")) return "Смена пароля";
  return value;
}

function humanizeAuditArea(value) {
  const area = String(value || "").toLowerCase();
  if (!area) return "Система";
  if (area === "crm") return "CRM";
  if (area === "catalog") return "Каталог";
  if (area === "users") return "Пользователи";
  if (area === "site") return "Сайт";
  if (area === "auth") return "Авторизация";
  if (area.includes("calc")) return "Калькулятор";
  return value;
}

function humanizeAuditTarget(value) {
  const target = String(value || "").toLowerCase();
  if (!target) return "Объект";
  if (target === "user") return "Пользователь";
  if (target === "lead") return "Лид";
  if (target === "task") return "Задача";
  if (target === "page") return "Страница";
  if (target === "item") return "Позиция";
  if (target === "order") return "Заказ";
  return value;
}

function humanizeActorRole(value) {
  const role = String(value || "").toLowerCase();
  if (!role) return "системная роль";
  if (role === "owner") return "владелец";
  if (role === "admin") return "админ";
  if (role === "manager") return "менеджер";
  if (role === "operator") return "оператор";
  if (role === "editor") return "редактор";
  if (role === "student") return "участник курса";
  if (role === "buyer") return "клиент";
  return value;
}

function getRoleOptionsForAccountType(accountType) {
  return accountType === "admin"
    ? ["owner", "admin", "manager", "operator", "editor"]
    : ["buyer", "student"];
}

function normalizeCabinetRoleByAccountType(role, accountType) {
  const normalizedRole = String(role || "").trim().toLowerCase();
  const normalizedAccountType = String(accountType || "member").trim().toLowerCase();
  const allowed = new Set(getRoleOptionsForAccountType(normalizedAccountType));
  if (allowed.has(normalizedRole)) return normalizedRole;
  return normalizedAccountType === "admin" ? "manager" : "buyer";
}

function extractCrmItems(payload) {
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.queue)) return payload.queue;
  if (Array.isArray(payload?.owners)) return payload.owners;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function countCrmNewLeads(leads) {
  return leads.filter((lead) => {
    const status = String(lead.status_code || lead.status || lead.status_name || lead.pipeline_stage || "").toLowerCase();
    return status.includes("new") || status.includes("нов") || status.includes("incoming") || status.includes("lead");
  }).length;
}

function normalizeCabinetRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  if (["owner", "admin", "editor", "manager", "operator"].includes(normalized)) {
    return normalized;
  }
  return "admin";
}

function sumCrmLeadPotential(leads) {
  return leads.reduce((total, lead) => total + readCrmMoneyValue(lead), 0);
}

function readCrmMoneyValue(item) {
  const candidates = [
    item?.budget,
    item?.expected_value,
    item?.amount,
    item?.price,
    item?.value,
    item?.sum,
    item?.revenue,
  ];
  for (const candidate of candidates) {
    const parsed = parseLooseNumber(candidate);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function readCrmStageCount(item) {
  const candidates = [
    item?.lead_count,
    item?.count,
    item?.items_count,
    item?.open_count,
    item?.total,
  ];
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function readCrmStageValue(item) {
  const candidates = [
    item?.amount,
    item?.value,
    item?.budget,
    item?.sum,
    item?.revenue,
  ];
  for (const candidate of candidates) {
    const parsed = parseLooseNumber(candidate);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function parseLooseNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const normalized = String(value || "")
    .replace(/\s+/g, "")
    .replace(/[^0-9,.-]/g, "")
    .replace(/,(?=\d{1,2}$)/, ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function readCrmHealthCount(payload) {
  if (!payload || typeof payload !== "object") return 0;
  const direct = [
    payload.sync_issues,
    payload.issue_count,
    payload.error_count,
    payload.warnings_count,
    payload.open_issues,
  ].find((value) => Number.isFinite(Number(value)));
  if (direct !== undefined) return Number(direct) || 0;
  const arrays = [payload.items, payload.rows, payload.issues, payload.warnings, payload.errors].find(Array.isArray);
  return Array.isArray(arrays) ? arrays.length : 0;
}

function renderRuntimeEmpty(label, message, actions = []) {
  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">${escapeHtml(label)}</div>
        <h2 class="calc-card-title">${escapeHtml(label)}</h2>
        <p class="sublead">${escapeHtml(message)}</p>
      </div>
      ${actions.length ? `
        <article class="card card-pad cabinet-card">
          <div class="tag">Что делать</div>
          <h3 class="calc-card-title">Следующий шаг</h3>
          <div class="cabinet-home-actions">
            ${actions.map((action) => `
              <a class="btn ${action.tone === "secondary" ? "btn-secondary" : "btn-primary"}" href="${escapeAttribute(action.href)}">${escapeHtml(action.label)}</a>
            `).join("")}
          </div>
        </article>
      ` : ""}
    </div>
  `;
}

function humanizeBoolean(value) {
  return value ? "вкл" : "выкл";
}

function bindAdminUsersSection() {
  document.querySelectorAll("[data-user-account-type]").forEach((field) => {
    syncUserRoleOptions(field.dataset.userAccountType);
    field.addEventListener("change", () => syncUserRoleOptions(field.dataset.userAccountType));
  });
  document.querySelector("[data-user-search]")?.addEventListener("input", applyAdminUserFilters);
  document.querySelectorAll("[data-user-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-user-filter]").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      applyAdminUserFilters();
    });
  });
  document.querySelector('[data-cabinet-user-create]')?.addEventListener("click", () => {
    handleAdminUserCreate();
  });
  document.querySelectorAll("[data-user-save]").forEach((button) => {
    button.addEventListener("click", () => handleAdminUserSave(button.dataset.userSave));
  });
  document.querySelectorAll("[data-user-klubhack]").forEach((button) => {
    button.addEventListener("click", () => applyKlubhackPreset(button.dataset.userKlubhack));
  });
  document.querySelectorAll("[data-user-password]").forEach((button) => {
    button.addEventListener("click", () => handleAdminUserPassword(button.dataset.userPassword));
  });
  document.querySelectorAll("[data-user-message-send]").forEach((button) => {
    button.addEventListener("click", () => handleAdminUserMessage(button.dataset.userMessageSend));
  });
  document.querySelectorAll("[data-order-document-create]").forEach((button) => {
    button.addEventListener("click", () => handleAdminOrderDocumentCreate(button.dataset.orderDocumentCreate));
  });
  document.querySelectorAll("[data-order-document-save]").forEach((button) => {
    button.addEventListener("click", () => handleAdminOrderDocumentSave(button.dataset.orderDocumentSave));
  });
  document.querySelectorAll("[data-admin-order-save]").forEach((button) => {
    button.addEventListener("click", () => handleAdminOrderSave(button.dataset.adminOrderSave));
  });
  document.querySelectorAll("[data-user-detail-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.dataset.userDetailTab;
      document.querySelectorAll("[data-user-detail-tab]").forEach((node) => {
        node.classList.toggle("is-active", node === button);
      });
      document.querySelectorAll("[data-user-detail-panel]").forEach((panel) => {
        const isActive = panel.dataset.userDetailPanel === tabId;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    });
  });
  applyAdminUserFilters();
}

function applyAdminUserFilters() {
  const needle = String(document.querySelector("[data-user-search]")?.value || "").trim().toLowerCase();
  const activeFilter = document.querySelector("[data-user-filter].is-active")?.dataset.userFilter || "all";
  document.querySelectorAll("[data-user-row]").forEach((row) => {
    const haystack = String(row.getAttribute("data-user-search-index") || "");
    const tags = String(row.getAttribute("data-user-tags") || "");
    const matchesSearch = !needle || haystack.includes(needle);
    const matchesFilter = activeFilter === "all" || tags.split(/\s+/).includes(activeFilter);
    row.hidden = !(matchesSearch && matchesFilter);
  });
}

function syncUserRoleOptions(userId) {
  if (!userId) return;
  const accountTypeField = document.querySelector(`[data-user-account-type="${userId}"]`);
  const roleField = document.querySelector(`[data-user-role="${userId}"]`);
  if (!accountTypeField || !roleField) return;
  const accountType = String(accountTypeField.value || "member").trim().toLowerCase();
  const options = getRoleOptionsForAccountType(accountType);
  const currentValue = normalizeCabinetRoleByAccountType(roleField.value, accountType);
  roleField.innerHTML = options.map((role) => `<option value="${role}" ${role === currentValue ? "selected" : ""}>${role}</option>`).join("");
  roleField.value = currentValue;
}

function bindAdminCatalogSection() {
  document.querySelector("[data-catalog-manager-search]")?.addEventListener("input", applyAdminCatalogFilters);
  document.querySelectorAll("[data-catalog-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-catalog-filter]").forEach((node) => node.classList.remove("is-active"));
      button.classList.add("is-active");
      applyAdminCatalogFilters();
    });
  });
  document.querySelector("[data-catalog-toolbar-create]")?.addEventListener("click", () => {
    handleAdminCatalogCreateDraft();
  });
  document.querySelectorAll("[data-catalog-product-save]").forEach((button) => {
    button.addEventListener("click", () => handleAdminCatalogProductSave(button.dataset.catalogProductSave));
  });
  document.querySelectorAll("[data-catalog-collection-add]").forEach((button) => {
    button.addEventListener("click", () => handleCatalogCollectionAdd(button.dataset.catalogCollectionAdd));
  });
  document.querySelectorAll("[data-catalog-collection-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      button.closest("[data-catalog-collection-item]")?.remove();
    });
  });
  document.querySelectorAll("[data-catalog-product-editor]").forEach((editor) => {
    bindCatalogMediaManager(editor);
    bindCatalogEditorTabs(editor);
  });
  applyAdminCatalogFilters();
}

function applyAdminCatalogFilters() {
  const needle = String(document.querySelector("[data-catalog-manager-search]")?.value || "").trim().toLowerCase();
  const activeFilter = document.querySelector("[data-catalog-filter].is-active")?.dataset.catalogFilter || "all";
  document.querySelectorAll("[data-catalog-manager-row]").forEach((row) => {
    const haystack = String(row.getAttribute("data-catalog-search-index") || "");
    const status = String(row.getAttribute("data-catalog-status") || "");
    const matchesSearch = !needle || haystack.includes(needle);
    const matchesFilter = activeFilter === "all" || status === activeFilter;
    row.hidden = !(matchesSearch && matchesFilter);
  });
}

function bindCatalogEditorTabs(editor) {
  editor.querySelectorAll("[data-catalog-editor-tab]").forEach((button) => {
    if (button.dataset.catalogTabBound) return;
    button.dataset.catalogTabBound = "true";
    button.addEventListener("click", () => {
      const tabId = button.dataset.catalogEditorTab;
      editor.querySelectorAll("[data-catalog-editor-tab]").forEach((node) => {
        node.classList.toggle("is-active", node === button);
      });
      editor.querySelectorAll("[data-catalog-editor-panel]").forEach((panel) => {
        const isActive = panel.dataset.catalogEditorPanel === tabId;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    });
  });
}

function bindMemberMessagesSection(session) {
  document.querySelector("[data-member-message-send]")?.addEventListener("click", async () => {
    const subjectField = document.querySelector("[data-member-message-subject]");
    const bodyField = document.querySelector("[data-member-message-body]");
    const status = document.querySelector("[data-member-message-status]");
    const subject = subjectField?.value.trim() || "Вопрос по проекту";
    const message = bodyField?.value.trim() || "";
    if (!message) {
      if (status) status.textContent = "Введите текст сообщения.";
      return;
    }
    if (status) status.textContent = "Отправляем…";
    try {
      await createMemberMessage({ subject, message });
      if (subjectField) subjectField.value = "Вопрос по проекту";
      if (bodyField) bodyField.value = "";
      if (status) status.textContent = "Сообщение отправлено.";
      await rerenderCurrentSection();
    } catch (error) {
      if (status) status.textContent = `Не отправилось: ${cleanupError(error.message || "runtime_error")}`;
    }
  });
}

function bindMemberOrdersSection(session) {
  document.querySelectorAll("[data-member-order-message-send]").forEach((button) => {
    button.addEventListener("click", async () => {
      const orderId = button.dataset.memberOrderMessageSend;
      const subjectField = document.querySelector(`[data-member-order-message-subject="${orderId}"]`);
      const bodyField = document.querySelector(`[data-member-order-message-body="${orderId}"]`);
      const status = document.querySelector(`[data-member-order-message-status="${orderId}"]`);
      const subject = subjectField?.value.trim() || "Сообщение по заказу";
      const message = bodyField?.value.trim() || "";
      if (!message) {
        if (status) status.textContent = "Введите текст сообщения.";
        return;
      }
      if (status) status.textContent = "Отправляем сообщение…";
      try {
        await createMemberMessage({ subject, message });
        if (bodyField) bodyField.value = "";
        if (status) status.textContent = "Сообщение отправлено.";
        await rerenderCurrentSection();
      } catch (error) {
        if (status) status.textContent = `Не отправилось: ${cleanupError(error.message || "runtime_error")}`;
      }
    });
  });
}

function bindMemberProfileSection(session) {
  document.querySelector("[data-member-profile-save]")?.addEventListener("click", async () => {
    const payload = {
      display_name: document.querySelector('[data-member-profile="display_name"]')?.value.trim() || "",
      email: document.querySelector('[data-member-profile="email"]')?.value.trim() || "",
      phone: document.querySelector('[data-member-profile="phone"]')?.value.trim() || "",
      company: document.querySelector('[data-member-profile="company"]')?.value.trim() || "",
      delivery_address: document.querySelector('[data-member-profile="delivery_address"]')?.value.trim() || "",
      delivery_comment: document.querySelector('[data-member-profile="delivery_comment"]')?.value.trim() || "",
      newsletter: Boolean(document.querySelector('[data-member-profile="newsletter"]')?.checked),
    };
    const status = document.querySelector("[data-member-profile-status]");
    if (status) status.textContent = "Сохраняем…";
    try {
      await saveMemberProfile(session, payload);
      if (status) status.textContent = "Сохранено.";
      renderUserChips(currentSession);
    } catch (error) {
      if (status) status.textContent = `Не сохранилось: ${cleanupError(error.message || "runtime_error")}`;
    }
  });
}

function bindMemberCartSection(session) {
  const canOpenOrders = sessionHasSection(session, "orders");
  document.querySelectorAll("[data-member-create-order]").forEach((button) => {
    button.addEventListener("click", async () => {
      const cart = loadMemberCart();
      const cartEntries = Object.entries(cart).filter(([, qty]) => (Number(qty) || 0) > 0);
      if (!cartEntries.length) {
        await rerenderCurrentSection();
        return;
      }
      button.disabled = true;
      const originalLabel = button.textContent;
      button.textContent = "Собираем заказ…";
      try {
        const catalogItems = await loadMemberCatalogItems().catch(() => []);
        const lineItems = cartEntries
          .map(([productId, qty]) => {
            const product = catalogItems.find((item) => item.id === productId);
            if (!product) return null;
            return {
              product_id: product.id,
              title: product.title,
              path: product.path,
              category: product.category || product.kind || "",
              summary: product.summary || "",
              qty: Number(qty) || 1,
            };
          })
          .filter(Boolean);
        if (!lineItems.length) {
          throw new Error("В корзине нет доступных позиций. Обновите список товаров.");
        }
        const created = await createMemberOrder({
          title: "Заказ из корзины",
          note: `Добавлено ${lineItems.length} ${pluralizeRu(lineItems.length, "позиция", "позиции", "позиций")} из корзины.`,
          line_items: lineItems,
        });
        saveMemberCart({});
        window.location.href = canOpenOrders ? cabinetSectionHref("orders", { order: created?.id || "" }) : cabinetSectionHref("profile");
      } catch (error) {
        button.disabled = false;
        button.textContent = originalLabel;
        window.alert(error.message || "Не получилось собрать заказ.");
      }
    });
  });
  document.querySelectorAll("[data-member-cart-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const productId = button.dataset.memberCartRemove;
      if (!productId) return;
      const cart = loadMemberCart();
      delete cart[productId];
      saveMemberCart(cart);
      await rerenderCurrentSection();
    });
  });
  document.querySelectorAll("[data-member-cart-save]").forEach((button) => {
    button.addEventListener("click", async () => {
      const productId = button.dataset.memberCartSave;
      if (!productId) return;
      const cart = loadMemberCart();
      delete cart[productId];
      saveMemberCart(cart);
      const saved = loadMemberSaved(session);
      if (!saved.includes(productId)) {
        saveMemberSaved(session, [...saved, productId]);
      }
      await rerenderCurrentSection();
    });
  });
  document.querySelectorAll("[data-member-saved-move]").forEach((button) => {
    button.addEventListener("click", async () => {
      const productId = button.dataset.memberSavedMove;
      if (!productId) return;
      const saved = loadMemberSaved(session).filter((item) => item !== productId);
      saveMemberSaved(session, saved);
      const cart = loadMemberCart();
      cart[productId] = cart[productId] ? Number(cart[productId]) + 1 : 1;
      saveMemberCart(cart);
      await rerenderCurrentSection();
    });
  });
}

async function handleAdminUserCreate() {
  const slug = window.prompt("Slug нового пользователя");
  if (!slug) return;
  const displayName = window.prompt("Имя пользователя");
  if (!displayName) return;
  const email = window.prompt("Email пользователя", "") || "";
  const accountType = (window.prompt("Тип аккаунта: admin/member", "member") || "member").trim().toLowerCase();
  const role = normalizeCabinetRoleByAccountType(
    (window.prompt(
      `Роль: ${getRoleOptionsForAccountType(accountType).join("/")}`,
      accountType === "admin" ? "manager" : "buyer",
    ) || "").trim(),
    accountType,
  );
  const defaultScopes = accountType === "admin" ? "admin, crm, catalog, special_pages" : "catalog, special_pages";
  const scopesRaw = window.prompt("Scopes через запятую", defaultScopes) || defaultScopes;
  const password = window.prompt("Пароль (минимум 8 символов, можно оставить пустым)", "") || "";

  setCabinetUsersStatus("Создаём пользователя…");
  const response = await fetchJson(`${apiBase()}/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      display_name: displayName,
      email,
      account_type: accountType,
      role,
      scopes: parseCommaValues(scopesRaw),
      password,
    }),
  });
  if (!response.ok) {
    setCabinetUsersStatus(`Не получилось создать пользователя: ${cleanupError(response.text || `HTTP ${response.status}`)}`);
    return;
  }
  setCabinetUsersStatus("Пользователь создан.");
  await rerenderCurrentSection();
}

async function handleAdminUserSave(userId) {
  const nameField = document.querySelector(`[data-user-name="${userId}"]`);
  const emailField = document.querySelector(`[data-user-email="${userId}"]`);
  const roleField = document.querySelector(`[data-user-role="${userId}"]`);
  const accountTypeField = document.querySelector(`[data-user-account-type="${userId}"]`);
  const scopesField = document.querySelector(`[data-user-scopes="${userId}"]`);
  const activeField = document.querySelector(`[data-user-active="${userId}"]`);
  const scopeChecks = Array.from(document.querySelectorAll(`[data-user-scope="${userId}"]:checked`));
  if (!nameField || !roleField || !accountTypeField || !activeField) return;

  setCabinetUsersStatus("Сохраняем пользователя…");
  const normalizedAccountType = String(accountTypeField.value || "member").trim().toLowerCase();
  const normalizedRole = normalizeCabinetRoleByAccountType(roleField.value, normalizedAccountType);
  const scopes = scopeChecks.length
    ? scopeChecks.map((field) => field.value).filter(Boolean)
    : parseCommaValues(scopesField?.value || "");
  const response = await fetchJson(`${apiBase()}/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      display_name: nameField.value.trim(),
      email: emailField?.value.trim() || "",
      role: normalizedRole,
      account_type: normalizedAccountType,
      scopes,
      is_active: Boolean(activeField.checked),
    }),
  });
  if (!response.ok) {
    setCabinetUsersStatus(`Не получилось сохранить пользователя: ${cleanupError(response.text || `HTTP ${response.status}`)}`);
    return;
  }
  setCabinetUsersStatus("Пользователь обновлён.");
  await rerenderCurrentSection();
}

async function handleAdminUserPassword(userId) {
  const password = window.prompt("Новый пароль (минимум 8 символов)");
  if (!password) return;
  setCabinetUsersStatus("Обновляем пароль…");
  const response = await fetchJson(`${apiBase()}/admin/users/${userId}/set-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    setCabinetUsersStatus(`Не получилось обновить пароль: ${cleanupError(response.text || `HTTP ${response.status}`)}`);
    return;
  }
  setCabinetUsersStatus("Пароль обновлён.");
  await rerenderCurrentSection();
}

async function handleAdminUserMessage(userId) {
  const bodyField = document.querySelector(`[data-user-message-body="${userId}"]`);
  const message = bodyField?.value.trim() || "";
  if (!message) {
    setCabinetUsersStatus("Введите сообщение для пользователя.");
    return;
  }
  setCabinetUsersStatus("Отправляем сообщение…");
  const response = await fetchJson(`${apiBase()}/admin/member-messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: Number(userId),
      subject: "Ответ команды",
      message,
    }),
  });
  if (!response.ok) {
    setCabinetUsersStatus(`Не получилось отправить: ${cleanupError(response.text || `HTTP ${response.status}`)}`);
    return;
  }
  if (bodyField) bodyField.value = "";
  setCabinetUsersStatus("Сообщение отправлено в кабинет пользователя.");
}

async function handleAdminOrderDocumentCreate(orderId) {
  const titleField = document.querySelector(`[data-order-document-title="${orderId}"]`);
  const typeField = document.querySelector(`[data-order-document-type="${orderId}"]`);
  const urlField = document.querySelector(`[data-order-document-url="${orderId}"]`);
  const sizeField = document.querySelector(`[data-order-document-size="${orderId}"]`);
  const statusField = document.querySelector(`[data-order-document-status="${orderId}"]`);
  const title = titleField?.value.trim() || "";
  if (!title) {
    setCabinetUsersStatus("Введите название документа.");
    return;
  }
  setCabinetUsersStatus("Добавляем документ…");
  const response = await createAdminOrderDocument(orderId, {
    title,
    document_type: typeField?.value || "other",
    file_url: urlField?.value.trim() || "",
    file_size: sizeField?.value.trim() || "",
    status: statusField?.value || "draft",
  });
  if (!response.ok) {
    setCabinetUsersStatus(`Не получилось добавить документ: ${cleanupError(response.text || `HTTP ${response.status}`)}`);
    return;
  }
  if (titleField) titleField.value = "";
  if (urlField) urlField.value = "";
  if (sizeField) sizeField.value = "";
  if (statusField) statusField.value = "draft";
  if (typeField) typeField.value = "invoice";
  setCabinetUsersStatus("Документ добавлен.");
  await rerenderCurrentSection();
}

async function handleAdminOrderDocumentSave(documentId) {
  const titleField = document.querySelector(`[data-order-document-existing-title="${documentId}"]`);
  const typeField = document.querySelector(`[data-order-document-existing-type="${documentId}"]`);
  const urlField = document.querySelector(`[data-order-document-existing-url="${documentId}"]`);
  const sizeField = document.querySelector(`[data-order-document-existing-size="${documentId}"]`);
  const statusField = document.querySelector(`[data-order-document-existing-status="${documentId}"]`);
  if (!titleField || !typeField || !urlField || !sizeField || !statusField) return;
  setCabinetUsersStatus("Сохраняем документ…");
  const response = await updateAdminOrderDocument(documentId, {
    title: titleField.value.trim(),
    document_type: typeField.value,
    file_url: urlField.value.trim(),
    file_size: sizeField.value.trim(),
    status: statusField.value,
  });
  if (!response.ok) {
    setCabinetUsersStatus(`Не получилось сохранить документ: ${cleanupError(response.text || `HTTP ${response.status}`)}`);
    return;
  }
  setCabinetUsersStatus("Документ обновлён.");
  await rerenderCurrentSection();
}

async function handleAdminOrderSave(orderId) {
  const statusField = document.querySelector(`[data-admin-order-status="${orderId}"]`);
  const noteField = document.querySelector(`[data-admin-order-note="${orderId}"]`);
  if (!statusField || !noteField) return;
  setCabinetUsersStatus("Сохраняем заказ…");
  const response = await updateAdminOrder(orderId, {
    status: statusField.value,
    note: noteField.value.trim(),
  });
  if (!response.ok) {
    setCabinetUsersStatus(`Не получилось обновить заказ: ${cleanupError(response.text || `HTTP ${response.status}`)}`);
    return;
  }
  setCabinetUsersStatus("Заказ обновлён.");
  await rerenderCurrentSection();
}

async function handleAdminCatalogCreateDraft() {
  const name = window.prompt("Название нового товара");
  if (!name) return;
  const suggestedSlug = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/ё/g, "e");
  const slug = (window.prompt("Slug товара", suggestedSlug) || "").trim().toLowerCase();
  if (!slug) return;

  const payload = {
    name,
    article: "",
    short_description: "",
    full_description: "",
    price: null,
    old_price: null,
    status: "draft",
    stock_status: "in_stock",
    images: [],
    badges: [],
    seo_title: "",
    seo_description: "",
    attributes: [],
    documents: [],
    faq: [],
    related_products: [],
    compatibility: [],
  };

  try {
    await saveAdminCatalogProduct(slug, payload);
    window.location.href = cabinetSectionHref("catalog", { product: slug });
  } catch (error) {
    window.alert(`Не удалось создать черновик: ${cleanupError(error.message || "runtime_error")}`);
  }
}

async function handleAdminCatalogProductSave(slug) {
  const editor = document.querySelector(`[data-catalog-product-editor="${CSS.escape(String(slug))}"]`);
  if (!editor) return;
  const status = editor.querySelector("[data-catalog-product-status]");
  const read = (key) => editor.querySelector(`[data-catalog-product-field="${key}"]`);
  const selectedBadges = Array.from(editor.querySelectorAll("[data-catalog-badge-preset]:checked"))
    .map((field) => field.value.trim())
    .filter(Boolean);
  const customBadges = String(read("badges_custom")?.value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const payload = {
    name: read("name")?.value.trim() || "",
    article: read("article")?.value.trim() || "",
    short_description: read("short_description")?.value.trim() || "",
    full_description: read("full_description")?.value.trim() || "",
    price: read("price")?.value === "" ? null : Number(read("price")?.value),
    old_price: read("old_price")?.value === "" ? null : Number(read("old_price")?.value),
    status: read("status")?.value || "published",
    stock_status: read("stock_status")?.value || "in_stock",
    images: readCatalogImageCollection(editor),
    badges: Array.from(new Set([...selectedBadges, ...customBadges])),
    seo_title: read("seo_title")?.value.trim() || "",
    seo_description: read("seo_description")?.value.trim() || "",
    attributes: readCatalogAttributeCollection(editor),
    documents: readCatalogDocumentCollection(editor),
    faq: readCatalogFaqCollection(editor),
    related_products: readCatalogRelatedCollection(editor),
    compatibility: readCatalogCompatibilityCollection(editor),
  };
  if (status) status.textContent = "Сохраняем товар…";
  try {
    await saveAdminCatalogProduct(slug, payload);
    if (status) status.textContent = "Товар сохранён.";
    await rerenderCurrentSection();
  } catch (error) {
    if (status) status.textContent = `Не удалось сохранить товар: ${cleanupError(error.message || "runtime_error")}`;
  }
}

function handleCatalogCollectionAdd(type) {
  const container = document.querySelector(`[data-catalog-collection="${CSS.escape(String(type || ""))}"]`);
  if (!container) return;
  if (type === "images") {
    appendCatalogImageRow(container, "");
    return;
  }
  if (type === "attributes") container.insertAdjacentHTML("beforeend", renderCatalogAttributeRow({}));
  if (type === "documents") container.insertAdjacentHTML("beforeend", renderCatalogDocumentRow({}));
  if (type === "faq") container.insertAdjacentHTML("beforeend", renderCatalogFaqRow({}));
  if (type === "related_products") container.insertAdjacentHTML("beforeend", renderCatalogRelatedRow({}));
  if (type === "compatibility") container.insertAdjacentHTML("beforeend", renderCatalogCompatibilityRow({}));
  container.querySelectorAll("[data-catalog-collection-remove]").forEach((button) => {
    if (button.dataset.catalogCollectionBound) return;
    button.dataset.catalogCollectionBound = "true";
    button.addEventListener("click", () => {
      button.closest("[data-catalog-collection-item]")?.remove();
    });
  });
}

function updateCatalogImageRowPreview(row) {
  const input = row?.querySelector('[data-catalog-collection-field="value"]');
  if (!input) return;
  const value = input.value.trim();
  const resolved = resolveCatalogMediaHref(value);
  const title = row.querySelector("[data-catalog-image-title]");
  const filename = value.split("/").filter(Boolean).pop() || "";
  if (title) {
    title.textContent = filename || "Изображение товара";
  }
  const preview = row.querySelector("[data-catalog-image-preview]");
  const empty = row.querySelector("[data-catalog-image-preview-empty]");
  if (resolved) {
    if (preview) {
      preview.src = resolved;
    } else {
      row.querySelector(".cabinet-media-preview")?.insertAdjacentHTML("afterbegin", `<img src="${escapeAttribute(resolved)}" alt="" loading="lazy" data-catalog-image-preview />`);
    }
    if (empty) empty.remove();
  } else {
    if (preview) preview.remove();
    if (!empty) {
      row.querySelector(".cabinet-media-preview")?.insertAdjacentHTML("afterbegin", `<div class="cabinet-media-preview__empty" data-catalog-image-preview-empty>Нет превью</div>`);
    }
  }
}

function appendCatalogImageRow(container, value = "") {
  container.insertAdjacentHTML("beforeend", renderCatalogImageRow(value));
  const row = container.lastElementChild;
  if (row) {
    bindCatalogImageRow(row);
    updateCatalogImageRowPreview(row);
  }
  refreshCatalogImageCollectionState(container);
  return row;
}

function refreshCatalogImageCollectionState(container) {
  if (!container) return;
  const rows = Array.from(container.querySelectorAll('[data-catalog-collection-item="images"]'));
  rows.forEach((row, index) => {
    row.dataset.catalogImageCover = index === 0 ? "true" : "false";
    const badge = row.querySelector("[data-catalog-image-cover]");
    if (badge) badge.hidden = index !== 0;
    const order = row.querySelector("[data-catalog-image-order]");
    if (order) order.textContent = String(index + 1).padStart(2, "0");
    row.classList.toggle("is-cover", index === 0);
  });
}

function bindCatalogImageRow(row) {
  const input = row.querySelector('[data-catalog-collection-field="value"]');
  if (input && !input.dataset.catalogImageBound) {
    input.dataset.catalogImageBound = "true";
    input.addEventListener("input", () => updateCatalogImageRowPreview(row));
  }
  if (!row.dataset.catalogImageDnDBound) {
    row.dataset.catalogImageDnDBound = "true";
    row.addEventListener("dragstart", (event) => {
      row.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("is-dragging");
      refreshCatalogImageCollectionState(row.closest('[data-catalog-collection="images"]'));
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      const container = row.closest('[data-catalog-collection="images"]');
      const dragging = container?.querySelector('.cabinet-repeater-row--media.is-dragging');
      if (!dragging || dragging === row) return;
      const rect = row.getBoundingClientRect();
      const insertAfter = (event.clientY - rect.top) > rect.height / 2;
      if (insertAfter) {
        row.after(dragging);
      } else {
        row.before(dragging);
      }
    });
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      refreshCatalogImageCollectionState(row.closest('[data-catalog-collection="images"]'));
    });
  }
  row.querySelectorAll("[data-catalog-image-action]").forEach((button) => {
    if (button.dataset.catalogImageBound) return;
    button.dataset.catalogImageBound = "true";
    button.addEventListener("click", async () => {
      const action = button.dataset.catalogImageAction;
      const editor = row.closest("[data-catalog-product-editor]");
      const slug = editor?.dataset.catalogProductEditor || "";
      const container = row.closest('[data-catalog-collection="images"]');
      const status = editor?.querySelector("[data-catalog-media-status]");
      if (!container) return;
      if (action === "drag") {
        if (status) status.textContent = "Перетащите карточку мышкой, чтобы поменять порядок.";
        return;
      }
      if (action === "first") {
        container.prepend(row);
        refreshCatalogImageCollectionState(container);
        if (status) status.textContent = "Главное фото переставлено на первое место.";
        return;
      }
      if (action === "up") {
        const previous = row.previousElementSibling;
        if (previous) container.insertBefore(row, previous);
        refreshCatalogImageCollectionState(container);
        return;
      }
      if (action === "down") {
        const next = row.nextElementSibling;
        if (next) container.insertBefore(next, row);
        refreshCatalogImageCollectionState(container);
        return;
      }
      if (action === "remove") {
        row.remove();
        if (!container.children.length) appendCatalogImageRow(container, "");
        refreshCatalogImageCollectionState(container);
        return;
      }
      if (action === "delete-file") {
        const value = input?.value.trim() || "";
        const filename = getCatalogUploadedMediaFilename(slug, value);
        if (!filename) {
          if (status) status.textContent = "Этот файл не был загружен через media manager. Можно только убрать его из галереи.";
          return;
        }
        if (status) status.textContent = "Удаляем файл…";
        try {
          await deleteAdminCatalogProductMedia(slug, filename);
          row.remove();
          if (!container.children.length) appendCatalogImageRow(container, "");
          refreshCatalogImageCollectionState(container);
          if (status) status.textContent = "Файл удалён и убран из галереи.";
        } catch (error) {
          if (status) status.textContent = `Не удалось удалить файл: ${cleanupError(error.message || "runtime_error")}`;
        }
      }
    });
  });
}

function bindCatalogMediaManager(editor) {
  const slug = editor?.dataset.catalogProductEditor || "";
  if (!slug) return;
  const input = editor.querySelector(`[data-catalog-media-input="${CSS.escape(slug)}"]`);
  const pick = editor.querySelector(`[data-catalog-media-pick="${CSS.escape(slug)}"]`);
  const container = editor.querySelector('[data-catalog-collection="images"]');
  const status = editor.querySelector(`[data-catalog-media-status="${CSS.escape(slug)}"]`);
  if (!container) return;
  container.querySelectorAll('[data-catalog-collection-item="images"]').forEach(bindCatalogImageRow);
  refreshCatalogImageCollectionState(container);
  if (pick && input && !pick.dataset.catalogMediaBound) {
    pick.dataset.catalogMediaBound = "true";
    pick.addEventListener("click", () => input.click());
  }
  if (input && !input.dataset.catalogMediaBound) {
    input.dataset.catalogMediaBound = "true";
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      for (const file of files) {
        if (status) status.textContent = `Загружаем ${file.name}…`;
        try {
          const item = await uploadAdminCatalogProductMedia(slug, file);
          if (item?.url) {
            const onlyEmptyRow = container.children.length === 1
              && !String(container.querySelector('[data-catalog-collection-field="value"]')?.value || "").trim();
            if (onlyEmptyRow) {
              const field = container.querySelector('[data-catalog-collection-field="value"]');
              if (field) {
                field.value = item.url;
                updateCatalogImageRowPreview(container.firstElementChild);
              }
            } else {
              appendCatalogImageRow(container, item.url);
            }
          }
          refreshCatalogImageCollectionState(container);
          if (status) status.textContent = `Фото ${file.name} загружено.`;
        } catch (error) {
          if (status) status.textContent = `Не удалось загрузить ${file.name}: ${cleanupError(error.message || "runtime_error")}`;
        }
      }
      input.value = "";
    });
  }
}

function readCatalogImageCollection(editor) {
  return Array.from(editor.querySelectorAll('[data-catalog-collection-item="images"] [data-catalog-collection-field="value"]'))
    .map((field) => field.value.trim())
    .filter(Boolean);
}

function readCatalogAttributeCollection(editor) {
  return Array.from(editor.querySelectorAll('[data-catalog-collection-item="attributes"]')).map((row) => ({
    key: row.querySelector('[data-catalog-collection-field="key"]')?.value.trim() || "",
    label: row.querySelector('[data-catalog-collection-field="label"]')?.value.trim() || "",
    value: row.querySelector('[data-catalog-collection-field="value"]')?.value.trim() || "",
    group: row.querySelector('[data-catalog-collection-field="group"]')?.value.trim() || "",
    filterable: Boolean(row.querySelector('[data-catalog-collection-field="filterable"]')?.checked),
  })).filter((item) => item.label || item.value || item.key || item.group);
}

function readCatalogDocumentCollection(editor) {
  return Array.from(editor.querySelectorAll('[data-catalog-collection-item="documents"]')).map((row) => ({
    id: row.querySelector('[data-catalog-collection-field="id"]')?.value.trim() || "",
    title: row.querySelector('[data-catalog-collection-field="title"]')?.value.trim() || "",
    fileUrl: row.querySelector('[data-catalog-collection-field="fileUrl"]')?.value.trim() || "",
    fileSize: row.querySelector('[data-catalog-collection-field="fileSize"]')?.value.trim() || "",
  })).filter((item) => item.id || item.title || item.fileUrl || item.fileSize);
}

function readCatalogFaqCollection(editor) {
  return Array.from(editor.querySelectorAll('[data-catalog-collection-item="faq"]')).map((row) => ({
    question: row.querySelector('[data-catalog-collection-field="question"]')?.value.trim() || "",
    answer: row.querySelector('[data-catalog-collection-field="answer"]')?.value.trim() || "",
    askedAt: row.querySelector('[data-catalog-collection-field="askedAt"]')?.value.trim() || "",
    answeredAt: row.querySelector('[data-catalog-collection-field="answeredAt"]')?.value.trim() || "",
  })).filter((item) => item.question || item.answer || item.askedAt || item.answeredAt);
}

function readCatalogRelatedCollection(editor) {
  return Array.from(editor.querySelectorAll('[data-catalog-collection-item="related_products"]')).map((row) => ({
    slug: row.querySelector('[data-catalog-collection-field="slug"]')?.value.trim() || "",
    label: row.querySelector('[data-catalog-collection-field="label"]')?.value.trim() || "",
  })).filter((item) => item.slug || item.label);
}

function readCatalogCompatibilityCollection(editor) {
  return Array.from(editor.querySelectorAll('[data-catalog-collection-item="compatibility"]')).map((row) => ({
    target_slug: row.querySelector('[data-catalog-collection-field="target_slug"]')?.value.trim() || "",
    relation: row.querySelector('[data-catalog-collection-field="relation"]')?.value || "works_with",
    note: row.querySelector('[data-catalog-collection-field="note"]')?.value.trim() || "",
  })).filter((item) => item.target_slug || item.note);
}

function applyKlubhackPreset(userId) {
  const roleField = document.querySelector(`[data-user-role="${userId}"]`);
  const accountTypeField = document.querySelector(`[data-user-account-type="${userId}"]`);
  const scopesField = document.querySelector(`[data-user-scopes="${userId}"]`);
  const activeField = document.querySelector(`[data-user-active="${userId}"]`);
  if (!roleField || !accountTypeField || !scopesField || !activeField) return;

  const currentScopes = parseCommaValues(scopesField.value);
  const mergedScopes = Array.from(new Set([...currentScopes, "course_access", "special_pages"]));
  const currentRole = String(roleField.value || "").trim().toLowerCase();

  accountTypeField.value = "member";
  if (!currentRole || ["buyer", "student", "member", "viewer"].includes(currentRole)) {
    roleField.value = "student";
  }
  activeField.checked = true;
  scopesField.value = mergedScopes.join(", ");
  setCabinetUsersStatus("Пресет «Клубничный Хак» применён. Нажмите «Сохранить».");
}

function setCabinetUsersStatus(message) {
  const node = document.querySelector("[data-cabinet-users-status]");
  if (node) node.textContent = message || "";
}

async function rerenderCurrentSection() {
  if (currentSession?.ok) {
    renderUserChips(currentSession);
    await renderCabinet(currentSession);
  }
}

function parseCommaValues(raw) {
  return String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadMemberProfile(session) {
  const defaults = {
    display_name: session?.user?.display_name || session?.user?.user_name || "",
    email: session?.user?.email || "",
    phone: session?.user?.phone || "",
    company: session?.user?.company || "",
    delivery_address: session?.user?.delivery_address || "",
    delivery_comment: session?.user?.delivery_comment || "",
    newsletter: Boolean(session?.user?.newsletter),
  };
  const response = await fetchJson(`${apiBase()}/member/profile`);
  if (!response.ok) return defaults;
  return { ...defaults, ...(response.data.profile || {}) };
}

async function loadMemberOrders() {
  const response = await fetchJson(`${apiBase()}/member/orders`);
  if (!response.ok) return [];
  return Array.isArray(response.data.items) ? response.data.items : [];
}

async function loadMemberOrderDocuments(orderId) {
  const response = await fetchJson(`${apiBase()}/member/orders/${orderId}/documents`);
  if (!response.ok) return [];
  return Array.isArray(response.data.items) ? response.data.items : [];
}

async function createMemberOrder(payload) {
  const response = await fetchJson(`${apiBase()}/member/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  }
  return response.data.item || null;
}

async function loadAdminUserOrders(userId) {
  const response = await fetchJson(`${apiBase()}/admin/users/${userId}/orders`);
  if (!response.ok) return [];
  return Array.isArray(response.data.items) ? response.data.items : [];
}

async function loadAdminOrderDocuments(orderId) {
  const response = await fetchJson(`${apiBase()}/admin/orders/${orderId}/documents`);
  if (!response.ok) return [];
  return Array.isArray(response.data.items) ? response.data.items : [];
}

async function updateAdminOrder(orderId, payload) {
  return fetchJson(`${apiBase()}/admin/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function createAdminOrderDocument(orderId, payload) {
  return fetchJson(`${apiBase()}/admin/orders/${orderId}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function updateAdminOrderDocument(documentId, payload) {
  return fetchJson(`${apiBase()}/admin/order-documents/${documentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function loadMemberMessages() {
  const response = await fetchJson(`${apiBase()}/member/messages`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data.items || [];
}

async function createMemberMessage(payload) {
  const response = await fetchJson(`${apiBase()}/member/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  return response.data.item;
}

async function saveMemberProfile(session, payload) {
  const response = await fetchJson(`${apiBase()}/member/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  }
  const nextValue = response.data.profile || {};
  if (currentSession?.user) {
    currentSession.user = { ...currentSession.user, ...nextValue };
  }
  return nextValue;
}

function loadMemberCart() {
  try {
    return JSON.parse(window.localStorage.getItem(CATALOG_CART_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMemberCart(cart) {
  window.localStorage.setItem(CATALOG_CART_STORAGE_KEY, JSON.stringify(cart));
}

function memberSavedStorageId(session) {
  return String(session?.user?.slug || session?.user?.user_name || session?.user?.email || "member").toLowerCase();
}

function loadMemberSaved(session) {
  try {
    return JSON.parse(window.localStorage.getItem(`${MEMBER_SAVED_STORAGE_KEY}:${memberSavedStorageId(session)}`) || "[]");
  } catch {
    return [];
  }
}

function saveMemberSaved(session, items) {
  window.localStorage.setItem(`${MEMBER_SAVED_STORAGE_KEY}:${memberSavedStorageId(session)}`, JSON.stringify(items));
}

function getMemberProfileCompleteness(profile) {
  const fields = [profile.email, profile.phone, profile.delivery_address];
  return fields.filter((value) => String(value || "").trim()).length;
}

function getMemberProfileMissingFields(profile) {
  const missing = [];
  if (!String(profile?.email || "").trim()) missing.push("email");
  if (!String(profile?.phone || "").trim()) missing.push("телефон");
  if (!String(profile?.delivery_address || "").trim()) missing.push("адрес доставки");
  return missing;
}

function describeMemberSelectionState(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "buy") {
    return {
      label: "Готово к покупке",
      note: "Можно открывать позицию и двигаться дальше.",
      tone: "ready",
    };
  }
  if (normalized === "consult") {
    return {
      label: "Полезно рядом",
      note: "Можно держать рядом как ориентир или дополнительную позицию.",
      tone: "related",
    };
  }
  return {
    label: "Нужно уточнить",
    note: "Лучше сверить состав, параметры или совместимость перед покупкой.",
    tone: "check",
  };
}

function humanizeMemberCatalogCategory(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "Подбор";
  const labels = {
    ventilation: "Вентиляция",
    accessories: "Комплектующие",
    modules: "Модули",
    glazing: "Остекление",
    fittings: "Фурнитура",
    led: "Освещение",
    "linear-led": "Освещение",
    "greenhouse-led": "Освещение",
    irrigation: "Полив",
    "irrigation-kits": "Полив",
    drippers: "Полив",
    "ph-ec-control": "Питание и раствор",
    racks: "Стеллажи",
    "rack-frames": "Стеллажи",
    substrates: "Субстрат",
    "substrate-slabs": "Субстрат",
    "propagation-plugs": "Субстрат",
    "planting-material": "Посадочный материал",
    "frigo-plants": "Посадочный материал",
    seeds: "Посадочный материал",
    "seed-series": "Посадочный материал",
    climate: "Климат-контроль",
    "air-circulation": "Климат-контроль",
    humidification: "Климат-контроль",
    monitoring: "Контроль и датчики",
    sensors: "Контроль и датчики",
    controllers: "Автоматика",
    catalog: "Подбор",
  };
  return labels[normalized] || String(value || "").replace(/[_-]+/g, " ");
}

function findLatestTeamMessage(messages) {
  return [...(Array.isArray(messages) ? messages : [])]
    .filter((item) => String(item.sender_type || "").toLowerCase() === "staff")
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] || null;
}

function describeMemberDocumentReadiness(documents = []) {
  const items = Array.isArray(documents) ? documents : [];
  if (!items.length) {
    return {
      label: "Ещё не добавлен",
      note: "Документ появится здесь, когда команда его подготовит.",
      tone: "missing",
    };
  }
  const readyCount = items.filter((item) => ["ready", "sent"].includes(String(item.status || "").toLowerCase())).length;
  if (readyCount === items.length) {
    return {
      label: "Готов",
      note: `${readyCount} ${pluralizeRu(readyCount, "файл", "файла", "файлов")} уже можно открыть.`,
      tone: "ready",
    };
  }
  return {
    label: "Готовится",
    note: `${readyCount} из ${items.length} уже доступны.`,
    tone: "progress",
  };
}

function deriveMemberHomeState({
  profile,
  orders,
  messages,
  cartEntries,
  savedItems,
  catalogItems,
  specialPages,
  documentGroups,
  canOpenOrders,
  canOpenDocuments,
}) {
  const profileMissing = getMemberProfileMissingFields(profile);
  const latestTeamMessage = findLatestTeamMessage(messages);
  const latestOrder = (orders || [])[0] || null;
  const latestOrderDocuments = latestOrder
    ? (documentGroups.find((entry) => String(entry.order?.id) === String(latestOrder.id))?.documents || [])
    : [];
  const readyCatalogItem = (catalogItems || []).find((item) => String(item.cta_mode || "").toLowerCase() === "buy") || null;

  if (profileMissing.length) {
    return {
      title: "Сначала заполните профиль",
      description: `Не хватает: ${profileMissing.join(", ")}. Так нам будет проще быстро оформить заказ и подготовить документы.`,
      primaryLabel: "Заполнить профиль",
      primaryHref: cabinetSectionHref("profile"),
      secondaryLabel: "Написать сообщение",
      secondaryHref: cabinetSectionHref("messages"),
      statusLabel: "Нужны данные",
      supportLabel: "Профиль",
      supportValue: `${3 - profileMissing.length}/3 заполнено`,
    };
  }

  if (latestOrder && canOpenOrders && !latestOrderDocuments.length) {
    return {
      title: "По заказу пока нет документов",
      description: "Заказ уже собран. Когда команда подготовит счёт или спецификацию, они появятся здесь же.",
      primaryLabel: "Открыть заказ",
      primaryHref: cabinetSectionHref("orders", { order: latestOrder.id }),
      secondaryLabel: canOpenDocuments ? "Открыть документы" : "Написать сообщение",
      secondaryHref: canOpenDocuments ? cabinetSectionHref("documents") : cabinetSectionHref("messages"),
      statusLabel: "Заказ в работе",
      supportLabel: "Документы",
      supportValue: "Пока готовятся",
    };
  }

  if (savedItems.length) {
    return {
      title: "У вас есть отложенные позиции",
      description: "Вернитесь к подбору: часть товаров уже сохранена и ждёт следующего шага.",
      primaryLabel: "Открыть корзину и сохранённое",
      primaryHref: cabinetSectionHref("cart"),
      secondaryLabel: "Открыть каталог",
      secondaryHref: cabinetSectionHref("catalog"),
      statusLabel: "Подбор продолжается",
      supportLabel: "Сохранено",
      supportValue: `${savedItems.length} ${pluralizeRu(savedItems.length, "позиция", "позиции", "позиций")}`,
    };
  }

  if (cartEntries.length) {
    return {
      title: "Корзина уже собрана",
      description: "Проверьте состав и переходите к заказу, когда всё готово.",
      primaryLabel: "Открыть корзину",
      primaryHref: cabinetSectionHref("cart"),
      secondaryLabel: canOpenOrders ? "Открыть заказы" : "Профиль и доставка",
      secondaryHref: canOpenOrders ? cabinetSectionHref("orders") : cabinetSectionHref("profile"),
      statusLabel: "Можно двигаться дальше",
      supportLabel: "В корзине",
      supportValue: `${cartEntries.length} ${pluralizeRu(cartEntries.length, "позиция", "позиции", "позиций")}`,
    };
  }

  if (latestTeamMessage) {
    return {
      title: "Есть ответ от команды",
      description: "Последнее важное сообщение уже в кабинете. Лучше продолжить диалог в том же разделе.",
      primaryLabel: "Открыть сообщения",
      primaryHref: cabinetSectionHref("messages"),
      secondaryLabel: "Открыть профиль",
      secondaryHref: cabinetSectionHref("profile"),
      statusLabel: "Есть обновление",
      supportLabel: "Последний ответ",
      supportValue: formatAuditTimestamp(latestTeamMessage.created_at || ""),
    };
  }

  if (readyCatalogItem) {
    return {
      title: "Можно вернуться к подбору",
      description: "Для вас уже есть позиции, с которых удобно продолжить подбор или покупку.",
      primaryLabel: "Открыть каталог",
      primaryHref: cabinetSectionHref("catalog"),
      secondaryLabel: "Написать сообщение",
      secondaryHref: cabinetSectionHref("messages"),
      statusLabel: "Подбор открыт",
      supportLabel: "Готово к покупке",
      supportValue: readyCatalogItem.title || "Есть позиция",
    };
  }

  return {
    title: "Начните с ближайшего шага",
    description: specialPages.length
      ? "Сначала откройте материалы и консультации, затем возвращайтесь к подбору и заказу."
      : "Кабинет уже готов для связи, профиля и следующих шагов по проекту.",
    primaryLabel: specialPages.length ? "Открыть расчёт и консультации" : "Написать сообщение",
    primaryHref: specialPages.length ? cabinetSectionHref("requests") : cabinetSectionHref("messages"),
    secondaryLabel: "Открыть профиль",
    secondaryHref: cabinetSectionHref("profile"),
    statusLabel: "Старт",
    supportLabel: "Доступ",
    supportValue: "Кабинет готов",
  };
}

function pluralizeRu(value, one, few, many) {
  const n = Math.abs(Number(value)) || 0;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

async function loadMemberProjectBundle(session) {
  const routeAccess = session.policy?.route_access || {};
  const scopes = session.policy?.scopes || session.user?.scopes || [];
  const [catalogResult, specialResult] = await Promise.all([
    routeAccess.catalog ? loadMemberCatalogItems().catch(() => []) : Promise.resolve([]),
    routeAccess.special ? loadMemberSpecialPages().catch(() => []) : Promise.resolve([]),
  ]);
  const catalogItems = Array.isArray(catalogResult) ? catalogResult : [];
  const specialPages = Array.isArray(specialResult) ? specialResult : [];
  const documentPages = collectMemberDocumentPages(specialPages);
  return { routeAccess, scopes, catalogItems, specialPages, documentPages };
}

function collectMemberDocumentPages(items) {
  return (Array.isArray(items) ? items : []).filter((item) => {
    const probe = `${item.slug || ""} ${item.title || ""} ${item.kind || ""} ${item.path || ""}`.toLowerCase();
    return ["doc", "pdf", "spec", "invoice", "акт", "счет", "смет", "док", "file"].some((token) => probe.includes(token));
  });
}

function deriveMemberProjectState({ routeAccess, scopes, catalogItems, specialPages, documentPages }) {
  const hasCatalog = routeAccess.catalog && catalogItems.length > 0;
  const hasMaterials = routeAccess.special && specialPages.length > 0;
  const hasDocuments = scopes.includes("documents") && documentPages.length > 0;
  const hasCourse = scopes.includes("course_access");

  if (hasDocuments) {
    return {
      shortLabel: "Закупка и документы",
      statNote: "уже есть документы и рабочий заказ",
      title: "У вас уже рабочий этап по заказу",
      description: "Документы и позиции уже на месте. Кабинет нужен, чтобы быстро вернуться к нужному шагу.",
      nextSection: "documents",
      primaryCta: "Открыть документы",
      nextHint: "Сначала проверьте документы, потом возвращайтесь к подбору.",
    };
  }

  if (hasCatalog) {
    return {
      shortLabel: "Заявка и подбор",
      statNote: "товары уже подобраны под задачу",
      title: "Главный вход сейчас через расчёт и уточнение",
      description: "Когда подбор уже есть, лучше идти через заявки и расчёты.",
      nextSection: "requests",
      primaryCta: "Открыть заявки и расчёты",
      nextHint: "Начните с расчёта или консультации.",
    };
  }

  if (hasMaterials || hasCourse) {
    return {
      shortLabel: "Материалы и сопровождение",
      statNote: "главный вход сейчас через материалы",
      title: "Начните с материалов и сопровождения",
      description: "Сейчас полезнее открыть материалы и пройтись по шагам, чем искать товары вручную.",
      nextSection: hasCourse ? "course" : "requests",
      primaryCta: hasCourse ? "Открыть Клубничный Хак" : "Открыть заявки и расчёты",
      nextHint: "Откройте материалы и двигайтесь по ним шаг за шагом.",
    };
  }

  return {
    shortLabel: "Стартовый вход",
    statNote: "кабинет только запускается",
    title: "Пока это стартовый экран",
    description: "Сейчас открыт базовый кабинет. Новые разделы появятся по мере подключения доступа.",
    nextSection: "overview",
    primaryCta: "Открыть обзор",
    nextHint: "Когда появятся подбор, документы или материалы, вы увидите их здесь.",
  };
}

function formatRub(value) {
  const amount = Number(value || 0);
  return `${rubFormatter.format(amount)} ₽`;
}

function formatAuditTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "без даты");
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function cleanupError(message) {
  return String(message || "").replace(/^Error:\s*/u, "").replace(/^["']|["']$/g, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value = "") {
  return escapeHtml(value);
}
