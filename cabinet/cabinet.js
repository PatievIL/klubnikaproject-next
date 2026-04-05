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
  document.body.dataset.cabinetRole = String(session.policy?.role || session.user.user_role || session.user.role || session.accountType || "member").toLowerCase();
  document.querySelectorAll("[data-cabinet-user]").forEach((target) => {
    const scopes = session.policy?.scopes || session.user?.scopes || [];
    const userName = session.user.user_name || session.user.display_name || "Пользователь";
    const role = session.policy?.role || session.user.user_role || session.user.role || session.accountType;
    const scopeNote = scopes.length
      ? `Открыто ${scopes.length} ${pluralizeZones(scopes.length)}.`
      : "Пока открыт только базовый кабинет.";
    target.innerHTML = `
      <div class="cabinet-access-card">
        <span class="cabinet-access-title">Доступ этой сессии</span>
        <div class="cabinet-user-main">
          <strong class="cabinet-user-name">${escapeHtml(userName)}</strong>
          <span class="cabinet-user-note">${escapeHtml(scopeNote)}</span>
        </div>
        <div class="cabinet-pill-row">
          <span class="cabinet-pill is-role">${escapeHtml(humanizeCabinetRole(role))}</span>
          ${scopes.map((scope) => `<span class="cabinet-pill is-scope">${escapeHtml(humanizeCabinetScope(scope))}</span>`).join("")}
        </div>
      </div>
    `;
  });

  document.querySelectorAll("[data-cabinet-greeting]").forEach((target) => {
    const name = session.user.user_name || session.user.display_name || "Пользователь";
    target.textContent = `Добрый день, ${name}`;
  });

  document.querySelectorAll("[data-cabinet-head-meta]").forEach((target) => {
    const scopes = session.policy?.scopes || session.user?.scopes || [];
    const role = humanizeCabinetRole(session.policy?.role || session.user.user_role || session.user.role || session.accountType);
    target.textContent = buildCabinetHeadMeta(session, role, scopes.length || 0);
  });

  document.querySelectorAll("[data-cabinet-nav-label]").forEach((target) => {
    target.textContent = session.accountType === "admin" ? "Командные разделы" : "Ваши разделы";
  });

  document.querySelectorAll("[data-cabinet-rail-meta]").forEach((target) => {
    const scopes = session.policy?.scopes || session.user?.scopes || [];
    target.textContent = buildCabinetRailMeta(session, scopes.length || 0);
  });
}

function humanizeCabinetRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  const labels = {
    admin: "Админ",
    owner: "Владелец",
    manager: "Менеджер",
    buyer: "Покупатель",
    student: "Участник курса",
    member: "Пользователь",
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
  if (["special", "special_page"].includes(normalized)) return "Материал";
  if (["route", "page"].includes(normalized)) return "Раздел";
  if (["document", "file"].includes(normalized)) return "Документ";
  return value || "Раздел";
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
  if (normalized === "buy") return "Готово к закупке";
  if (normalized === "choose") return "Нужно уточнение";
  if (normalized === "consult") return "Через консультацию";
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
  return `${roleLabel} · ${scopeCount} ${pluralizeZones(scopeCount)} доступа`;
}

