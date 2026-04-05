const SITE_ADMIN_BACKEND_CACHE_KEY = "klubnikaproject.site.backend.settings.v1";
const ADMIN_SESSION_STORAGE_KEY = "klubnikaproject.admin.session.v1";
const MEMBER_SESSION_STORAGE_KEY = "klubnikaproject.member.session.v1";
const DEFAULT_SETTINGS = {
  site: {
    projectName: "Klubnika Project",
  },
  members: {
    enabled: true,
    loginPath: "cabinet/login/",
    hubPath: "cabinet/",
    catalogPath: "account/catalog/",
    specialPath: "account/special/",
  },
  integrations: {
    apiBase: "https://api.klubnikaproject.ru/site/v1",
  },
};

let settings = clone(DEFAULT_SETTINGS);
let currentSessionUser = null;
let memberAccessPolicy = null;
const basePath = detectBasePath();

document.addEventListener("DOMContentLoaded", async () => {
  settings = loadCachedSettings();
  await refreshSettings();
  hydrateStaticLinks();
  bindLogout();
  const session = await fetchSession();

  if (session?.ok && session.accountType === "admin") {
    redirectAuthenticatedAdmin();
    return;
  }

  const view = document.body.dataset.accountView || "hub";
  if (!isMembersEnabled()) {
    renderMembersDisabled(view);
    return;
  }

  if (view === "login") {
    if (session?.ok) {
      currentSessionUser = session.user;
      await refreshAccessPolicy();
      redirectAuthenticatedMember(session.user);
      return;
    }
    bindLogin();
    return;
  }

  if (!session?.ok) {
    redirectToLogin();
    return;
  }

  currentSessionUser = session.user;
  await refreshAccessPolicy();
  renderUser(session.user);

  if (view === "catalog") {
    if (!hasScope(session.user, "catalog")) {
      renderScopeDenied("catalog");
      return;
    }
    await renderMemberCatalog();
  } else if (view === "special") {
    if (!hasScope(session.user, "special_pages")) {
      renderScopeDenied("special_pages");
      return;
    }
    await renderSpecialPages();
  } else {
    renderHub(session.user);
  }
});

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
  } catch (error) {
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
  } catch (error) {
    // keep cached settings
  }
}

function apiBase() {
  return detectRuntimeApiBase((settings.integrations?.apiBase || DEFAULT_SETTINGS.integrations.apiBase));
}

function detectBasePath() {
  return window.location.pathname.startsWith("/klubnikaproject-next/") ? "/klubnikaproject-next/" : "/";
}

function routePath(relativePath = "") {
  const clean = String(relativePath || "").replace(/^\/+/, "");
  return clean ? `${basePath}${clean}` : basePath;
}

function normalizeAppPath(path = "") {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith(basePath)) return raw;
  return routePath(raw);
}

function detectRuntimeApiBase(configuredBase) {
  const configured = String(configuredBase || "").trim().replace(/\/+$/, "");
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return "http://127.0.0.1:8010/v1";
  }
  return configured;
}

function memberPath(key) {
  const raw = settings.members?.[key] || DEFAULT_SETTINGS.members[key];
  return routePath(raw);
}

function isMembersEnabled() {
  return Boolean(settings.members?.enabled);
}

function hasScope(user, scope) {
  if (memberAccessPolicy?.route_access) {
    if (scope === "catalog") return Boolean(memberAccessPolicy.route_access.catalog);
    if (scope === "special_pages") return Boolean(memberAccessPolicy.route_access.special);
  }
  return Array.isArray(user?.scopes) && user.scopes.includes(scope);
}

function preferredMemberPath(user) {
  if (memberAccessPolicy?.route_access?.catalog || hasScope(user, "catalog")) return memberPath("catalogPath");
  if (memberAccessPolicy?.route_access?.special || hasScope(user, "special_pages")) return memberPath("specialPath");
  if (memberAccessPolicy?.preferred_path) return normalizeAppPath(memberAccessPolicy.preferred_path);
  return memberPath("hubPath");
}

function adminHubPath() {
  return routePath("cabinet/?section=dashboard");
}

function withNext(url) {
  const next = `${window.location.pathname}${window.location.search || ""}`;
  return `${url}?next=${encodeURIComponent(next)}`;
}

function hydrateStaticLinks() {
  document.querySelectorAll("[data-account-link]").forEach((link) => {
    const key = link.dataset.accountLink;
    const path = key === "login" ? memberPath("loginPath")
      : key === "hub" ? memberPath("hubPath")
      : key === "catalog" ? memberPath("catalogPath")
      : key === "special" ? memberPath("specialPath")
      : "/";
    link.href = path;
  });
}

