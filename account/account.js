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
let memberSessions = [];
const currentAccountView = document.body.dataset.accountView || "hub";

document.addEventListener("DOMContentLoaded", async () => {
  settings = loadCachedSettings();
  await refreshSettings();
  hydrateStaticLinks();
  bindLogout();

  const view = currentAccountView;
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
    renderLoginReasonNotice();
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

function withNextAndReason(url, reason = "") {
  const next = `${window.location.pathname}${window.location.search || ""}`;
  const params = new URLSearchParams();
  params.set("next", next);
  if (reason) params.set("reason", reason);
  return `${url}?${params.toString()}`;
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
      if (status) {
        status.className = "account-status is-error";
        status.textContent = "Введите логин и пароль.";
      }
      return;
    }
    if (status) {
      status.className = "account-status";
      status.textContent = "Проверяю логин и доступ...";
    }
    try {
      const response = await accountFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ login, password }),
      }, { allowUnauthorizedRedirect: false });
      const payload = response;
      currentSessionUser = payload.user || null;
      await refreshAccessPolicy();
      const nextCandidate = new URLSearchParams(window.location.search).get("next") || memberPath("hubPath");
      const next = isAllowedNextPath(nextCandidate) ? nextCandidate : preferredMemberPath(currentSessionUser);
      window.location.href = next;
    } catch (error) {
      if (status) {
        status.className = "account-status is-error";
        status.textContent = `Не удалось войти: ${cleanupError(error.message)}`;
      }
    }
  });
}

async function fetchSession() {
  try {
    return await accountFetch("/auth/session");
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
    const payload = await accountFetch("/auth/access-policy");
    memberAccessPolicy = payload.policy || null;
  } catch (error) {
    memberAccessPolicy = null;
  }
}