function buildCabinetRailMeta(session, scopeCount) {
  if (session.accountType === "admin") {
    return scopeCount
      ? `Показываем только рабочие зоны команды, открытые этой сессии.`
      : `Открыт базовый режим без дополнительных разделов.`;
  }
  return scopeCount
    ? `Показываем только те входы, которые реально доступны этому аккаунту.`
    : `Открыт базовый кабинет без дополнительных разделов.`;
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
      <span>${escapeHtml(section.note)}</span>
    </a>
  `).join("");

  const section = sections.find((item) => item.id === active) || sections[0];
  if (!section) {
    content.innerHTML = '<div class="account-empty">Для этого аккаунта пока не собрано ни одного доступного раздела.</div>';
    return;
  }

  content.dataset.section = section.id;
  content.innerHTML = '<div class="account-empty">Собираем раздел и проверяем живые данные…</div>';
  try {
    const html = await renderSection(session, section);
    if (content.dataset.section !== section.id) return;
    content.innerHTML = html;
    bindSectionRuntime(session, section.id);
  } catch (error) {
    if (content.dataset.section !== section.id) return;
    content.innerHTML = `<div class="account-empty">Не удалось собрать раздел: ${escapeHtml(cleanupError(error.message || "runtime_error"))}</div>`;
  }
}

function bindSectionRuntime(session, sectionId) {
  if (session.accountType === "admin" && sectionId === "users") {
    bindAdminUsersSection();
  }
  if (session.accountType === "admin" && sectionId === "catalog") {
    bindAdminCatalogSection();
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
}

function preferredSectionId(session) {
  const sections = getAllowedSections(session);
  return sections[0]?.id || "overview";
}

function getAllowedSections(session) {
  if (session.accountType === "admin") {
    const allowed = new Set(session.policy?.sections || []);
    const scopes = new Set(session.policy?.scopes || []);
    return [
      allowed.has("dashboard") && {
        id: "dashboard",
        label: "Dashboard",
        note: "Быстрая сводка по команде на сейчас.",
      },
      (allowed.has("site") || allowed.has("pages") || allowed.has("forms") || allowed.has("seo") || allowed.has("integrations")) && {
        id: "site",
        label: "Сайт и настройки",
        note: "Страницы, формы и публикация.",
      },
      allowed.has("crm") && {
        id: "crm",
        label: "CRM",
        note: "Лиды, задачи и очередь команды.",
      },
      (allowed.has("catalog") || allowed.has("inventory")) && {
        id: "catalog",
        label: "Каталог",
        note: "Товары и карточки магазина.",
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
    if (section.id === "cart") return renderMemberCartSection(session);
    if (section.id === "requests") return renderMemberRequestsSection(session);
    if (section.id === "course") return renderMemberCourseSection(session);
    if (section.id === "orders") return renderMemberOrdersSection(session);
    if (section.id === "documents") return renderMemberDocumentsSection(session);
    if (section.id === "messages") return renderMemberMessagesSection(session);
    if (section.id === "profile") return renderMemberProfileSection(session);
  }

  if (session.accountType === "admin") {
    if (section.id === "dashboard") return renderAdminDashboard();
    if (section.id === "catalog") return renderAdminCatalogSection();
    if (section.id === "crm") return renderCrmSection();
    if (section.id === "calc-prices") return renderCalcPricesSection();
    if (section.id === "site") return renderAdminSiteSection();
    if (section.id === "users") return renderAdminUsersSection();
    if (section.id === "audit") return renderAdminAuditSection();
  }

  return renderPlannedSection(section);
}

async function renderMemberOverview(session) {
  const bundle = await loadMemberProjectBundle(session);
  const { routeAccess, scopes, catalogItems, specialPages, documentPages } = bundle;
  const projectState = deriveMemberProjectState({
    routeAccess,
    scopes,
    catalogItems,
    specialPages,
    documentPages,
  });
  const nextSectionHref = cabinetSectionHref(projectState.nextSection);
  const overviewSecondaryActions = [];
  if (scopes.includes("orders")) {
    overviewSecondaryActions.push(`<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>`);
  }
  overviewSecondaryActions.push(`<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Связь</a>`);
  if (!scopes.includes("orders")) {
    overviewSecondaryActions.push(`<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Профиль</a>`);
  }

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Главная</div>
        <h2 class="calc-card-title">Ваш кабинет</h2>
        <p class="sublead">Открывайте нужный раздел и сразу двигайтесь дальше: заказ, документы, расчёт или сообщение.</p>
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Ближайшее действие</div>
            <h3 class="calc-card-title">${escapeHtml(projectState.title)}</h3>
            <p class="sublead">${escapeHtml(projectState.description)}</p>
            <div class="cabinet-home-actions">
              <a class="btn btn-primary" href="${escapeAttribute(nextSectionHref)}">${escapeHtml(projectState.primaryCta)}</a>
              ${overviewSecondaryActions.slice(0, 2).join("")}
            </div>
          </article>
          <section class="cabinet-section-grid">
            ${(routeAccess.special || routeAccess.catalog) ? `
              <article class="card card-pad cabinet-card cabinet-action-card">
                <div class="cabinet-kicker">Расчёт и консультации</div>
                <h3 class="calc-card-title">Разобрать задачу</h3>
                <p class="sublead">${specialPages.length ? `Для вас уже открыто ${specialPages.length} ${pluralizeRu(specialPages.length, "страница", "страницы", "страниц")}.` : "Здесь можно начать с расчёта и консультации."}</p>
                <div class="cabinet-home-actions">
                  <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("requests"))}">Открыть раздел</a>
                </div>
              </article>
            ` : ""}
            ${scopes.includes("orders") ? `
              <article class="card card-pad cabinet-card cabinet-action-card">
                <div class="cabinet-kicker">Заказы</div>
                <h3 class="calc-card-title">Вернуться к заказам</h3>
                <p class="sublead">Проверьте статус и откройте нужный заказ.</p>
                <div class="cabinet-home-actions">
                  <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>
                </div>
              </article>
            ` : ""}
            ${scopes.includes("documents") ? `
              <article class="card card-pad cabinet-card cabinet-action-card">
                <div class="cabinet-kicker">Документы</div>
                <h3 class="calc-card-title">Файлы под рукой</h3>
                <p class="sublead">${documentPages.length ? `Уже видно ${documentPages.length} ${pluralizeRu(documentPages.length, "файл", "файла", "файлов")}.` : "Файлов пока нет. Когда появятся счёт и спецификация, они будут здесь."}</p>
                <div class="cabinet-home-actions">
                  <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("documents"))}">Открыть документы</a>
                </div>
              </article>
            ` : ""}
            <article class="card card-pad cabinet-card cabinet-action-card">
              <div class="cabinet-kicker">Профиль и доставка</div>
              <h3 class="calc-card-title">Проверить данные</h3>
              <p class="sublead">Здесь ваши контакты, адрес доставки и уведомления.</p>
              <div class="cabinet-home-actions">
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Открыть профиль</a>
              </div>
            </article>
            ${!routeAccess.catalog && !routeAccess.special && !scopes.includes("orders") && !scopes.includes("documents") ? `
              <div class="account-empty">Пока тут только базовый кабинет. Остальные разделы подключим по вашему доступу.</div>
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
  if (!items.length) {
    return renderRuntimeEmpty("Подбор и каталог", "В этом кабинете пока нет позиций, привязанных к вашей задаче.");
  }

  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean))).slice(0, 6);
  const primary = items.slice(0, 8);
  const firstReady = items.find((item) => String(item.cta_mode || "").toLowerCase() === "buy") || items[0];
  const needsClarification = items.find((item) => String(item.cta_mode || "").toLowerCase() !== "buy");
  const buyReadyCount = items.filter((item) => String(item.cta_mode || "").toLowerCase() === "buy").length;
  const verifyCount = items.length - buyReadyCount;
  const projectState = deriveMemberProjectState(bundle);
  const firstReference = specialPages.find((item) => !documentPages.includes(item)) || null;

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Подбор и каталог</div>
        <h2 class="calc-card-title">Позиции для вашей задачи</h2>
        <p class="sublead">Здесь только нужные товары: что можно брать сразу, а что лучше уточнить.</p>
      </div>
      <div class="cabinet-stat-grid cabinet-stat-grid--member">
        ${renderStatCard("Позиции", String(items.length), "в вашем списке")}
        ${renderStatCard("Можно брать", String(buyReadyCount), buyReadyCount ? "готово к покупке" : "сначала лучше уточнить")}
        ${renderStatCard("Уточнить", String(verifyCount), verifyCount ? "есть чувствительные позиции" : "список уже чистый")}
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
                <strong>Уже можно брать</strong>
                <span>${buyReadyCount ? `${buyReadyCount} ${pluralizeRu(buyReadyCount, "позиция", "позиции", "позиций")} можно брать без лишних шагов.` : "Пока нет позиций, которые можно брать без уточнения."}</span>
              </article>
              <article class="cabinet-phase-card">
                <strong>Лучше сверить</strong>
                <span>${verifyCount ? `${verifyCount} ${pluralizeRu(verifyCount, "позиция", "позиции", "позиций")} лучше проверить с нами перед покупкой.` : "Проверок почти не осталось."}</span>
              </article>
              <article class="cabinet-phase-card">
                <strong>Что лежит рядом</strong>
                <span>${documentPages.length ? "Документы уже рядом, не нужно искать их в переписке." : firstReference ? "Рядом есть полезные материалы для следующего шага." : "Пока рядом только каталог."}</span>
              </article>
            </div>
            <div class="cabinet-home-actions">
              <a class="btn btn-primary" href="${escapeAttribute(firstReady?.path || cabinetRoutes.catalog)}">${escapeHtml(firstReady ? "Открыть первую готовую позицию" : "Открыть каталог")}</a>
              ${needsClarification ? `<a class="btn btn-secondary" href="${escapeAttribute(needsClarification.path || cabinetRoutes.catalog)}">Открыть позицию для уточнения</a>` : ""}
              ${documentPages.length ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("documents"))}">Открыть документы</a>` : routeAccess.special ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("requests"))}">Заявки и расчёты</a>` : ""}
            </div>
            ${categories.length ? `<div class="cabinet-chip-row">${categories.map((item) => `<span class="account-note-chip">${escapeHtml(item)}</span>`).join("")}</div>` : ""}
          </article>
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">Рабочие позиции</div>
            <h3 class="calc-card-title">Что уже есть в списке</h3>
            <div class="cabinet-list">
              <div class="cabinet-list-head cabinet-list-head--catalog">
                <span>Позиция</span>
                <span>Где работает</span>
                <span>Как действовать</span>
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
  const referencePages = items.filter((item) => !documentPages.includes(item));
  const firstReference = referencePages[0] || items[0] || null;

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Расчёт и консультации</div>
        <h2 class="calc-card-title">Расчёт и консультации</h2>
        <p class="sublead">Тут всё, что помогает принять решение: расчёт, консультации и полезные страницы.</p>
      </div>
      <div class="cabinet-stat-grid cabinet-stat-grid--member">
        ${renderStatCard("Страницы", String(items.length), "открыто для вас")}
        ${renderStatCard("Полезные", String(referencePages.length), referencePages.length ? "есть что открыть сейчас" : "пока в основном документы")}
        ${renderStatCard("Файлы", String(documentPages.length), documentPages.length ? "документы уже рядом" : "файлы пока не добавлены")}
        ${renderStatCard("Режим", routeAccess.catalog ? "С подбором" : "Без подбора", "зависит от вашего доступа")}
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">С чего начать</div>
            <h3 class="calc-card-title">Начните с ближайшего шага</h3>
            <p class="sublead">${escapeHtml(firstReference?.summary || "Здесь будут основные входы: расчёт, консультация и полезные материалы.")}</p>
            <div class="cabinet-home-actions">
              ${firstReference ? `<a class="btn btn-primary" href="${escapeAttribute(firstReference.path)}">Открыть первую страницу</a>` : ""}
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.calc)}">Открыть расчёт</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.consultations)}">Открыть консультации</a>
              ${documentPages.length ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("documents"))}">Открыть документы</a>` : ""}
            </div>
          </article>
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">Что уже открыто</div>
            <h3 class="calc-card-title">Что уже доступно</h3>
            ${items.length ? `
              <div class="account-grid">
                ${items.map(renderMemberSpecialCard).join("")}
              </div>
            ` : `<div class="account-empty">Пока тут пусто. Начните с расчёта или консультации.</div>`}
          </section>
        </div>
      </div>
    </div>
  `;
}

async function renderMemberCourseSection(session) {
  const items = await loadMemberSpecialPages().catch(() => []);
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
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("requests"))}">Заявки и расчёты</a>
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
                          <span>${escapeHtml(entry.category || "catalog")}</span>
                        </div>
                        <div class="cabinet-list-cell">
                          <strong><a href="${escapeAttribute(entry.path)}">Открыть позицию</a></strong>
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

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Заказы</div>
        <h2 class="calc-card-title">Ваши заказы</h2>
        <p class="sublead">Здесь видно, какие заказы уже собраны и что нужно сделать перед покупкой.</p>
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Следующий шаг</div>
            <h3 class="calc-card-title">С чего начать</h3>
            <p class="sublead">${buyReady.length ? "Сначала пройдите по готовым позициям. Потом проверьте то, что требует уточнения." : "Пока лучше доуточнить состав, а потом собирать заказ."}</p>
            <div class="cabinet-home-actions">
              ${firstBuyReady ? `<a class="btn btn-primary" href="${escapeAttribute(firstBuyReady.path)}">Открыть первую готовую позицию</a>` : ""}
              ${(routeAccess.catalog || routeAccess.special) ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("requests"))}">Открыть заявки и расчёты</a>` : ""}
              ${orders.length ? `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("documents"))}">Открыть документы</a>` : ""}
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
            ` : `<div class="account-empty">Заказов пока нет. Соберите первый заказ из корзины.</div>`}
          </section>
        </div>
      </div>
    </div>
  `;
}