function bindLogin() {
  const form = document.getElementById("account-login-form");
  const status = document.getElementById("account-login-status");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const login = document.getElementById("account-login-identity")?.value.trim() || "";
    const password = document.getElementById("account-login-password")?.value || "";
    if (!login || !password) {
      if (status) status.textContent = "Введите логин и пароль, чтобы открыть кабинет.";
      return;
    }
    if (status) status.textContent = "Проверяем данные и открываем кабинет...";
    try {
      const adminResponse = await fetch(`${apiBase()}/admin/auth/password-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ login, password }),
      });

      if (adminResponse.ok) {
        const adminPayload = await adminResponse.json();
        storeSessionToken("admin", adminPayload?.session_token || "");
        storeSessionToken("member", "");
        const nextCandidate = new URLSearchParams(window.location.search).get("next");
        const next = isAllowedAdminNextPath(nextCandidate) ? normalizeAppPath(nextCandidate) : adminHubPath();
        window.location.href = next;
        return;
      }

      const response = await fetch(`${apiBase()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ login, password }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const payload = await response.json();
      storeSessionToken("member", payload?.session_token || "");
      storeSessionToken("admin", "");
      currentSessionUser = payload.user || null;
      await refreshAccessPolicy();
      const nextCandidate = new URLSearchParams(window.location.search).get("next") || memberPath("hubPath");
      const next = isAllowedNextPath(nextCandidate) ? nextCandidate : preferredMemberPath(currentSessionUser);
      window.location.href = next;
    } catch (error) {
      if (status) status.textContent = `Не получилось войти: ${cleanupError(error.message)}`;
    }
  });
}

async function fetchSession() {
  const adminSession = await fetchAdminSession();
  if (adminSession?.ok) return adminSession;
  return fetchMemberSession();
}

