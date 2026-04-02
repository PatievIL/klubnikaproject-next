import { DEFAULT_CATALOG_ITEMS } from "./catalog-defaults.generated.js";

const STORAGE_KEY = "klubnikaproject.site.admin.draft.v1";
const BACKEND_TOKEN_KEY = "klubnikaproject.site.admin.token.v1";

const DEFAULT_CONFIG = {
  site: {
    projectName: "Klubnika Project",
    publicUrl: "https://patievil.github.io/klubnikaproject-next/",
    primaryDomain: "https://klubnikaproject.ru/",
    supportTelegram: "@patiev_admin",
    supportTelegramUrl: "https://t.me/patiev_admin",
    supportEmail: "hello@klubnikaproject.ru",
    supportWhatsapp: "",
    defaultLanguage: "ru",
    defaultTheme: "light",
    activeLogoSystem: "manual-primary",
  },
  members: {
    enabled: true,
    loginPath: "/account/login/",
    hubPath: "/account/",
    catalogPath: "/account/catalog/",
    specialPath: "/account/special/",
  },
  forms: {
    mode: "backend_submit",
    primaryChannel: "crm",
    handoffPrefix: "Новая заявка с сайта Klubnika Project",
    successHint: "Вводные сохранены в системе. Если нужен быстрый ручной контакт, их можно продублировать в Telegram.",
    openTelegramAfterCopy: false,
    collectEmail: true,
    collectPhone: true,
    collectTelegram: true,
    collectStage: true,
  },
  seo: {
    titleSuffix: "— Klubnika Project",
    defaultDescription: "Расчёт, каталог, подбор и сопровождение для клубничных ферм в контролируемой среде.",
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
    note: "Следующий этап: lead inbox, история касаний, owner, дедлайны и webhook в CRM.",
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
    futureCms: "JSON/CMS-lite",
    futureCrm: "Lead inbox + pipeline",
    apiBase: "https://api.klubnikaproject.ru/site/v1",
    note: "Под этот JSON дальше можно подвязать backend, не меняя логику секций.",
  },
};

const SECTIONS = [
  { id: "dashboard", label: "Обзор" },
  { id: "site", label: "Сайт" },
  { id: "pages", label: "Страницы" },
  { id: "forms", label: "Формы" },
  { id: "crm", label: "CRM" },
  { id: "users", label: "Доступ" },
  { id: "audit", label: "Audit" },
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
  backendToken: document.getElementById("admin-backend-token"),
  loginIdentity: document.getElementById("admin-login-identity"),
  loginPassword: document.getElementById("admin-login-password"),
  currentPassword: document.getElementById("admin-current-password"),
  newPassword: document.getElementById("admin-new-password"),
  jsonOutput: document.getElementById("admin-json-output"),
  downloadButton: document.getElementById("download-admin-json"),
  copyButton: document.getElementById("copy-admin-json"),
  importInput: document.getElementById("import-admin-json"),
  resetButton: document.getElementById("reset-admin-button"),
  pullBackendButton: document.getElementById("pull-backend-config"),
  pushBackendButton: document.getElementById("push-backend-config"),
  loginButton: document.getElementById("admin-login-button"),
  passwordLoginButton: document.getElementById("admin-password-login-button"),
  sessionButton: document.getElementById("admin-session-button"),
  logoutButton: document.getElementById("admin-logout-button"),
  changePasswordButton: document.getElementById("admin-change-password-button"),
  logoutOthersButton: document.getElementById("admin-logout-others-button"),
  ownSessions: document.getElementById("admin-own-sessions"),
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
const inventoryWorkspace = {
  query: "",
  category: "",
  stockStatus: "",
};
const crmWorkspace = {
  available: false,
  view: "kanban",
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
  hydrateBackendToken();
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

function hydrateBackendToken() {
  const token = window.localStorage.getItem(BACKEND_TOKEN_KEY) || "";
  if (els.backendToken) {
    els.backendToken.value = token;
  }
}

function bindGlobalEvents() {
  els.downloadButton.addEventListener("click", downloadJson);
  els.copyButton.addEventListener("click", copyJson);
  els.importInput.addEventListener("change", importJson);
  els.resetButton.addEventListener("click", resetDraft);
  els.pullBackendButton.addEventListener("click", pullBackendDraft);
  els.pushBackendButton.addEventListener("click", pushBackendDraft);
  els.loginButton.addEventListener("click", loginToBackend);
  els.passwordLoginButton.addEventListener("click", loginToBackendWithPassword);
  els.sessionButton.addEventListener("click", checkBackendSession);
  els.logoutButton.addEventListener("click", logoutFromBackend);
  els.changePasswordButton?.addEventListener("click", changeOwnPassword);
  els.logoutOthersButton?.addEventListener("click", logoutOtherAdminSessions);
  els.backendToken.addEventListener("input", persistBackendToken);
}

function renderTabs() {
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
    });
  });
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