async function renderMemberDocumentsSection(session) {
  const [items, ordersResult] = await Promise.all([
    loadMemberSpecialPages().catch(() => []),
    loadMemberOrders().catch(() => []),
  ]);
  const documentPages = collectMemberDocumentPages(items);
  const orders = Array.isArray(ordersResult) ? ordersResult : [];
  const accountName = session.user.user_name || session.user.display_name || "Пользователь";
  const profile = await loadMemberProfile(session);
  const profileCompleteness = getMemberProfileCompleteness(profile);
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
            <h3 class="calc-card-title">Все файлы в одном месте</h3>
            <p class="sublead">Ничего не нужно искать в чатах: откройте нужный документ прямо отсюда.</p>
            <div class="cabinet-inline-meta">
              <span>${orders.length} ${pluralizeRu(orders.length, "заказ", "заказа", "заказов")}</span>
              <span>${totalOrderDocuments} ${pluralizeRu(totalOrderDocuments, "документ", "документа", "документов")}</span>
              <span>${readyOrderDocuments} готово</span>
            </div>
            <div class="cabinet-home-actions">
              <a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Написать сообщение</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Открыть профиль</a>
            </div>
          </article>
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">По заказам</div>
            <h3 class="calc-card-title">Документы, привязанные к заказам</h3>
            ${orderDocumentGroups.length ? `
              <div class="cabinet-document-group-list">
                ${orderDocumentGroups.map(({ order, documents }) => renderMemberOrderDocumentGroup(order, documents, profileCompleteness)).join("")}
              </div>
            ` : `
              <div class="cabinet-mini-list">
                <article class="cabinet-mini-card">
                  <strong>Заказов пока нет</strong>
                  <span>Сначала соберите первый заказ. После этого документы появятся здесь.</span>
                </article>
                <article class="cabinet-mini-card">
                  <strong>Что сделать сейчас</strong>
                  <span>Откройте заказы, проверьте профиль или напишите нам.</span>
                </article>
              </div>
              <div class="cabinet-home-actions">
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("profile"))}">Проверить профиль</a>
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Написать сообщение</a>
              </div>
            `}
          </section>
          ${documentPages.length ? `
            <section class="card card-pad cabinet-card">
              <div class="cabinet-kicker">Ещё файлы</div>
              <h3 class="calc-card-title">Связанные документы</h3>
              <div class="cabinet-list">
                <div class="cabinet-list-head cabinet-list-head--catalog">
                  <span>Документ</span>
                  <span>Тип</span>
                  <span>Переход</span>
                </div>
                <div class="cabinet-list-body">
                  ${documentPages.slice(0, 6).map(renderMemberDocumentRow).join("")}
                </div>
              </div>
            </section>
          ` : ""}
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
                <button class="btn btn-primary" type="button" data-member-create-order>Собрать заказ из корзины</button>
                <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("orders"))}">Открыть заказы</a>
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
                        <span>${escapeHtml(entry.product.category || entry.product.kind || "catalog")}</span>
                      </div>
                      <div class="cabinet-list-cell">
                        <strong><a href="${escapeAttribute(entry.product.path)}">Открыть позицию</a></strong>
                        <span class="cabinet-inline-actions">
                          <button class="btn btn-ghost btn-ghost--small" type="button" data-member-cart-save="${escapeAttribute(entry.product.id)}">В сохранённое</button>
                          <button class="btn btn-ghost btn-ghost--small" type="button" data-member-cart-remove="${escapeAttribute(entry.product.id)}">Убрать</button>
                        </span>
                      </div>
                    </article>
                  `).join("")}
                </div>
              </div>
            ` : `<div class="account-empty">Корзина пока пустая. Добавьте товары из каталога.</div>`}
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
                      <a class="btn btn-secondary" href="${escapeAttribute(item.path)}">Открыть позицию</a>
                      <button class="btn btn-ghost btn-ghost--small" type="button" data-member-saved-move="${escapeAttribute(item.id)}">Вернуть в корзину</button>
                    </div>
                  </article>
                `).join("")}
              </div>
            ` : `<div class="account-empty">Пока ничего не отложено.</div>`}
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

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Сообщения</div>
        <h2 class="calc-card-title">Связь с командой</h2>
        <p class="sublead">Напишите в кабинете или выберите удобный канал.</p>
      </div>
      <section class="card card-pad cabinet-card">
        <div class="cabinet-kicker">Написать сообщение</div>
        <h3 class="calc-card-title">Напишите нам</h3>
        <div class="cabinet-field-grid">
          <label class="cabinet-field">
            <span class="cabinet-field-label">Тема</span>
            <input class="admin-input" data-member-message-subject type="text" value="Вопрос по проекту" />
          </label>
          <label class="cabinet-field cabinet-field--wide">
            <span class="cabinet-field-label">Сообщение</span>
            <textarea class="admin-textarea" data-member-message-body placeholder="Коротко: что нужно сделать?"></textarea>
          </label>
        </div>
        <div class="cabinet-user-card-actions">
          <button class="btn btn-primary" type="button" data-member-message-send>Отправить сообщение</button>
        </div>
        <div class="cabinet-users-status" data-member-message-status></div>
      </section>
      <section class="cabinet-section-grid cabinet-section-grid--compact">
        <article class="card card-pad cabinet-card cabinet-action-card">
          <div class="cabinet-kicker">Быстрые каналы</div>
          <div class="cabinet-home-actions">
            <a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.consultations)}">Консультации</a>
            <a class="btn btn-secondary" href="${escapeAttribute(supportTelegramUrl)}" target="_blank" rel="noreferrer">Telegram</a>
            <a class="btn btn-secondary" href="mailto:${escapeAttribute(supportEmail)}">Email</a>
            <a class="btn btn-secondary" href="tel:${escapeAttribute(supportPhone.replace(/[^\d+]/g, ""))}">Позвонить</a>
          </div>
        </article>
        <article class="card card-pad cabinet-card cabinet-action-card">
          <div class="cabinet-kicker">Чтобы ответить быстрее</div>
          <ul class="cabinet-note-list">
            <li>Напишите задачу в одном-двух предложениях.</li>
            <li>По товару добавьте ссылку, артикул или список позиций.</li>
            <li>По документам сразу укажите, какой файл нужен.</li>
          </ul>
        </article>
      </section>
      <section class="card card-pad cabinet-card">
        <div class="cabinet-kicker">Ваши сообщения</div>
        <h3 class="calc-card-title">Диалог в кабинете</h3>
        ${messages.length ? `
          <div class="cabinet-message-list">
            ${messages.map(renderMemberMessageItem).join("")}
          </div>
        ` : `<div class="account-empty">Сообщений пока нет. Можете отправить первое сообщение прямо сейчас.</div>`}
      </section>
    </div>
  `;
}

async function renderMemberNotificationsSection(session) {
  const bundle = await loadMemberProjectBundle(session);
  const profile = await loadMemberProfile(session);
  const scopes = session.policy?.scopes || session.user?.scopes || [];
  const notifications = [
    bundle.catalogItems.length
      ? `В подборе уже видно ${bundle.catalogItems.length} ${pluralizeRu(bundle.catalogItems.length, "позицию", "позиции", "позиций")}.`
      : "Подбор по проекту ещё не наполнен позициями.",
    bundle.documentPages.length
      ? `Документы уже рядом: ${bundle.documentPages.length} ${pluralizeRu(bundle.documentPages.length, "файл", "файла", "файлов")} доступны в кабинете.`
      : "Файлов пока нет.",
    scopes.includes("course_access")
      ? "Клубничный Хак уже открыт для этого аккаунта."
      : "Клубничный Хак пока не открыт для этого аккаунта.",
    profile.newsletter
      ? "Рассылка включена: кабинет будет считать email рабочим каналом для обновлений."
      : "Рассылка выключена: включить её можно в профиле и доставке.",
  ];

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">Уведомления</div>
        <h2 class="calc-card-title">Что важно по вашему кабинету сейчас</h2>
        <p class="sublead">Коротко: что уже открыто, что обновилось и куда идти дальше.</p>
      </div>
      <div class="cabinet-stat-grid">
        ${renderStatCard("Подбор", String(bundle.catalogItems.length), bundle.catalogItems.length ? "позиции уже открыты" : "пока позиций нет")}
        ${renderStatCard("Документы", String(bundle.documentPages.length), bundle.documentPages.length ? "файлы уже в кабинете" : "файлы пока не появились")}
        ${renderStatCard("Материалы", String(bundle.specialPages.length), bundle.specialPages.length ? "есть закрытые страницы" : "материалы ещё не добавлены")}
        ${renderStatCard("Рассылка", profile.newsletter ? "Вкл" : "Выкл", "настройка хранится в профиле")}
      </div>
      <section class="card card-pad cabinet-card">
        <div class="tag">Сводка</div>
        <h3 class="calc-card-title">Актуальные сигналы по кабинету</h3>
        <ul class="cabinet-note-list">
          ${notifications.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>
    </div>
  `;
}

