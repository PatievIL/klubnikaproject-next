import { DEFAULT_CATALOG_ITEMS } from "./catalog-defaults.generated.js";

const STORAGE_KEY = "klubnikaproject.site.admin.draft.v1";

const DEFAULT_CONFIG = {
  site: {
    projectName: "Klubnika Project",
    publicUrl: "https://patievil.github.io/klubnikaproject-next/",
    primaryDomain: "https://klubnikaproject.ru/",
    supportTelegram: "@patiev_admin",
    supportTelegramUrl: "https://t.me/patiev_admin",
    supportEmail: "info@klubnikaproject.ru",
    supportWhatsapp: "https://wa.me/79891250150",
    defaultLanguage: "ru",
    defaultTheme: "light",
    activeLogoSystem: "manual-primary",
  },
  members: {
    enabled: true,
    loginPath: "/cabinet/login/",
    hubPath: "/cabinet/",
    catalogPath: "/account/catalog/",
    specialPath: "/account/special/",
  },
  forms: {
    mode: "backend_submit",
    primaryChannel: "crm",
    handoffPrefix: "Новая заявка с сайта Klubnika Project",
    successHint: "Сообщение подготовлено. Если нужен быстрый контакт, его можно сразу продублировать в Telegram.",
    openTelegramAfterCopy: false,
    collectEmail: true,
    collectPhone: true,
    collectTelegram: true,
    collectStage: true,
  },
  seo: {
    titleSuffix: "— Klubnika Project",
    defaultDescription: "Расчёт, каталог, подбор и сопровождение для клубничной фермы без лишней суеты.",
    canonicalOrigin: "https://klubnikaproject.ru",
    indexPublicPages: true,
    indexAdminPages: false,
    includeSitemap: true,
  },
  crm: {
    enabled: false,
    inboxMode: "manual",
    owner: "Илья",
    futureWebhook: "",
    leadSources: [
      "Главная форма",
      "Калькулятор",
      "Каталог",
      "Консультации",
      "Курс",
      "Telegram"
    ],
    pipeline: [
      "Новый лид",
      "Квалификация",
      "Нужен расчёт",
      "Нужна консультация",
      "Смета отправлена",
      "Сделка в работе",
      "Закрыто"
    ],
    requiredFields: [
      "Имя",
      "Контакт",
      "Сценарий",
      "Стадия проекта",
      "Что нужно",
      "Источник"
    ],
    note: "Следующий этап: единый список заявок, история касаний, ответственные и спокойная передача в CRM.",
  },
  pages: [
    { id: "home", label: "Главная", goal: "Маршрутизатор", primaryCta: "Рассчитать ферму", secondaryCta: "Перейти в каталог", status: "published" },
    { id: "shop", label: "Каталог", goal: "Выбор категории и товара", primaryCta: "Подобрать комплект", secondaryCta: "Смотреть категории", status: "published" },
    { id: "farm", label: "Расчёт фермы", goal: "Собрать вводные и рамку сметы", primaryCta: "Передать вводные", secondaryCta: "Открыть калькулятор", status: "published" },
    { id: "study", label: "Сопровождение", goal: "Длинная работа по действующей ферме", primaryCta: "Оставить задачу", secondaryCta: "Посмотреть форматы", status: "published" },
    { id: "consultations", label: "Консультации", goal: "Точечный разбор", primaryCta: "Разобрать задачу", secondaryCta: "Сравнить с сопровождением", status: "published" },
    { id: "calc", label: "Калькулятор", goal: "Быстрый ориентир", primaryCta: "Начать расчёт", secondaryCta: "Понять, что получу", status: "published" },
  ],
  integrations: {
    calculatorPricingAdmin: "/calc/admin/",
    siteAdmin: "/admin/",
    catalogSource: "generated-static-build",
    futureCms: "Редактор контента",
    futureCrm: "Рабочий кабинет заявок",
    apiBase: "https://api.klubnikaproject.ru/site/v1",
    note: "Этот слой можно связать с внешней системой без пересборки сценариев и страниц.",
  },
};

const SECTIONS = [
  { id: "dashboard", label: "Обзор" },
  { id: "site", label: "Сайт" },
  { id: "pages", label: "Страницы" },
  { id: "forms", label: "Формы" },
  { id: "crm", label: "CRM" },
  { id: "users", label: "Доступ" },
  { id: "audit", label: "История" },
  { id: "catalog", label: "Каталог" },
  { id: "inventory", label: "Товары" },
  { id: "seo", label: "SEO" },
  { id: "integrations", label: "Интеграции" },
];

const els = {
  tabs: document.getElementById("admin-tabs"),
  section: document.getElementById("admin-section-content"),
  summary: document.getElementById("admin-summary-grid"),
  status: document.getElementById("admin-status"),
  loginIdentity: document.getElementById("admin-login-identity"),
  loginPassword: document.getElementById("admin-login-password"),
  jsonOutput: document.getElementById("admin-json-output"),
  downloadButton: document.getElementById("download-admin-json"),
  copyButton: document.getElementById("copy-admin-json"),
  importInput: document.getElementById("import-admin-json"),
  resetButton: document.getElementById("reset-admin-button"),
  pullBackendButton: document.getElementById("pull-backend-config"),
  pushBackendButton: document.getElementById("push-backend-config"),
  passwordLoginButton: document.getElementById("admin-password-login-button"),
  sessionButton: document.getElementById("admin-session-button"),
  logoutButton: document.getElementById("admin-logout-button"),
  sessionState: document.getElementById("admin-session-state"),
};

let draft = clone(DEFAULT_CONFIG);
let currentSection = "dashboard";
let catalogDraft = clone(DEFAULT_CATALOG_ITEMS);
let catalogSnapshotDraft = null;
let usersDraft = [];
let auditDraft = [];
let backendUser = null;
let backendAccessPolicy = null;
const auditWorkspace = {
  query: "",
  area: "",
  actor: "",
};
const inventoryWorkspace = {
  query: "",
  category: "",
  stockStatus: "",
  editorSlug: "",
  editorDraft: null,
  editorLoadingSlug: "",
  editorSaving: false,
  editorWarnings: [],
  editorErrors: [],
};

const INVENTORY_BADGE_OPTIONS = [
  { value: "recommended", label: "Советуем" },
  { value: "hit", label: "Хит" },
  { value: "new", label: "Новинка" },
  { value: "sale", label: "Акция" },
];
const crmWorkspace = {
  available: false,
  view: "kanban",
  activePreset: "all",
  currentUserId: null,
  pipelines: [],
  users: [],
  sources: [],
  leads: [],
  selectedLeadId: null,
  selectedLead: null,
  filters: {
    status_filter: "",
    owner_id: 0,
    source_filter: "",
    tag: "",
    follow_up_state: "",
    search: "",
  },
};

init();

function init() {
  hydrateDraft();
  normalizeDraft();
  hydrateSectionFromHash();
  renderTabs();
  renderCurrentSection();
  renderSummary();
  bindGlobalEvents();
  persistDraft();
  checkBackendSession();
}

function hydrateDraft() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    draft = deepMerge(clone(DEFAULT_CONFIG), parsed);
  } catch (error) {
    draft = clone(DEFAULT_CONFIG);
  }
}

function normalizeDraft() {
  draft.integrations = draft.integrations || {};
  draft.integrations.apiBase = getApiBase();
}

function bindGlobalEvents() {
  els.downloadButton.addEventListener("click", downloadJson);
  els.copyButton.addEventListener("click", copyJson);
  els.importInput.addEventListener("change", importJson);
  els.resetButton.addEventListener("click", resetDraft);
  els.pullBackendButton.addEventListener("click", pullBackendDraft);
  els.pushBackendButton.addEventListener("click", pushBackendDraft);
  els.passwordLoginButton.addEventListener("click", loginToBackendWithPassword);
  els.sessionButton.addEventListener("click", checkBackendSession);
  els.logoutButton.addEventListener("click", logoutFromBackend);
  window.addEventListener("hashchange", handleSectionHashChange);
}

function renderTabs() {
  if (!backendUser) {
    els.tabs.innerHTML = "";
    return;
  }
  const visibleSections = getVisibleSections();
  if (!visibleSections.some((section) => section.id === currentSection)) {
    currentSection = visibleSections[0]?.id || "dashboard";
  }
  els.tabs.innerHTML = visibleSections.map((section) => `
    <button
      class="admin-tab"
      type="button"
      role="tab"
      data-section="${section.id}"
      aria-selected="${section.id === currentSection ? "true" : "false"}"
    >${section.label}</button>
  `).join("");

  els.tabs.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      currentSection = button.dataset.section;
      renderTabs();
      renderCurrentSection();
      syncSectionHash();
    });
  });

  syncSectionHash();
}

function getVisibleSections() {
  return SECTIONS.filter((section) => canAccessSection(section.id));
}

function canAccessSection(sectionId) {
  const policySections = backendAccessPolicy?.sections;
  if (Array.isArray(policySections)) {
    return policySections.includes(sectionId);
  }

  const role = backendUser?.user_role || backendUser?.role || "";
  const scopes = new Set(backendUser?.scopes || []);

  if (!backendUser) {
    return !["crm", "users", "audit"].includes(sectionId);
  }

  if (["owner", "admin"].includes(role)) return true;
  if (role === "editor") {
    return ["dashboard", "site", "pages", "forms", "catalog", "inventory", "seo", "integrations"].includes(sectionId);
  }
  if (role === "manager") {
    return ["dashboard", "crm"].includes(sectionId) || (["catalog", "inventory"].includes(sectionId) && scopes.has("catalog"));
  }
  if (sectionId === "crm") return scopes.has("crm");
  if (["catalog", "inventory"].includes(sectionId)) return scopes.has("catalog");
  return sectionId === "dashboard";
}

function renderCurrentSection() {
  if (!backendUser) {
    els.section.innerHTML = renderAccessGateSection();
    return;
  }
  const html = currentSection === "dashboard" ? renderDashboardSection()
    : currentSection === "site" ? renderSiteSection()
    : currentSection === "pages" ? renderPagesSection()
    : currentSection === "forms" ? renderFormsSection()
    : currentSection === "crm" ? renderCrmSection()
    : currentSection === "users" ? renderUsersSection()
    : currentSection === "audit" ? renderAuditSection()
    : currentSection === "catalog" ? renderCatalogSection()
    : currentSection === "inventory" ? renderInventorySection()
    : currentSection === "seo" ? renderSeoSection()
    : renderIntegrationsSection();

  els.section.innerHTML = html;
  bindSectionFields();
  if (currentSection === "crm") {
    initCrmWorkspace();
  }
  if (currentSection === "users") {
    bindUsersSection();
  }
  if (currentSection === "audit") {
    bindAuditSection();
  }
  if (currentSection === "catalog") {
    bindCatalogSection();
  }
  if (currentSection === "inventory") {
    bindInventorySection();
  }
}

function hydrateSectionFromHash() {
  const sectionFromHash = readSectionFromHash();
  if (sectionFromHash && SECTIONS.some((section) => section.id === sectionFromHash)) {
    currentSection = sectionFromHash;
  }
}