function renderUser(user) {
  const chips = [];
  chips.push(`<span class="admin-pill">${escapeHtml(user.user_name || user.display_name || "Пользователь")}</span>`);
  if (hasScope(user, "catalog")) {
    chips.push('<span class="admin-pill">Каталог открыт</span>');
  }
  if (hasScope(user, "special_pages")) {
    chips.push('<span class="admin-pill">Материалы открыты</span>');
  }
  if (chips.length === 1) {
    chips.push('<span class="admin-pill">Доступ уточняется</span>');
  }
  document.querySelectorAll("[data-account-user]").forEach((target) => {
    target.innerHTML = chips.join("");
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
        <h3 class="calc-card-title">Доступные позиции и решения</h3>
        <p class="sublead">Откройте каталог, если он выдан для этого аккаунта.</p>
        <div class="account-actions">
          ${hasCatalog
            ? `<a class="btn btn-primary" href="${memberPath("catalogPath")}">Открыть каталог</a>`
            : `<span class="account-note-chip">Каталог пока не открыт</span>`
          }
        </div>
      </article>
      <article class="card card-pad account-card">
        <div class="tag">Материалы</div>
        <h3 class="calc-card-title">Закрытые страницы и подборки</h3>
        <p class="sublead">Здесь открываются материалы, которые выданы именно вашему аккаунту.</p>
        <div class="account-actions">
          ${hasSpecial
            ? `<a class="btn btn-secondary" href="${memberPath("specialPath")}">Открыть материалы</a>`
            : `<span class="account-note-chip">Материалы пока не открыты</span>`
          }
        </div>
      </article>
    </div>
    <article class="card card-pad account-card">
      <div class="tag">Сессия</div>
      <h3 class="calc-card-title">Текущий доступ</h3>
      <p class="sublead">Вы вошли как <strong>${escapeHtml(user.user_name || user.display_name || "Пользователь")}</strong>. Если нужен другой уровень доступа, выйдите и войдите под другим логином.</p>
    </article>
    <article class="card card-pad account-card">
      <div class="tag">Безопасность</div>
      <h3 class="calc-card-title">Пароль и активные сессии</h3>
      <p class="sublead">Можно сменить пароль, оставить только текущую сессию и быстро проверить, где аккаунт ещё открыт.</p>
      <div class="account-password-grid">
        <label class="account-label">
          <span>Текущий пароль</span>
          <input class="account-input" id="account-current-password" type="password" autocomplete="current-password" placeholder="Current password" />
        </label>
        <label class="account-label">
          <span>Новый пароль</span>
          <input class="account-input" id="account-new-password" type="password" autocomplete="new-password" placeholder="New password" />
        </label>
      </div>
      <div class="account-actions">
        <button class="btn btn-primary" type="button" id="account-change-password">Сменить пароль</button>
        <button class="btn btn-secondary" type="button" id="account-logout-others">Выйти из других сессий</button>
      </div>
      <div class="account-status" id="account-self-service-status"></div>
      <div class="account-session-list" id="account-session-list">
        <div class="account-empty">Сессии загружаются…</div>
      </div>
    </article>
    ${!hasCatalog && !hasSpecial ? `
      <div class="account-empty">
        Для этого аккаунта пока не открыты каталог и закрытые материалы. Напишите администратору проекта, чтобы выдать доступ.
      </div>
    ` : ""}
  `;
  bindAccountSelfService();
  loadMemberSessions();
}

async function renderMemberCatalog() {
  const container = document.getElementById("account-dynamic-content");
  if (!container) return;
  container.innerHTML = '<div class="account-empty">Загружаю каталог…</div>';
  try {
    const payload = await accountFetch("/member/catalog/items");
    const items = payload.items || [];
    if (!items.length) {
      container.innerHTML = `
        <div class="account-empty">
          <strong>В каталоге пока нет открытых позиций</strong>
          <span>Когда для этого аккаунта появятся доступные страницы, они отобразятся здесь.</span>
          <div class="account-actions">
            <a class="btn btn-secondary" href="${memberPath("hubPath")}">Вернуться в кабинет</a>
          </div>
        </div>
      `;
      return;
    }
    container.innerHTML = `<div class="account-grid-3">${items.map(renderCatalogCard).join("")}</div>`;
  } catch (error) {
    container.innerHTML = `
      <div class="account-empty">
        <strong>Не удалось открыть каталог</strong>
        <span>${escapeHtml(cleanupError(error.message))}</span>
        <div class="account-actions">
          <a class="btn btn-secondary" href="${memberPath("hubPath")}">Вернуться в кабинет</a>
        </div>
      </div>
    `;
  }
}

async function renderSpecialPages() {
  const container = document.getElementById("account-dynamic-content");
  if (!container) return;
  container.innerHTML = '<div class="account-empty">Загружаю спецстраницы…</div>';
  try {
    const payload = await accountFetch("/member/special-pages");
    const items = payload.items || [];
    if (!items.length) {
      container.innerHTML = `
        <div class="account-empty">
          <strong>Закрытые материалы пока не добавлены</strong>
          <span>Когда для этого аккаунта появятся материалы или дополнительные маршруты, они отобразятся здесь.</span>
          <div class="account-actions">
            <a class="btn btn-secondary" href="${memberPath("hubPath")}">Вернуться в кабинет</a>
          </div>
        </div>
      `;
      return;
    }
    container.innerHTML = `<div class="account-grid">${items.map(renderSpecialCard).join("")}</div>`;
  } catch (error) {
    container.innerHTML = `
      <div class="account-empty">
        <strong>Не удалось открыть материалы</strong>
        <span>${escapeHtml(cleanupError(error.message))}</span>
        <div class="account-actions">
          <a class="btn btn-secondary" href="${memberPath("hubPath")}">Вернуться в кабинет</a>
        </div>
      </div>
    `;
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
        <span>${escapeHtml(item.kind || "страница")}</span>
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
        <a class="btn btn-secondary" href="${escapeAttribute(item.path)}">Открыть материал</a>
      </div>
    </article>
  `;
}

function bindLogout() {
  document.querySelectorAll("[data-account-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await accountFetch("/auth/logout", { method: "POST" }, { allowUnauthorizedRedirect: false });
      } catch (error) {
        // ignore
      }
      window.location.href = isMembersEnabled() ? memberPath("loginPath") : "/";
    });
  });
}

function bindAccountSelfService() {
  const changeButton = document.getElementById("account-change-password");
  const logoutOthersButton = document.getElementById("account-logout-others");
  if (changeButton) {
    changeButton.addEventListener("click", changeMemberPassword);
  }
  if (logoutOthersButton) {
    logoutOthersButton.addEventListener("click", logoutOtherMemberSessions);
  }
}

async function loadMemberSessions() {
  const container = document.getElementById("account-session-list");
  if (!container || !currentSessionUser) return;
  container.innerHTML = '<div class="account-empty">Сессии загружаются…</div>';
  try {
    const payload = await accountFetch("/auth/sessions");
    memberSessions = payload.items || [];
    if (!memberSessions.length) {
      container.innerHTML = '<div class="account-empty">Активных сессий не найдено.</div>';
      return;
    }
    container.innerHTML = memberSessions.map((item) => `
      <div class="account-session-item">
        <strong>${item.current ? "Текущая сессия" : "Активная сессия"}</strong>
        <div class="account-session-meta">
          <span>${escapeHtml(item.user_role || "member")}</span>
          <span>Создана: ${escapeHtml(formatDateTime(item.created_at))}</span>
          <span>Истекает: ${escapeHtml(formatDateTime(item.expires_at))}</span>
        </div>
      </div>
    `).join("");
  } catch (error) {
    container.innerHTML = `<div class="account-empty">Не удалось загрузить сессии: ${escapeHtml(cleanupError(error.message))}</div>`;
  }
}