async function renderMemberProfileSection(session) {
  const profile = await loadMemberProfile(session);
  const userName = session.user.display_name || session.user.user_name || "Пользователь";

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="cabinet-kicker">Профиль и доставка</div>
        <h2 class="calc-card-title">Профиль и доставка</h2>
        <p class="sublead">Контакты, адрес доставки и уведомления.</p>
      </div>
      <div class="cabinet-stat-grid">
        ${renderStatCard("Пользователь", userName, "основной аккаунт")}
        ${renderStatCard("Email", profile.email || "не заполнен", profile.email ? "для счетов и файлов" : "добавьте для связи")}
        ${renderStatCard("Телефон", profile.phone || "не заполнен", profile.phone ? "для уточнений и доставки" : "добавьте заранее")}
        ${renderStatCard("Рассылка", profile.newsletter ? "Вкл" : "Выкл", "можно изменить ниже")}
      </div>
      <section class="cabinet-section-grid">
        <article class="card card-pad cabinet-card">
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
        <article class="card card-pad cabinet-card">
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
      </section>
      <section class="card card-pad cabinet-card">
        <div class="cabinet-kicker">Настройки</div>
          <h3 class="calc-card-title">Сохранение и уведомления</h3>
        <label class="cabinet-checkbox-row">
          <input data-member-profile="newsletter" type="checkbox" ${profile.newsletter ? "checked" : ""} />
          <span>Получать обновления по заказам и документам.</span>
        </label>
        <div class="cabinet-user-card-actions">
          <button class="btn btn-primary" type="button" data-member-profile-save>Сохранить данные</button>
          <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("messages"))}">Нужна помощь</a>
        </div>
        <div class="cabinet-users-status" data-member-profile-status></div>
      </section>
    </div>
  `;
}

async function renderAdminDashboard() {
  const [catalogItems, pricing] = await Promise.all([
    loadAdminCatalogItems().catch(() => []),
    loadCalcPricing().catch(() => null),
  ]);
  const crmBundle = isCrmEnabled() ? await loadCrmBundle().catch(() => null) : null;

  const crmAvailable = isCrmEnabled() && Boolean(crmBundle);
  const leadCount = crmBundle?.leads?.length || 0;
  const overdueTasks = (crmBundle?.tasks || []).filter((task) => String(task.due_state || task.follow_up_state || "").toLowerCase() === "overdue").length;
  const priceCount = pricing?.items?.length || 0;
  const latestLead = crmBundle?.leads?.[0] || null;
  const latestTask = crmBundle?.tasks?.[0] || null;

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">Командный dashboard</div>
        <h2 class="calc-card-title">Что важно для команды сейчас</h2>
        <p class="sublead">${crmAvailable ? "CRM, каталог и цены собраны в одном экране, чтобы быстрее начать работу." : isCrmEnabled() ? "Каталог и цены доступны. CRM сейчас недоступна." : "Каталог и цены доступны. CRM выключена в настройках."}</p>
      </div>
      <div class="cabinet-stat-grid">
        ${renderStatCard("Каталог", String(catalogItems.length), "позиций в текущей базе кабинета")}
        ${renderStatCard("CRM", String(leadCount), crmAvailable ? "лидов в короткой выборке" : isCrmEnabled() ? "CRM не отвечает, работаем без live-данных" : "CRM выключена в настройках")}
        ${renderStatCard("Просрочено", String(overdueTasks), "задач требуют реакции")}
        ${renderStatCard("Калькулятор", String(priceCount), "ценовых позиций в pricing.json")}
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="tag">Приоритет на сейчас</div>
            <h3 class="calc-card-title">Куда команде идти первым</h3>
            <div class="cabinet-mini-list">
              <article class="cabinet-mini-card">
                <strong>CRM</strong>
                <span>${escapeHtml(crmAvailable ? (latestLead?.title || latestLead?.name || "Проверьте лиды и ближайшие задачи.") : isCrmEnabled() ? "CRM сейчас недоступна." : "CRM выключена в настройках.")}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Каталог</strong>
                <span>${catalogItems.length ? `Сейчас доступно ${catalogItems.length} пози${catalogItems.length === 1 ? "ция" : "ций"}.` : "Каталог готов к следующему проходу."}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Цены калькулятора</strong>
                <span>${priceCount ? `Сейчас ${priceCount} ценовых позиций.` : "Раздел цен пока пуст."}</span>
              </article>
            </div>
            <div class="cabinet-home-actions">
              ${crmAvailable ? `<a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("crm"))}">Открыть CRM</a>` : `<a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("crm"))}">Статус CRM</a>`}
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("catalog"))}">Открыть каталог</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("calc-prices"))}">Открыть цены калькулятора</a>
            </div>
          </article>
          <article class="card card-pad cabinet-home-card">
            <div class="tag">Что требует внимания</div>
            <h3 class="calc-card-title">Короткая сводка</h3>
            <div class="cabinet-mini-list">
              <article class="cabinet-mini-card">
                <strong>Просроченные задачи</strong>
                <span>${overdueTasks ? `${overdueTasks} задач${overdueTasks === 1 ? "а" : overdueTasks < 5 ? "и" : ""} требуют реакции.` : "Просроченных задач сейчас нет."}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Ближайшая задача</strong>
                <span>${escapeHtml(latestTask?.title || latestTask?.text || "Следующая рабочая задача появится здесь, как только CRM её вернёт.")}</span>
              </article>
            </div>
          </article>
        </div>
      </div>
    </div>
  `;
}