function renderDashboardSection() {
  const publishedPages = draft.pages.filter((page) => page.status === "published").length;
  const crmStages = draft.crm.pipeline.length;
  const leadSources = draft.crm.leadSources.length;
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Обзор</div>
        <h3 class="calc-card-title">Единый контур сайта, форм и будущей CRM</h3>
        <p class="sublead">Здесь фиксируется не только UI, но и то, как сайт будет жить как система: какие страницы активны, куда уходит лид, какие поля обязательны и к чему потом цеплять backend.</p>
      </div>

      <div class="admin-mini-metrics">
        <div class="admin-mini-metric"><span>Публичных страниц в модели</span><strong>${publishedPages}</strong></div>
        <div class="admin-mini-metric"><span>Источников лидов</span><strong>${leadSources}</strong></div>
        <div class="admin-mini-metric"><span>Стадий pipeline</span><strong>${crmStages}</strong></div>
      </div>

      <div class="admin-block">
        <div class="admin-block-head">
          <div>
            <strong>Что уже можно использовать</strong>
            <span>Site settings, формы, Telegram-handoff, SEO-рамка и структура страниц уже готовы как draft-конфиг.</span>
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

function renderSiteSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Сайт</div>
        <h3 class="calc-card-title">Базовые настройки проекта и контактов</h3>
        <p class="sublead">Это слой, который потом должен кормить header, footer, формы, микрокопирайт и contact blocks на всём сайте.</p>
      </div>
      <div class="admin-grid">
        ${inputField("site.projectName", "Название проекта", draft.site.projectName, "Что показывается в админке и общем описании")}
        ${inputField("site.publicUrl", "Публичный URL", draft.site.publicUrl, "Текущий опубликованный адрес")}
        ${inputField("site.primaryDomain", "Основной домен", draft.site.primaryDomain, "Нужен для каноникалов и будущей CMS")}
        ${inputField("site.activeLogoSystem", "Система логотипа", draft.site.activeLogoSystem, "Текущий принятый логотип/lockup")}
        ${inputField("site.supportTelegram", "Telegram", draft.site.supportTelegram, "Основной ручной канал при текущем handoff-flow")}
        ${inputField("site.supportTelegramUrl", "Telegram URL", draft.site.supportTelegramUrl, "Сюда ведут формы и CTA")}
        ${inputField("site.supportEmail", "Email", draft.site.supportEmail, "Вторичный контакт")}
        ${inputField("site.supportWhatsapp", "WhatsApp", draft.site.supportWhatsapp, "Заполнить позже, если нужен")}
      </div>
      <div class="admin-grid">
        ${selectField("site.defaultLanguage", "Язык по умолчанию", draft.site.defaultLanguage, [["ru","Русский"],["en","English"]], "Начальное состояние переключателя языка")}
        ${selectField("site.defaultTheme", "Тема по умолчанию", draft.site.defaultTheme, [["light","Светлая"],["dark","Тёмная"]], "Начальное состояние темы")}
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
        <p class="sublead">До появления backend это честный handoff-layer. Здесь фиксируется модель формы, каналы и набор обязательных полей.</p>
      </div>
      <div class="admin-grid">
        ${selectField("forms.mode", "Текущий режим", draft.forms.mode, [["telegram_handoff","telegram_handoff"],["copy_only","copy_only"],["backend_submit","backend_submit"]], "Как сейчас работает форма")}
        ${selectField("forms.primaryChannel", "Основной канал", draft.forms.primaryChannel, [["telegram","telegram"],["email","email"],["crm","crm"]], "Куда уходит заявка первым делом")}
        ${inputField("forms.handoffPrefix", "Префикс для brief", draft.forms.handoffPrefix, "Верхняя строка при копировании заявки")}
        ${inputField("forms.successHint", "Подсказка после действия", draft.forms.successHint, "Что видит пользователь после copy / handoff")}
      </div>
      <div class="admin-grid admin-grid-3">
        ${checkboxField("forms.openTelegramAfterCopy", "Открывать Telegram после copy", draft.forms.openTelegramAfterCopy)}
        ${checkboxField("forms.collectEmail", "Собирать email", draft.forms.collectEmail)}
        ${checkboxField("forms.collectPhone", "Собирать телефон", draft.forms.collectPhone)}
        ${checkboxField("forms.collectTelegram", "Собирать Telegram", draft.forms.collectTelegram)}
        ${checkboxField("forms.collectStage", "Собирать стадию проекта", draft.forms.collectStage)}
      </div>
    </div>
  `;
}

function renderCrmSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">CRM</div>
        <h3 class="calc-card-title">Sales workspace и CRM-операционка</h3>
        <p class="sublead">Здесь теперь не только схема CRM, но и рабочий кабинет продаж: стадии, доска, карточка лида, owner, follow-up, комментарии и sync-статус внешних интеграций.</p>
      </div>
      <div class="admin-grid">
        ${checkboxField("crm.enabled", "CRM слой включён", draft.crm.enabled)}
        ${selectField("crm.inboxMode", "Режим inbox", draft.crm.inboxMode, [["manual","manual"],["shared-email","shared-email"],["webhook","webhook"]], "Текущий режим приёма")}
        ${inputField("crm.owner", "Ответственный", draft.crm.owner, "Кто смотрит новые лиды первым")}
        ${inputField("crm.futureWebhook", "Future webhook", draft.crm.futureWebhook, "Под будущий backend/CRM")}
      </div>
      <div class="admin-grid">
        ${textareaField("crm.leadSources", "Источники лидов", draft.crm.leadSources.join("\n"), "По одному на строку")}
        ${textareaField("crm.pipeline", "Стадии pipeline", draft.crm.pipeline.join("\n"), "По одной стадии на строку")}
        ${textareaField("crm.requiredFields", "Обязательные поля", draft.crm.requiredFields.join("\n"), "Что должно попадать в лид")}
        ${textareaField("crm.note", "Комментарий по CRM", draft.crm.note, "Что ещё нужно для полноценного запуска")}
      </div>
      <div class="admin-code-card">
<pre>${escapeHtml(JSON.stringify(buildLeadExample(), null, 2))}</pre>
      </div>
      <div class="admin-block">
        <div class="admin-block-head">
          <div>
            <strong>CRM workspace</strong>
            <span>Работает через backend proxy к отдельному CRM-сервису. Если CRM ещё не настроен, ниже останется legacy inbox.</span>
          </div>
          <div class="admin-toolbar-actions">
            <button class="btn btn-secondary" id="crm-workspace-refresh" type="button">Обновить</button>
            <button class="btn btn-secondary" id="crm-workspace-view-toggle" type="button">Переключить вид</button>
          </div>
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
            <span class="admin-field-label">Owner</span>
            <select class="admin-select" id="crm-filter-owner">
              <option value="0">Все owner</option>
            </select>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Источник</span>
            <select class="admin-select" id="crm-filter-source">
              <option value="">Все источники</option>
            </select>
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Tag</span>
            <input class="admin-input" id="crm-filter-tag" type="text" placeholder="например hot" />
          </label>
          <label class="admin-field">
            <span class="admin-field-label">Follow-up</span>
            <select class="admin-select" id="crm-filter-follow-up">
              <option value="">Все</option>
              <option value="overdue">Просрочено</option>
              <option value="scheduled">Запланировано</option>
              <option value="none">Без follow-up</option>
              <option value="archived">Архив</option>
            </select>
          </label>
        </div>
        <div class="admin-crm-layout">
          <div class="admin-crm-board" id="admin-crm-board">
            <div class="admin-lead-empty">CRM workspace пока не загружен.</div>
          </div>
          <aside class="admin-crm-detail" id="admin-crm-detail">
            <div class="admin-lead-empty">Выберите лид, чтобы открыть карточку.</div>
          </aside>
        </div>
        <div class="admin-lead-list" id="admin-lead-list" hidden>
          <div class="admin-lead-empty">Lead inbox пока не загружен.</div>
        </div>
      </div>
    </div>
  `;
}

function renderCatalogSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Каталог</div>
        <h3 class="calc-card-title">Минимальный catalog data-layer под самописный магазин</h3>
        <p class="sublead">Отдельный manifest под категории и ключевые входы каталога. Следующий этап: связать его с генерацией карточек, SEO-полями и управлением SKU без ручной правки HTML.</p>
      </div>
      <div class="admin-toolbar-actions">
        <button class="btn btn-secondary" id="load-catalog-button" type="button">Загрузить каталог из backend</button>
        <button class="btn btn-primary" id="save-catalog-button" type="button">Сохранить каталог в backend</button>
      </div>
      <label class="admin-field">
        <span class="admin-field-label">Catalog manifest</span>
        <span class="admin-field-note">Пока в виде JSON-массива. Это отдельный слой данных, а не финальная CMS-форма.</span>
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
  const tableContent = !snapshot ? `
            <div class="admin-lead-empty">Snapshot ещё не загружен. Нужен рабочий backend apiBase и admin-сессия.</div>
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
        <p class="sublead">Отдельная операционная вкладка под SKU, цены, наличие и навигацию по магазину. Источник данных сейчас: backend snapshot, собранный из catalog build-layer.</p>
      </div>
      <div class="admin-block">
        <div class="admin-block-head">
          <div>
            <strong>Рабочий срез каталога</strong>
            <span>Поиск по названию, артикулу и маршруту, фильтр по категории и статусу наличия. Manifest каталога остаётся в соседней вкладке.</span>
          </div>
          <div class="admin-toolbar-actions">
            <button class="btn btn-secondary" id="inventory-refresh-button" type="button">Обновить snapshot</button>
            <button class="btn btn-secondary" id="inventory-copy-button" type="button">Скопировать snapshot</button>
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
          <div class="admin-mini-metric"><span>Товаров в snapshot</span><strong>${products.length}</strong></div>
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
    </div>
  `;
}

function renderUsersSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Доступ</div>
        <h3 class="calc-card-title">Пользователи и роли доступа</h3>
        <p class="sublead">Админы получают доступ к CRM и внутренним настройкам. Пользователи получают доступ к закрытому каталогу и спецстраницам. Access key остаётся резервным каналом, но основной вход теперь можно строить через логин и пароль.</p>
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
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">Audit</div>
        <h3 class="calc-card-title">История административных действий</h3>
        <p class="sublead">Здесь видно, кто входил в админку, менял настройки, пользователей и каталог. Это первый audit-layer поверх текущего backend.</p>
      </div>
      <div class="admin-toolbar-actions">
        <button class="btn btn-secondary" id="load-audit-button" type="button">Загрузить аудит</button>
      </div>
      <div class="admin-lead-list" id="admin-audit-list">
        <div class="admin-lead-empty">Аудит пока не загружен.</div>
      </div>
    </div>
  `;
}

function renderSeoSection() {
  return `
    <div class="admin-section-stack">
      <div class="admin-section-intro">
        <div class="tag">SEO</div>
        <h3 class="calc-card-title">Базовая SEO-рамка и правила индексации</h3>
        <p class="sublead">Этот слой должен совпадать со скриптом build-seo.mjs, robots.txt и реальной индексируемой картой сайта.</p>
      </div>
      <div class="admin-grid">
        ${inputField("seo.titleSuffix", "Title suffix", draft.seo.titleSuffix, "Хвост заголовков по умолчанию")}
        ${inputField("seo.canonicalOrigin", "Canonical origin", draft.seo.canonicalOrigin, "Основной origin для каноникалов")}
        ${textareaField("seo.defaultDescription", "Default description", draft.seo.defaultDescription, "Базовое описание проекта")}
      </div>
      <div class="admin-grid admin-grid-3">
        ${checkboxField("seo.indexPublicPages", "Индексировать публичные страницы", draft.seo.indexPublicPages)}
        ${checkboxField("seo.indexAdminPages", "Индексировать admin", draft.seo.indexAdminPages)}
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
        <h3 class="calc-card-title">Точки подвязки под CMS, CRM и data-layer</h3>
        <p class="sublead">Здесь фиксируется, как этот внутренний кабинет должен потом соединиться с калькулятором, каталогом и lead inbox.</p>
      </div>
      <div class="admin-grid">
        ${inputField("integrations.calculatorPricingAdmin", "Админка калькулятора", draft.integrations.calculatorPricingAdmin, "Текущий внутренний маршрут")}
        ${inputField("integrations.siteAdmin", "Site admin route", draft.integrations.siteAdmin, "Текущий корень кабинета")}
        ${inputField("integrations.catalogSource", "Источник каталога", draft.integrations.catalogSource, "Сейчас: static-html")}
        ${inputField("integrations.futureCms", "Future CMS", draft.integrations.futureCms, "Куда хотим расти")}
        ${inputField("integrations.futureCrm", "Future CRM", draft.integrations.futureCrm, "Как должен называться следующий слой")}
        ${inputField("integrations.apiBase", "API base", draft.integrations.apiBase, "Пока пусто")}
      </div>
      <div class="admin-grid">
        ${textareaField("integrations.note", "Примечание", draft.integrations.note, "Короткая дорожная карта под backend")}
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
  const crmStatus = draft.crm.enabled ? "включён" : "черновик";
  const publicPages = draft.pages.filter((page) => page.status === "published").length;
  const backendActive = Boolean(getApiBase());
  const roleLabel = backendAccessPolicy?.role || backendUser?.user_role || backendUser?.role || "гость";
  const visibleSections = Array.isArray(backendAccessPolicy?.sections)
    ? backendAccessPolicy.sections.length
    : getVisibleSections().length;
  const inventoryCount = getInventoryProducts().length;
  els.summary.innerHTML = [
    { label: "Публичные страницы", value: String(publicPages) },
    { label: "Режим форм", value: draft.forms.mode },
    { label: "CRM", value: crmStatus },
    { label: "Товаров в snapshot", value: inventoryCount ? String(inventoryCount) : "не загружены" },
    { label: "Telegram", value: draft.site.supportTelegram || "не указан" },
    { label: "Источники лидов", value: String(draft.crm.leadSources.length) },
    { label: "Стадии pipeline", value: String(draft.crm.pipeline.length) },
    { label: "Backend API", value: backendActive ? "указан" : "не указан" },
    { label: "Роль backend", value: String(roleLabel) },
    { label: "Видимых разделов", value: String(visibleSections) },
    { label: "Пользователи", value: usersDraft.length ? String(usersDraft.length) : "не загружены" },
    { label: "Аудит", value: auditDraft.length ? String(auditDraft.length) : "не загружен" },
  ].map((item) => `
    <div class="summary-item">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");

  els.jsonOutput.value = JSON.stringify(draft, null, 2);
  els.status.textContent = isDefaultState()
    ? "Черновик совпадает с базовой конфигурацией."
    : "Есть несохранённые изменения. Скачайте JSON или перенесите его в backend/CMS.";
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "admin-config.json";
  link.click();
  URL.revokeObjectURL(url);
  els.status.textContent = "admin-config.json подготовлен к скачиванию.";
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
  persistDraft();
  renderTabs();
  renderCurrentSection();
  renderSummary();
  els.status.textContent = "Черновик сброшен к базовой конфигурации.";
}

function persistDraft() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

function persistBackendToken() {
  if (!els.backendToken) return;
  window.localStorage.setItem(BACKEND_TOKEN_KEY, els.backendToken.value.trim());
}

function getApiBase() {
  return (draft.integrations?.apiBase || "").replace(/\/+$/, "");
}

function getBackendToken() {
  return (els.backendToken?.value || "").trim();
}

async function adminFetch(path, options = {}) {
  const apiBase = getApiBase();
  if (!apiBase) {
    throw new Error("Сначала укажите integrations.apiBase.");
  }
  const token = getBackendToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("X-KP-Requested-With", "klubnikaproject");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBase}${path}`, { ...options, headers, credentials: "include" });
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      applyGuestAccessState();
      els.sessionState.textContent = "Сессия истекла или была отозвана. Войдите снова.";
    }
    const error = new Error(text || `Backend returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function pullBackendDraft() {
  try {
    els.status.textContent = "Загружаю настройки из backend...";
    const response = await adminFetch("/admin/settings");
    draft = deepMerge(clone(DEFAULT_CONFIG), response.settings || {});
    persistDraft();
    renderTabs();
    renderCurrentSection();
    renderSummary();
    els.status.textContent = "Черновик обновлён из backend.";
  } catch (error) {
    els.status.textContent = `Не удалось загрузить настройки из backend: ${error.message}`;
  }
}

async function pushBackendDraft() {
  try {
    els.status.textContent = "Сохраняю настройки в backend...";
    await adminFetch("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ settings: draft }),
    });
    els.status.textContent = "Настройки сохранены в backend.";
  } catch (error) {
    els.status.textContent = `Не удалось сохранить настройки в backend: ${error.message}`;
  }
}

function getCrmApiBaseConfigured() {
  return Boolean(getApiBase());
}

function bindCrmWorkspaceControls() {
  const refreshButton = document.getElementById("crm-workspace-refresh");
  const viewButton = document.getElementById("crm-workspace-view-toggle");
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

  const fields = [searchField, statusField, ownerField, sourceField, tagField, followUpField].filter(Boolean);
  fields.forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    const handler = () => {
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
    if (!crmWorkspace.selectedLeadId && crmWorkspace.leads.length) {
      crmWorkspace.selectedLeadId = crmWorkspace.leads[0].id;
    }
    if (!crmWorkspace.leads.some((lead) => lead.id === crmWorkspace.selectedLeadId)) {
      crmWorkspace.selectedLeadId = crmWorkspace.leads[0]?.id || null;
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

  const statuses = crmWorkspace.pipelines[0]?.statuses || [];
  if (statusField) {
    statusField.innerHTML = `<option value="">Все стадии</option>${statuses.map((item) => `<option value="${escapeAttribute(item.code)}" ${crmWorkspace.filters.status_filter === item.code ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}`;
  }
  if (ownerField) {
    ownerField.innerHTML = `<option value="0">Все owner</option>${crmWorkspace.users.map((user) => `<option value="${user.id}" ${Number(crmWorkspace.filters.owner_id) === Number(user.id) ? "selected" : ""}>${escapeHtml(user.display_name)}</option>`).join("")}`;
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

  if (!crmWorkspace.leads.length) {
    board.innerHTML = '<div class="admin-lead-empty">По текущим фильтрам лидов нет.</div>';
    return;
  }

  if (crmWorkspace.view === "list" || !statuses.length) {
    board.innerHTML = `<div class="admin-crm-list">${crmWorkspace.leads.map(renderCrmLeadCard).join("")}</div>`;
  } else {
    board.innerHTML = `<div class="admin-crm-kanban">${statuses.map((status) => {
      const items = crmWorkspace.leads.filter((lead) => lead.status_code === status.code);
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

  board.querySelectorAll("[data-crm-open]").forEach((button) => {
    button.addEventListener("click", () => {
      crmWorkspace.selectedLeadId = Number(button.dataset.crmOpen);
      loadCrmLeadDetail(crmWorkspace.selectedLeadId);
      renderCrmWorkspace();
    });
  });
}

function renderCrmLeadCard(lead) {
  const selected = Number(crmWorkspace.selectedLeadId) === Number(lead.id);
  return `
    <article class="admin-crm-card ${selected ? "is-selected" : ""}">
      <div class="admin-crm-card-head">
        <strong>#${lead.id} · ${escapeHtml(lead.name || "Без имени")}</strong>
        <span class="admin-crm-follow-up is-${escapeAttribute(lead.follow_up_state || "none")}">${escapeHtml(lead.status_name || lead.status_code)}</span>
      </div>
      <div class="admin-crm-card-meta">
        <span>${escapeHtml(lead.owner_name || "Без owner")}</span>
        <span>${escapeHtml(lead.source || "Без источника")}</span>
      </div>
      <p>${escapeHtml(lead.request_type || lead.message || "Без описания")}</p>
      <div class="admin-crm-chip-row">
        ${(lead.tags || []).slice(0, 4).map((tag) => `<span class="admin-crm-chip">${escapeHtml(tag)}</span>`).join("")}
        ${lead.sync?.sync_status ? `<span class="admin-crm-chip is-sync">${escapeHtml(lead.sync.sync_status)}</span>` : ""}
      </div>
      <div class="admin-crm-card-meta">
        <span>${escapeHtml(lead.phone || lead.email || lead.telegram || "Нет контакта")}</span>
        <span>${escapeHtml(formatFollowUpLabel(lead.next_action_at, lead.follow_up_state))}</span>
      </div>
      <button class="btn btn-secondary" data-crm-open="${lead.id}" type="button">Открыть карточку</button>
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
  detail.innerHTML = `
    <div class="admin-crm-detail-head">
      <div>
        <strong>#${lead.id} · ${escapeHtml(lead.name || "Без имени")}</strong>
        <span>${escapeHtml(lead.request_type || lead.message || "")}</span>
      </div>
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
            <strong>${escapeHtml(item.event_type)}</strong>
            <span>${escapeHtml(item.created_at || "")}</span>
            <span>${escapeHtml(JSON.stringify(item.payload || {}))}</span>
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
  if (loadButton) loadButton.addEventListener("click", loadAuditEvents);
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
          <button class="btn btn-secondary admin-user-rotate" data-user-rotate="${user.id}" type="button">Сменить access key</button>
        </div>
      </article>
    `).join("");
    list.querySelectorAll("[data-user-save]").forEach((button) => {
      button.addEventListener("click", () => saveUser(button.dataset.userSave));
    });
    list.querySelectorAll("[data-user-rotate]").forEach((button) => {
      button.addEventListener("click", () => rotateUserKey(button.dataset.userRotate));
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
  const password = window.prompt("Пароль (минимум 10 символов, хотя бы одна буква и одна цифра; можно оставить пустым)", "") || "";
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
    els.status.textContent = `Пользователь создан. Access key: ${response.access_key}`;
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

async function rotateUserKey(userId) {
  try {
    const response = await adminFetch(`/admin/users/${userId}/rotate-key`, {
      method: "POST",
    });
    els.status.textContent = `Новый access key для пользователя #${userId}: ${response.access_key}`;
    loadUsers();
  } catch (error) {
    els.status.textContent = `Не удалось сменить ключ пользователя #${userId}: ${error.message}`;
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
    if (!auditDraft.length) {
      list.innerHTML = '<div class="admin-lead-empty">Аудит пока пустой.</div>';
      return;
    }
    list.innerHTML = auditDraft.map((item) => `
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
    `).join("");
  } catch (error) {
    list.innerHTML = `<div class="admin-lead-empty">Не удалось загрузить аудит: ${escapeHtml(error.message)}</div>`;
  }
}

async function setUserPassword(userId) {
  const password = window.prompt("Новый пароль пользователя (минимум 10 символов, хотя бы одна буква и одна цифра)");
  if (!password) return;
  if (password.length < 10 || !/[A-Za-zА-Яа-я]/.test(password) || !/\\d/.test(password)) {
    els.status.textContent = "Пароль должен быть не короче 10 символов и содержать хотя бы одну букву и одну цифру.";
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
    row.querySelector("[data-inventory-save]")?.addEventListener("click", () => {
      saveInventoryRow(row.dataset.inventoryRow);
    });
    row.querySelector("[data-inventory-reset]")?.addEventListener("click", () => {
      resetInventoryRow(row.dataset.inventoryRow);
    });
    updateInventoryRowState(row);
  });

  if (!catalogSnapshotDraft) {
    pullCatalogSnapshot(false);
  }
}

async function pullCatalogDraft() {
  const output = document.getElementById("admin-catalog-output");
  if (!output) return;
  try {
    els.status.textContent = "Загружаю каталог из backend...";
    const response = await adminFetch("/admin/catalog/items");
    catalogDraft = response.items || [];
    output.value = JSON.stringify(catalogDraft, null, 2);
    els.status.textContent = "Каталог загружен из backend.";
  } catch (error) {
    els.status.textContent = `Не удалось загрузить каталог: ${error.message}`;
  }
}

async function pushCatalogDraft() {
  const output = document.getElementById("admin-catalog-output");
  if (!output) return;
  try {
    catalogDraft = JSON.parse(output.value);
    els.status.textContent = "Сохраняю каталог в backend...";
    await adminFetch("/admin/catalog/items", {
      method: "PUT",
      body: JSON.stringify({ items: catalogDraft }),
    });
    els.status.textContent = "Каталог сохранён в backend.";
  } catch (error) {
    els.status.textContent = `Не удалось сохранить каталог: ${error.message}`;
  }
}

async function pullCatalogSnapshot(forceMessage = true) {
  if (!canAccessSection("inventory")) return;
  if (forceMessage) {
    els.status.textContent = "Загружаю товарный snapshot...";
  }
  try {
    const response = await adminFetch("/admin/catalog/snapshot");
    catalogSnapshotDraft = response.snapshot || null;
    renderSummary();
    if (currentSection === "inventory") {
      renderCurrentSection();
    }
    if (forceMessage) {
      els.status.textContent = "Товарный snapshot загружен.";
    }
  } catch (error) {
    if (currentSection === "inventory") {
      const shell = document.querySelector(".admin-inventory-table-shell");
      if (shell) {
        shell.innerHTML = `<div class="admin-lead-empty">Не удалось загрузить товарный snapshot: ${escapeHtml(error.message)}</div>`;
      }
    }
    if (forceMessage || !catalogSnapshotDraft) {
      els.status.textContent = `Не удалось загрузить товарный snapshot: ${error.message}`;
    }
  }
}

async function copyCatalogSnapshot() {
  if (!catalogSnapshotDraft) {
    els.status.textContent = "Сначала загрузите товарный snapshot.";
    return;
  }
  try {
    await copyText(JSON.stringify(catalogSnapshotDraft, null, 2));
    els.status.textContent = "Товарный snapshot скопирован в буфер.";
  } catch (error) {
    els.status.textContent = "Не удалось скопировать товарный snapshot.";
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
  row.querySelector('[data-inventory-field="price"]').value = formatNumberInputValue(product.price);
  row.querySelector('[data-inventory-field="oldPrice"]').value = formatNumberInputValue(product.oldPrice);
  row.querySelector('[data-inventory-field="stockStatus"]').value = product.stockStatus || "in_stock";
  updateInventoryRowState(row);
  els.status.textContent = `Изменения по ${slug} сброшены.`;
}

async function loginToBackend() {
  const token = getBackendToken();
  if (!token) {
    els.sessionState.textContent = "Вставьте token, если вход по паролю недоступен.";
    return;
  }
  try {
    els.sessionState.textContent = "Выполняю вход...";
    const response = await adminFetch("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    const user = response.user;
    await applyBackendAccessState(user || null);
    els.sessionState.textContent = user
      ? `Вы вошли как ${user.display_name || user.user_name || "пользователь"}.`
      : "Вход выполнен.";
  } catch (error) {
    els.sessionState.textContent = `Вход не удался: ${error.message}`;
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
    els.sessionState.textContent = "Выполняю вход по логину...";
    const response = await adminFetch("/admin/auth/password-login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    });
    const user = response.user;
    await applyBackendAccessState(user || null);
    els.sessionState.textContent = user
      ? `Вы вошли как ${user.display_name || user.user_name || "пользователь"}.`
      : "Вход выполнен.";
  } catch (error) {
    els.sessionState.textContent = `Не удалось войти: ${error.message}`;
  }
}

async function checkBackendSession() {
  try {
    els.sessionState.textContent = "Проверяю сессию...";
    const response = await adminFetch("/admin/auth/session");
    const user = response.user;
    await applyBackendAccessState(user || null);
    els.sessionState.textContent = response.session
      ? `Сессия активна: ${user?.display_name || user?.user_name || "пользователь"}.`
      : "Активная сессия не найдена.";
  } catch (error) {
    applyGuestAccessState();
    els.sessionState.textContent = `Сессию не удалось подтвердить: ${error.message}`;
  }
}

async function logoutFromBackend() {
  try {
    els.sessionState.textContent = "Завершаю сессию...";
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
  if (backendUser) {
    try {
      const response = await adminFetch("/admin/auth/access-policy");
      backendAccessPolicy = response.policy || null;
    } catch (error) {
      backendAccessPolicy = null;
    }
  }
  await renderOwnAdminSessions();
  renderTabs();
  renderCurrentSection();
  renderSummary();
}

function applyGuestAccessState() {
  backendUser = null;
  backendAccessPolicy = null;
  renderOwnAdminSessions();
  renderTabs();
  renderCurrentSection();
  renderSummary();
}

async function renderOwnAdminSessions() {
  if (!els.ownSessions) return;
  if (!backendUser) {
    els.ownSessions.innerHTML = '<div class="admin-lead-empty">Список сессий появится после входа.</div>';
    return;
  }
  try {
    const response = await adminFetch("/admin/auth/sessions");
    const items = response.items || [];
    if (!items.length) {
      els.ownSessions.innerHTML = '<div class="admin-lead-empty">Активных сессий не найдено.</div>';
      return;
    }
    els.ownSessions.innerHTML = items.map((item) => `
      <div class="admin-session-item">
        <strong>${item.current ? "Текущая сессия" : "Активная сессия"}</strong>
        <div class="admin-session-meta">
          <span>${escapeHtml(item.user_role || "admin")}</span>
          <span>Создана: ${escapeHtml(formatDateTime(item.created_at))}</span>
          <span>Истекает: ${escapeHtml(formatDateTime(item.expires_at))}</span>
        </div>
      </div>
    `).join("");
  } catch (error) {
    els.ownSessions.innerHTML = `<div class="admin-lead-empty">Не удалось загрузить сессии: ${escapeHtml(error.message)}</div>`;
  }
}

async function changeOwnPassword() {
  const currentPassword = els.currentPassword?.value || "";
  const newPassword = els.newPassword?.value || "";
  if (!backendUser?.user_id) {
    els.sessionState.textContent = "Смена пароля доступна только после входа под своим аккаунтом.";
    return;
  }
  if (!currentPassword || !newPassword) {
    els.sessionState.textContent = "Введите текущий и новый пароль.";
    return;
  }
  if (newPassword.length < 10 || !/[A-Za-zА-Яа-я]/.test(newPassword) || !/\d/.test(newPassword)) {
    els.sessionState.textContent = "Новый пароль должен быть не короче 10 символов и содержать букву и цифру.";
    return;
  }
  try {
    els.sessionState.textContent = "Обновляю пароль и закрываю другие сессии...";
    await adminFetch("/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    if (els.currentPassword) els.currentPassword.value = "";
    if (els.newPassword) els.newPassword.value = "";
    els.sessionState.textContent = "Пароль обновлён. Другие admin-сессии закрыты.";
    await renderOwnAdminSessions();
  } catch (error) {
    els.sessionState.textContent = `Не удалось сменить пароль: ${error.message}`;
  }
}

async function logoutOtherAdminSessions() {
  if (!backendUser?.user_id) {
    els.sessionState.textContent = "Сначала войдите под своим аккаунтом.";
    return;
  }
  try {
    els.sessionState.textContent = "Закрываю другие admin-сессии...";
    const response = await adminFetch("/admin/auth/logout-others", { method: "POST" });
    els.sessionState.textContent = `Другие сессии закрыты: ${response.revoked || 0}.`;
    await renderOwnAdminSessions();
  } catch (error) {
    els.sessionState.textContent = `Не удалось закрыть другие сессии: ${error.message}`;
  }
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
    return "Snapshot ещё не загружен. Нужен рабочий backend apiBase и активная admin-сессия.";
  }
  const generatedAt = snapshot.generatedAt || "неизвестно";
  const source = snapshot.source || "unknown";
  const counts = snapshot.counts || {};
  return [
    `Источник: ${source}`,
    `Сгенерировано: ${generatedAt}`,
    `Категорий: ${counts.categories || 0}`,
    `Товаров: ${counts.products || 0}`,
    `Позиции manifest: ${counts.items || 0}`,
    `Inventory overrides: ${counts.inventoryOverrides || 0}`,
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
          ${product.path ? `<a class="btn btn-secondary admin-inventory-open" href="..${escapeAttribute(product.path)}" target="_blank" rel="noopener">Открыть</a>` : ""}
        </div>
        <div class="admin-inventory-row-state" data-inventory-state>Совпадает со snapshot.</div>
      </td>
    </tr>
  `;
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
  const price = Number(row.querySelector('[data-inventory-field="price"]').value || 0);
  const oldPrice = Number(row.querySelector('[data-inventory-field="oldPrice"]').value || 0);
  return {
    price,
    old_price: Number.isFinite(oldPrice) && oldPrice > 0 ? oldPrice : null,
    stock_status: row.querySelector('[data-inventory-field="stockStatus"]').value || "in_stock",
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
  state.textContent = dirty ? "Есть несохранённые изменения." : "Совпадает со snapshot.";
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

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
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