async function fetchAdminSession() {
  try {
    const headers = { Accept: "application/json" };
    const adminToken = readStoredSessionToken("admin");
    if (adminToken) headers["X-KP-Admin-Session"] = adminToken;
    const response = await fetch(`${apiBase()}/admin/auth/session`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return {
      ok: true,
      accountType: "admin",
      user: payload.user || null,
    };
  } catch (error) {
    return null;
  }
}

async function fetchMemberSession() {
  try {
    const headers = { Accept: "application/json" };
    const memberToken = readStoredSessionToken("member");
    if (memberToken) headers["X-KP-Member-Session"] = memberToken;
    const response = await fetch(`${apiBase()}/auth/session`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) return null;
    const payload = await response.json();
    return {
      ...payload,
      accountType: "member",
    };
  } catch (error) {
    return null;
  }
}

async function refreshAccessPolicy() {
  if (!currentSessionUser) {
    memberAccessPolicy = null;
    return;
  }
  try {
    const headers = { Accept: "application/json" };
    const memberToken = readStoredSessionToken("member");
    if (memberToken) headers["X-KP-Member-Session"] = memberToken;
    const response = await fetch(`${apiBase()}/auth/access-policy`, {
      headers,
      credentials: "include",
    });
    if (!response.ok) {
      memberAccessPolicy = null;
      return;
    }
    const payload = await response.json();
    memberAccessPolicy = payload.policy || null;
  } catch (error) {
    memberAccessPolicy = null;
  }
}

function buildMemberAuthHeaders() {
  const headers = { Accept: "application/json" };
  const memberToken = readStoredSessionToken("member");
  if (memberToken) headers["X-KP-Member-Session"] = memberToken;
  return headers;
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

function renderUser(user) {
  document.querySelectorAll("[data-account-user]").forEach((target) => {
    target.innerHTML = `
      <span class="admin-pill">${escapeHtml(user.user_name || user.display_name || "Пользователь")}</span>
      <span class="admin-pill">${escapeHtml(user.user_role || user.role || "member")}</span>
      ${(user.scopes || []).map((scope) => `<span class="admin-pill">${escapeHtml(scope)}</span>`).join("")}
    `;
  });
}

function renderHub(user) {
  const container = document.getElementById("account-dynamic-content");
  if (!container) return;
  const hasCatalog = hasScope(user, "catalog");
  const hasSpecial = hasScope(user, "special_pages");
  container.innerHTML = `
    <div class="account-grid">
      <article class="card card-pad account-card">
        <div class="tag">Каталог</div>
        <h3 class="calc-card-title">Закрытый каталог пользователя</h3>
        <p class="sublead">Здесь можно быстро открыть нужные разделы каталога без лишних кругов по публичному сайту.</p>
        <div class="account-actions">
          ${hasCatalog
            ? `<a class="btn btn-primary" href="${memberPath("catalogPath")}">Открыть каталог</a>`
            : `<span class="account-note-chip">Нет доступа к каталогу</span>`
          }
        </div>
      </article>
      <article class="card card-pad account-card">
        <div class="tag">Спецстраницы</div>
        <h3 class="calc-card-title">Материалы по вашему доступу</h3>
        <p class="sublead">Отдельные страницы, которые не индексируются и доступны только авторизованным пользователям.</p>
        <div class="account-actions">
          ${hasSpecial
            ? `<a class="btn btn-secondary" href="${memberPath("specialPath")}">Открыть спецстраницы</a>`
            : `<span class="account-note-chip">Нет доступа к материалам</span>`
          }
        </div>
      </article>
    </div>
    <article class="card card-pad account-card">
      <div class="tag">Сессия</div>
      <h3 class="calc-card-title">Текущий доступ</h3>
      <p class="sublead">Вы вошли как <strong>${escapeHtml(user.user_name || user.display_name || "Пользователь")}</strong>. Если нужно сменить доступ, выйдите и войдите под другим логином.</p>
    </article>
    ${!hasCatalog && !hasSpecial ? `
      <div class="account-empty">
        Для этого аккаунта пока не выдан доступ к каталогу или закрытым материалам. Проверьте права в админке.
      </div>
    ` : ""}
  `;
}

async function renderMemberCatalog() {
  const container = document.getElementById("account-dynamic-content");
  if (!container) return;
  container.innerHTML = '<div class="account-empty">Загружаю каталог…</div>';
  try {
    const response = await fetch(`${apiBase()}/member/catalog/items`, {
      headers: buildMemberAuthHeaders(),
      credentials: "include",
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const items = payload.items || [];
    if (!items.length) {
      container.innerHTML = '<div class="account-empty">В закрытом каталоге пока нет элементов.</div>';
      return;
    }
    container.innerHTML = `<div class="account-grid-3">${items.map(renderCatalogCard).join("")}</div>`;
  } catch (error) {
    container.innerHTML = `<div class="account-empty">Не удалось загрузить каталог: ${escapeHtml(cleanupError(error.message))}</div>`;
  }
}

async function renderSpecialPages() {
  const container = document.getElementById("account-dynamic-content");
  if (!container) return;
  container.innerHTML = '<div class="account-empty">Загружаю спецстраницы…</div>';
  try {
    const response = await fetch(`${apiBase()}/member/special-pages`, {
      headers: buildMemberAuthHeaders(),
      credentials: "include",
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        redirectToLogin();
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    const items = payload.items || [];
    if (!items.length) {
      container.innerHTML = '<div class="account-empty">Спецстраницы пока не заданы.</div>';
      return;
    }
    container.innerHTML = `<div class="account-grid">${items.map(renderSpecialCard).join("")}</div>`;
  } catch (error) {
    container.innerHTML = `<div class="account-empty">Не удалось загрузить спецстраницы: ${escapeHtml(cleanupError(error.message))}</div>`;
  }
}

function renderCatalogCard(item) {
  return `
    <article class="card card-pad account-card">
      <div class="tag">${escapeHtml(humanizeMemberItemKind(item.kind || item.category || "catalog"))}</div>
      <h3 class="calc-card-title">${escapeHtml(item.title)}</h3>
      <p class="sublead">${escapeHtml(item.summary || "Без описания")}</p>
      <div class="account-item-meta">
        <span>${escapeHtml(item.category || "без категории")}</span>
        <span>${escapeHtml(humanizeMemberCtaMode(item.cta_mode || "choose"))}</span>
        <span>${escapeHtml(humanizeMemberItemStatus(item.status || "published"))}</span>
      </div>
      <div class="account-actions">
        <a class="btn btn-primary" href="${escapeAttribute(normalizeAppPath(item.path))}">Открыть страницу</a>
      </div>
    </article>
  `;
}

function renderSpecialCard(item) {
  return `
    <article class="card card-pad account-card">
      <div class="tag">${escapeHtml(humanizeMemberItemKind(item.kind || "route"))}</div>
      <h3 class="calc-card-title">${escapeHtml(item.title)}</h3>
      <p class="sublead">${escapeHtml(item.summary || "Без описания")}</p>
      <div class="account-actions">
        <a class="btn btn-secondary" href="${escapeAttribute(normalizeAppPath(item.path))}">Перейти</a>
      </div>
    </article>
  `;
}

function bindLogout() {
  document.querySelectorAll("[data-account-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await fetch(`${apiBase()}/auth/logout`, {
          method: "POST",
          headers: buildMemberAuthHeaders(),
          credentials: "include",
        });
      } catch (error) {
        // ignore
      }
      storeSessionToken("member", "");
      storeSessionToken("admin", "");
      window.location.href = isMembersEnabled() ? memberPath("loginPath") : routePath("");
    });
  });
}