async function renderAdminCatalogSection() {
  const [items, snapshot, adminProducts] = await Promise.all([
    loadAdminCatalogItems(),
    loadAdminCatalogSnapshot(),
    loadAdminCatalogProducts(),
  ]);
  const categories = extractSnapshotCategories(snapshot);
  const products = extractSnapshotProducts(snapshot);
  const categoryNames = categories.slice(0, 6).map((item) => item.name || item.title || item.slug).filter(Boolean);
  const selectedSlug = new URLSearchParams(window.location.search).get("product") || adminProducts[0]?.slug || "";
  const selectedProduct = selectedSlug ? adminProducts.find((item) => item.slug === selectedSlug) || null : null;

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">Каталог</div>
        <h2 class="calc-card-title">Каталог и товары</h2>
        <p class="sublead">Отсюда можно открыть магазин и быстро перейти к редактированию нужного товара.</p>
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">Быстрые входы</div>
            <h3 class="calc-card-title">Быстрый вход</h3>
            <div class="cabinet-inline-meta">
              <span>${items.length} ${pluralizeRu(items.length, "позиция", "позиции", "позиций")} в каталоге</span>
              <span>${products.length} товаров в магазине</span>
              <span>${categories.length} категорий</span>
            </div>
            <div class="cabinet-home-actions">
              <a class="btn btn-primary" href="${escapeAttribute(cabinetRoutes.catalog)}">Открыть магазин</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("dashboard"))}">Открыть обзор кабинета</a>
            </div>
            ${categoryNames.length ? `
              <div class="cabinet-mini-list">
                <article class="cabinet-mini-card">
                  <strong>Главные категории</strong>
                  <span>${escapeHtml(categoryNames.join(" · "))}</span>
                </article>
              </div>
            ` : ""}
          </article>
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">База товаров</div>
            <h3 class="calc-card-title">Выберите товар для редактирования</h3>
            <label class="cabinet-field">
              <span class="cabinet-field-label">Быстрый поиск по товарам</span>
              <input class="admin-input" type="search" data-catalog-manager-search placeholder="Название, slug, артикул, категория" />
            </label>
            <p class="cabinet-inline-hint">Показываем весь список товаров. Поиск помогает сразу открыть нужную карточку.</p>
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
          </section>
          ${selectedProduct ? renderAdminCatalogProductEditor(selectedProduct, adminProducts) : ""}
        </div>
      </div>
    </div>
  `;
}

async function renderCrmSection() {
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

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">CRM</div>
        <h2 class="calc-card-title">CRM команды</h2>
        <p class="sublead">Сначала обработайте новые лиды, просроченные задачи и очередь без ответственного.</p>
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="cabinet-kicker">На сейчас</div>
            <h3 class="calc-card-title">Что требует реакции первым</h3>
            <div class="cabinet-inline-meta">
              <span>${leads.length} ${pluralizeRu(leads.length, "лид", "лида", "лидов")} в выборке</span>
              <span>${countCrmNewLeads(leads)} новых</span>
              <span>${overdueTasks.length} просрочено</span>
              <span>${unassignedLeads.length} без ответственного</span>
              <span>${syncIssues} проблем синхронизации</span>
            </div>
            <div class="cabinet-mini-list">
              <article class="cabinet-mini-card">
                <strong>Что требует реакции сейчас</strong>
                <span>${overdueTasks.length ? `Сначала закройте ${overdueTasks.length} просроченных задач.` : "Просроченных задач сейчас нет."}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Очередь без owner</strong>
                <span>${unassignedLeads.length ? `${unassignedLeads.length} лидов ещё без ответственного.` : "Все лиды уже назначены."}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Качество данных</strong>
                <span>${duplicateCount ? `Есть ${duplicateCount} кандидатов на дубли.` : "Явных дублей не видно."}</span>
              </article>
            </div>
            <div class="cabinet-home-actions">
              <a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("crm"))}">Открыть CRM</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("users"))}">Проверить owners</a>
            </div>
          </article>
          <section class="card card-pad cabinet-card">
            <div class="cabinet-kicker">Лиды и задачи</div>
            <h3 class="calc-card-title">Ближайшие элементы потока</h3>
            ${(leadPreview.length || taskPreview.length) ? `
              <div class="cabinet-mini-list">
                ${leadPreview.map(renderCrmLeadItem).join("")}
                ${taskPreview.map(renderCrmTaskItem).join("")}
              </div>
            ` : `<div class="account-empty">CRM не вернул рабочую выборку по лидам и задачам.</div>`}
          </section>
          <article class="card card-pad cabinet-home-card cabinet-home-card--compact">
            <div class="cabinet-kicker">Owners и очередь</div>
            <h3 class="calc-card-title">Кому что достаётся</h3>
            ${(ownerPreview.length || queuePreview.length) ? `
              <div class="cabinet-mini-list">
                ${ownerPreview.map(renderCrmWorkloadItem).join("")}
                ${queuePreview.map(renderCrmQueueItem).join("")}
              </div>
            ` : `<div class="account-empty">CRM не вернула данные по owners для этой сессии.</div>`}
          </article>
          <article class="card card-pad cabinet-home-card cabinet-home-card--compact">
            <div class="cabinet-kicker">Pipeline и чистота</div>
            <h3 class="calc-card-title">Состояние CRM</h3>
            <div class="cabinet-inline-meta">
              <span>${pipelines.length} стадий</span>
              <span>${duplicateCount} кандидатов на дубль</span>
              <span>${crmUsers.length} участников команды</span>
              <span>${statusItem ? escapeHtml(statusItem.account_name || statusItem.title || "CRM подключена") : "статус не вернулся"}</span>
            </div>
            ${(pipelinePreview.length || duplicatePreview.length) ? `
              <div class="cabinet-mini-list">
                ${pipelinePreview.map(renderCrmPipelineItem).join("")}
                ${duplicatePreview.map(renderCrmDuplicateItem).join("")}
              </div>
            ` : `<div class="account-empty">CRM не вернула pipeline и качество данных.</div>`}
          </article>
        </div>
      </div>
    </div>
  `;
}

function renderCrmOfflineState() {
  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">CRM</div>
        <h2 class="calc-card-title">CRM команды</h2>
        <p class="sublead">Кабинет работает, но CRM сейчас не подключена.</p>
      </div>
      <article class="card card-pad cabinet-home-card">
        <div class="cabinet-kicker">Статус системы</div>
        <h3 class="calc-card-title">CRM не подключена</h3>
        <div class="cabinet-mini-list">
          <article class="cabinet-mini-card">
            <strong>Статус</strong>
            <span>Кабинет доступен, но CRM пока не отдаёт лиды и задачи.</span>
          </article>
          <article class="cabinet-mini-card">
            <strong>Что недоступно</strong>
            <span>Очередь лидов, задачи и статусы пока не загружаются.</span>
          </article>
          <article class="cabinet-mini-card">
            <strong>Что делать дальше</strong>
            <span>Подключите CRM или тестовые данные, и раздел снова станет рабочим.</span>
          </article>
        </div>
        <div class="cabinet-home-actions">
          <a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("dashboard"))}">Назад к dashboard</a>
          <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("catalog"))}">Открыть каталог</a>
          <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("users"))}">Проверить пользователей</a>
        </div>
      </article>
    </div>
  `;
}

function renderCrmDisabledState() {
  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">CRM</div>
        <h2 class="calc-card-title">CRM команды</h2>
        <p class="sublead">CRM сейчас выключена в настройках сайта.</p>
      </div>
      <article class="card card-pad cabinet-home-card">
        <div class="cabinet-kicker">Статус системы</div>
        <h3 class="calc-card-title">CRM отключена</h3>
        <div class="cabinet-mini-list">
          <article class="cabinet-mini-card">
            <strong>Почему так</strong>
            <span>В backend-настройках флаг CRM стоит в положении «выключено».</span>
          </article>
          <article class="cabinet-mini-card">
            <strong>Что доступно</strong>
            <span>Каталог, цены калькулятора, пользователи и аудит работают в штатном режиме.</span>
          </article>
          <article class="cabinet-mini-card">
            <strong>Как включить</strong>
            <span>Включите CRM в настройках backend, и раздел снова начнёт показывать лиды и задачи.</span>
          </article>
        </div>
        <div class="cabinet-home-actions">
          <a class="btn btn-primary" href="${escapeAttribute(cabinetSectionHref("dashboard"))}">Назад к dashboard</a>
          <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("site"))}">Открыть настройки сайта</a>
          <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("catalog"))}">Открыть каталог</a>
        </div>
      </article>
    </div>
  `;
}

