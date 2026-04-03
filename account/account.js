const SITE_ADMIN_BACKEND_CACHE_KEY = "klubnikaproject.site.backend.settings.v1";
const DEFAULT_SETTINGS = {
  site: {
    projectName: "Klubnika Project",
  },
  members: {
    enabled: true,
    loginPath: "/account/login/",
    hubPath: "/account/",
    catalogPath: "/account/catalog/",
    specialPath: "/account/special/",
  },
  integrations: {
    apiBase: "https://api.klubnikaproject.ru/site/v1",
  },
};

let settings = clone(DEFAULT_SETTINGS);
let currentSessionUser = null;
let memberAccessPolicy = null;

document.addEventListener("DOMContentLoaded", async () => {
  settings = loadCachedSettings();
  await refreshSettings();
  hydrateStaticLinks();
  bindLogout();

  const view = document.body.dataset.accountView || "hub";
  if (!isMembersEnabled()) {
    renderMembersDisabled(view);
    return;
  }

  if (view === "login") {
    const session = await fetchSession();
    if (session?.ok) {
      currentSessionUser = session.user;
      await refreshAccessPolicy();
      redirectAuthenticatedMember(session.user);
      return;
    }
    bindLogin();
    return;
  }

  const session = await fetchSession();
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
  return (settings.integrations?.apiBase || DEFAULT_SETTINGS.integrations.apiBase).replace(/\/+$/, "");
}

function memberPath(key) {
  return settings.members?.[key] || DEFAULT_SETTINGS.members[key];
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
  if (memberAccessPolicy?.preferred_path) return memberAccessPolicy.preferred_path;
  if (hasScope(user, "catalog")) return memberPath("catalogPath");
  if (hasScope(user, "special_pages")) return memberPath("specialPath");
  return memberPath("hubPath");
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
  try {
    const response = await fetch(`${apiBase()}/auth/session`, {
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!response.ok) return null;
    return response.json();
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
    const response = await fetch(`${apiBase()}/auth/access-policy`, {
      headers: { Accept: "application/json" },
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
            : `<span class="account-note-chip">Нет scope \`catalog\`</span>`
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
            : `<span class="account-note-chip">Нет scope \`special_pages\`</span>`
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
        Для этого аккаунта пока не выдан доступ к \`catalog\` или \`special_pages\`. Настройте scopes в админке.
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
      headers: { Accept: "application/json" },
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
      headers: { Accept: "application/json" },
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
      <div class="tag">${escapeHtml(item.kind || item.category || "catalog")}</div>
      <h3 class="calc-card-title">${escapeHtml(item.title)}</h3>
      <p class="sublead">${escapeHtml(item.summary || "Без описания")}</p>
      <div class="account-item-meta">
        <span>${escapeHtml(item.category || "без категории")}</span>
        <span>${escapeHtml(item.cta_mode || "choose")}</span>
        <span>${escapeHtml(item.status || "published")}</span>
      </div>
      <div class="account-actions">
        <a class="btn btn-primary" href="${escapeAttribute(item.path)}">Открыть страницу</a>
      </div>
    </article>
  `;
}

function renderSpecialCard(item) {
  return `
    <article class="card card-pad account-card">
      <div class="tag">${escapeHtml(item.kind || "route")}</div>
      <h3 class="calc-card-title">${escapeHtml(item.title)}</h3>
      <p class="sublead">${escapeHtml(item.summary || "Без описания")}</p>
      <div class="account-actions">
        <a class="btn btn-secondary" href="${escapeAttribute(item.path)}">Перейти</a>
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
          headers: { Accept: "application/json" },
          credentials: "include",
        });
      } catch (error) {
        // ignore
      }
      window.location.href = isMembersEnabled() ? memberPath("loginPath") : "/";
    });
  });
}

function redirectToLogin() {
  if (!isMembersEnabled()) {
    window.location.href = "/";
    return;
  }
  window.location.href = withNext(memberPath("loginPath"));
}

function redirectAuthenticatedMember(user) {
  const nextCandidate = new URLSearchParams(window.location.search).get("next");
  if (isAllowedNextPath(nextCandidate)) {
    window.location.href = nextCandidate;
    return;
  }
  window.location.href = preferredMemberPath(user);
}

function isAllowedNextPath(path) {
  if (!path || !path.startsWith("/")) return false;
  const normalized = path.replace(/\/+$/, "/");
  if (normalized === memberPath("hubPath")) return true;
  if (normalized.startsWith(memberPath("catalogPath"))) return Boolean(memberAccessPolicy?.route_access?.catalog ?? hasScope(currentSessionUser, "catalog"));
  if (normalized.startsWith(memberPath("specialPath"))) return Boolean(memberAccessPolicy?.route_access?.special ?? hasScope(currentSessionUser, "special_pages"));
  if (normalized.startsWith(memberPath("loginPath"))) return true;
  return false;
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
      Для этого раздела нужен scope <strong>${escapeHtml(scope)}</strong>. Вернитесь в кабинет или измените права пользователя в админке.
      <div class="account-actions">
        <a class="btn btn-secondary" href="${memberPath("hubPath")}">Вернуться в кабинет</a>
      </div>
    </div>
  `;
}

function cleanupError(message) {
  return String(message || "").replace(/^Error:\s*/u, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