function readSectionFromHash() {
  const match = window.location.hash.match(/^#admin:([a-z0-9_-]+)$/i);
  return match?.[1] || "";
}

function syncSectionHash() {
  if (!backendUser) return;
  const nextHash = `#admin:${currentSection}`;
  if (window.location.hash === nextHash) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
}

function handleSectionHashChange() {
  const sectionFromHash = readSectionFromHash();
  if (!sectionFromHash || sectionFromHash === currentSection) return;
  if (!SECTIONS.some((section) => section.id === sectionFromHash)) return;
  currentSection = sectionFromHash;
  renderTabs();
  renderCurrentSection();
}

function renderAccessGateSection() {
  return `
    <div class="admin-section-stack admin-locked-state">
      <div class="admin-section-intro">
        <div class="tag">Доступ</div>
        <h3 class="calc-card-title">Войдите, чтобы открыть кабинет</h3>
        <p class="sublead">После входа откроются только те разделы, которые доступны по вашей роли.</p>
      </div>

      <div class="admin-block admin-locked-card">
        <div class="admin-block-head">
          <div>
            <strong>Что внутри</strong>
            <span>Сайт, каталог, заявки, доступы и рабочие настройки собраны в одном кабинете.</span>
          </div>
        </div>
        <div class="admin-pills">
          <span class="admin-pill">Сайт</span>
          <span class="admin-pill">Каталог</span>
          <span class="admin-pill">Товары</span>
          <span class="admin-pill">CRM</span>
          <span class="admin-pill">Доступ</span>
          <span class="admin-pill">История</span>
        </div>
      </div>
    </div>
  `;
}

function renderDashboardSection() {
  const publishedPages = draft.pages.filter((page) => page.status === "published").length;
  const crmStages = draft.crm.pipeline.length;
  const leadSources = draft.crm.leadSources.length;
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Обзор</div>
        <h3 class="calc-card-title">Сайт, формы и заявки в одном кабинете</h3>
        <p class="sublead">Здесь видно, какие страницы активны, куда приходят заявки и какие настройки сейчас держат проект в рабочем состоянии.</p>
      </div>

      <div class="admin-mini-metrics">
        <div class="admin-mini-metric"><span>Публичных страниц в модели</span><strong>${publishedPages}</strong></div>
        <div class="admin-mini-metric"><span>Источников лидов</span><strong>${leadSources}</strong></div>
        <div class="admin-mini-metric"><span>Стадий воронки</span><strong>${crmStages}</strong></div>
      </div>

      <div class="admin-block">
        <div class="admin-block-head">
          <div>
            <strong>Что уже можно использовать</strong>
            <span>Настройки сайта, формы, Telegram, SEO и структура страниц уже собраны в рабочий черновик.</span>
          </div>
        </div>
        <div class="admin-pills">
          <span class="admin-pill">Сайт</span>
          <span class="admin-pill">Формы</span>
          <span class="admin-pill">SEO</span>
          <span class="admin-pill">CRM-ready</span>
          <span class="admin-pill">JSON export</span>
        </div>
        <div class="admin-code-card">
<pre>${escapeHtml(JSON.stringify(buildLeadExample(), null, 2))}</pre>
        </div>
      </div>
    </div>
  `;
}

function getCrmWorkspaceDashboardStats() {
  const leads = getVisibleCrmLeads();
  const currentUser = findCurrentCrmUser();
  const newStatusCode = getCrmNewStatusCode();
  const activeLeads = leads.filter((lead) => !lead.is_archived && lead.follow_up_state !== "archived");
  const overdueLeads = activeLeads.filter((lead) => lead.follow_up_state === "overdue");
  const unassignedLeads = activeLeads.filter((lead) => !Number(lead.owner_id || 0));
  const newLeads = activeLeads.filter((lead) => lead.status_code === newStatusCode);
  const myLeads = currentUser
    ? activeLeads.filter((lead) => Number(lead.owner_id || 0) === Number(currentUser.id))
    : [];
  const syncIssues = activeLeads.filter((lead) => {
    const syncStatus = lead?.sync?.sync_status;
    return syncStatus === "failed" || syncStatus === "failed_permanent";
  });

  return {
    roleLabel: backendAccessPolicy?.role || backendUser?.user_role || backendUser?.role || "гость",
    entryState: getCrmApiBaseConfigured() ? (crmWorkspace.available ? "подключено" : "ожидание данных") : "нужен API base",
    routeLabel: "/cabinet/crm",
    total: activeLeads.length,
    newLeads: newLeads.length,
    overdueLeads: overdueLeads.length,
    unassignedLeads: unassignedLeads.length,
    myLeads: myLeads.length,
    syncIssues: syncIssues.length,
  };
}

function renderCrmMetricCard(label, value, caption = "") {
  return `
    <div class="admin-mini-metric admin-crm-mini-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      ${caption ? `<em>${escapeHtml(caption)}</em>` : ""}
    </div>
  `;
}

function renderSiteSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Сайт</div>
        <h3 class="calc-card-title">Базовые настройки проекта и контактов</h3>
        <p class="sublead">Здесь собраны базовые настройки, которые потом расходятся по шапке, подвалу, формам и контактным блокам на всём сайте.</p>
      </div>
      <div class="admin-grid">
        ${inputField("site.projectName", "Название проекта", draft.site.projectName, "Что показывается в админке и общем описании")}
        ${inputField("site.publicUrl", "Публичный URL", draft.site.publicUrl, "Текущий опубликованный адрес")}
        ${inputField("site.primaryDomain", "Основной домен", draft.site.primaryDomain, "Нужен для каноникалов и общей адресации проекта")}
        ${inputField("site.activeLogoSystem", "Система логотипа", draft.site.activeLogoSystem, "Какой логотип и lockup считаются рабочими сейчас")}
        ${inputField("site.supportTelegram", "Telegram", draft.site.supportTelegram, "Основной быстрый канал связи")}
        ${inputField("site.supportTelegramUrl", "Telegram URL", draft.site.supportTelegramUrl, "Сюда ведут формы и CTA")}
        ${inputField("site.supportEmail", "Email", draft.site.supportEmail, "Вторичный контакт")}
        ${inputField("site.supportWhatsapp", "WhatsApp", draft.site.supportWhatsapp, "Заполнить позже, если нужен")}
      </div>
      <div class="admin-grid">
        ${selectField("site.defaultLanguage", "Язык по умолчанию", draft.site.defaultLanguage, [["ru","Русский"],["en","English"]], "С какого языка открывается сайт")}
        ${selectField("site.defaultTheme", "Тема по умолчанию", draft.site.defaultTheme, [["light","Светлая"],["dark","Тёмная"]], "Какая тема включается первой")}
      </div>
      <div class="admin-block">
        <div class="admin-block-head">
          <div>
            <strong>Кабинет пользователя</strong>
            <span>Закрытый слой для каталога, спецстраниц и будущих клиентских маршрутов.</span>
          </div>
        </div>
        <div class="admin-grid">
          ${checkboxField("members.enabled", "Кабинет пользователя включён", draft.members.enabled)}
          ${inputField("members.loginPath", "Login path", draft.members.loginPath, "Страница входа пользователя")}
          ${inputField("members.hubPath", "Hub path", draft.members.hubPath, "Главная страница кабинета")}
          ${inputField("members.catalogPath", "Catalog path", draft.members.catalogPath, "Закрытый каталог")}
          ${inputField("members.specialPath", "Special path", draft.members.specialPath, "Спецстраницы и private routes")}
        </div>
      </div>
    </div>
  `;
}

function renderPagesSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Страницы</div>
        <h3 class="calc-card-title">Маршруты сайта, их роли и CTA</h3>
        <p class="sublead">Это не редактор контента по блокам. Это карта публичных маршрутов: какая страница за что отвечает и какой первый шаг должна давать.</p>
      </div>
      ${draft.pages.map((page, index) => `
        <div class="admin-block">
          <div class="admin-block-head">
            <div>
              <strong>${page.label}</strong>
              <span>${page.goal}</span>
            </div>
            <span class="admin-pill">${page.status}</span>
          </div>
          <div class="admin-grid">
            ${inputField(`pages.${index}.goal`, "Роль страницы", page.goal, "Коммерческая роль маршрута")}
            ${selectField(`pages.${index}.status`, "Статус", page.status, [["published","published"],["draft","draft"],["hidden","hidden"]], "Уровень готовности маршрута")}
            ${inputField(`pages.${index}.primaryCta`, "Primary CTA", page.primaryCta, "Первое действие на странице")}
            ${inputField(`pages.${index}.secondaryCta`, "Secondary CTA", page.secondaryCta, "Второй допустимый шаг")}
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFormsSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Формы</div>
        <h3 class="calc-card-title">Как сайт сейчас собирает и передаёт заявки</h3>
        <p class="sublead">Здесь настраивается, как сайт собирает заявку, что показывает после действия и в какой канал уходит следующий шаг.</p>
      </div>
      <div class="admin-grid">
        ${selectField("forms.mode", "Текущий режим", draft.forms.mode, [["telegram_handoff","telegram_handoff"],["copy_only","copy_only"],["backend_submit","backend_submit"]], "Как сейчас работает отправка формы")}
        ${selectField("forms.primaryChannel", "Основной канал", draft.forms.primaryChannel, [["telegram","telegram"],["email","email"],["crm","crm"]], "Куда заявка уходит в первую очередь")}
        ${inputField("forms.handoffPrefix", "Заголовок сообщения", draft.forms.handoffPrefix, "Первая строка, с которой собирается заявка")}
        ${inputField("forms.successHint", "Текст после действия", draft.forms.successHint, "Что видит пользователь после отправки или копирования")}
      </div>
      <div class="admin-grid admin-grid-3">
        ${checkboxField("forms.openTelegramAfterCopy", "Открывать Telegram после копирования", draft.forms.openTelegramAfterCopy)}
        ${checkboxField("forms.collectEmail", "Собирать email", draft.forms.collectEmail)}
        ${checkboxField("forms.collectPhone", "Собирать телефон", draft.forms.collectPhone)}
        ${checkboxField("forms.collectTelegram", "Собирать Telegram", draft.forms.collectTelegram)}
        ${checkboxField("forms.collectStage", "Собирать стадию проекта", draft.forms.collectStage)}
      </div>
    </div>
  `;
}

function renderCrmSection() {
  const crmStats = getCrmWorkspaceDashboardStats();
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Cabinet CRM</div>
        <h3 class="calc-card-title">Минимальный рабочий срез кабинета для CRM</h3>
        <p class="sublead">Это не отдельная админка, а CRM-слой внутри универсального кабинета. Здесь сначала видно очередь, затем открывается карточка лида и уже после этого фиксируется следующий шаг.</p>
      </div>
      <div class="admin-crm-dashboard">
        <div class="admin-crm-dashboard-copy">
          <div class="admin-crm-entry-chip-row">
            <span class="admin-pill">Доступ: ${escapeHtml(crmStats.roleLabel)}</span>
            <span class="admin-pill">Маршрут: ${escapeHtml(crmStats.routeLabel)}</span>
            <span class="admin-pill">Состояние: ${escapeHtml(crmStats.entryState)}</span>
          </div>
          <p class="admin-crm-dashboard-note">
            Минимальный доступный срез должен отвечать на четыре вопроса: сколько лидов в потоке, где срочная просрочка, что ещё не назначено и что уже в работе у меня.
          </p>
        </div>
        <div class="admin-crm-dashboard-metrics">
          ${renderCrmMetricCard("В потоке", crmStats.total, "Открытые лиды под текущими фильтрами")}
          ${renderCrmMetricCard("Новые", crmStats.newLeads, "Первичный вход без обработки")}
          ${renderCrmMetricCard("Просрочено", crmStats.overdueLeads, "Нужно вернуть в работу сейчас")}
          ${renderCrmMetricCard("Без owner", crmStats.unassignedLeads, "Требуют назначения")}
          ${renderCrmMetricCard("На мне", crmStats.myLeads, "Лиды текущего пользователя")}
          ${renderCrmMetricCard("Sync issues", crmStats.syncIssues, "Где нужен повторный прогон")}
        </div>
      </div>
      <div class="admin-block">
        <div class="admin-block-head">
          <div>
            <strong>Рабочий кабинет CRM</strong>
            <span>Если CRM уже подключена, здесь открывается рабочий экран очереди. Если нет, ниже остаётся запасной inbox.</span>
          </div>
          <div class="admin-toolbar-actions">
            <button class="btn btn-secondary" id="crm-workspace-refresh" type="button">Обновить</button>
            <button class="btn btn-secondary" id="crm-workspace-view-toggle" type="button">Переключить вид</button>
          </div>
        </div>
        <div class="admin-crm-presets" id="admin-crm-presets">
          <button class="btn btn-secondary admin-crm-preset" data-crm-preset="all" type="button">Все</button>
          <button class="btn btn-secondary admin-crm-preset" data-crm-preset="my" type="button">Мои</button>
          <button class="btn btn-secondary admin-crm-preset" data-crm-preset="new" type="button">Новые</button>
          <button class="btn btn-secondary admin-crm-preset" data-crm-preset="overdue" type="button">Просрочено</button>
          <button class="btn btn-secondary admin-crm-preset" data-crm-preset="unassigned" type="button">Без owner</button>
        </div>
        <div class="admin-crm-filters" id="admin-crm-filters">
          <label class="admin-field">
            <span class="admin-field-label">Поиск</span>
            <input class="admin-input" id="crm-filter-search" type="text" placeholder="Имя, телефон, email, brief" />
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Стадия</span>
            <select class="admin-select" id="crm-filter-status">
              <option value="">Все стадии</option>
            </select>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Ответственный</span>
            <select class="admin-select" id="crm-filter-owner">
              <option value="0">Все ответственные</option>
            </select>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Источник</span>
            <select class="admin-select" id="crm-filter-source">
              <option value="">Все источники</option>
            </select>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Тег</span>
            <input class="admin-input" id="crm-filter-tag" type="text" placeholder="например hot" />
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Следующий шаг</span>
            <select class="admin-select" id="crm-filter-follow-up">
              <option value="">Все</option>
              <option value="overdue">Просрочено</option>
              <option value="scheduled">Запланировано</option>
              <option value="none">Без следующего шага</option>
              <option value="archived">Архив</option>
            </select>
          </label>
        </div>
        <div class="admin-crm-layout">
          <div class="admin-crm-board" id="admin-crm-board">
            <div class="admin-lead-empty">CRM-экран пока не загружен.</div>
          </div>
          <aside class="admin-crm-detail" id="admin-crm-detail">
            <div class="admin-lead-empty">Выберите лид, чтобы открыть карточку.</div>
          </aside>
        </div>
        <div class="admin-lead-list" id="admin-lead-list" hidden>
          <div class="admin-lead-empty">Список заявок пока не загружен.</div>
        </div>
      </div>
      <details class="admin-block admin-crm-settings-panel">
        <summary class="admin-crm-settings-summary">
          <div>
            <strong>Настройки CRM</strong>
            <span>Здесь лежит схема CRM и служебные параметры. Это вторичный блок, а не основной экран для ежедневной работы.</span>
          </div>
        </summary>
        <div class="admin-grid">
          ${checkboxField("crm.enabled", "CRM слой включён", draft.crm.enabled)}
          ${selectField("crm.inboxMode", "Режим inbox", draft.crm.inboxMode, [["manual","manual"],["shared-email","shared-email"],["webhook","webhook"]], "Как сейчас приходят новые заявки")}
          ${inputField("crm.owner", "Ответственный", draft.crm.owner, "Кто смотрит новые лиды первым")}
          ${inputField("crm.futureWebhook", "Будущий webhook", draft.crm.futureWebhook, "Сюда можно будет подвязать следующую интеграцию")}
        </div>
        <div class="admin-grid">
          ${textareaField("crm.leadSources", "Источники лидов", draft.crm.leadSources.join("\n"), "По одному на строку")}
          ${textareaField("crm.pipeline", "Стадии воронки", draft.crm.pipeline.join("\n"), "По одной стадии на строку")}
          ${textareaField("crm.requiredFields", "Обязательные поля", draft.crm.requiredFields.join("\n"), "Что должно попадать в лид")}
          ${textareaField("crm.note", "Комментарий по CRM", draft.crm.note, "Что ещё нужно для полноценного запуска")}
        </div>
        <div class="admin-code-card">
<pre>${escapeHtml(JSON.stringify(buildLeadExample(), null, 2))}</pre>
        </div>
      </details>
    </div>
  `;
}

function renderCatalogSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Каталог</div>
        <h3 class="calc-card-title">Структура каталога</h3>
        <p class="sublead">Здесь хранится рабочая структура каталога: разделы, ключевые входы и данные, из которых потом собираются страницы. Блок нужен для спокойной правки источника без ручного прохода по HTML.</p>
      </div>
      <div class="admin-toolbar-actions">
        <button class="btn btn-secondary" id="load-catalog-button" type="button">Загрузить текущую структуру</button>
        <button class="btn btn-primary" id="save-catalog-button" type="button">Сохранить структуру</button>
      </div>
      <label class="admin-field">
        <span class="admin-field-label">Структура каталога</span>
        <span class="admin-field-note">Пока это JSON-слой. Он нужен для редактирования источника данных, из которого собираются страницы каталога.</span>
        <textarea class="admin-json-output admin-catalog-output" id="admin-catalog-output" spellcheck="false">${escapeHtml(JSON.stringify(catalogDraft, null, 2))}</textarea>
      </label>
    </div>
  `;
}

function renderInventorySection() {
  const snapshot = catalogSnapshotDraft;
  const categories = Array.isArray(snapshot?.categories) ? snapshot.categories : [];
  const products = getInventoryProducts();
  const filteredProducts = filterInventoryProducts(products, categories);
  const stockCounts = summarizeInventoryStock(products);
  const priceRange = summarizeInventoryPrice(filteredProducts);
  const editorContent = renderInventoryProductEditor();
  const tableContent = !snapshot ? `
            <div class="admin-lead-empty">Срез каталога ещё не загружен. Нужен рабочий `apiBase` и активный вход в кабинет.</div>
          ` : filteredProducts.length ? `
            <table class="admin-inventory-table">
              <thead>
                <tr>
                  <th>Артикул</th>
                  <th>Товар</th>
                  <th>Категория</th>
                  <th>Цена</th>
                  <th>Наличие</th>
                  <th>Маршрут и действия</th>
                </tr>
              </thead>
              <tbody>
                ${filteredProducts.map((product) => renderInventoryRow(product, categories)).join("")}
              </tbody>
            </table>
          ` : `
            <div class="admin-lead-empty">По текущим фильтрам товаров нет.</div>
          `;

  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Товары</div>
        <h3 class="calc-card-title">Цены, остатки и товарная матрица</h3>
        <p class="sublead">Здесь видны цены, остатки и маршруты по товарам. Блок помогает быстро проверить карточки и поправить рабочие позиции без ручного обхода каталога.</p>
      </div>
      <div class="admin-block">
        <div class="admin-block-head">
          <div>
            <strong>Рабочий срез каталога</strong>
            <span>Здесь можно искать по названию, артикулу и маршруту, фильтровать по категории и быстро править карточки товаров.</span>
          </div>
          <div class="admin-toolbar-actions">
            <button class="btn btn-secondary" id="inventory-refresh-button" type="button">Обновить данные</button>
            <button class="btn btn-secondary" id="inventory-copy-button" type="button">Скопировать срез</button>
          </div>
        </div>
        <div class="admin-inventory-filters">
          <label class="admin-field">
            <span class="admin-field-label">Поиск</span>
            <input class="admin-input" id="inventory-query" type="text" value="${escapeAttribute(inventoryWorkspace.query)}" placeholder="Название, артикул, URL" />
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Категория</span>
            <select class="admin-select" id="inventory-category">
              <option value="">Все категории</option>
              ${buildInventoryCategoryOptions(categories)}
            </select>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Наличие</span>
            <select class="admin-select" id="inventory-stock-status">
              <option value="">Все статусы</option>
              ${buildInventoryStockOptions()}
            </select>
          </label>
        </div>
        <div class="admin-mini-metrics admin-inventory-metrics">
          <div class="admin-mini-metric"><span>Товаров в срезе</span><strong>${products.length}</strong></div>
          <div class="admin-mini-metric"><span>Показано сейчас</span><strong>${filteredProducts.length}</strong></div>
          <div class="admin-mini-metric"><span>В наличии</span><strong>${stockCounts.in_stock}</strong></div>
          <div class="admin-mini-metric"><span>Мало / под заказ</span><strong>${stockCounts.limited + stockCounts.preorder}</strong></div>
          <div class="admin-mini-metric"><span>Нет в наличии</span><strong>${stockCounts.out_of_stock}</strong></div>
          <div class="admin-mini-metric"><span>Диапазон цен</span><strong>${priceRange}</strong></div>
        </div>
        <div class="admin-code-card admin-inventory-note">
<pre>${escapeHtml(buildInventorySourceNote(snapshot))}</pre>
        </div>
        <div class="admin-inventory-table-shell">
          ${tableContent}
        </div>
      </div>
      <div class="admin-block admin-inventory-editor-shell">
        ${editorContent}
      </div>
    </div>
  `;
}

function renderUsersSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Доступ</div>
        <h3 class="calc-card-title">Пользователи и доступы</h3>
        <p class="sublead">Здесь управляются роли, закрытые разделы и резервный вход по ключу. Блок нужен, чтобы спокойно разделять доступ команды, клиентов и партнёров.</p>
      </div>
      <div class="admin-toolbar-actions">
        <button class="btn btn-secondary" id="load-users-button" type="button">Загрузить пользователей</button>
        <button class="btn btn-primary" id="create-user-button" type="button">Создать пользователя</button>
      </div>
      <div class="admin-lead-list" id="admin-users-list">
        <div class="admin-lead-empty">Пользователи пока не загружены.</div>
      </div>
    </div>
  `;
}

function renderAuditSection() {
  const filteredAudit = getFilteredAuditEvents();
  const areas = getAuditAreas();
  const actors = getAuditActors();
  const summary = getAuditSummary();
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">История</div>
        <h3 class="calc-card-title">История действий</h3>
        <p class="sublead">Следующий кабинетный блок после пользователей: кто что менял, в каком разделе и что стоит перепроверить без ручного поиска по всему интерфейсу.</p>
      </div>
      <div class="admin-mini-metrics admin-audit-metrics">
        <div class="admin-mini-metric"><span>Событий в журнале</span><strong>${summary.total}</strong></div>
        <div class="admin-mini-metric"><span>Разделов</span><strong>${summary.areas}</strong></div>
        <div class="admin-mini-metric"><span>Акторов</span><strong>${summary.actors}</strong></div>
        <div class="admin-mini-metric"><span>Последнее событие</span><strong>${escapeHtml(summary.latest)}</strong></div>
      </div>
      <div class="admin-block">
        <div class="admin-block-head">
          <div>
            <strong>Журнал кабинета</strong>
            <span>Фильтры помогают быстро отсечь шум и увидеть изменения по разделу, актору или поисковому запросу.</span>
          </div>
          <div class="admin-toolbar-actions">
            <button class="btn btn-secondary" id="load-audit-button" type="button">Загрузить историю</button>
            <button class="btn btn-secondary" id="audit-clear-filters" type="button">Сбросить фильтры</button>
          </div>
        </div>
        <div class="admin-grid admin-grid-3 admin-audit-filters">
          <label class="admin-field">
            <span class="admin-field-label">Поиск</span>
            <span class="admin-field-note">Раздел, действие, actor или target</span>
            <input class="admin-input" id="audit-filter-query" type="text" value="${escapeAttribute(auditWorkspace.query)}" placeholder="Поиск по журналу" />
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Раздел</span>
            <span class="admin-field-note">Фильтр по зоне изменений</span>
            <select class="admin-select" id="audit-filter-area">
              <option value="" ${auditWorkspace.area ? "" : "selected"}>Все разделы</option>
              ${areas.map((area) => `<option value="${escapeAttribute(area)}" ${auditWorkspace.area === area ? "selected" : ""}>${escapeHtml(area)}</option>`).join("")}
            </select>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Actor</span>
            <span class="admin-field-note">Фильтр по автору</span>
            <select class="admin-select" id="audit-filter-actor">
              <option value="" ${auditWorkspace.actor ? "" : "selected"}>Все actors</option>
              ${actors.map((actor) => `<option value="${escapeAttribute(actor)}" ${auditWorkspace.actor === actor ? "selected" : ""}>${escapeHtml(actor)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="admin-lead-list" id="admin-audit-list">
          ${filteredAudit.length ? filteredAudit.map((item) => `
            <article class="admin-lead-card">
              <div class="admin-lead-head">
                <strong>${escapeHtml(item.area)} / ${escapeHtml(item.action)}</strong>
                <span>${escapeHtml(item.created_at || "")}</span>
              </div>
              <div class="admin-lead-meta">
                <span>${escapeHtml(item.actor_name || "system")} · ${escapeHtml(item.actor_role || "")}</span>
                <span>${escapeHtml(item.target_type || "")} · ${escapeHtml(item.target_id || "")}</span>
              </div>
              <div class="admin-history-item">
                <strong>Payload</strong>
                <span>${escapeHtml(JSON.stringify(item.payload || {}))}</span>
              </div>
            </article>
          `).join("") : '<div class="admin-lead-empty">История пока не загружена или не проходит текущие фильтры.</div>'}
        </div>
      </div>
    </div>
  `;
}

function renderSeoSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">SEO</div>
        <h3 class="calc-card-title">SEO и индексация</h3>
        <p class="sublead">Здесь собраны базовые настройки поиска и индексации. Они должны совпадать с картой сайта, `robots.txt` и тем, что реально открыто пользователю.</p>
      </div>
      <div class="admin-grid">
        ${inputField("seo.titleSuffix", "Хвост title", draft.seo.titleSuffix, "Что по умолчанию добавляется к заголовкам")}
        ${inputField("seo.canonicalOrigin", "Основной адрес сайта", draft.seo.canonicalOrigin, "Адрес для канонических ссылок")}
        ${textareaField("seo.defaultDescription", "Базовое описание", draft.seo.defaultDescription, "Короткое описание проекта по умолчанию")}
      </div>
      <div class="admin-grid admin-grid-3">
        ${checkboxField("seo.indexPublicPages", "Индексировать публичные страницы", draft.seo.indexPublicPages)}
        ${checkboxField("seo.indexAdminPages", "Индексировать кабинет", draft.seo.indexAdminPages)}
        ${checkboxField("seo.includeSitemap", "Генерировать sitemap", draft.seo.includeSitemap)}
      </div>
    </div>
  `;
}

function renderIntegrationsSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Интеграции</div>
        <h3 class="calc-card-title">Связки и внешние точки</h3>
        <p class="sublead">Здесь собраны внутренние маршруты и точки подключения, чтобы калькулятор, каталог и кабинет держались в одной логике.</p>
      </div>
      <div class="admin-grid">
        ${inputField("integrations.calculatorPricingAdmin", "Маршрут админки калькулятора", draft.integrations.calculatorPricingAdmin, "Текущий внутренний маршрут")}
        ${inputField("integrations.siteAdmin", "Маршрут кабинета", draft.integrations.siteAdmin, "Текущий корень внутреннего кабинета")}
        ${inputField("integrations.catalogSource", "Источник каталога", draft.integrations.catalogSource, "Сейчас: static-html")}
        ${inputField("integrations.futureCms", "Контур контента", draft.integrations.futureCms, "Следующий шаг для управления контентом")}
        ${inputField("integrations.futureCrm", "Следующий CRM-контур", draft.integrations.futureCrm, "Как дальше будет называться рабочий слой по заявкам")}
        ${inputField("integrations.apiBase", "API-адрес", draft.integrations.apiBase, "Отсюда подтягиваются настройки и рабочие данные")}
      </div>
      <div class="admin-grid">
        ${textareaField("integrations.note", "Примечание", draft.integrations.note, "Коротко: как этот слой связан с внешней системой")}
      </div>
    </div>
  `;
}

function bindSectionFields() {
  els.section.querySelectorAll("[data-path]").forEach((field) => {
    const path = field.dataset.path;
    const type = field.dataset.type || field.type;
    const eventName = field.tagName === "TEXTAREA" || field.tagName === "SELECT" ? "input" : "input";
    field.addEventListener(eventName, () => updatePath(path, field, type));
    field.addEventListener("change", () => updatePath(path, field, type));
  });
}

function updatePath(path, field, type) {
  const keys = path.split(".");
  let target = draft;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = isIndex(keys[i]) ? Number(keys[i]) : keys[i];
    target = target[key];
  }
  const lastKey = isIndex(keys[keys.length - 1]) ? Number(keys[keys.length - 1]) : keys[keys.length - 1];

  if (type === "checkbox") {
    target[lastKey] = field.checked;
  } else if (field.tagName === "TEXTAREA" && /crm\.(leadSources|pipeline|requiredFields)$/.test(path)) {
    target[lastKey] = field.value.split("\n").map((item) => item.trim()).filter(Boolean);
  } else {
    target[lastKey] = field.value;
  }

  renderSummary();
  persistDraft();
}

function renderSummary() {
  updateWorkspaceVisibility();
  const crmStatus = draft.crm.enabled ? "включён" : "черновик";
  const publicPages = draft.pages.filter((page) => page.status === "published").length;
  const backendActive = Boolean(getApiBase());
  const roleLabel = backendAccessPolicy?.role || backendUser?.user_role || backendUser?.role || "гость";
  const visibleSections = Array.isArray(backendAccessPolicy?.sections)
    ? backendAccessPolicy.sections.length
    : getVisibleSections().length;
  const inventoryCount = getInventoryProducts().length;
  els.summary.innerHTML = [
    { label: "Публичных страниц", value: String(publicPages) },
    { label: "Режим форм", value: draft.forms.mode },
    { label: "CRM", value: crmStatus },
    { label: "Товаров в срезе", value: inventoryCount ? String(inventoryCount) : "не загружены" },
    { label: "Telegram", value: draft.site.supportTelegram || "не указан" },
    { label: "Источников лидов", value: String(draft.crm.leadSources.length) },
    { label: "Стадий воронки", value: String(draft.crm.pipeline.length) },
    { label: "API системы", value: backendActive ? "указан" : "не указан" },
    { label: "Роль в системе", value: String(roleLabel) },
    { label: "Видимых разделов", value: String(visibleSections) },
    { label: "Пользователей", value: usersDraft.length ? String(usersDraft.length) : "не загружены" },
    { label: "История", value: auditDraft.length ? String(auditDraft.length) : "не загружена" },
  ].map((item) => `
    <div class="summary-item">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");

  els.jsonOutput.value = JSON.stringify(draft, null, 2);
  els.status.textContent = isDefaultState()
    ? "Черновик совпадает с базовой конфигурацией."
    : "Есть несохранённые изменения. Их можно скачать JSON-файлом или передать в систему.";
}

function updateWorkspaceVisibility() {
  document.body.dataset.adminAuth = backendUser ? "authenticated" : "guest";
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "admin-config.json";
  link.click();
  URL.revokeObjectURL(url);
  els.status.textContent = "Файл admin-config.json подготовлен.";
}

async function copyJson() {
  try {
    await copyText(els.jsonOutput.value);
    els.status.textContent = "JSON скопирован в буфер.";
  } catch (error) {
    els.status.textContent = "Не удалось скопировать JSON.";
  }
}

async function importJson(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    draft = deepMerge(clone(DEFAULT_CONFIG), parsed);
    normalizeDraft();
    persistDraft();
    renderTabs();
    renderCurrentSection();
    renderSummary();
    els.status.textContent = "JSON импортирован в черновик.";
  } catch (error) {
    els.status.textContent = "Не удалось импортировать JSON. Проверьте структуру файла.";
  } finally {
    event.target.value = "";
  }
}

function resetDraft() {
  draft = clone(DEFAULT_CONFIG);
  normalizeDraft();
  persistDraft();
  renderTabs();
  renderCurrentSection();
  renderSummary();
  els.status.textContent = "Черновик сброшен к базовой конфигурации.";
}

function persistDraft() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function getApiBase() {
  const configured = String(draft.integrations?.apiBase || "").trim().replace(/\/+$/, "");
  const fallback = String(DEFAULT_CONFIG.integrations?.apiBase || "").trim().replace(/\/+$/, "");
  const resolved = configured || fallback;
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return "http://127.0.0.1:8010/v1";
  }
  return resolved;
}

async function adminFetch(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("Сначала укажите integrations.apiBase.");
  }
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBase}${path}`, { ...options, headers, credentials: "include" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Backend returned ${response.status}`);
  }
  return response.json();
}

async function pullBackendDraft() {
  try {
    els.status.textContent = "Загружаю настройки из системы...";
    const response = await adminFetch("/admin/settings");
    draft = deepMerge(clone(DEFAULT_CONFIG), response.settings || {});
    normalizeDraft();
    persistDraft();
    renderTabs();
    renderCurrentSection();
    renderSummary();
    els.status.textContent = "Черновик обновлён из системы.";
  } catch (error) {
    els.status.textContent = `Не удалось загрузить настройки из системы: ${error.message}`;
  }
}

async function pushBackendDraft() {
  try {
    els.status.textContent = "Сохраняю настройки в систему...";
    await adminFetch("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings: draft }),
    });
    els.status.textContent = "Настройки сохранены в системе.";
  } catch (error) {
    els.status.textContent = `Не удалось сохранить настройки в системе: ${error.message}`;
  }
}

function getCrmApiBaseConfigured() {
  return Boolean(getApiBase());
}

function bindCrmWorkspaceControls() {
  const refreshButton = document.getElementById("crm-workspace-refresh");
  const viewButton = document.getElementById("crm-workspace-view-toggle");
  const presetButtons = Array.from(document.querySelectorAll("[data-crm-preset]"));
  const searchField = document.getElementById("crm-filter-search");
  const statusField = document.getElementById("crm-filter-status");
  const ownerField = document.getElementById("crm-filter-owner");
  const sourceField = document.getElementById("crm-filter-source");
  const tagField = document.getElementById("crm-filter-tag");
  const followUpField = document.getElementById("crm-filter-follow-up");

  if (refreshButton) {
    refreshButton.onclick = () => loadCrmWorkspace(true);
  }
  if (viewButton) {
    viewButton.textContent = crmWorkspace.view === "kanban" ? "Показать список" : "Показать канбан";
    viewButton.onclick = () => {
      crmWorkspace.view = crmWorkspace.view === "kanban" ? "list" : "kanban";
      renderCrmWorkspace();
      bindCrmWorkspaceControls();
    };
  }
  presetButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.crmPreset === crmWorkspace.activePreset);
    button.onclick = async () => {
      await applyCrmFilterPreset(button.dataset.crmPreset || "all");
    };
  });

  const fields = [searchField, statusField, ownerField, sourceField, tagField, followUpField].filter(Boolean);
  fields.forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    const handler = () => {
      crmWorkspace.activePreset = "custom";
      crmWorkspace.filters = {
        status_filter: statusField?.value || "",
        owner_id: Number(ownerField?.value || 0),
        source_filter: sourceField?.value || "",
        tag: tagField?.value.trim() || "",
        follow_up_state: followUpField?.value || "",
        search: searchField?.value.trim() || "",
      };
      loadCrmWorkspace();
    };
    field[`on${eventName}`] = handler;
  });
}

function findCurrentCrmUser() {
  if (!crmWorkspace.users.length) return null;
  const cachedUser = crmWorkspace.users.find((user) => Number(user.id) === Number(crmWorkspace.currentUserId)) || null;
  if (cachedUser) return cachedUser;

  const normalizeIdentity = (value) => String(value || "").trim().toLowerCase();
  const backendIdentity = {
    slug: normalizeIdentity(backendUser?.slug),
    email: normalizeIdentity(backendUser?.email),
    user_name: normalizeIdentity(backendUser?.user_name),
    display_name: normalizeIdentity(backendUser?.display_name),
  };
  const crmUsers = crmWorkspace.users.map((user) => ({
    user,
    identity: {
      slug: normalizeIdentity(user.slug),
      email: normalizeIdentity(user.email),
      user_name: normalizeIdentity(user.user_name),
      display_name: normalizeIdentity(user.display_name),
    },
  }));
  const keys = ["slug", "email", "user_name", "display_name"];
  for (const key of keys) {
    const candidate = backendIdentity[key];
    if (!candidate) continue;
    const matches = crmUsers.filter((entry) => entry.identity[key] === candidate);
    if (matches.length === 1) {
      crmWorkspace.currentUserId = Number(matches[0].user.id) || null;
      return matches[0].user;
    }
  }
  if (crmWorkspace.users.length === 1) {
    crmWorkspace.currentUserId = Number(crmWorkspace.users[0].id) || null;
    return crmWorkspace.users[0];
  }
  crmWorkspace.currentUserId = null;
  return null;
}

async function ensureCrmUsersLoaded() {
  if (crmWorkspace.users.length) return crmWorkspace.users;
  const response = await adminFetch("/admin/crm/users");
  crmWorkspace.users = response.items || [];
  return crmWorkspace.users;
}

function getCrmNewStatusCode() {
  const statuses = crmWorkspace.pipelines[0]?.statuses || [];
  const direct = statuses.find((status) => ["new", "incoming", "fresh"].includes(status.code));
  return direct?.code || statuses[0]?.code || "";
}

async function applyCrmFilterPreset(preset) {
  let currentUser = null;
  if (preset === "my") {
    currentUser = findCurrentCrmUser();
    if (!currentUser) {
      await ensureCrmUsersLoaded();
      currentUser = findCurrentCrmUser();
    }
  }
  if (preset === "my" && !currentUser) {
    els.status.textContent = "Не удалось связать текущий вход с ответственным в CRM. Выберите ответственного вручную.";
    return;
  }
  crmWorkspace.activePreset = preset;
  if (preset === "all") {
    crmWorkspace.filters = {
      status_filter: "",
      owner_id: 0,
      source_filter: "",
      tag: "",
      follow_up_state: "",
      search: "",
    };
  } else if (preset === "my") {
    crmWorkspace.filters = {
      status_filter: "",
      owner_id: Number(currentUser?.id || 0),
      source_filter: "",
      tag: "",
      follow_up_state: "",
      search: "",
    };
  } else if (preset === "new") {
    crmWorkspace.filters = {
      status_filter: getCrmNewStatusCode(),
      owner_id: 0,
      source_filter: "",
      tag: "",
      follow_up_state: "",
      search: "",
    };
  } else if (preset === "overdue") {
    crmWorkspace.filters = {
      status_filter: "",
      owner_id: 0,
      source_filter: "",
      tag: "",
      follow_up_state: "overdue",
      search: "",
    };
  } else if (preset === "unassigned") {
    crmWorkspace.filters = {
      status_filter: "",
      owner_id: -1,
      source_filter: "",
      tag: "",
      follow_up_state: "",
      search: "",
    };
  }
  await loadCrmWorkspace();
}

function getVisibleCrmLeads() {
  return crmWorkspace.leads;
}

async function initCrmWorkspace() {
  bindCrmWorkspaceControls();
  await loadCrmWorkspace();
}

async function loadCrmWorkspace(forceReloadDetail = false) {
  const board = document.getElementById("admin-crm-board");
  const detail = document.getElementById("admin-crm-detail");
  const legacyList = document.getElementById("admin-lead-list");
  if (!board || !detail) return;

  if (!getCrmApiBaseConfigured()) {
    board.innerHTML = '<div class="admin-lead-empty">Чтобы увидеть CRM workspace, укажите integrations.apiBase.</div>';
    detail.innerHTML = '<div class="admin-lead-empty">Сначала настройте API base.</div>';
    if (legacyList) legacyList.hidden = false;
    await loadLegacyLeadInbox();
    return;
  }

  board.innerHTML = '<div class="admin-lead-empty">Загружаю CRM workspace…</div>';
  try {
    const [statusResponse, pipelinesResponse, usersResponse, leadsResponse] = await Promise.all([
      adminFetch("/admin/crm/status"),
      adminFetch("/admin/crm/pipelines"),
      adminFetch("/admin/crm/users"),
      adminFetch(`/admin/crm/leads?${new URLSearchParams({
        limit: "100",
        status_filter: crmWorkspace.filters.status_filter || "",
        owner_id: String(crmWorkspace.filters.owner_id || 0),
        source_filter: crmWorkspace.filters.source_filter || "",
        tag: crmWorkspace.filters.tag || "",
        follow_up_state: crmWorkspace.filters.follow_up_state || "",
        search: crmWorkspace.filters.search || "",
      })}`),
    ]);
    crmWorkspace.available = Boolean(statusResponse?.item);
    crmWorkspace.pipelines = pipelinesResponse.items || [];
    crmWorkspace.users = usersResponse.items || [];
    crmWorkspace.leads = leadsResponse.items || [];
    crmWorkspace.sources = leadsResponse.sources || [];
    const visibleLeads = getVisibleCrmLeads();
    if (!crmWorkspace.selectedLeadId && visibleLeads.length) {
      crmWorkspace.selectedLeadId = visibleLeads[0].id;
    }
    if (!visibleLeads.some((lead) => lead.id === crmWorkspace.selectedLeadId)) {
      crmWorkspace.selectedLeadId = visibleLeads[0]?.id || null;
    }
    renderCrmWorkspace();
    bindCrmWorkspaceControls();
    if (crmWorkspace.selectedLeadId && (forceReloadDetail || !crmWorkspace.selectedLead || crmWorkspace.selectedLead.item?.id !== crmWorkspace.selectedLeadId)) {
      await loadCrmLeadDetail(crmWorkspace.selectedLeadId);
    } else {
      renderCrmLeadDetail();
    }
    if (legacyList) legacyList.hidden = true;
  } catch (error) {
    board.innerHTML = `<div class="admin-lead-empty">CRM workspace недоступен: ${escapeHtml(error.message)}</div>`;
    detail.innerHTML = '<div class="admin-lead-empty">Переключаюсь на legacy inbox.</div>';
    if (legacyList) legacyList.hidden = false;
    await loadLegacyLeadInbox();
  }
}

function renderCrmWorkspace() {
  const board = document.getElementById("admin-crm-board");
  const statusField = document.getElementById("crm-filter-status");
  const ownerField = document.getElementById("crm-filter-owner");
  const sourceField = document.getElementById("crm-filter-source");
  if (!board) return;
  const visibleLeads = getVisibleCrmLeads();

  const statuses = crmWorkspace.pipelines[0]?.statuses || [];
  if (statusField) {
    statusField.innerHTML = `<option value="">Все стадии</option>${statuses.map((item) => `<option value="${escapeAttribute(item.code)}" ${crmWorkspace.filters.status_filter === item.code ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}`;
  }
  if (ownerField) {
    const unassignedOption = Number(crmWorkspace.filters.owner_id) < 0
      ? `<option value="-1" selected>Без owner</option>`
      : "";
    ownerField.innerHTML = `<option value="0" ${Number(crmWorkspace.filters.owner_id) === 0 ? "selected" : ""}>Все owner</option>${unassignedOption}${crmWorkspace.users.map((user) => `<option value="${user.id}" ${Number(crmWorkspace.filters.owner_id) === Number(user.id) ? "selected" : ""}>${escapeHtml(user.display_name)}</option>`).join("")}`;
  }
  if (sourceField) {
    sourceField.innerHTML = `<option value="">Все источники</option>${crmWorkspace.sources.map((source) => `<option value="${escapeAttribute(source)}" ${crmWorkspace.filters.source_filter === source ? "selected" : ""}>${escapeHtml(source)}</option>`).join("")}`;
  }
  const searchField = document.getElementById("crm-filter-search");
  const tagField = document.getElementById("crm-filter-tag");
  const followUpField = document.getElementById("crm-filter-follow-up");
  if (searchField) searchField.value = crmWorkspace.filters.search || "";
  if (tagField) tagField.value = crmWorkspace.filters.tag || "";
  if (followUpField) followUpField.value = crmWorkspace.filters.follow_up_state || "";

  if (!visibleLeads.length) {
    board.innerHTML = `<div class="admin-lead-empty">${crmWorkspace.activePreset === "unassigned" ? "Лидов без owner по текущим фильтрам нет." : "По текущим фильтрам лидов нет."}</div>`;
    return;
  }

  if (crmWorkspace.view === "list" || !statuses.length) {
    board.innerHTML = `<div class="admin-crm-list">${visibleLeads.map(renderCrmLeadCard).join("")}</div>`;
  } else {
    board.innerHTML = `<div class="admin-crm-kanban">${statuses.map((status) => {
      const items = visibleLeads.filter((lead) => lead.status_code === status.code);
      return `
        <section class="admin-crm-column">
          <div class="admin-crm-column-head">
            <strong>${escapeHtml(status.name)}</strong>
            <span>${items.length}</span>
          </div>
          <div class="admin-crm-column-body">
            ${items.length ? items.map(renderCrmLeadCard).join("") : '<div class="admin-lead-empty">Пусто</div>'}
          </div>
        </section>
      `;
    }).join("")}</div>`;
  }

  board.querySelectorAll("[data-crm-open]").forEach((card) => {
    card.addEventListener("click", () => {
      crmWorkspace.selectedLeadId = Number(card.dataset.crmOpen);
      loadCrmLeadDetail(crmWorkspace.selectedLeadId);
      renderCrmWorkspace();
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      crmWorkspace.selectedLeadId = Number(card.dataset.crmOpen);
      loadCrmLeadDetail(crmWorkspace.selectedLeadId);
      renderCrmWorkspace();
    });
  });
}

function renderCrmLeadCard(lead) {
  const selected = Number(crmWorkspace.selectedLeadId) === Number(lead.id);
  const nextStep = getCrmNextStepLabel(lead);
  return `
    <article class="admin-crm-card ${selected ? "is-selected" : ""}" data-crm-open="${lead.id}" tabindex="0" role="button" aria-label="Открыть лид ${escapeAttribute(lead.name || `#${lead.id}`)}">
      <div class="admin-crm-card-head">
        <div class="admin-crm-card-title">
          <strong>#${lead.id} · ${escapeHtml(lead.name || "Без имени")}</strong>
          <span>${escapeHtml(lead.request_type || lead.message || "Без краткого описания")}</span>
        </div>
        <div class="admin-crm-chip-row">
          ${renderCrmStageBadge(lead)}
          ${renderCrmFollowUpBadge(lead)}
          ${renderCrmSyncBadge(lead)}
        </div>
      </div>
      <div class="admin-crm-card-meta">
        <span>${escapeHtml(lead.owner_name || "Без owner")}</span>
        <span>${escapeHtml(lead.source || "Без источника")}</span>
      </div>
      <div class="admin-crm-next-step">
        <strong>Следующий шаг</strong>
        <span>${escapeHtml(nextStep)}</span>
      </div>
      <div class="admin-crm-chip-row">
        ${(lead.tags || []).slice(0, 4).map((tag) => `<span class="admin-crm-chip">${escapeHtml(tag)}</span>`).join("")}
      </div>
      <div class="admin-crm-card-meta">
        <span>${escapeHtml(lead.phone || lead.email || lead.telegram || "Нет контакта")}</span>
        <span>${escapeHtml(formatFollowUpLabel(lead.next_action_at, lead.follow_up_state))}</span>
      </div>
    </article>
  `;
}

async function loadCrmLeadDetail(leadId) {
  const detail = document.getElementById("admin-crm-detail");
  if (!detail) return;
  detail.innerHTML = '<div class="admin-lead-empty">Загружаю карточку лида…</div>';
  try {
    const [response, eventsResponse, commentsResponse] = await Promise.all([
      adminFetch(`/admin/crm/leads/${leadId}`),
      adminFetch(`/admin/crm/leads/${leadId}/events`),
      adminFetch(`/admin/crm/leads/${leadId}/comments`),
    ]);
    crmWorkspace.selectedLead = {
      ...response,
      events: eventsResponse.items || [],
      comments: commentsResponse.items || response.comments || [],
    };
    renderCrmLeadDetail();
  } catch (error) {
    detail.innerHTML = `<div class="admin-lead-empty">Не удалось загрузить карточку: ${escapeHtml(error.message)}</div>`;
  }
}

function renderCrmLeadDetail() {
  const detail = document.getElementById("admin-crm-detail");
  if (!detail) return;
  const bundle = crmWorkspace.selectedLead;
  if (!bundle?.item) {
    detail.innerHTML = '<div class="admin-lead-empty">Выберите лид, чтобы открыть карточку.</div>';
    return;
  }
  const lead = bundle.item;
  const contact = bundle.contact || {};
  const events = bundle.events || [];
  const comments = bundle.comments || [];
  const statuses = crmWorkspace.pipelines[0]?.statuses || [];
  const currentOwner = crmWorkspace.users.find((user) => Number(user.id) === Number(lead.owner_id));
  detail.innerHTML = `
    <div class="admin-crm-detail-head">
      <div>
        <strong>#${lead.id} · ${escapeHtml(lead.name || "Без имени")}</strong>
        <span>${escapeHtml(lead.request_type || lead.message || "")}</span>
      </div>
      <div class="admin-crm-chip-row">
        ${renderCrmStageBadge(lead)}
        ${renderCrmFollowUpBadge(lead)}
        ${renderCrmSyncBadge(lead)}
      </div>
    </div>
    <div class="admin-crm-next-step-card">
      <div class="admin-crm-next-step-copy">
        <strong>Следующий шаг</strong>
        <span>${escapeHtml(getCrmNextStepLabel(lead))}</span>
      </div>
      <div class="admin-crm-action-strip">
        <button class="btn btn-secondary" data-crm-quick-action="take-over" type="button">В работу</button>
        <button class="btn btn-secondary" data-crm-quick-action="call-today" type="button">Позвонить сегодня</button>
        <button class="btn btn-secondary" data-crm-quick-action="follow-up-tomorrow" type="button">Follow-up завтра</button>
        <button class="btn btn-secondary" data-crm-quick-action="mark-hot" type="button">Hot lead</button>
      </div>
    </div>
    <div class="admin-crm-detail-meta">
      <span>${escapeHtml(currentOwner?.display_name || lead.owner_name || "Без owner")}</span>
      <span>${escapeHtml(lead.source || "Без источника")}</span>
      <span>${escapeHtml(lead.phone || lead.email || lead.telegram || "Нет контакта")}</span>
      <button class="btn btn-secondary" id="crm-lead-retry-sync" type="button">Retry sync</button>
    </div>
    <div class="admin-grid">
      <label class="admin-field">
        <span class="admin-field-label">Стадия</span>
        <select class="admin-select" id="crm-lead-status">${statuses.map((status) => `<option value="${escapeAttribute(status.code)}" ${lead.status_code === status.code ? "selected" : ""}>${escapeHtml(status.name)}</option>`).join("")}</select>
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Owner</span>
        <select class="admin-select" id="crm-lead-owner">
          <option value="0">Без owner</option>
          ${crmWorkspace.users.map((user) => `<option value="${user.id}" ${Number(lead.owner_id) === Number(user.id) ? "selected" : ""}>${escapeHtml(user.display_name)}</option>`).join("")}
        </select>
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Источник</span>
        <input class="admin-input" id="crm-lead-source" type="text" value="${escapeAttribute(lead.source || "")}" />
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Follow-up</span>
        <input class="admin-input" id="crm-lead-follow-up" type="datetime-local" value="${escapeAttribute(toDatetimeLocal(lead.next_action_at))}" />
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Теги</span>
        <input class="admin-input" id="crm-lead-tags" type="text" value="${escapeAttribute((lead.tags || []).join(", "))}" />
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Архив</span>
        <input class="admin-input" id="crm-lead-archived" type="checkbox" ${lead.is_archived ? "checked" : ""} />
      </label>
      <label class="admin-field admin-lead-note">
        <span class="admin-field-label">Заметка</span>
        <textarea class="admin-textarea" id="crm-lead-note">${escapeHtml(lead.note || "")}</textarea>
      </label>
    </div>
    <div class="admin-toolbar-actions">
      <button class="btn btn-primary" id="crm-lead-save" type="button">Сохранить карточку</button>
    </div>
    <div class="admin-crm-detail-block">
      <strong>Контакт</strong>
      <div class="admin-crm-detail-meta">
        <span>${escapeHtml(contact.phone || lead.phone || "Телефон не указан")}</span>
        <span>${escapeHtml(contact.email || lead.email || "Email не указан")}</span>
        <span>${escapeHtml(contact.telegram || lead.telegram || "Telegram не указан")}</span>
      </div>
    </div>
    <div class="admin-crm-detail-block">
      <strong>Бриф</strong>
      <pre class="admin-crm-pre">${escapeHtml(lead.brief_text || JSON.stringify(lead.payload || {}, null, 2))}</pre>
    </div>
    <div class="admin-crm-detail-block">
      <strong>Комментарии</strong>
      <div class="admin-crm-thread">
        ${comments.length ? comments.map((comment) => `
          <div class="admin-history-item">
            <strong>${escapeHtml(comment.author_name || "Команда")}</strong>
            <span>${escapeHtml(comment.created_at || "")}</span>
            <span>${escapeHtml(comment.body || "")}</span>
          </div>
        `).join("") : '<div class="admin-lead-empty">Комментариев пока нет.</div>'}
      </div>
      <label class="admin-field admin-lead-note">
        <span class="admin-field-label">Новый комментарий</span>
        <textarea class="admin-textarea" id="crm-lead-comment-body" placeholder="Что важно сделать, что уже обсудили, какой следующий шаг"></textarea>
      </label>
      <button class="btn btn-secondary" id="crm-lead-comment-save" type="button">Добавить комментарий</button>
    </div>
    <div class="admin-crm-detail-block">
      <strong>История</strong>
      <div class="admin-crm-thread">
        ${events.length ? events.map((item) => `
          <div class="admin-history-item">
            <strong>${escapeHtml(formatCrmEventTitle(item))}</strong>
            <span>${escapeHtml(item.created_at || "")}</span>
            <span>${escapeHtml(formatCrmEventDescription(item))}</span>
          </div>
        `).join("") : '<div class="admin-lead-empty">Истории пока нет.</div>'}
      </div>
    </div>
    <div class="admin-crm-detail-block">
      <strong>Sync</strong>
      <div class="admin-crm-detail-meta">
        <span>${escapeHtml(lead.sync?.sync_status || bundle.sync?.sync_status || "no sync")}</span>
        <span>${escapeHtml(lead.sync?.external_id || bundle.sync?.external_id || "")}</span>
        <span>${escapeHtml(lead.sync?.last_error || bundle.sync?.last_error || "")}</span>
      </div>
    </div>
  `;

  document.getElementById("crm-lead-save")?.addEventListener("click", saveCrmLeadDetail);
  document.getElementById("crm-lead-comment-save")?.addEventListener("click", createCrmLeadComment);
  document.getElementById("crm-lead-retry-sync")?.addEventListener("click", retryCrmLeadSync);
  detail.querySelectorAll("[data-crm-quick-action]").forEach((button) => {
    button.addEventListener("click", () => {
      applyCrmQuickAction(button.dataset.crmQuickAction || "");
    });
  });
}

async function saveCrmLeadDetail() {
  const leadId = crmWorkspace.selectedLead?.item?.id;
  if (!leadId) return;
  const payload = {
    status_code: document.getElementById("crm-lead-status")?.value || "new",
    owner_id: Number(document.getElementById("crm-lead-owner")?.value || 0) || null,
    source: document.getElementById("crm-lead-source")?.value.trim() || "",
    note: document.getElementById("crm-lead-note")?.value || "",
    tags: parseTagInput(document.getElementById("crm-lead-tags")?.value || ""),
    next_action_at: fromDatetimeLocal(document.getElementById("crm-lead-follow-up")?.value || ""),
    is_archived: Boolean(document.getElementById("crm-lead-archived")?.checked),
  };
  try {
    els.status.textContent = `Сохраняю CRM-карточку #${leadId}...`;
    await adminFetch(`/admin/crm/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    els.status.textContent = `CRM-карточка #${leadId} обновлена.`;
    await loadCrmWorkspace(true);
  } catch (error) {
    els.status.textContent = `Не удалось сохранить CRM-карточку #${leadId}: ${error.message}`;
  }
}

async function createCrmLeadComment() {
  const leadId = crmWorkspace.selectedLead?.item?.id;
  const body = document.getElementById("crm-lead-comment-body")?.value.trim() || "";
  if (!leadId || !body) return;
  try {
    await adminFetch(`/admin/crm/leads/${leadId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    els.status.textContent = `Комментарий к лиду #${leadId} добавлен.`;
    await loadCrmLeadDetail(leadId);
  } catch (error) {
    els.status.textContent = `Не удалось добавить комментарий: ${error.message}`;
  }
}

async function retryCrmLeadSync() {
  const leadId = crmWorkspace.selectedLead?.item?.id;
  if (!leadId) return;
  try {
    await adminFetch(`/admin/crm/leads/${leadId}/retry-sync`, { method: "POST" });
    els.status.textContent = `Sync для лида #${leadId} перезапущен.`;
    await loadCrmLeadDetail(leadId);
    await loadCrmWorkspace();
  } catch (error) {
    els.status.textContent = `Не удалось перезапустить sync: ${error.message}`;
  }
}

function renderCrmStageBadge(lead) {
  return `<span class="admin-crm-chip is-stage">${escapeHtml(lead.status_name || lead.status_code || "Без стадии")}</span>`;
}

function renderCrmFollowUpBadge(lead) {
  return `<span class="admin-crm-follow-up is-${escapeAttribute(lead.follow_up_state || "none")}">${escapeHtml(getCrmFollowUpUrgencyLabel(lead.follow_up_state))}</span>`;
}

function renderCrmSyncBadge(lead) {
  const syncState = lead.sync?.sync_status;
  if (!syncState) return "";
  return `<span class="admin-crm-chip is-sync">${escapeHtml(formatCrmSyncLabel(syncState))}</span>`;
}

function getCrmFollowUpUrgencyLabel(state) {
  if (state === "overdue") return "Просрочено";
  if (state === "scheduled") return "Запланировано";
  if (state === "archived") return "Архив";
  return "Без follow-up";
}

function formatCrmSyncLabel(status) {
  const mapping = {
    succeeded: "Sync OK",
    retry_succeeded: "Sync OK",
    failed: "Sync failed",
    failed_permanent: "Sync failed",
    pending: "Sync pending",
    retry_scheduled: "Retry scheduled",
  };
  return mapping[status] || status;
}

function getCrmNextStepLabel(lead) {
  if (lead.is_archived || lead.follow_up_state === "archived") return "Лид в архиве";
  if (!Number(lead.owner_id || 0)) return "Назначить owner и взять лид в работу";
  if (lead.follow_up_state === "overdue") return "Связаться с клиентом сейчас";
  if (lead.next_action_at) return formatFollowUpLabel(lead.next_action_at, lead.follow_up_state);
  if ((lead.tags || []).includes("hot")) return "Горячий лид, нужен быстрый контакт";
  return "Назначить следующий шаг";
}

function prependNoteLine(value, line) {
  const normalized = String(value || "").trim();
  if (!line) return normalized;
  if (normalized.includes(line)) return normalized;
  return normalized ? `${line}\n${normalized}` : line;
}

function getWorkingStatusCode() {
  const statuses = crmWorkspace.pipelines[0]?.statuses || [];
  const preferredCodes = ["in_progress", "working", "contacted", "processing", "qualified"];
  for (const code of preferredCodes) {
    const match = statuses.find((status) => status.code === code);
    if (match) return match.code;
  }
  const fallback = statuses.find((status) => status.code !== getCrmNewStatusCode());
  return fallback?.code || statuses[0]?.code || "";
}

function buildQuickActionDatetime(kind) {
  const date = new Date();
  if (kind === "call-today") {
    date.setHours(date.getHours() + 2, 0, 0, 0);
    return toDatetimeLocal(date.toISOString());
  }
  date.setDate(date.getDate() + 1);
  date.setHours(11, 0, 0, 0);
  return toDatetimeLocal(date.toISOString());
}

async function applyCrmQuickAction(action) {
  const statusField = document.getElementById("crm-lead-status");
  const ownerField = document.getElementById("crm-lead-owner");
  const followUpField = document.getElementById("crm-lead-follow-up");
  const tagsField = document.getElementById("crm-lead-tags");
  const noteField = document.getElementById("crm-lead-note");
  if (!statusField || !ownerField || !followUpField || !tagsField || !noteField) return;

  if (action === "take-over") {
    const currentUser = findCurrentCrmUser();
    if (currentUser) {
      ownerField.value = String(currentUser.id);
    }
    statusField.value = getWorkingStatusCode() || statusField.value;
    noteField.value = prependNoteLine(noteField.value, "Следующий шаг: взять лид в работу и выйти на контакт.");
  } else if (action === "call-today") {
    followUpField.value = buildQuickActionDatetime("call-today");
    noteField.value = prependNoteLine(noteField.value, "Следующий шаг: позвонить клиенту сегодня.");
  } else if (action === "follow-up-tomorrow") {
    followUpField.value = buildQuickActionDatetime("follow-up-tomorrow");
    noteField.value = prependNoteLine(noteField.value, "Следующий шаг: вернуться к клиенту завтра.");
  } else if (action === "mark-hot") {
    const tags = new Set(parseTagInput(tagsField.value || ""));
    tags.add("hot");
    tagsField.value = Array.from(tags).join(", ");
    noteField.value = prependNoteLine(noteField.value, "Лид помечен как hot.");
  } else {
    return;
  }

  await saveCrmLeadDetail();
}

function parseTagInput(value) {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}

function toDatetimeLocal(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const offset = parsed.getTimezoneOffset();
  const normalized = new Date(parsed.getTime() - offset * 60_000);
  return normalized.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function formatFollowUpLabel(value, state) {
  if (!value) return state === "none" ? "Без follow-up" : "Follow-up не задан";
  return `${state === "overdue" ? "Просрочено" : "Follow-up"} · ${value.slice(0, 16).replace("T", " ")}`;
}

function formatCrmEventTitle(item) {
  const mapping = {
    "lead.created": "Лид создан",
    "lead.updated": "Карточка обновлена",
    "lead.assigned": "Назначен owner",
    "lead.reassigned": "Owner изменён",
    "lead.comment.created": "Комментарий добавлен",
    "lead.comment.added": "Комментарий добавлен",
    "task.follow_up.created": "Создан follow-up",
    "task.overdue": "Просрочен follow-up",
    "sync.amocrm.failed": "Sync amoCRM не прошёл",
    "sync.amocrm.succeeded": "Sync amoCRM выполнен",
    "lead.duplicate_detected": "Найден дубль",
  };
  return mapping[item.event_type] || humanizeCrmEventCode(item.event_type || "system.event");
}

function formatCrmEventDescription(item) {
  const payload = item.payload || {};
  if (payload.body) return payload.body;
  if (payload.note) return payload.note;
  if (payload.reason) return payload.reason;
  if (payload.error || payload.last_error) return payload.error || payload.last_error;
  if (payload.from_status || payload.to_status) {
    return `Стадия: ${payload.from_status || "?"} -> ${payload.to_status || "?"}`;
  }
  if (payload.from_owner_name || payload.to_owner_name) {
    return `Owner: ${payload.from_owner_name || "без owner"} -> ${payload.to_owner_name || "без owner"}`;
  }
  if (payload.owner_name) return `Owner: ${payload.owner_name}`;
  if (payload.task_title) return payload.task_title;
  if (payload.sync_status) return `Статус sync: ${payload.sync_status}`;
  const compact = Object.entries(payload).filter(([, value]) => value !== null && value !== "").slice(0, 3);
  if (!compact.length) return "Системное событие CRM.";
  return compact.map(([key, value]) => `${humanizeCrmEventCode(key)}: ${String(value)}`).join(" · ");
}

function humanizeCrmEventCode(value) {
  return String(value || "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

async function loadLegacyLeadInbox() {
  const list = document.getElementById("admin-lead-list");
  if (!list) return;

  const apiBase = getApiBase();
  if (!apiBase) {
    list.innerHTML = '<div class="admin-lead-empty">Чтобы увидеть лиды, укажите integrations.apiBase.</div>';
    return;
  }

  list.innerHTML = '<div class="admin-lead-empty">Загружаю лиды…</div>';
  try {
    const response = await adminFetch("/admin/leads");
    const items = response.items || [];
    if (!items.length) {
      list.innerHTML = '<div class="admin-lead-empty">Лидов пока нет.</div>';
      return;
    }
    list.innerHTML = items.slice(0, 12).map((lead) => `
      <article class="admin-lead-card">
        <div class="admin-lead-head">
          <strong>#${lead.id} · ${escapeHtml(lead.name || "Без имени")}</strong>
          <span>${escapeHtml(lead.status || "Новый лид")}</span>
        </div>
        <div class="admin-lead-meta">
          <span>${escapeHtml(lead.source || lead.route || "Сайт")}</span>
          <span>${escapeHtml(lead.contact || lead.email || lead.phone || "Нет контакта")}</span>
        </div>
        <p>${escapeHtml(lead.what_needed || lead.message || "Без описания")}</p>
        <div class="admin-lead-actions">
          <label class="admin-field">
            <span class="admin-field-label">Статус</span>
            <select class="admin-select" data-lead-status="${lead.id}">
              ${(draft.crm.pipeline || []).map((item) => `<option value="${escapeAttribute(item)}" ${lead.status === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
            </select>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Owner</span>
            <input class="admin-input" data-lead-owner="${lead.id}" type="text" value="${escapeAttribute(lead.owner || "")}" />
          </label>
          <label class="admin-field admin-lead-note">
            <span class="admin-field-label">Note</span>
            <textarea class="admin-textarea" data-lead-note="${lead.id}">${escapeHtml(lead.note || "")}</textarea>
          </label>
          <button class="btn btn-primary admin-lead-save" data-lead-save="${lead.id}" type="button">Сохранить лид</button>
          <button class="btn btn-secondary admin-lead-history-toggle" data-lead-history-toggle="${lead.id}" type="button">Показать историю</button>
          <div class="admin-lead-history" data-lead-history="${lead.id}" hidden></div>
        </div>
      </article>
    `).join("");
    list.querySelectorAll("[data-lead-save]").forEach((button) => {
      button.addEventListener("click", () => saveLead(button.dataset.leadSave));
    });
    list.querySelectorAll("[data-lead-history-toggle]").forEach((button) => {
      button.addEventListener("click", () => loadLeadHistory(button.dataset.leadHistoryToggle, button));
    });
  } catch (error) {
    list.innerHTML = `<div class="admin-lead-empty">Не удалось загрузить лиды: ${escapeHtml(error.message)}</div>`;
  }
}

async function saveLead(leadId) {
  const statusField = document.querySelector(`[data-lead-status="${leadId}"]`);
  const ownerField = document.querySelector(`[data-lead-owner="${leadId}"]`);
  const noteField = document.querySelector(`[data-lead-note="${leadId}"]`);
  try {
    els.status.textContent = `Сохраняю лид #${leadId}...`;
    await adminFetch(`/admin/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: statusField?.value || "",
        owner: ownerField?.value || "",
        note: noteField?.value || "",
      }),
    });
    els.status.textContent = `Лид #${leadId} обновлён.`;
    loadLegacyLeadInbox();
  } catch (error) {
    els.status.textContent = `Не удалось обновить лид #${leadId}: ${error.message}`;
  }
}

async function loadLeadHistory(leadId, button) {
  const container = document.querySelector(`[data-lead-history="${leadId}"]`);
  if (!container) return;
  const expanded = !container.hidden;
  if (expanded) {
    container.hidden = true;
    button.textContent = "Показать историю";
    return;
  }
  container.hidden = false;
  button.textContent = "Скрыть историю";
  container.innerHTML = '<div class="admin-lead-empty">Загружаю историю…</div>';
  try {
    const response = await adminFetch(`/admin/leads/${leadId}/events`);
    const items = response.items || [];
    if (!items.length) {
      container.innerHTML = '<div class="admin-lead-empty">Истории по лиду пока нет.</div>';
      return;
    }
    container.innerHTML = items.map((item) => `
      <div class="admin-history-item">
        <strong>${escapeHtml(item.event_type)}</strong>
        <span>${escapeHtml(item.actor_name || "system")} · ${escapeHtml(item.actor_role || "")}</span>
        <span>${escapeHtml(item.created_at || "")}</span>
      </div>
    `).join("");
  } catch (error) {
    container.innerHTML = `<div class="admin-lead-empty">Не удалось загрузить историю: ${escapeHtml(error.message)}</div>`;
  }
}

function bindUsersSection() {
  const loadButton = document.getElementById("load-users-button");
  const createButton = document.getElementById("create-user-button");
  if (loadButton) loadButton.addEventListener("click", loadUsers);
  if (createButton) createButton.addEventListener("click", createUser);
}

function bindAuditSection() {
  const loadButton = document.getElementById("load-audit-button");
  const clearButton = document.getElementById("audit-clear-filters");
  const queryField = document.getElementById("audit-filter-query");
  const areaField = document.getElementById("audit-filter-area");
  const actorField = document.getElementById("audit-filter-actor");
  if (loadButton) loadButton.addEventListener("click", loadAuditEvents);
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      auditWorkspace.query = "";
      auditWorkspace.area = "";
      auditWorkspace.actor = "";
      renderCurrentSection();
    });
  }
  if (queryField) {
    queryField.addEventListener("input", () => {
      auditWorkspace.query = queryField.value;
      renderCurrentSection();
    });
  }
  if (areaField) {
    areaField.addEventListener("change", () => {
      auditWorkspace.area = areaField.value;
      renderCurrentSection();
    });
  }
  if (actorField) {
    actorField.addEventListener("change", () => {
      auditWorkspace.actor = actorField.value;
      renderCurrentSection();
    });
  }
}

async function loadUsers() {
  if (!canAccessSection("users")) {
    usersDraft = [];
    renderSummary();
    return;
  }
  const list = document.getElementById("admin-users-list");
  if (!list) return;
  list.innerHTML = '<div class="admin-lead-empty">Загружаю пользователей…</div>';
  try {
    const response = await adminFetch("/admin/users");
    usersDraft = response.items || [];
    renderSummary();
    if (!usersDraft.length) {
      list.innerHTML = '<div class="admin-lead-empty">Пользователей пока нет.</div>';
      return;
    }
    list.innerHTML = usersDraft.map((user) => `
      <article class="admin-lead-card">
        <div class="admin-lead-head">
          <strong>${escapeHtml(user.display_name)}</strong>
          <span>${escapeHtml(user.role)}</span>
        </div>
        <div class="admin-lead-meta">
          <span>${escapeHtml(user.slug)}</span>
          <span>${escapeHtml(user.email || "email не указан")}</span>
        </div>
        <div class="admin-pills">
          <span class="admin-pill">${escapeHtml(user.account_type || "admin")}</span>
          ${(user.scopes || []).map((scope) => `<span class="admin-pill">${escapeHtml(scope)}</span>`).join("")}
          <span class="admin-pill">${user.has_password ? "password" : "no password"}</span>
        </div>
        <div class="admin-lead-actions">
          <label class="admin-field">
            <span class="admin-field-label">Имя</span>
            <input class="admin-input" data-user-name="${user.id}" type="text" value="${escapeAttribute(user.display_name)}" />
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Email</span>
            <input class="admin-input" data-user-email="${user.id}" type="text" value="${escapeAttribute(user.email || "")}" />
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Роль</span>
            <select class="admin-select" data-user-role="${user.id}">
              ${["owner","admin","manager","editor","viewer"].map((role) => `<option value="${role}" ${user.role === role ? "selected" : ""}>${role}</option>`).join("")}
            </select>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Тип аккаунта</span>
            <select class="admin-select" data-user-account-type="${user.id}">
              ${["admin","member"].map((accountType) => `<option value="${accountType}" ${user.account_type === accountType ? "selected" : ""}>${accountType}</option>`).join("")}
            </select>
          </label>
          <label class="admin-field admin-lead-note">
            <span class="admin-field-label">Scopes</span>
            <textarea class="admin-textarea" data-user-scopes="${user.id}" placeholder="catalog, special_pages, crm">${escapeHtml((user.scopes || []).join(", "))}</textarea>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Активен</span>
            <input class="admin-input" data-user-active="${user.id}" type="checkbox" ${user.is_active ? "checked" : ""} />
          </label>
          <button class="btn btn-primary admin-user-save" data-user-save="${user.id}" type="button">Сохранить пользователя</button>
          <button class="btn btn-secondary admin-user-password" data-user-password="${user.id}" type="button">Задать пароль</button>
        </div>
      </article>
    `).join("");
    list.querySelectorAll("[data-user-save]").forEach((button) => {
      button.addEventListener("click", () => saveUser(button.dataset.userSave));
    });
    list.querySelectorAll("[data-user-password]").forEach((button) => {
      button.addEventListener("click", () => setUserPassword(button.dataset.userPassword));
    });
  } catch (error) {
    list.innerHTML = `<div class="admin-lead-empty">Не удалось загрузить пользователей: ${escapeHtml(error.message)}</div>`;
  }
}

async function createUser() {
  const slug = window.prompt("Slug нового пользователя");
  if (!slug) return;
  const displayName = window.prompt("Имя пользователя");
  if (!displayName) return;
  const email = window.prompt("Email пользователя", "") || "";
  const accountType = (window.prompt("Тип аккаунта: admin/member", "member") || "member").trim().toLowerCase();
  const role = window.prompt("Роль: owner/admin/manager/editor/viewer", "manager") || "manager";
  const defaultScopes = accountType === "admin" ? "admin, crm, catalog, special_pages" : "catalog, special_pages";
  const scopesRaw = window.prompt("Scopes через запятую", defaultScopes) || defaultScopes;
  const password = window.prompt("Пароль (минимум 8 символов, можно оставить пустым)", "") || "";
  try {
    const response = await adminFetch("/admin/users", {
      method: "POST",
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
    els.status.textContent = "Пользователь создан.";
    loadUsers();
  } catch (error) {
    els.status.textContent = `Не удалось создать пользователя: ${error.message}`;
  }
}

async function saveUser(userId) {
  const nameField = document.querySelector(`[data-user-name="${userId}"]`);
  const emailField = document.querySelector(`[data-user-email="${userId}"]`);
  const roleField = document.querySelector(`[data-user-role="${userId}"]`);
  const accountTypeField = document.querySelector(`[data-user-account-type="${userId}"]`);
  const scopesField = document.querySelector(`[data-user-scopes="${userId}"]`);
  const activeField = document.querySelector(`[data-user-active="${userId}"]`);
  try {
    await adminFetch(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({
        display_name: nameField?.value || "",
        email: emailField?.value || "",
        account_type: accountTypeField?.value || "member",
        role: roleField?.value || "manager",
        scopes: parseCommaValues(scopesField?.value || ""),
        is_active: Boolean(activeField?.checked),
      }),
    });
    els.status.textContent = `Пользователь #${userId} обновлён.`;
    loadUsers();
  } catch (error) {
    els.status.textContent = `Не удалось обновить пользователя #${userId}: ${error.message}`;
  }
}

async function loadAuditEvents() {
  if (!canAccessSection("audit")) {
    auditDraft = [];
    renderSummary();
    return;
  }
  const list = document.getElementById("admin-audit-list");
  if (!list) return;
  list.innerHTML = '<div class="admin-lead-empty">Загружаю аудит…</div>';
  try {
    const response = await adminFetch("/admin/audit-events?limit=100");
    auditDraft = response.items || [];
    renderSummary();
    renderCurrentSection();
  } catch (error) {
    auditDraft = [];
    renderCurrentSection();
    const fallbackList = document.getElementById("admin-audit-list");
    if (fallbackList) {
      fallbackList.innerHTML = `<div class="admin-lead-empty">Не удалось загрузить аудит: ${escapeHtml(error.message)}</div>`;
    }
  }
}

function getFilteredAuditEvents() {
  return auditDraft.filter((item) => {
    const query = auditWorkspace.query.trim().toLowerCase();
    const area = auditWorkspace.area.trim();
    const actor = auditWorkspace.actor.trim();
    const haystack = [
      item.area,
      item.action,
      item.actor_name,
      item.actor_role,
      item.target_type,
      item.target_id,
      JSON.stringify(item.payload || {}),
    ].join(" ").toLowerCase();
    if (query && !haystack.includes(query)) return false;
    if (area && item.area !== area) return false;
    if (actor && (item.actor_name || "") !== actor) return false;
    return true;
  });
}

function getAuditAreas() {
  return [...new Set(auditDraft.map((item) => item.area).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
}

function getAuditActors() {
  return [...new Set(auditDraft.map((item) => item.actor_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ru"));
}

function getAuditSummary() {
  const areas = getAuditAreas();
  const actors = getAuditActors();
  const latest = auditDraft[0]?.created_at || "не загружена";
  return {
    total: auditDraft.length,
    areas: areas.length,
    actors: actors.length,
    latest,
  };
}

async function setUserPassword(userId) {
  const password = window.prompt("Новый пароль пользователя (минимум 8 символов)");
  if (!password) return;
  if (password.length < 8) {
    els.status.textContent = "Пароль должен быть не короче 8 символов.";
    return;
  }
  try {
    await adminFetch(`/admin/users/${userId}/set-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    els.status.textContent = `Пароль пользователя #${userId} обновлён.`;
    loadUsers();
  } catch (error) {
    els.status.textContent = `Не удалось обновить пароль пользователя #${userId}: ${error.message}`;
  }
}

function bindCatalogSection() {
  const loadButton = document.getElementById("load-catalog-button");
  const saveButton = document.getElementById("save-catalog-button");
  if (loadButton) loadButton.addEventListener("click", pullCatalogDraft);
  if (saveButton) saveButton.addEventListener("click", pushCatalogDraft);
}

function bindInventorySection() {
  const refreshButton = document.getElementById("inventory-refresh-button");
  const copyButton = document.getElementById("inventory-copy-button");
  const queryField = document.getElementById("inventory-query");
  const categoryField = document.getElementById("inventory-category");
  const stockField = document.getElementById("inventory-stock-status");

  if (queryField) {
    queryField.addEventListener("input", () => {
      inventoryWorkspace.query = queryField.value;
      renderCurrentSection();
    });
  }
  if (categoryField) {
    categoryField.value = inventoryWorkspace.category;
    categoryField.addEventListener("change", () => {
      inventoryWorkspace.category = categoryField.value;
      renderCurrentSection();
    });
  }
  if (stockField) {
    stockField.value = inventoryWorkspace.stockStatus;
    stockField.addEventListener("change", () => {
      inventoryWorkspace.stockStatus = stockField.value;
      renderCurrentSection();
    });
  }
  if (refreshButton) {
    refreshButton.addEventListener("click", () => pullCatalogSnapshot(true));
  }
  if (copyButton) {
    copyButton.addEventListener("click", copyCatalogSnapshot);
  }
  document.querySelectorAll("[data-inventory-row]").forEach((row) => {
    row.querySelectorAll("[data-inventory-field]").forEach((field) => {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, () => updateInventoryRowState(row));
    });
    const saveButton = row.querySelector("[data-inventory-save]");
    const resetButton = row.querySelector("[data-inventory-reset]");
    if (saveButton) {
      saveButton.addEventListener("click", () => saveInventoryRow(row.dataset.inventoryRow));
    }
    if (resetButton) {
      resetButton.addEventListener("click", () => resetInventoryRow(row.dataset.inventoryRow));
    }
    const editButton = row.querySelector("[data-inventory-edit-product]");
    if (editButton) {
      editButton.addEventListener("click", () => openInventoryProductEditor(row.dataset.inventoryRow));
    }
    updateInventoryRowState(row);
  });

  document.querySelectorAll("[data-editor-field]").forEach((field) => {
    const eventName = field.tagName === "SELECT" || field.type === "checkbox" || field.type === "number" ? "change" : "input";
    field.addEventListener(eventName, () => updateInventoryEditorSimpleField(field));
  });
  document.querySelectorAll("[data-editor-badge]").forEach((field) => {
    field.addEventListener("change", () => updateInventoryEditorBadge(field.dataset.editorBadge, field.checked));
  });
  document.querySelectorAll("[data-editor-list-field]").forEach((field) => {
    const eventName = field.tagName === "SELECT" || field.type === "checkbox" ? "change" : "input";
    field.addEventListener(eventName, () => updateInventoryEditorListField(field));
  });
  document.querySelectorAll("[data-editor-add]").forEach((button) => {
    button.addEventListener("click", () => addInventoryEditorListItem(button.dataset.editorAdd));
  });
  document.querySelectorAll("[data-editor-remove]").forEach((button) => {
    button.addEventListener("click", () => removeInventoryEditorListItem(button.dataset.listKind, Number(button.dataset.listIndex)));
  });
  document.querySelector("[data-inventory-editor-save]")?.addEventListener("click", saveInventoryProductEditor);
  document.querySelector("[data-inventory-editor-reset]")?.addEventListener("click", resetInventoryProductEditor);
  document.querySelector("[data-inventory-editor-close]")?.addEventListener("click", closeInventoryProductEditor);

  if (!catalogSnapshotDraft) {
    pullCatalogSnapshot(false);
  }
}

async function pullCatalogDraft() {
  const output = document.getElementById("admin-catalog-output");
  if (!output) return;
  try {
    els.status.textContent = "Загружаю структуру каталога из системы...";
    const response = await adminFetch("/admin/catalog/items");
    catalogDraft = response.items || [];
    output.value = JSON.stringify(catalogDraft, null, 2);
    els.status.textContent = "Структура каталога загружена из системы.";
  } catch (error) {
    els.status.textContent = `Не удалось загрузить каталог: ${error.message}`;
  }
}

async function pushCatalogDraft() {
  const output = document.getElementById("admin-catalog-output");
  if (!output) return;
  try {
    catalogDraft = JSON.parse(output.value);
    els.status.textContent = "Сохраняю структуру каталога в систему...";
    await adminFetch("/admin/catalog/items", {
      method: "PUT",
      body: JSON.stringify({ items: catalogDraft }),
    });
    els.status.textContent = "Структура каталога сохранена в системе.";
  } catch (error) {
    els.status.textContent = `Не удалось сохранить каталог: ${error.message}`;
  }
}

async function pullCatalogSnapshot(forceMessage = true) {
  if (!canAccessSection("inventory")) return;
  if (forceMessage) {
    els.status.textContent = "Загружаю рабочий срез товаров...";
  }
  try {
    const response = await adminFetch("/admin/catalog/snapshot");
    catalogSnapshotDraft = response.snapshot || null;
    renderSummary();
    if (currentSection === "inventory") {
      renderCurrentSection();
    }
    if (forceMessage) {
      els.status.textContent = "Рабочий срез товаров загружен.";
    }
  } catch (error) {
    if (currentSection === "inventory") {
      const shell = document.querySelector(".admin-inventory-table-shell");
      if (shell) {
        shell.innerHTML = `<div class="admin-lead-empty">Не удалось загрузить рабочий срез товаров: ${escapeHtml(error.message)}</div>`;
      }
    }
    if (forceMessage || !catalogSnapshotDraft) {
      els.status.textContent = `Не удалось загрузить рабочий срез товаров: ${error.message}`;
    }
  }
}

async function copyCatalogSnapshot() {
  if (!catalogSnapshotDraft) {
    els.status.textContent = "Сначала загрузите рабочий срез товаров.";
    return;
  }
  try {
    await copyText(JSON.stringify(catalogSnapshotDraft, null, 2));
    els.status.textContent = "Рабочий срез товаров скопирован в буфер.";
  } catch (error) {
    els.status.textContent = "Не удалось скопировать рабочий срез товаров.";
  }
}

async function saveInventoryRow(slug) {
  const row = document.querySelector(`[data-inventory-row="${slug}"]`);
  if (!row) return;
  const payload = readInventoryRowDraft(row);
  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    els.status.textContent = `Укажите корректную цену для ${slug}.`;
    return;
  }
  try {
    row.dataset.inventorySaving = "true";
    updateInventoryRowState(row);
    els.status.textContent = `Сохраняю товар ${slug}...`;
    const response = await adminFetch(`/admin/catalog/inventory/${slug}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    patchInventoryProductInSnapshot(response.product || null);
    renderSummary();
    if (currentSection === "inventory") {
      renderCurrentSection();
    }
    els.status.textContent = `Товар ${slug} сохранён.`;
  } catch (error) {
    row.dataset.inventorySaving = "false";
    updateInventoryRowState(row);
    els.status.textContent = `Не удалось сохранить ${slug}: ${error.message}`;
  }
}

function resetInventoryRow(slug) {
  const row = document.querySelector(`[data-inventory-row="${slug}"]`);
  const product = getInventoryProducts().find((item) => item.slug === slug);
  if (!row || !product) return;
  const priceField = row.querySelector('[data-inventory-field="price"]');
  const oldPriceField = row.querySelector('[data-inventory-field="oldPrice"]');
  const stockField = row.querySelector('[data-inventory-field="stockStatus"]');
  if (priceField) priceField.value = formatNumberInputValue(product.price);
  if (oldPriceField) oldPriceField.value = formatNumberInputValue(product.oldPrice);
  if (stockField) stockField.value = product.stockStatus || "in_stock";
  updateInventoryRowState(row);
  els.status.textContent = `Изменения по ${slug} сброшены.`;
}

function normalizeInventoryEditorProduct(product) {
  if (!product || typeof product !== "object") return null;
  return {
    slug: String(product.slug || ""),
    path: String(product.path || ""),
    article: String(product.article || ""),
    name: String(product.name || ""),
    short_description: String(product.short_description || ""),
    full_description: String(product.full_description || ""),
    price: Number.isFinite(Number(product.price)) ? Number(product.price) : null,
    old_price: Number.isFinite(Number(product.old_price)) ? Number(product.old_price) : null,
    stock_status: String(product.stock_status || "in_stock"),
    status: String(product.status || "published"),
    seo_title: String(product.seo_title || ""),
    seo_description: String(product.seo_description || ""),
    badges: Array.isArray(product.badges) ? product.badges.map((item) => String(item || "").trim()).filter(Boolean) : [],
    images: Array.isArray(product.images) ? product.images.map((item) => String(item || "").trim()).filter(Boolean) : [],
    attributes: Array.isArray(product.attributes)
      ? product.attributes.map((item) => ({
          key: String(item?.key || ""),
          label: String(item?.label || ""),
          value: String(item?.value || ""),
          group: String(item?.group || ""),
          filterable: Boolean(item?.filterable),
        }))
      : [],
    documents: Array.isArray(product.documents)
      ? product.documents.map((item) => ({
          id: String(item?.id || ""),
          title: String(item?.title || ""),
          fileUrl: String(item?.fileUrl || ""),
          fileSize: String(item?.fileSize || ""),
        }))
      : [],
    faq: Array.isArray(product.faq)
      ? product.faq.map((item) => ({
          question: String(item?.question || ""),
          answer: String(item?.answer || ""),
          askedAt: String(item?.askedAt || ""),
          answeredAt: String(item?.answeredAt || ""),
        }))
      : [],
    related_products: Array.isArray(product.related_products)
      ? product.related_products.map((item) => ({
          slug: String(item?.slug || ""),
          label: String(item?.label || ""),
        }))
      : [],
    compatibility: Array.isArray(product.compatibility)
      ? product.compatibility.map((item) => ({
          target_slug: String(item?.target_slug || ""),
          relation: String(item?.relation || "works_with"),
          note: String(item?.note || ""),
        }))
      : [],
  };
}

async function openInventoryProductEditor(slug) {
  if (!slug) return;
  inventoryWorkspace.editorSlug = slug;
  inventoryWorkspace.editorLoadingSlug = slug;
  inventoryWorkspace.editorSaving = false;
  if (currentSection === "inventory") {
    renderCurrentSection();
  }
  try {
    els.status.textContent = `Загружаю карточку ${slug}...`;
    const response = await adminFetch(`/admin/catalog/products/${slug}`);
    inventoryWorkspace.editorDraft = normalizeInventoryEditorProduct(response.product);
    applyInventoryEditorRules();
    inventoryWorkspace.editorLoadingSlug = "";
    if (currentSection === "inventory") {
      renderCurrentSection();
    }
    els.status.textContent = `Карточка ${slug} загружена в редактор.`;
  } catch (error) {
    inventoryWorkspace.editorDraft = null;
    inventoryWorkspace.editorLoadingSlug = "";
    inventoryWorkspace.editorWarnings = [];
    inventoryWorkspace.editorErrors = [];
    if (currentSection === "inventory") {
      renderCurrentSection();
    }
    els.status.textContent = `Не удалось загрузить карточку ${slug}: ${error.message}`;
  }
}

function closeInventoryProductEditor() {
  inventoryWorkspace.editorSlug = "";
  inventoryWorkspace.editorDraft = null;
  inventoryWorkspace.editorLoadingSlug = "";
  inventoryWorkspace.editorSaving = false;
  inventoryWorkspace.editorWarnings = [];
  inventoryWorkspace.editorErrors = [];
  if (currentSection === "inventory") {
    renderCurrentSection();
  }
}

function resetInventoryProductEditor() {
  if (!inventoryWorkspace.editorSlug) return;
  openInventoryProductEditor(inventoryWorkspace.editorSlug);
}

function updateInventoryEditorSimpleField(field) {
  if (!inventoryWorkspace.editorDraft || !field?.dataset?.editorField) return;
  const key = field.dataset.editorField;
  if (key === "price" || key === "old_price") {
    const nextValue = Number(field.value);
    inventoryWorkspace.editorDraft[key] = Number.isFinite(nextValue) && nextValue > 0 ? nextValue : null;
    applyInventoryEditorRules();
    return;
  }
  inventoryWorkspace.editorDraft[key] = field.type === "checkbox" ? Boolean(field.checked) : String(field.value || "");
  applyInventoryEditorRules();
  if (key === "status" || key === "stock_status") {
    renderCurrentSection();
  }
}

function updateInventoryEditorBadge(badge, checked) {
  if (!inventoryWorkspace.editorDraft) return;
  const current = new Set(inventoryWorkspace.editorDraft.badges || []);
  if (checked) current.add(String(badge || ""));
  else current.delete(String(badge || ""));
  inventoryWorkspace.editorDraft.badges = Array.from(current).filter(Boolean);
  applyInventoryEditorRules();
  renderCurrentSection();
}

function updateInventoryEditorListField(field) {
  if (!inventoryWorkspace.editorDraft) return;
  const kind = field.dataset.listKind;
  const index = Number(field.dataset.listIndex);
  if (!kind || !Number.isInteger(index) || index < 0) return;
  const list = inventoryWorkspace.editorDraft[kind];
  if (!Array.isArray(list) || !list[index]) return;

  if (kind === "images") {
    list[index] = String(field.value || "");
    applyInventoryEditorRules();
    return;
  }

  const key = field.dataset.listKey;
  if (!key) return;
  list[index][key] = field.type === "checkbox" ? Boolean(field.checked) : String(field.value || "");
  applyInventoryEditorRules();
}

function addInventoryEditorListItem(kind) {
  if (!inventoryWorkspace.editorDraft || !kind) return;
  const list = inventoryWorkspace.editorDraft[kind];
  if (!Array.isArray(list)) return;
  if (kind === "images") {
    list.push("");
  } else if (kind === "attributes") {
    list.push({ key: "", label: "", value: "", group: "", filterable: false });
  } else if (kind === "documents") {
    list.push({ id: "", title: "", fileUrl: "", fileSize: "" });
  } else if (kind === "faq") {
    list.push({ question: "", answer: "", askedAt: "", answeredAt: "" });
  } else if (kind === "related_products") {
    list.push({ slug: "", label: "" });
  } else if (kind === "compatibility") {
    list.push({ target_slug: "", relation: "works_with", note: "" });
  }
  if (currentSection === "inventory") {
    applyInventoryEditorRules();
    renderCurrentSection();
  }
}

function removeInventoryEditorListItem(kind, index) {
  if (!inventoryWorkspace.editorDraft || !kind || !Number.isInteger(index) || index < 0) return;
  const list = inventoryWorkspace.editorDraft[kind];
  if (!Array.isArray(list)) return;
  list.splice(index, 1);
  if (currentSection === "inventory") {
    applyInventoryEditorRules();
    renderCurrentSection();
  }
}

function applyInventoryEditorRules() {
  const product = inventoryWorkspace.editorDraft;
  if (!product) {
    inventoryWorkspace.editorWarnings = [];
    inventoryWorkspace.editorErrors = [];
    return;
  }

  const warnings = [];
  const errors = [];

  if (product.status === "archived" && product.stock_status !== "out_of_stock") {
    product.stock_status = "out_of_stock";
    warnings.push("Для статуса archived наличие автоматически выставлено в «Нет в наличии».");
  }

  if (product.status !== "published" && Array.isArray(product.badges) && product.badges.length) {
    product.badges = [];
    warnings.push("Для статусов draft/hidden/archived бейджи снимаются автоматически.");
  }

  if (product.stock_status === "out_of_stock" && Array.isArray(product.badges) && product.badges.includes("sale")) {
    product.badges = product.badges.filter((badge) => badge !== "sale");
    warnings.push("Бейдж «Акция» снят: товар помечен как «Нет в наличии».");
  }

  const price = Number(product.price);
  const oldPrice = Number(product.old_price);
  const hasSaleBadge = Array.isArray(product.badges) && product.badges.includes("sale");
  const validPrice = Number.isFinite(price) && price > 0;
  const validOldPrice = Number.isFinite(oldPrice) && oldPrice > 0;

  if (hasSaleBadge && (!validPrice || !validOldPrice || oldPrice <= price)) {
    product.badges = product.badges.filter((badge) => badge !== "sale");
    warnings.push("Бейдж «Акция» снят: для него нужна старая цена выше текущей.");
  }

  if (!String(product.name || "").trim()) {
    errors.push("Название товара обязательно.");
  }
  if (product.status === "published" && !validPrice) {
    errors.push("Для статуса published нужно указать цену.");
  }
  if (validOldPrice && validPrice && oldPrice <= price) {
    errors.push("Старая цена должна быть больше текущей.");
  }
  const brokenDocuments = (product.documents || []).filter((item) => {
    const hasId = Boolean(String(item?.id || "").trim());
    const hasTitle = Boolean(String(item?.title || "").trim());
    const hasFileUrl = Boolean(String(item?.fileUrl || "").trim());
    const hasFileSize = Boolean(String(item?.fileSize || "").trim());
    return (hasId || hasTitle || hasFileSize) && !hasFileUrl;
  });
  if (brokenDocuments.length) {
    warnings.push("В документах есть записи без ссылки на файл. Такие строки не стоит оставлять пустыми.");
  }
  const halfFaq = (product.faq || []).filter((item) => {
    const hasQuestion = Boolean(String(item?.question || "").trim());
    const hasAnswer = Boolean(String(item?.answer || "").trim());
    return hasQuestion !== hasAnswer;
  });
  if (halfFaq.length) {
    warnings.push("В FAQ есть неполные пары «вопрос-ответ». Лучше заполнить обе части перед публикацией.");
  }

  inventoryWorkspace.editorWarnings = warnings;
  inventoryWorkspace.editorErrors = errors;
}

function renderInventoryEditorIssues() {
  const warnings = inventoryWorkspace.editorWarnings || [];
  const errors = inventoryWorkspace.editorErrors || [];
  if (!warnings.length && !errors.length) return "";
  return `
    <div class="admin-inventory-editor-issues">
      ${errors.map((message) => `<div class="admin-inventory-editor-issue is-error">${escapeHtml(message)}</div>`).join("")}
      ${warnings.map((message) => `<div class="admin-inventory-editor-issue is-warning">${escapeHtml(message)}</div>`).join("")}
    </div>
  `;
}

function buildInventoryProductEditorPayload(product) {
  const nextPrice = Number(product.price);
  const nextOldPrice = Number(product.old_price);
  return {
    article: String(product.article || "").trim(),
    name: String(product.name || "").trim(),
    short_description: String(product.short_description || "").trim(),
    full_description: String(product.full_description || "").trim(),
    price: Number.isFinite(nextPrice) && nextPrice > 0 ? nextPrice : null,
    old_price: Number.isFinite(nextOldPrice) && nextOldPrice > 0 ? nextOldPrice : null,
    stock_status: String(product.stock_status || "in_stock").trim() || "in_stock",
    status: String(product.status || "published").trim() || "published",
    images: (product.images || []).map((item) => String(item || "").trim()).filter(Boolean),
    badges: Array.from(new Set((product.badges || []).map((item) => String(item || "").trim()).filter(Boolean))),
    seo_title: String(product.seo_title || "").trim(),
    seo_description: String(product.seo_description || "").trim(),
    attributes: (product.attributes || [])
      .map((item) => ({
        key: String(item?.key || "").trim(),
        label: String(item?.label || "").trim(),
        value: String(item?.value || "").trim(),
        group: String(item?.group || "").trim(),
        filterable: Boolean(item?.filterable),
      }))
      .filter((item) => item.key || item.label || item.value || item.group),
    documents: (product.documents || [])
      .map((item) => ({
        id: String(item?.id || "").trim(),
        title: String(item?.title || "").trim(),
        fileUrl: String(item?.fileUrl || "").trim(),
        fileSize: String(item?.fileSize || "").trim(),
      }))
      .filter((item) => item.id || item.title || item.fileUrl || item.fileSize),
    faq: (product.faq || [])
      .map((item) => ({
        question: String(item?.question || "").trim(),
        answer: String(item?.answer || "").trim(),
        askedAt: String(item?.askedAt || "").trim(),
        answeredAt: String(item?.answeredAt || "").trim(),
      }))
      .filter((item) => item.question || item.answer || item.askedAt || item.answeredAt),
    related_products: (product.related_products || [])
      .map((item) => ({
        slug: String(item?.slug || "").trim(),
        label: String(item?.label || "").trim(),
      }))
      .filter((item) => item.slug || item.label),
    compatibility: (product.compatibility || [])
      .map((item) => ({
        target_slug: String(item?.target_slug || "").trim(),
        relation: String(item?.relation || "works_with").trim() || "works_with",
        note: String(item?.note || "").trim(),
      }))
      .filter((item) => item.target_slug || item.relation || item.note),
  };
}

async function saveInventoryProductEditor() {
  const product = inventoryWorkspace.editorDraft;
  if (!product?.slug) return;
  if (!String(product.name || "").trim()) {
    els.status.textContent = "Укажите название товара перед сохранением.";
    return;
  }
  applyInventoryEditorRules();
  if (inventoryWorkspace.editorErrors.length) {
    els.status.textContent = `Нельзя сохранить: ${inventoryWorkspace.editorErrors[0]}`;
    renderCurrentSection();
    return;
  }
  const payload = buildInventoryProductEditorPayload(product);
  try {
    inventoryWorkspace.editorSaving = true;
    if (currentSection === "inventory") {
      renderCurrentSection();
    }
    els.status.textContent = `Сохраняю карточку ${product.slug}...`;
    const response = await adminFetch(`/admin/catalog/products/${product.slug}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    inventoryWorkspace.editorDraft = normalizeInventoryEditorProduct(response.product);
    patchAdminProductInSnapshot(response.product || null);
    renderSummary();
    els.status.textContent = `Карточка ${product.slug} сохранена.`;
  } catch (error) {
    els.status.textContent = `Не удалось сохранить карточку ${product.slug}: ${error.message}`;
  } finally {
    inventoryWorkspace.editorSaving = false;
    if (currentSection === "inventory") {
      renderCurrentSection();
    }
  }
}

async function loginToBackendWithPassword() {
  const login = (els.loginIdentity?.value || "").trim();
  const password = els.loginPassword?.value || "";
  if (!login || !password) {
    els.sessionState.textContent = "Введите логин и пароль.";
    return;
  }
  try {
    els.sessionState.textContent = "Проверяем данные...";
    const response = await adminFetch("/admin/auth/password-login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    });
    const user = response.user;
    await applyBackendAccessState(user || null);
    els.sessionState.textContent = user
      ? `Вход выполнен: ${user.display_name || "пользователь"} (${user.role || "роль"})`
      : "Вход выполнен.";
  } catch (error) {
    els.sessionState.textContent = `Не удалось войти: ${error.message}`;
  }
}

async function checkBackendSession() {
  try {
    els.sessionState.textContent = "Проверяем сессию...";
    const response = await adminFetch("/admin/auth/session");
    const user = response.user;
    await applyBackendAccessState(user || null);
    els.sessionState.textContent = response.session
      ? `Сессия активна: ${user?.user_name || user?.display_name || "пользователь"} (${user?.user_role || user?.role || "роль"})`
      : "Сессия не найдена.";
  } catch (error) {
    applyGuestAccessState();
    els.sessionState.textContent = `Не удалось проверить сессию: ${error.message}`;
  }
}

async function logoutFromBackend() {
  try {
    els.sessionState.textContent = "Завершаем сессию...";
    await adminFetch("/admin/auth/logout", { method: "POST" });
    applyGuestAccessState();
    els.sessionState.textContent = "Вы вышли из кабинета.";
  } catch (error) {
    els.sessionState.textContent = `Не удалось завершить сессию: ${error.message}`;
  }
}

async function applyBackendAccessState(user) {
  backendUser = user || null;
  backendAccessPolicy = null;
  crmWorkspace.currentUserId = null;
  if (backendUser) {
    try {
      const response = await adminFetch("/admin/auth/access-policy");
      backendAccessPolicy = response.policy || null;
    } catch (error) {
      backendAccessPolicy = null;
    }
  }
  renderTabs();
  renderCurrentSection();
  renderSummary();
}

function applyGuestAccessState() {
  backendUser = null;
  backendAccessPolicy = null;
  crmWorkspace.currentUserId = null;
  renderTabs();
  renderCurrentSection();
  renderSummary();
}

function isDefaultState() {
  return JSON.stringify(draft) === JSON.stringify(DEFAULT_CONFIG);
}

function inputField(path, label, value, note) {
  return `
    <label class="admin-field">
      <span class="admin-field-label">${label}</span>
      <span class="admin-field-note">${note}</span>
      <input class="admin-input" data-path="${path}" data-type="text" type="text" value="${escapeAttribute(value || "")}" />
    </label>
  `;
}

function textareaField(path, label, value, note) {
  return `
    <label class="admin-field">
      <span class="admin-field-label">${label}</span>
      <span class="admin-field-note">${note}</span>
      <textarea class="admin-textarea" data-path="${path}" data-type="textarea">${escapeHtml(value || "")}</textarea>
    </label>
  `;
}

function selectField(path, label, value, options, note) {
  return `
    <label class="admin-field">
      <span class="admin-field-label">${label}</span>
      <span class="admin-field-note">${note}</span>
      <select class="admin-select" data-path="${path}" data-type="select">
        ${options.map(([optionValue, optionLabel]) => `
          <option value="${escapeAttribute(optionValue)}" ${value === optionValue ? "selected" : ""}>${optionLabel}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function checkboxField(path, label, checked) {
  return `
    <label class="admin-field">
      <span class="admin-field-label">${label}</span>
      <input class="admin-input" data-path="${path}" data-type="checkbox" type="checkbox" ${checked ? "checked" : ""} />
    </label>
  `;
}

function buildLeadExample() {
  return {
    source: "Главная форма",
    route: "Расчёт фермы",
    stage: draft.crm.pipeline[0],
    owner: draft.crm.owner,
    contact: {
      name: "Имя",
      telegram: draft.forms.collectTelegram ? "@username" : null,
      phone: draft.forms.collectPhone ? "+66 ..." : null,
      email: draft.forms.collectEmail ? "mail@example.com" : null,
    },
    brief: {
      projectStage: draft.forms.collectStage ? "Запуск" : null,
      request: "Нужен расчёт и состав фермы",
    },
  };
}

function getInventoryProducts() {
  return Array.isArray(catalogSnapshotDraft?.products) ? catalogSnapshotDraft.products : [];
}

function patchInventoryProductInSnapshot(product) {
  if (!catalogSnapshotDraft || !product?.slug || !Array.isArray(catalogSnapshotDraft.products)) return;
  const index = catalogSnapshotDraft.products.findIndex((item) => item.slug === product.slug);
  if (index === -1) return;
  catalogSnapshotDraft.products[index] = {
    ...catalogSnapshotDraft.products[index],
    ...product,
  };
}

function patchAdminProductInSnapshot(product) {
  if (!catalogSnapshotDraft || !product?.slug || !Array.isArray(catalogSnapshotDraft.products)) return;
  const index = catalogSnapshotDraft.products.findIndex((item) => item.slug === product.slug);
  if (index === -1) return;
  const current = catalogSnapshotDraft.products[index] || {};
  catalogSnapshotDraft.products[index] = {
    ...current,
    article: product.article ?? current.article,
    name: product.name ?? current.name,
    shortDescription: product.short_description ?? current.shortDescription,
    fullDescription: product.full_description ?? current.fullDescription,
    price: product.price ?? current.price,
    oldPrice: product.old_price ?? null,
    stockStatus: product.stock_status || current.stockStatus || "in_stock",
    status: product.status || current.status || "published",
    images: Array.isArray(product.images) ? product.images : current.images,
    badges: Array.isArray(product.badges) ? product.badges : current.badges,
    seoTitle: product.seo_title ?? current.seoTitle,
    seoDescription: product.seo_description ?? current.seoDescription,
    attributes: Array.isArray(product.attributes) ? product.attributes : current.attributes,
    documents: Array.isArray(product.documents) ? product.documents : current.documents,
    faq: Array.isArray(product.faq) ? product.faq : current.faq,
    relatedProducts: Array.isArray(product.related_products) ? product.related_products : current.relatedProducts,
    compatibility: Array.isArray(product.compatibility) ? product.compatibility : current.compatibility,
    path: product.path || current.path,
    productAdminUpdatedAt: product.updated_at || current.productAdminUpdatedAt,
  };
}

function buildInventoryCategoryOptions(categories) {
  return categories
    .slice()
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "ru"))
    .map((category) => `
      <option value="${escapeAttribute(category.slug || "")}" ${inventoryWorkspace.category === category.slug ? "selected" : ""}>${escapeHtml(category.name || category.slug || "Без названия")}</option>
    `)
    .join("");
}

function buildInventoryStockOptions() {
  return ["in_stock", "limited", "preorder", "out_of_stock"]
    .map((status) => `
      <option value="${status}" ${inventoryWorkspace.stockStatus === status ? "selected" : ""}>${escapeHtml(formatInventoryStockLabel(status))}</option>
    `)
    .join("");
}

function filterInventoryProducts(products, categories) {
  const categoryMap = new Map(categories.map((category) => [category.slug, category]));
  const query = inventoryWorkspace.query.trim().toLowerCase();
  return products.filter((product) => {
    if (inventoryWorkspace.category) {
      const categorySlug = product.categorySlug || product.topLevelCategorySlug || "";
      const category = categoryMap.get(categorySlug);
      const topLevelSlug = category?.topLevelSlug || product.topLevelCategorySlug || "";
      if (![categorySlug, topLevelSlug].includes(inventoryWorkspace.category)) {
        return false;
      }
    }
    if (inventoryWorkspace.stockStatus && product.stockStatus !== inventoryWorkspace.stockStatus) {
      return false;
    }
    if (!query) return true;
    const haystack = [
      product.name,
      product.article,
      product.slug,
      product.path,
      product.categorySlug,
      product.topLevelCategorySlug,
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  }).sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "ru"));
}

function summarizeInventoryStock(products) {
  return products.reduce((accumulator, product) => {
    const key = product.stockStatus || "out_of_stock";
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {
    in_stock: 0,
    limited: 0,
    preorder: 0,
    out_of_stock: 0,
  });
}

function summarizeInventoryPrice(products) {
  const values = products.map((product) => Number(product.price)).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return "нет данных";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? formatMoney(min) : `${formatMoney(min)} - ${formatMoney(max)}`;
}

function buildInventorySourceNote(snapshot) {
  if (!snapshot) {
    return "Срез каталога ещё не загружен. Нужен рабочий API-адрес и активный вход в кабинет.";
  }
  const generatedAt = snapshot.generatedAt || "неизвестно";
  const source = snapshot.source || "не указан";
  const counts = snapshot.counts || {};
  return [
    `Источник: ${source}`,
    `Обновлено: ${generatedAt}`,
    `Категорий: ${counts.categories || 0}`,
    `Товаров: ${counts.products || 0}`,
    `Позиций в структуре: ${counts.items || 0}`,
    `Ручных правок остатков: ${counts.inventoryOverrides || 0}`,
  ].join("\n");
}

function renderInventoryRow(product, categories) {
  const category = resolveInventoryCategory(product, categories);
  const badges = Array.isArray(product.badges) && product.badges.length
    ? `<div class="admin-inventory-badges">${product.badges.map((badge) => `<span class="admin-crm-chip">${escapeHtml(badge)}</span>`).join("")}</div>`
    : "";
  return `
    <tr data-inventory-row="${escapeAttribute(product.slug || "")}">
      <td class="admin-mono">${escapeHtml(product.article || "—")}</td>
      <td>
        <div class="admin-inventory-name">${escapeHtml(product.name || "Без названия")}</div>
        <div class="admin-inventory-meta">${escapeHtml(product.shortDescription || "")}</div>
        ${badges}
      </td>
      <td>${escapeHtml(category)}</td>
      <td>
        <label class="admin-inventory-edit">
          <span>Текущая</span>
          <input class="admin-input admin-inventory-input" data-inventory-field="price" type="number" min="0" step="1" value="${escapeAttribute(formatNumberInputValue(product.price))}" />
        </label>
        <label class="admin-inventory-edit">
          <span>Старая</span>
          <input class="admin-input admin-inventory-input" data-inventory-field="oldPrice" type="number" min="0" step="1" value="${escapeAttribute(formatNumberInputValue(product.oldPrice))}" placeholder="не задана" />
        </label>
        <div class="admin-inventory-price-note">Было: ${formatMoney(product.price)}${product.oldPrice ? ` · старая ${formatMoney(product.oldPrice)}` : ""}</div>
      </td>
      <td>
        <select class="admin-select admin-inventory-select" data-inventory-field="stockStatus">
          ${["in_stock", "limited", "preorder", "out_of_stock"].map((status) => `
            <option value="${status}" ${(product.stockStatus || "in_stock") === status ? "selected" : ""}>${escapeHtml(formatInventoryStockLabel(status))}</option>
          `).join("")}
        </select>
        <div class="admin-inventory-price-note">Сейчас: <span class="admin-inventory-stock is-${escapeAttribute(product.stockStatus || "out_of_stock")}">${escapeHtml(formatInventoryStockLabel(product.stockStatus))}</span></div>
      </td>
      <td>
        <div class="admin-mono admin-inventory-path">${escapeHtml(product.path || "—")}</div>
        <div class="admin-inventory-actions">
          <button class="btn btn-primary admin-inventory-open" data-inventory-save="${escapeAttribute(product.slug || "")}" type="button">Сохранить</button>
          <button class="btn btn-secondary admin-inventory-open" data-inventory-reset="${escapeAttribute(product.slug || "")}" type="button">Сбросить</button>
          <button class="btn btn-secondary admin-inventory-open" data-inventory-edit-product="${escapeAttribute(product.slug || "")}" type="button">Редактор</button>
          ${product.path ? `<a class="btn btn-secondary admin-inventory-open" href="..${escapeAttribute(product.path)}" target="_blank" rel="noopener">Открыть</a>` : ""}
        </div>
        <div class="admin-inventory-row-state" data-inventory-state>Совпадает с текущим срезом.</div>
      </td>
    </tr>
  `;
}

function renderInventoryProductEditor() {
  if (inventoryWorkspace.editorLoadingSlug) {
    return `
      <div class="admin-block-head">
        <div>
          <strong>Редактор карточки товара</strong>
          <span>Загружаю данные по ${escapeHtml(inventoryWorkspace.editorLoadingSlug)}...</span>
        </div>
      </div>
      <div class="admin-lead-empty">Подождите, загружаю карточку.</div>
    `;
  }

  const product = inventoryWorkspace.editorDraft;
  if (!product) {
    return `
      <div class="admin-block-head">
        <div>
          <strong>Редактор карточки товара</strong>
          <span>Полный редактор: контент, медиа, характеристики, документы, FAQ и SEO.</span>
        </div>
      </div>
      <div class="admin-lead-empty">Выберите товар в таблице и нажмите «Редактор».</div>
    `;
  }

  const stockOptions = ["in_stock", "limited", "preorder", "out_of_stock"]
    .map((status) => `<option value="${status}" ${product.stock_status === status ? "selected" : ""}>${escapeHtml(formatInventoryStockLabel(status))}</option>`)
    .join("");
  const statusOptions = [
    ["published", "Опубликовано"],
    ["draft", "Черновик"],
    ["hidden", "Скрыто"],
    ["archived", "Архив"],
  ]
    .map(([value, label]) => `<option value="${value}" ${product.status === value ? "selected" : ""}>${escapeHtml(label)}</option>`)
    .join("");
  applyInventoryEditorRules();
  const issues = renderInventoryEditorIssues();
  const mediaSuggestions = collectInventoryMediaSuggestions();
  const mediaListId = "inventory-media-suggestions";

  return `
    <div class="admin-block-head">
      <div>
        <strong>Редактор: ${escapeHtml(product.name || product.slug || "товар")}</strong>
        <span>${escapeHtml(product.slug || "")}${product.path ? ` · ${escapeHtml(product.path)}` : ""}</span>
      </div>
      <div class="admin-toolbar-actions">
        <button class="btn btn-secondary" type="button" data-inventory-editor-reset>Обновить из базы</button>
        <button class="btn btn-secondary" type="button" data-inventory-editor-close>Закрыть</button>
        <button class="btn btn-primary" type="button" data-inventory-editor-save ${inventoryWorkspace.editorSaving ? "disabled" : ""}>${inventoryWorkspace.editorSaving ? "Сохраняю..." : "Сохранить карточку"}</button>
      </div>
    </div>
    ${issues}

    <div class="admin-grid admin-grid-3">
      <label class="admin-field">
        <span class="admin-field-label">Артикул</span>
        <input class="admin-input" type="text" data-editor-field="article" value="${escapeAttribute(product.article || "")}" />
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Название</span>
        <input class="admin-input" type="text" data-editor-field="name" value="${escapeAttribute(product.name || "")}" />
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Статус карточки</span>
        <select class="admin-select" data-editor-field="status">${statusOptions}</select>
      </label>
    </div>

    <div class="admin-grid admin-grid-3">
      <label class="admin-field">
        <span class="admin-field-label">Цена</span>
        <input class="admin-input" type="number" min="0" step="1" data-editor-field="price" value="${escapeAttribute(formatNumberInputValue(product.price))}" />
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Старая цена</span>
        <input class="admin-input" type="number" min="0" step="1" data-editor-field="old_price" value="${escapeAttribute(formatNumberInputValue(product.old_price))}" placeholder="не задана" />
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Наличие</span>
        <select class="admin-select" data-editor-field="stock_status">${stockOptions}</select>
      </label>
    </div>

    <div class="admin-grid">
      <label class="admin-field">
        <span class="admin-field-label">Короткое описание</span>
        <textarea class="admin-textarea" data-editor-field="short_description">${escapeHtml(product.short_description || "")}</textarea>
      </label>
      <label class="admin-field">
        <span class="admin-field-label">Полное описание</span>
        <textarea class="admin-textarea admin-inventory-editor-long" data-editor-field="full_description">${escapeHtml(product.full_description || "")}</textarea>
      </label>
    </div>

    <div class="admin-field admin-inventory-badge-manager">
      <span class="admin-field-label">Бейджи карточки</span>
      <div class="admin-inventory-badge-grid">
        ${INVENTORY_BADGE_OPTIONS.map((badge) => `
          <label class="admin-checkbox-chip">
            <input type="checkbox" data-editor-badge="${escapeAttribute(badge.value)}" ${(product.badges || []).includes(badge.value) ? "checked" : ""} />
            <span>${escapeHtml(badge.label)}</span>
          </label>
        `).join("")}
      </div>
    </div>

    <div class="admin-field admin-inventory-list-manager">
      <div class="admin-inventory-list-head">
        <span class="admin-field-label">Медиа-менеджер</span>
        <button class="btn btn-secondary" type="button" data-editor-add="images">Добавить фото</button>
      </div>
      ${mediaSuggestions.length ? `
        <datalist id="${mediaListId}">
          ${mediaSuggestions.map((item) => `<option value="${escapeAttribute(item)}"></option>`).join("")}
        </datalist>
      ` : ""}
      <div class="admin-inventory-list-grid">
        ${(product.images || []).map((value, index) => `
          <div class="admin-inventory-list-row admin-inventory-media-row">
            <div class="admin-inventory-media-preview">
              ${value
    ? `<img src="${escapeAttribute(resolveInventoryMediaHref(value))}" alt="Фото ${escapeAttribute(product.name || product.slug || "товара")}" loading="lazy" />`
    : '<div class="admin-inventory-media-placeholder">Нет превью</div>'}
            </div>
            <div class="admin-inventory-media-controls">
              <input class="admin-input" type="text" placeholder="assets/catalog/tovar.jpg" value="${escapeAttribute(value || "")}" data-editor-list-field data-list-kind="images" data-list-index="${index}" list="${mediaListId}" />
              <div class="admin-inventory-list-actions">
                ${value ? `<a class="btn btn-secondary" target="_blank" rel="noopener" href="${escapeAttribute(resolveInventoryMediaHref(value))}">Открыть</a>` : ""}
                <button class="btn btn-secondary" type="button" data-editor-remove data-list-kind="images" data-list-index="${index}">Удалить</button>
              </div>
            </div>
          </div>
        `).join("") || '<div class="admin-lead-empty">Фото не добавлены.</div>'}
      </div>
    </div>

    <div class="admin-field admin-inventory-list-manager">
      <div class="admin-inventory-list-head">
        <span class="admin-field-label">Характеристики</span>
        <button class="btn btn-secondary" type="button" data-editor-add="attributes">Добавить характеристику</button>
      </div>
      <div class="admin-inventory-list-grid">
        ${(product.attributes || []).map((item, index) => `
          <div class="admin-inventory-list-row admin-inventory-list-row-grid">
            <input class="admin-input" type="text" placeholder="Ключ (slug)" value="${escapeAttribute(item.key || "")}" data-editor-list-field data-list-kind="attributes" data-list-index="${index}" data-list-key="key" />
            <input class="admin-input" type="text" placeholder="Название поля" value="${escapeAttribute(item.label || "")}" data-editor-list-field data-list-kind="attributes" data-list-index="${index}" data-list-key="label" />
            <input class="admin-input" type="text" placeholder="Значение" value="${escapeAttribute(item.value || "")}" data-editor-list-field data-list-kind="attributes" data-list-index="${index}" data-list-key="value" />
            <input class="admin-input" type="text" placeholder="Группа" value="${escapeAttribute(item.group || "")}" data-editor-list-field data-list-kind="attributes" data-list-index="${index}" data-list-key="group" />
            <label class="admin-checkbox-chip">
              <input type="checkbox" ${(item.filterable ? "checked" : "")} data-editor-list-field data-list-kind="attributes" data-list-index="${index}" data-list-key="filterable" />
              <span>Фильтр</span>
            </label>
            <button class="btn btn-secondary" type="button" data-editor-remove data-list-kind="attributes" data-list-index="${index}">Удалить</button>
          </div>
        `).join("") || '<div class="admin-lead-empty">Характеристики не добавлены.</div>'}
      </div>
    </div>

    <div class="admin-field admin-inventory-list-manager">
      <div class="admin-inventory-list-head">
        <span class="admin-field-label">Документы</span>
        <button class="btn btn-secondary" type="button" data-editor-add="documents">Добавить документ</button>
      </div>
      <div class="admin-inventory-list-grid">
        ${(product.documents || []).map((item, index) => `
          <div class="admin-inventory-list-row admin-inventory-list-row-grid">
            <input class="admin-input" type="text" placeholder="ID документа" value="${escapeAttribute(item.id || "")}" data-editor-list-field data-list-kind="documents" data-list-index="${index}" data-list-key="id" />
            <input class="admin-input" type="text" placeholder="Название документа" value="${escapeAttribute(item.title || "")}" data-editor-list-field data-list-kind="documents" data-list-index="${index}" data-list-key="title" />
            <input class="admin-input" type="text" placeholder="Путь к файлу" value="${escapeAttribute(item.fileUrl || "")}" data-editor-list-field data-list-kind="documents" data-list-index="${index}" data-list-key="fileUrl" />
            <input class="admin-input" type="text" placeholder="Размер (например, 124 KB)" value="${escapeAttribute(item.fileSize || "")}" data-editor-list-field data-list-kind="documents" data-list-index="${index}" data-list-key="fileSize" />
            <button class="btn btn-secondary" type="button" data-editor-remove data-list-kind="documents" data-list-index="${index}">Удалить</button>
          </div>
        `).join("") || '<div class="admin-lead-empty">Документы не добавлены.</div>'}
      </div>
    </div>

    <div class="admin-field admin-inventory-list-manager">
      <div class="admin-inventory-list-head">
        <span class="admin-field-label">FAQ</span>
        <button class="btn btn-secondary" type="button" data-editor-add="faq">Добавить вопрос</button>
      </div>
      <div class="admin-inventory-list-grid">
        ${(product.faq || []).map((item, index) => `
          <div class="admin-inventory-list-row admin-inventory-list-row-grid">
            <input class="admin-input" type="text" placeholder="Вопрос" value="${escapeAttribute(item.question || "")}" data-editor-list-field data-list-kind="faq" data-list-index="${index}" data-list-key="question" />
            <textarea class="admin-textarea" placeholder="Ответ" data-editor-list-field data-list-kind="faq" data-list-index="${index}" data-list-key="answer">${escapeHtml(item.answer || "")}</textarea>
            <input class="admin-input" type="text" placeholder="Дата вопроса (YYYY-MM-DD)" value="${escapeAttribute(item.askedAt || "")}" data-editor-list-field data-list-kind="faq" data-list-index="${index}" data-list-key="askedAt" />
            <input class="admin-input" type="text" placeholder="Дата ответа (YYYY-MM-DD)" value="${escapeAttribute(item.answeredAt || "")}" data-editor-list-field data-list-kind="faq" data-list-index="${index}" data-list-key="answeredAt" />
            <button class="btn btn-secondary" type="button" data-editor-remove data-list-kind="faq" data-list-index="${index}">Удалить</button>
          </div>
        `).join("") || '<div class="admin-lead-empty">FAQ не заполнен.</div>'}
      </div>
    </div>

    <div class="admin-field admin-inventory-list-manager">
      <div class="admin-inventory-list-head">
        <span class="admin-field-label">Связанные товары</span>
        <button class="btn btn-secondary" type="button" data-editor-add="related_products">Добавить связь</button>
      </div>
      <div class="admin-inventory-list-grid">
        ${(product.related_products || []).map((item, index) => `
          <div class="admin-inventory-list-row admin-inventory-list-row-grid">
            <input class="admin-input" type="text" placeholder="Slug товара" value="${escapeAttribute(item.slug || "")}" data-editor-list-field data-list-kind="related_products" data-list-index="${index}" data-list-key="slug" />
            <input class="admin-input" type="text" placeholder="Подпись (опционально)" value="${escapeAttribute(item.label || "")}" data-editor-list-field data-list-kind="related_products" data-list-index="${index}" data-list-key="label" />
            <button class="btn btn-secondary" type="button" data-editor-remove data-list-kind="related_products" data-list-index="${index}">Удалить</button>
          </div>
        `).join("") || '<div class="admin-lead-empty">Связанные товары пока не заданы.</div>'}
      </div>
    </div>

    <div class="admin-field admin-inventory-list-manager">
      <div class="admin-inventory-list-head">
        <span class="admin-field-label">Совместимость</span>
        <button class="btn btn-secondary" type="button" data-editor-add="compatibility">Добавить правило</button>
      </div>
      <div class="admin-inventory-list-grid">
        ${(product.compatibility || []).map((item, index) => `
          <div class="admin-inventory-list-row admin-inventory-list-row-grid">
            <input class="admin-input" type="text" placeholder="Slug совместимого товара" value="${escapeAttribute(item.target_slug || "")}" data-editor-list-field data-list-kind="compatibility" data-list-index="${index}" data-list-key="target_slug" />
            <input class="admin-input" type="text" placeholder="Тип связи (works_with)" value="${escapeAttribute(item.relation || "works_with")}" data-editor-list-field data-list-kind="compatibility" data-list-index="${index}" data-list-key="relation" />
            <input class="admin-input" type="text" placeholder="Комментарий" value="${escapeAttribute(item.note || "")}" data-editor-list-field data-list-kind="compatibility" data-list-index="${index}" data-list-key="note" />
            <button class="btn btn-secondary" type="button" data-editor-remove data-list-kind="compatibility" data-list-index="${index}">Удалить</button>
          </div>
        `).join("") || '<div class="admin-lead-empty">Правила совместимости пока не заданы.</div>'}
      </div>
    </div>

    <div class="admin-grid">
      <label class="admin-field">
        <span class="admin-field-label">SEO title</span>
        <input class="admin-input" type="text" data-editor-field="seo_title" value="${escapeAttribute(product.seo_title || "")}" />
      </label>
      <label class="admin-field">
        <span class="admin-field-label">SEO description</span>
        <textarea class="admin-textarea" data-editor-field="seo_description">${escapeHtml(product.seo_description || "")}</textarea>
      </label>
    </div>
  `;
}

function resolveInventoryMediaHref(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith("/")) return `..${normalized}`;
  return `../${normalized.replace(/^\.?\//, "")}`;
}

function collectInventoryMediaSuggestions(limit = 120) {
  const products = getInventoryProducts();
  const seen = new Set();
  const items = [];
  for (const product of products) {
    const images = Array.isArray(product?.images) ? product.images : [];
    for (const source of images) {
      const value = String(source || "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      items.push(value);
      if (items.length >= limit) return items.sort((left, right) => left.localeCompare(right, "ru"));
    }
  }
  return items.sort((left, right) => left.localeCompare(right, "ru"));
}

function resolveInventoryCategory(product, categories) {
  const categoryMap = new Map(categories.map((category) => [category.slug, category]));
  const direct = categoryMap.get(product.categorySlug || "");
  if (direct?.name) return direct.name;
  const top = categoryMap.get(product.topLevelCategorySlug || "");
  if (top?.name) return top.name;
  return product.categorySlug || product.topLevelCategorySlug || "—";
}

function formatInventoryStockLabel(status) {
  if (status === "in_stock") return "В наличии";
  if (status === "limited") return "Мало";
  if (status === "preorder") return "Под заказ";
  if (status === "out_of_stock") return "Нет в наличии";
  return status || "Не указан";
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "по запросу";
  }
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(amount))} ₽`;
}

function formatNumberInputValue(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }
  return String(Math.round(amount));
}

function readInventoryRowDraft(row) {
  const priceField = row.querySelector('[data-inventory-field="price"]');
  const oldPriceField = row.querySelector('[data-inventory-field="oldPrice"]');
  const stockField = row.querySelector('[data-inventory-field="stockStatus"]');
  const price = Number(priceField?.value || 0);
  const oldPrice = Number(oldPriceField?.value || 0);
  return {
    price,
    old_price: Number.isFinite(oldPrice) && oldPrice > 0 ? oldPrice : null,
    stock_status: stockField?.value || "in_stock",
  };
}

function isInventoryRowDirty(row) {
  const slug = row.dataset.inventoryRow;
  const product = getInventoryProducts().find((item) => item.slug === slug);
  if (!product) return false;
  const draftRow = readInventoryRowDraft(row);
  const currentPrice = Number(product.price || 0);
  const currentOldPrice = Number(product.oldPrice || 0);
  const normalizedCurrentOldPrice = Number.isFinite(currentOldPrice) && currentOldPrice > 0 ? currentOldPrice : null;
  return draftRow.price !== currentPrice
    || draftRow.old_price !== normalizedCurrentOldPrice
    || draftRow.stock_status !== (product.stockStatus || "in_stock");
}

function updateInventoryRowState(row) {
  const state = row.querySelector("[data-inventory-state]");
  const saveButton = row.querySelector("[data-inventory-save]");
  const resetButton = row.querySelector("[data-inventory-reset]");
  if (!state || !saveButton || !resetButton) return;
  const saving = row.dataset.inventorySaving === "true";
  const dirty = isInventoryRowDirty(row);
  saveButton.disabled = saving || !dirty;
  resetButton.disabled = saving || !dirty;
  if (saving) {
    state.textContent = "Сохраняю...";
    row.classList.add("is-saving");
    row.classList.remove("is-dirty");
    return;
  }
  row.dataset.inventorySaving = "false";
  row.classList.toggle("is-dirty", dirty);
  row.classList.remove("is-saving");
  state.textContent = dirty ? "Есть несохранённые изменения." : "Совпадает с текущим срезом.";
}

function parseCommaValues(value) {
  return Array.from(new Set(String(value).split(",").map((item) => item.trim()).filter(Boolean)));
}

function deepMerge(base, patch) {
  if (Array.isArray(base) || Array.isArray(patch)) return patch;
  const output = { ...base };
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
      output[key] = deepMerge(base[key], value);
    } else {
      output[key] = value;
    }
  });
  return output;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isIndex(value) {
  return /^\d+$/.test(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return new Promise((resolve, reject) => {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "absolute";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(field);
      resolve();
    } catch (error) {
      document.body.removeChild(field);
      reject(error);
    }
  });
}