async function renderCalcPricesSection() {
  const pricing = await loadCalcPricing();
  const items = Array.isArray(pricing?.items) ? pricing.items : [];
  const constants = pricing?.constants ? Object.keys(pricing.constants).length : 0;
  const inputs = pricing?.inputs ? Object.keys(pricing.inputs).length : 0;
  const topItems = [...items].sort((a, b) => Number(b.unitPrice || 0) - Number(a.unitPrice || 0)).slice(0, 6);
  const frameCount = items.filter((item) => Number(item.id) <= 11).length;
  const systemCount = items.filter((item) => Number(item.id) > 11).length;

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">Цены калькулятора</div>
        <h2 class="calc-card-title">Цены калькулятора</h2>
        <p class="sublead">Здесь видно, сколько цен в модели и какие из них сильнее влияют на расчёт.</p>
      </div>
      <div class="cabinet-stat-grid">
        ${renderStatCard("Позиции", String(items.length), "в текущем pricing.json")}
        ${renderStatCard("Константы", String(constants), "постоянные параметры")}
        ${renderStatCard("Вводные", String(inputs), "значения по умолчанию")}
        ${renderStatCard("Группы", `${frameCount} / ${systemCount}`, "каркас / системы")}
      </div>
      <article class="card card-pad cabinet-card">
        <div class="tag">Самые тяжёлые позиции</div>
        <h3 class="calc-card-title">Что сильнее влияет на расчёт</h3>
        <div class="cabinet-mini-list">
          ${topItems.map((item) => renderCalcPriceItem(item)).join("")}
        </div>
      </article>
      <div class="account-actions">
        <a class="btn btn-primary" href="${escapeAttribute(cabinetRoutes.calcAdmin)}">Открыть редактор pricing.json</a>
        <a class="btn btn-secondary" href="${escapeAttribute(cabinetRoutes.calc)}">Открыть калькулятор</a>
      </div>
    </div>
  `;
}

async function renderAdminSiteSection() {
  const response = await fetchJson(`${apiBase()}/admin/settings`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  const settingsPayload = response.data.settings || {};
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

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">Сайт и настройки</div>
        <h2 class="calc-card-title">Сайт и публикация</h2>
        <p class="sublead">Здесь страницы, форма заявки, SEO и канал в CRM.</p>
      </div>
      <div class="cabinet-stat-grid">
        ${renderStatCard("Страницы", String(pages.length), `${publishedPages} опубликовано`)}
        ${renderStatCard("Форма", String(enabledFormFields), `поля включены · ${humanizeBoolean(forms.openTelegramAfterCopy)} авто-telegram`)}
        ${renderStatCard("SEO", seo.indexPublicPages ? "включено" : "выключено", seo.titleSuffix || "без suffix")}
        ${renderStatCard("CRM", crm.primaryChannel || forms.primaryChannel || "manual", crm.enabled ? "канал включён" : "ручной режим")}
      </div>
      <div class="cabinet-home-grid cabinet-home-grid--single">
        <div class="cabinet-home-main">
          <article class="card card-pad cabinet-home-card">
            <div class="tag">Быстрые входы</div>
            <h3 class="calc-card-title">Куда идти первым</h3>
            <div class="cabinet-home-actions">
              <a class="btn btn-primary" href="${escapeAttribute(cabinetRoutes.site)}">Открыть сайт</a>
              <a class="btn btn-secondary" href="${escapeAttribute(cabinetSectionHref("dashboard"))}">Открыть кабинет</a>
            </div>
            <div class="cabinet-mini-list">
              <article class="cabinet-mini-card">
                <strong>Публичный сайт</strong>
                <span>${escapeHtml(site.projectName || "Klubnika Project")} · ${escapeHtml(site.primaryDomain || site.publicUrl || "домен не задан")}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Форма захвата</strong>
                <span>${escapeHtml(forms.mode || "backend_submit")} · канал ${escapeHtml(forms.primaryChannel || "manual")}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Интеграции</strong>
                <span>${escapeHtml(integrations.catalogSource || "catalog source")} · ${escapeHtml(integrations.futureCms || "future CMS")}</span>
              </article>
            </div>
          </article>
          <section class="card card-pad cabinet-card">
            <div class="tag">Публикация</div>
            <h3 class="calc-card-title">Что сейчас опубликовано</h3>
            <div class="cabinet-list">
              <div class="cabinet-list-head cabinet-list-head--site-pages">
                <span>Страница</span>
                <span>Роль страницы</span>
                <span>CTA</span>
                <span>Статус</span>
              </div>
              <div class="cabinet-list-body">
                ${pages.length ? pages.map(renderSitePageRow).join("") : '<div class="account-empty">Список страниц пока не загрузился.</div>'}
              </div>
            </div>
          </section>
          <article class="card card-pad cabinet-home-card">
            <div class="tag">Настройки</div>
            <h3 class="calc-card-title">Что важно по сайту сейчас</h3>
            <div class="cabinet-mini-list">
              <article class="cabinet-mini-card">
                <strong>SEO</strong>
                <span>canonical ${escapeHtml(seo.canonicalOrigin || "не задан")} · sitemap ${humanizeBoolean(seo.includeSitemap)}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>Форма</strong>
                <span>${enabledFormFields} полей · канал ${escapeHtml(forms.primaryChannel || "manual")}</span>
              </article>
              <article class="cabinet-mini-card">
                <strong>CRM</strong>
                <span>${escapeHtml(crm.note || "CRM работает через текущий канал")}</span>
              </article>
            </div>
          </article>
        </div>
      </div>
    </div>
  `;
}