async function changeMemberPassword() {
  const status = document.getElementById("account-self-service-status");
  const currentPassword = document.getElementById("account-current-password")?.value || "";
  const newPassword = document.getElementById("account-new-password")?.value || "";
  if (!currentPassword || !newPassword) {
    if (status) {
      status.className = "account-status is-error";
      status.textContent = "Введите текущий и новый пароль.";
    }
    return;
  }
  if (newPassword.length < 10 || !/[A-Za-zА-Яа-я]/.test(newPassword) || !/\d/.test(newPassword)) {
    if (status) {
      status.className = "account-status is-error";
      status.textContent = "Новый пароль должен быть не короче 10 символов и содержать букву и цифру.";
    }
    return;
  }
  if (status) {
    status.className = "account-status";
    status.textContent = "Обновляю пароль...";
  }
  try {
    await accountFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    const currentField = document.getElementById("account-current-password");
    const newField = document.getElementById("account-new-password");
    if (currentField) currentField.value = "";
    if (newField) newField.value = "";
    if (status) {
      status.className = "account-status is-success";
      status.textContent = "Пароль обновлён. Другие сессии закрыты.";
    }
    loadMemberSessions();
  } catch (error) {
    if (status) {
      status.className = "account-status is-error";
      status.textContent = `Не удалось сменить пароль: ${cleanupError(error.message)}`;
    }
  }
}

async function logoutOtherMemberSessions() {
  const status = document.getElementById("account-self-service-status");
  if (status) {
    status.className = "account-status";
    status.textContent = "Закрываю другие сессии...";
  }
  try {
    const payload = await accountFetch("/auth/logout-others", {
      method: "POST",
    });
    if (status) {
      status.className = "account-status is-success";
      status.textContent = `Другие сессии закрыты: ${payload.revoked || 0}.`;
    }
    loadMemberSessions();
  } catch (error) {
    if (status) {
      status.className = "account-status is-error";
      status.textContent = `Не удалось закрыть другие сессии: ${cleanupError(error.message)}`;
    }
  }
}

function redirectToLogin(reason = "") {
  if (!isMembersEnabled()) {
    window.location.href = "/";
    return;
  }
  window.location.href = withNextAndReason(memberPath("loginPath"), reason);
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
  if (title) title.textContent = "Доступ по аккаунту сейчас отключён";
  if (lead) lead.textContent = "Этот раздел временно отключён. Основной сайт и публичные страницы остаются доступны.";
  const status = document.getElementById("account-login-status");
  if (status) status.textContent = "Кабинет пользователя сейчас отключён.";
  document.querySelectorAll(".account-input, #account-login-form button[type='submit']").forEach((el) => {
    el.setAttribute("disabled", "disabled");
  });
  const container = document.getElementById("account-dynamic-content");
  if (container) {
    container.innerHTML = `
      <div class="account-empty">
        Кабинет пользователя временно недоступен. Вернитесь на основной сайт или включите доступ позже.
        <div class="account-actions">
          <a class="btn btn-secondary" href="/">Вернуться на сайт</a>
        </div>
      </div>
    `;
  }
}

function renderScopeDenied(scope) {
  const container = document.getElementById("account-dynamic-content");
  if (!container) return;
  const isCatalog = scope === "catalog";
  container.innerHTML = `
    <div class="account-empty">
      ${isCatalog
        ? "Для этого аккаунта каталог пока не открыт."
        : "Для этого аккаунта закрытые материалы пока не открыты."
      }
      <span>Если это не ошибка, доступ можно выдать позже через админку.</span>
      <div class="account-actions">
        <a class="btn btn-secondary" href="${memberPath("hubPath")}">Вернуться в кабинет</a>
      </div>
    </div>
  `;
}

function cleanupError(message) {
  return String(message || "").replace(/^Error:\s*/u, "");
}

function renderLoginReasonNotice() {
  const status = document.getElementById("account-login-status");
  if (!status) return;
  const reason = new URLSearchParams(window.location.search).get("reason") || "";
  if (reason === "session-expired") {
    status.className = "account-status is-error";
    status.textContent = "Сессия истекла или была закрыта. Войдите снова.";
  }
}

async function accountFetch(path, options = {}, extra = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  headers.set("X-KP-Requested-With", "klubnikaproject");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiBase()}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401 && extra.allowUnauthorizedRedirect !== false && currentAccountView !== "login") {
      currentSessionUser = null;
      memberAccessPolicy = null;
      memberSessions = [];
      redirectToLogin("session-expired");
    }
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json();
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