function redirectToLogin() {
  if (!isMembersEnabled()) {
    window.location.href = routePath("");
    return;
  }
  window.location.href = withNext(memberPath("loginPath"));
}

function redirectAuthenticatedMember(user) {
  const nextCandidate = new URLSearchParams(window.location.search).get("next");
  if (isAllowedNextPath(nextCandidate)) {
    window.location.href = normalizeAppPath(nextCandidate);
    return;
  }
  window.location.href = preferredMemberPath(user);
}

function redirectAuthenticatedAdmin() {
  const nextCandidate = new URLSearchParams(window.location.search).get("next");
  if (isAllowedAdminNextPath(nextCandidate)) {
    window.location.href = normalizeAppPath(nextCandidate);
    return;
  }
  window.location.href = adminHubPath();
}

function isAllowedNextPath(path) {
  if (!path || !path.startsWith("/")) return false;
  const normalized = normalizeAppPath(path).replace(/\/+$/, "/");
  if (normalized === memberPath("hubPath")) return true;
  if (normalized.startsWith(memberPath("catalogPath"))) return Boolean(memberAccessPolicy?.route_access?.catalog ?? hasScope(currentSessionUser, "catalog"));
  if (normalized.startsWith(memberPath("specialPath"))) return Boolean(memberAccessPolicy?.route_access?.special ?? hasScope(currentSessionUser, "special_pages"));
  if (normalized.startsWith(memberPath("loginPath"))) return true;
  return false;
}

function isAllowedAdminNextPath(path) {
  if (!path || !path.startsWith("/")) return false;
  return normalizeAppPath(path).startsWith(routePath("cabinet/"));
}

function renderMembersDisabled(view) {
  const title = document.querySelector(".hero-title-compact");
  const lead = document.querySelector(".lead");
  if (title) title.textContent = "Кабинет клиента сейчас временно недоступен";
  if (lead) lead.textContent = "Публичный сайт продолжает работать. Как только кабинет включат снова, вы сможете войти по своему логину и паролю.";
  const status = document.getElementById("account-login-status");
  if (status) status.textContent = "Вход временно отключён в настройках сайта.";
  document.querySelectorAll(".account-input, #account-login-form button[type='submit']").forEach((el) => {
    el.setAttribute("disabled", "disabled");
  });
  const container = document.getElementById("account-dynamic-content");
  if (container) {
    container.innerHTML = `
      <div class="account-empty">
        Кабинет клиента сейчас временно отключён. Можно вернуться на публичный сайт или включить этот слой в админке.
      </div>
    `;
  }
}

function renderScopeDenied(scope) {
  const container = document.getElementById("account-dynamic-content");
  if (!container) return;
  container.innerHTML = `
    <div class="account-empty">
      Для этого раздела нужен доступ <strong>${escapeHtml(humanizeMemberScope(scope))}</strong>. Вернитесь в кабинет или измените права пользователя в админке.
      <div class="account-actions">
        <a class="btn btn-secondary" href="${memberPath("hubPath")}">Вернуться в кабинет</a>
      </div>
    </div>
  `;
}

function cleanupError(message) {
  return String(message || "").replace(/^Error:\s*/u, "");
}

function humanizeMemberItemKind(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["catalog", "product"].includes(normalized)) return "Каталог";
  if (["special", "special_page"].includes(normalized)) return "Материал";
  if (["route", "page"].includes(normalized)) return "Раздел";
  if (["document", "file"].includes(normalized)) return "Документ";
  return value || "Раздел";
}

function humanizeMemberItemStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "published") return "Опубликовано";
  if (normalized === "draft") return "Черновик";
  if (normalized === "hidden") return "Скрыто";
  if (normalized === "archived") return "Архив";
  return value || "Статус не указан";
}

function humanizeMemberCtaMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "buy") return "Готово к закупке";
  if (normalized === "choose") return "Нужно уточнение";
  if (normalized === "consult") return "Через консультацию";
  return value || "Режим не указан";
}

function humanizeMemberScope(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "catalog") return "Каталог";
  if (normalized === "special_pages") return "Закрытые материалы";
  if (normalized === "orders") return "Заказы";
  if (normalized === "documents") return "Документы";
  return value || "Нужный раздел";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