async function renderAdminUsersSection() {
  const response = await fetchJson(`${apiBase()}/admin/users`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
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

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">Пользователи</div>
        <h2 class="calc-card-title">Пользователи и доступы</h2>
        <p class="sublead">Здесь создаются аккаунты, настраиваются права и открывается курс.</p>
      </div>
      <article class="card card-pad cabinet-home-card">
        <div class="cabinet-kicker">Управление</div>
        <h3 class="calc-card-title">Создать или обновить аккаунт</h3>
        <p class="sublead">Имя, права, пароль и доступ к Клубничному Хаку настраиваются в одной карточке.</p>
        <div class="cabinet-inline-meta">
          <span>${users.length} ${pluralizeRu(users.length, "аккаунт", "аккаунта", "аккаунтов")}</span>
          <span>${activeUsers.length} активных</span>
          <span>${adminUsers} в команде</span>
          <span>${courseUsers.length} с доступом к курсу</span>
        </div>
        <div class="cabinet-home-actions cabinet-home-actions--compact">
          <button class="btn btn-primary" type="button" data-cabinet-user-create>Создать пользователя</button>
        </div>
        <div class="cabinet-inline-hint">Для оплативших курс нажмите «Выдать Клубничный Хак», потом сохраните карточку.</div>
        <div class="cabinet-users-status" data-cabinet-users-status></div>
      </article>
      <section class="card card-pad cabinet-card">
        <div class="cabinet-kicker">Аккаунты</div>
        <h3 class="calc-card-title">Кто сейчас есть в системе</h3>
        <div class="cabinet-user-editor-grid">
          ${users.map((user) => renderAdminUserEditor(user, ordersByUser[user.id] || [], documentsByOrder)).join("")}
        </div>
      </section>
    </div>
  `;
}

async function renderAdminAuditSection() {
  const response = await fetchJson(`${apiBase()}/admin/audit-events?limit=12`);
  if (!response.ok) throw new Error(cleanupError(response.text || `HTTP ${response.status}`));
  const items = response.data.items || [];
  const actorCount = new Set(items.map((item) => item.actor_name || item.actor_id || "system")).size;
  const areaCount = new Set(items.map((item) => item.area || "system")).size;
  const latestTs = items[0]?.created_at || items[0]?.createdAt || "";

  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">Аудит</div>
        <h2 class="calc-card-title">Последние действия</h2>
        <p class="sublead">Лента входов и изменений по кабинету, CRM и настройкам.</p>
      </div>
      <div class="cabinet-stat-grid">
        ${renderStatCard("События", String(items.length), "в текущей короткой выборке")}
        ${renderStatCard("Зоны", String(areaCount), "слоёв системы попали в аудит")}
        ${renderStatCard("Участники", String(actorCount), "кто оставил след в последних событиях")}
        ${renderStatCard("Последнее", latestTs ? formatAuditTimestamp(latestTs) : "пусто", latestTs ? "самое свежее событие" : "событий пока нет")}
      </div>
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

function renderMemberCatalogCard(item) {
  return `
    <article class="card card-pad account-card">
      <div class="tag">${escapeHtml(humanizeCatalogKind(item.kind || item.category || "catalog"))}</div>
      <h3 class="calc-card-title">${escapeHtml(item.title)}</h3>
      <p class="sublead">${escapeHtml(item.summary || "Без описания")}</p>
      <div class="account-item-meta">
        <span>${escapeHtml(item.category || "без категории")}</span>
        <span>${escapeHtml(humanizeCatalogPublicationStatus(item.status || "published"))}</span>
      </div>
      <div class="account-actions">
        <a class="btn btn-primary" href="${escapeAttribute(item.path)}">Открыть страницу</a>
      </div>
    </article>
  `;
}

function renderMemberCatalogRow(item) {
  const nextStep = String(item.cta_mode || "").toLowerCase() === "buy" ? "Можно брать" : "Лучше уточнить";
  return `
    <article class="cabinet-list-row cabinet-list-row--catalog">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.summary || "Без описания")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.category || "без категории")}</strong>
        <span>${escapeHtml(humanizeCatalogKind(item.kind || "catalog"))}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(nextStep)}</strong>
        <span><a href="${escapeAttribute(item.path)}">Открыть страницу</a></span>
      </div>
    </article>
  `;
}

function renderMemberSpecialCard(item) {
  return `
    <article class="card card-pad account-card">
      <div class="tag">${escapeHtml(humanizeCatalogKind(item.kind || "route"))}</div>
      <h3 class="calc-card-title">${escapeHtml(item.title)}</h3>
      <p class="sublead">${escapeHtml(item.summary || "Без описания")}</p>
      <div class="account-actions">
        <a class="btn btn-secondary" href="${escapeAttribute(item.path)}">Перейти</a>
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
        <strong>Открыть</strong>
        <span><a href="${escapeAttribute(item.path)}">Перейти</a></span>
      </div>
    </article>
  `;
}

function humanizeOrderDocumentType(value) {
  const type = String(value || "").toLowerCase();
  if (type === "invoice") return "Счёт";
  if (type === "specification") return "Спецификация";
  if (type === "pdf") return "PDF";
  if (type === "checklist") return "Чек-лист";
  return "Документ";
}

function humanizeOrderDocumentStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status === "ready") return "Готов";
  if (status === "sent") return "Отправлен";
  return "Черновик";
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
  const latestStatus = items.length ? getOrderDocumentLatestStatus(items) : "";
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
          <span>${items.length ? humanizeOrderDocumentStatus(latestStatus) : "Пока пусто"}</span>
        </div>
      </div>
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
      ` : `<div class="account-empty">Документов по этому заказу пока нет.</div>`}
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
      secondaryLabel: "Открыть расчёт",
      secondaryHref: cabinetSectionHref("requests"),
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
      tertiaryLabel: documentsCount ? "Документы рядом" : "",
      tertiaryHref: documentsCount ? cabinetSectionHref("documents") : "",
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
      tertiaryLabel: documentsCount ? "Документы рядом" : "",
      tertiaryHref: documentsCount ? cabinetSectionHref("documents") : "",
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
      primaryLabel: documentsCount ? "Открыть документы" : "Запросить документы",
      primaryHref: documentsCount ? cabinetSectionHref("documents") : "#order-thread",
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
      primaryLabel: documentsCount ? "Открыть документы" : "Открыть связь по заказу",
      primaryHref: documentsCount ? cabinetSectionHref("documents") : "#order-thread",
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
    primaryLabel: documentsCount ? "Открыть документы" : "Открыть сообщения",
    primaryHref: documentsCount ? cabinetSectionHref("documents") : cabinetSectionHref("messages"),
    secondaryLabel: "Открыть все заказы",
    secondaryHref: cabinetSectionHref("orders"),
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
  if (normalized === "succeeded") return "CRM принял лид";
  if (normalized === "failed") return "CRM не принял лид";
  if (normalized === "disabled") return "CRM сейчас отключена";
  return "Ждёт отправки в CRM";
}

