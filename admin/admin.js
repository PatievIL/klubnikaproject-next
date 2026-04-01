const STORAGE_KEY = "klubnikaproject.site.admin.draft.v1";

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
  forms: {
    mode: "telegram_handoff",
    primaryChannel: "telegram",
    handoffPrefix: "Новая заявка с сайта Klubnika Project",
    successHint: "Скопируйте вводные и отправьте их в Telegram, пока backend ещё не подключён.",
    openTelegramAfterCopy: true,
    collectEmail: true,
    collectPhone: true,
    collectTelegram: true,
    collectStage: true,
  },
  seo: {
    titleSuffix: "— Klubnika Project",
    defaultDescription: "Расчёт, магазин, подбор и сопровождение для клубничных ферм в контролируемой среде.",
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
      "Магазин",
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
    { id: "home", label: "Главная", goal: "Маршрутизатор", primaryCta: "Рассчитать ферму", secondaryCta: "Перейти в магазин", status: "published" },
    { id: "shop", label: "Магазин", goal: "Выбор категории и товара", primaryCta: "Подобрать комплект", secondaryCta: "Смотреть категории", status: "published" },
    { id: "farm", label: "Расчёт фермы", goal: "Собрать вводные и рамку сметы", primaryCta: "Передать вводные", secondaryCta: "Открыть калькулятор", status: "published" },
    { id: "study", label: "Сопровождение", goal: "Длинная работа по действующей ферме", primaryCta: "Оставить задачу", secondaryCta: "Посмотреть форматы", status: "published" },
    { id: "consultations", label: "Консультации", goal: "Точечный разбор", primaryCta: "Разобрать задачу", secondaryCta: "Сравнить с сопровождением", status: "published" },
    { id: "calc", label: "Калькулятор", goal: "Быстрый ориентир", primaryCta: "Начать расчёт", secondaryCta: "Понять, что получу", status: "published" },
  ],
  integrations: {
    calculatorPricingAdmin: "/calc/admin/",
    siteAdmin: "/admin/",
    catalogSource: "static-html",
    futureCms: "JSON/CMS-lite",
    futureCrm: "Lead inbox + pipeline",
    apiBase: "",
    note: "Под этот JSON дальше можно подвязать backend, не меняя логику секций.",
  },
};

const SECTIONS = [
  { id: "dashboard", label: "Обзор" },
  { id: "site", label: "Сайт" },
  { id: "pages", label: "Страницы" },
  { id: "forms", label: "Формы" },
  { id: "crm", label: "CRM" },
  { id: "seo", label: "SEO" },
  { id: "integrations", label: "Интеграции" },
];

const els = {
  tabs: document.getElementById("admin-tabs"),
  section: document.getElementById("admin-section-content"),
  summary: document.getElementById("admin-summary-grid"),
  status: document.getElementById("admin-status"),
  jsonOutput: document.getElementById("admin-json-output"),
  downloadButton: document.getElementById("download-admin-json"),
  copyButton: document.getElementById("copy-admin-json"),
  importInput: document.getElementById("import-admin-json"),
  resetButton: document.getElementById("reset-admin-button"),
};

let draft = clone(DEFAULT_CONFIG);
let currentSection = "dashboard";

init();

function init() {
  hydrateDraft();
  renderTabs();
  renderCurrentSection();
  renderSummary();
  bindGlobalEvents();
  persistDraft();
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

function bindGlobalEvents() {
  els.downloadButton.addEventListener("click", downloadJson);
  els.copyButton.addEventListener("click", copyJson);
  els.importInput.addEventListener("change", importJson);
  els.resetButton.addEventListener("click", resetDraft);
}

function renderTabs() {
  els.tabs.innerHTML = SECTIONS.map((section) => `
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

function renderCurrentSection() {
  const html = currentSection === "dashboard" ? renderDashboardSection()
    : currentSection === "site" ? renderSiteSection()
    : currentSection === "pages" ? renderPagesSection()
    : currentSection === "forms" ? renderFormsSection()
    : currentSection === "crm" ? renderCrmSection()
    : currentSection === "seo" ? renderSeoSection()
    : renderIntegrationsSection();

  els.section.innerHTML = html;
  bindSectionFields();
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
        <h3 class="calc-card-title">Задел под свой lead inbox и pipeline</h3>
        <p class="sublead">Это не рабочая CRM, а согласованная схема: какие поля, какие источники, какие стадии и где потом цеплять webhook.</p>
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
  els.summary.innerHTML = [
    { label: "Публичных страниц", value: String(publicPages) },
    { label: "Режим форм", value: draft.forms.mode },
    { label: "CRM", value: crmStatus },
    { label: "Telegram", value: draft.site.supportTelegram || "не указан" },
    { label: "Lead sources", value: String(draft.crm.leadSources.length) },
    { label: "Pipeline stages", value: String(draft.crm.pipeline.length) },
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