function buildOrderLeadSummary(order) {
  const leadId = Number(order?.lead_id || 0) || 0;
  const crmLeadId = Number(order?.lead_crm_lead_id || 0) || 0;
  const owner = String(order?.lead_owner || "").trim();
  const deliveryLabel = humanizeOrderLeadDeliveryStatus(order?.lead_delivery_status || "");
  const deliveryError = String(order?.lead_delivery_error || "").trim();
  const linkError = String(order?.lead_link_error || "").trim();
  if (!leadId) {
    return {
      title: "Лид в CRM ещё не создан",
      note: linkError || "Заказ сохранён, но до CRM ещё не отправлен.",
    };
  }
  const title = crmLeadId ? `CRM лид #${crmLeadId}` : `Лид #${leadId} создан`;
  const details = [deliveryLabel];
  if (owner) details.push(`ответственный: ${owner}`);
  if (deliveryError) details.push(`ошибка: ${deliveryError}`);
  if (linkError) details.push(`подробности: ${linkError}`);
  return {
    title,
    note: `${details.join(" · ")}.`,
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
        <span>${escapeHtml(leadSummary.title)}</span>
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
    return { label: "На подтверждении", note: "Заказ уже в работе, ждём подтверждение." };
  }
  if (status === "confirmed") {
    return { label: "Подтверждён", note: "Заказ подтверждён. Следом будут документы и отгрузка." };
  }
  if (status === "shipped") {
    return { label: "В отгрузке", note: "Заказ уже двигается к доставке." };
  }
  if (status === "completed") {
    return { label: "Закрыт", note: "Заказ завершён. Документы и история остаются здесь." };
  }
  if (!lineCount) {
    return { label: "Черновик", note: "Заказ пока пустой и ещё не собран." };
  }
  if (profileCompleteness < 3) {
    return { label: "Заполните профиль", note: "Позиции собраны, но не хватает контактов и доставки." };
  }
  return { label: "Готов к подтверждению", note: "Состав собран, профиль заполнен, можно подтверждать." };
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
    <article class="cabinet-list-row cabinet-list-row--catalog${isSelected ? " is-selected" : ""}" data-catalog-manager-row data-catalog-search-index="${escapeAttribute(searchIndex)}">
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
          <div class="cabinet-kicker">Media manager</div>
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
      <div class="cabinet-kicker">Редактор товара</div>
      <h3 class="calc-card-title">${escapeHtml(product.name || product.slug || "Товар")}</h3>
      <div class="cabinet-inline-meta">
        <span>${escapeHtml(product.slug || "")}</span>
        <span>${escapeHtml(product.category_slug || "без категории")}</span>
        <span>${escapeHtml(product.path || "без public path")}</span>
      </div>
      <div class="cabinet-product-editor__actions">
        <button class="btn btn-primary" type="button" data-catalog-product-save="${escapeAttribute(product.slug)}">Сохранить товар</button>
        <a class="btn btn-secondary" href="${escapeAttribute(product.path || cabinetRoutes.catalog)}" target="_blank" rel="noopener noreferrer">Открыть страницу товара</a>
        <div class="cabinet-users-status cabinet-product-editor__status" data-catalog-product-status></div>
      </div>
      <div class="cabinet-product-editor__summary">
        <article class="cabinet-mini-card">
          <strong>Публичность</strong>
          <span>${escapeHtml(humanizeCatalogPublicationStatus(product.status || "published"))} · ${escapeHtml(humanizeCatalogStockStatus(product.stock_status || "in_stock"))}</span>
        </article>
        <article class="cabinet-mini-card">
          <strong>Медиа</strong>
          <span>${Array.isArray(product.images) ? product.images.length : 0} ${pluralizeRu(Array.isArray(product.images) ? product.images.length : 0, "файл", "файла", "файлов")}</span>
        </article>
        <article class="cabinet-mini-card">
          <strong>Структура</strong>
          <span>${(product.attributes || []).length} хар-к · ${(product.documents || []).length} док. · ${(product.faq || []).length} FAQ</span>
        </article>
        <article class="cabinet-mini-card">
          <strong>Связи</strong>
          <span>${(product.related_products || []).length} связанных · ${(product.compatibility || []).length} совместимостей</span>
        </article>
      </div>
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
        <label class="cabinet-field cabinet-field--wide">
          <span class="cabinet-field-label">Короткое описание</span>
          <textarea class="admin-textarea" rows="3" data-catalog-product-field="short_description">${escapeHtml(product.short_description || "")}</textarea>
        </label>
        <label class="cabinet-field cabinet-field--wide">
          <span class="cabinet-field-label">Полное описание</span>
          <textarea class="admin-textarea" rows="7" data-catalog-product-field="full_description">${escapeHtml(product.full_description || "")}</textarea>
        </label>
        <label class="cabinet-field cabinet-field--wide">
          <span class="cabinet-field-label">Badge logic</span>
          ${renderCatalogBadgeControls(product.badges || [])}
        </label>
      </div>
      ${renderCatalogMediaSection(product)}
      ${renderCatalogCollectionSection({
        kicker: "Характеристики",
        title: "Что показывать в карточке и фильтрах",
        note: "Каждая характеристика живёт отдельной записью: label, value, key и группа.",
        type: "attributes",
        addLabel: "Добавить характеристику",
        content: attributes.map(renderCatalogAttributeRow).join(""),
      })}
      ${renderCatalogCollectionSection({
        kicker: "Документы",
        title: "Файлы рядом с товаром",
        note: "Паспорта, чек-листы и спецификации храните здесь, а не в описании.",
        type: "documents",
        addLabel: "Добавить документ",
        content: documents.map(renderCatalogDocumentRow).join(""),
      })}
      ${renderCatalogCollapsibleSection({
        kicker: "SEO",
        title: "Поиск",
        note: "Здесь только SEO-текст для поиска и сниппета.",
        open: false,
        content: `
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
        `,
      })}
      ${renderCatalogCollapsibleSection({
        kicker: "FAQ",
        title: "Вопросы и ответы по товару",
        note: "Этот блок нужен для нормальной карточки товара и для снятия повторяющихся вопросов до переписки.",
        open: false,
        content: `
          <div class="cabinet-editor-section__head">
            <div></div>
            <button class="btn btn-secondary btn-ghost--small" type="button" data-catalog-collection-add="faq">Добавить вопрос</button>
          </div>
          <div class="cabinet-repeater" data-catalog-collection="faq">${faq.map(renderCatalogFaqRow).join("")}</div>
        `,
      })}
      ${renderCatalogCollapsibleSection({
        kicker: "Связи",
        title: "Связанные товары",
        note: "Сюда складываем соседние позиции, которые логично показывать рядом: модуль, комплект, следующий шаг.",
        open: false,
        content: `
          <div class="cabinet-editor-section__head">
            <div></div>
            <button class="btn btn-secondary btn-ghost--small" type="button" data-catalog-collection-add="related_products">Добавить связанную позицию</button>
          </div>
          <div class="cabinet-repeater" data-catalog-collection="related_products">${relatedProducts.map((item) => renderCatalogRelatedRow(item)).join("")}</div>
        `,
      })}
      ${renderCatalogCollapsibleSection({
        kicker: "Совместимость",
        title: "Совместимость",
        note: "Короткие пометки: с чем совместимо, где нужна проверка и когда нужен адаптер.",
        open: false,
        content: `
          <div class="cabinet-editor-section__head">
            <div></div>
            <button class="btn btn-secondary btn-ghost--small" type="button" data-catalog-collection-add="compatibility">Добавить правило совместимости</button>
          </div>
          <div class="cabinet-repeater" data-catalog-collection="compatibility">${compatibility.map((item) => renderCatalogCompatibilityRow(item)).join("")}</div>
        `,
      })}
      <div class="cabinet-home-actions">
        <button class="btn btn-primary" type="button" data-catalog-product-save="${escapeAttribute(product.slug)}">Сохранить товар</button>
        <a class="btn btn-secondary" href="${escapeAttribute(product.path || cabinetRoutes.catalog)}" target="_blank" rel="noopener noreferrer">Открыть страницу товара</a>
      </div>
    </article>
  `;
}

function renderSitePageRow(item) {
  return `
    <article class="cabinet-list-row cabinet-list-row--site-pages">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.label || item.id || "Без имени")}</strong>
        <span>${escapeHtml(item.id || "страница")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.goal || "Без цели")}</strong>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.primaryCta || "Без CTA")}</strong>
        <span>${escapeHtml(item.secondaryCta || "Без secondary CTA")}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(humanizeCatalogPublicationStatus(item.status || "draft"))}</strong>
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

function renderAdminUserEditor(user, orders = [], documentsByOrder = {}) {
  const scopes = Array.isArray(user.scopes) ? user.scopes : [];
  const roleOptions = ["owner", "admin", "manager", "editor", "viewer", "buyer", "student"];
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

function renderMemberMessageItem(item) {
  const isStaff = String(item.sender_type || "").toLowerCase() === "staff";
  return `
    <article class="cabinet-mini-card">
      <strong>${escapeHtml(item.subject || (isStaff ? "Ответ команды" : "Сообщение"))}</strong>
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
  const ownerName = item.owner_name || item.display_name || item.name || item.slug || "Owner";
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
  const source = item.source || item.request_type || item.pipeline_name || "owner queue";
  const owner = item.owner_name || item.owner || "без owner";
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
      <strong>${escapeHtml(item.name || `Позиция ${item.id}`)}</strong>
      <span>ID ${escapeHtml(item.id)} · ${formatRub(item.unitPrice)}</span>
    </article>
  `;
}

function renderAuditItem(item) {
  const action = humanizeAuditAction(item.action);
  const area = humanizeAuditArea(item.area);
  const targetType = humanizeAuditTarget(item.target_type);
  return `
    <article class="cabinet-list-row cabinet-list-row--audit">
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(action)} · ${escapeHtml(area)}</strong>
        <span>${escapeHtml(targetType)}${item.target_id ? ` · ${escapeHtml(item.target_id)}` : ""}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(item.actor_name || "Система")}</strong>
        <span>${escapeHtml(humanizeActorRole(item.actor_role || ""))}</span>
      </div>
      <div class="cabinet-list-cell">
        <strong>${escapeHtml(formatAuditTimestamp(item.created_at || item.createdAt || ""))}</strong>
      </div>
    </article>
  `;
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
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "manager") return "manager";
  if (role === "student") return "участник курса";
  if (role === "buyer") return "клиент";
  return value;
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

function renderRuntimeEmpty(label, message) {
  return `
    <div class="cabinet-section-stack">
      <div class="cabinet-section-intro">
        <div class="tag">${escapeHtml(label)}</div>
        <h2 class="calc-card-title">${escapeHtml(label)}</h2>
        <p class="sublead">${escapeHtml(message)}</p>
      </div>
    </div>
  `;
}

function humanizeBoolean(value) {
  return value ? "вкл" : "выкл";
}

function bindAdminUsersSection() {
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
}

function bindAdminCatalogSection() {
  document.querySelector("[data-catalog-manager-search]")?.addEventListener("input", (event) => {
    const needle = String(event.target?.value || "").trim().toLowerCase();
    document.querySelectorAll("[data-catalog-manager-row]").forEach((row) => {
      const haystack = String(row.getAttribute("data-catalog-search-index") || "");
      row.hidden = needle ? !haystack.includes(needle) : false;
    });
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
        window.location.href = cabinetSectionHref("orders", { order: created?.id || "" });
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
  const role = (window.prompt("Роль: owner/admin/manager/editor/viewer/buyer/student", accountType === "admin" ? "manager" : "buyer") || "").trim() || "buyer";
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
  if (!nameField || !roleField || !accountTypeField || !scopesField || !activeField) return;

  setCabinetUsersStatus("Сохраняем пользователя…");
  const response = await fetchJson(`${apiBase()}/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      display_name: nameField.value.trim(),
      email: emailField?.value.trim() || "",
      role: roleField.value,
      account_type: accountTypeField.value,
      scopes: parseCommaValues(scopesField.value),
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
  const hasDocuments = documentPages.length > 0;
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
