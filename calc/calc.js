import {
  CONTROL_CONFIG,
  calculateFarm,
  createDefaultState,
  formatRub,
  formatSmart,
  normalizeExpenseMode,
  normalizeInputValue,
  normalizeYieldScenario
} from "./calc-core.js";

const STORAGE_KEY = "klubnikaproject.calc.state.v2";

const STEP_META = [
  {
    title: "Что считаем",
    intro: "Сначала важно понять саму задачу. Этого достаточно, чтобы расчёт был полезным."
  },
  {
    title: "Формат объекта",
    intro: "На этом шаге появляются параметры помещения и базовые ограничения, которые меняют состав фермы."
  },
  {
    title: "Формат выращивания",
    intro: "Калькулятор заточен под клубнику в контролируемой среде и учитывает контекст выращивания."
  },
  {
    title: "Масштаб и базовые цифры",
    intro: "Здесь задаются параметры, которые реально влияют на смету, расходы и выручку."
  },
  {
    title: "Цель расчёта",
    intro: "Нужно понять, чего вы ждёте от результата: комплект, бюджет, сравнение вариантов или подготовку к запуску."
  },
  {
    title: "Канал реализации и ожидания",
    intro: "Этот блок помогает правильно интерпретировать рамку проекта и степень точности, которая вам сейчас нужна."
  },
  {
    title: "Контакты для следующего шага",
    intro: "Эти данные пригодятся, если вы захотите передать расчёт дальше без повторного ввода."
  }
];

const LABELS = {
  scenarioType: {
    start: "Запуск с нуля",
    existing: "Действующая ферма",
    expand: "Расширение фермы",
    budget: "Бюджет и состав"
  },
  roomStatus: {
    "have-room": "Помещение есть",
    "searching-room": "Помещение в поиске"
  },
  objectState: {
    new: "Новый объект",
    active: "Действующий объект"
  },
  roomHeight: {
    "under-3": "До 3 м",
    "3-4": "3–4 м",
    "over-4": "Выше 4 м"
  },
  climateReady: {
    yes: "Климатическая база есть",
    no: "Климатическую базу ещё считаем"
  },
  growingFormat: {
    "multi-tier": "Многоярусная ферма",
    greenhouse: "Теплица",
    other: "Другой формат"
  },
  strawberryFocus: {
    main: "Клубника — основной фокус",
    secondary: "Клубника — часть проекта"
  },
  schemeReady: {
    yes: "Схема уже понятна",
    no: "Схему ещё определяю"
  },
  scaleType: {
    pilot: "Пилотный модуль",
    small: "Малый запуск",
    current: "Действующий объект",
    expand: "Расширение"
  },
  goal: {
    kit: "Стартовая комплектация",
    budget: "Рамка бюджета",
    compare: "Сравнение сценариев",
    launch: "Подготовка к запуску",
    bottleneck: "Понять узкое место"
  },
  channel: {
    fresh: "Свежая ягода",
    local: "Локальные продажи",
    premium: "Премиальная ягода",
    test: "Тест модели",
    other: "Другая задача"
  }
};

const UI_DEFAULTS = {
  currentStep: 0,
  submitted: false,
  scenarioType: "start",
  roomStatus: "have-room",
  objectState: "new",
  roomHeight: "3-4",
  climateReady: "no",
  growingFormat: "multi-tier",
  strawberryFocus: "main",
  schemeReady: "no",
  scaleType: "pilot",
  goal: "kit",
  channel: "fresh",
  name: "",
  contact: "",
  email: "",
  city: ""
};

const NON_PERSISTED_KEYS = new Set(["name", "contact", "email", "city"]);

let pricing = null;
let state = null;

const elements = {
  wizardTitle: document.getElementById("wizard-title"),
  wizardIntro: document.getElementById("wizard-intro"),
  wizardStepCurrent: document.getElementById("wizard-step-current"),
  wizardProgressFill: document.getElementById("wizard-progress-fill"),
  wizardPanels: Array.from(document.querySelectorAll("[data-step-panel]")),
  wizardChips: Array.from(document.querySelectorAll("[data-go-step]")),
  wizardBack: document.getElementById("wizard-back"),
  wizardNext: document.getElementById("wizard-next"),
  totalEquipmentCost: document.getElementById("total-equipment-cost"),
  summaryGrid: document.getElementById("summary-grid"),
  briefChipList: document.getElementById("brief-chip-list"),
  nextStepTitle: document.getElementById("next-step-title"),
  nextStepText: document.getElementById("next-step-text"),
  projectBriefLink: document.getElementById("project-brief-link"),
  copyBriefButton: document.getElementById("copy-brief-button"),
  resultCopyBriefButton: document.getElementById("result-copy-brief-button"),
  equipmentWithoutSeedlings: document.getElementById("equipment-without-seedlings"),
  seedlingsTotalCost: document.getElementById("seedlings-total-cost"),
  budgetStructureGrid: document.getElementById("budget-structure-grid"),
  expenseList: document.getElementById("expense-list"),
  expenseTotalValue: document.getElementById("expense-total-value"),
  scenarioGrid: document.getElementById("scenario-grid"),
  paybackTableBody: document.getElementById("payback-table-body"),
  annualHarvest: document.getElementById("annual-harvest"),
  annualRevenue: document.getElementById("annual-revenue"),
  modelInvestmentCost: document.getElementById("model-investment-cost"),
  annualModelOpex: document.getElementById("annual-model-opex"),
  yieldScenarioToggle: document.getElementById("yield-scenario-toggle"),
  expenseModeToggle: document.getElementById("expense-mode-toggle"),
  resultStatusTitle: document.getElementById("result-status-title"),
  resultStatusText: document.getElementById("result-status-text"),
  resultPersonalTitle: document.getElementById("result-personal-title"),
  resultPersonalText: document.getElementById("result-personal-text"),
  resultPersonalMetrics: document.getElementById("result-personal-metrics"),
  resultRouteTitle: document.getElementById("result-route-title"),
  resultRouteText: document.getElementById("result-route-text"),
  resultProjectLink: document.getElementById("result-project-link"),
  resultSecondaryLink: document.getElementById("result-secondary-link"),
  resultIncludesList: document.getElementById("result-includes-list"),
  resultRelatedSection: document.getElementById("result-related"),
  resultRelatedGrid: document.getElementById("result-related-grid"),
  copyLinkButton: document.getElementById("copy-link-button"),
  resetButton: document.getElementById("reset-button")
};

init().catch((error) => {
  console.error(error);
  const wizardPanel = elements.wizardPanels[0];
  if (wizardPanel) {
    wizardPanel.innerHTML = `
      <div class="wizard-panel-top">
        <strong>Калькулятор не загрузился</strong>
        <p>Не удалось получить данные с ценами. Проверьте структуру файлов в папке <code>/calc</code>.</p>
      </div>
    `;
  }
});

async function init() {
  pricing = await loadPricing();
  state = buildInitialState(pricing);

  bindStaticEvents();
  renderYieldToggle();
  render();
}

async function loadPricing() {
  const response = await fetch("./pricing.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`pricing.json not loaded: ${response.status}`);
  }

  return response.json();
}

function buildInitialState(loadedPricing) {
  const storedState = loadStoredState();
  const params = new URLSearchParams(window.location.search);
  const nextState = {
    ...createDefaultState(loadedPricing),
    ...UI_DEFAULTS
  };

  nextState.expenseMode = normalizeExpenseMode(params.get("expense") || storedState.expenseMode || nextState.expenseMode);
  nextState.yieldScenario = normalizeYieldScenario(params.get("yield") || storedState.yieldScenario || nextState.yieldScenario, loadedPricing);
  nextState.currentStep = clampStep(storedState.currentStep ?? 0);
  nextState.submitted = Boolean(storedState.submitted);

  CONTROL_CONFIG.forEach((control) => {
    const rawValue = params.get(control.key) || storedState[control.key] || loadedPricing.inputs[control.key];
    nextState[control.key] = normalizeInputValue(rawValue, control);
  });

  Object.keys(UI_DEFAULTS).forEach((key) => {
    if (key in storedState && !NON_PERSISTED_KEYS.has(key)) {
      nextState[key] = storedState[key];
    }
  });

  return nextState;
}

function loadStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveState() {
  const persistedState = {};

  Object.keys(state).forEach((key) => {
    if (!NON_PERSISTED_KEYS.has(key)) {
      persistedState[key] = state[key];
    }
  });

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));

  const params = new URLSearchParams();
  CONTROL_CONFIG.forEach((control) => {
    params.set(control.key, String(state[control.key]));
  });
  params.set("expense", state.expenseMode);
  params.set("yield", state.yieldScenario);

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function bindStaticEvents() {
  document.querySelectorAll("[data-choice-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const { choiceKey, choiceValue } = button.dataset;
      state[choiceKey] = choiceValue;
      saveState();
      render();
    });
  });

  document.querySelectorAll("[data-input-type][data-key]").forEach((input) => {
    input.addEventListener("input", handleCalcInputChange);
    input.addEventListener("change", handleCalcInputChange);
  });

  document.querySelectorAll("[data-field-key]").forEach((field) => {
    field.addEventListener("input", handleFieldChange);
    field.addEventListener("change", handleFieldChange);
  });

  elements.expenseModeToggle.querySelectorAll("[data-expense-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.expenseMode = button.dataset.expenseMode;
      render();
    });
  });

  elements.wizardChips.forEach((button) => {
    button.addEventListener("click", () => {
      state.currentStep = clampStep(Number(button.dataset.goStep));
      saveState();
      renderWizard();
    });
  });

  elements.wizardBack.addEventListener("click", goBack);
  elements.wizardNext.addEventListener("click", goForward);
  elements.copyLinkButton.addEventListener("click", copyLink);
  elements.copyBriefButton.addEventListener("click", copyBrief);
  elements.resultCopyBriefButton?.addEventListener("click", copyBrief);
  elements.resetButton.addEventListener("click", resetState);
}

function handleCalcInputChange(event) {
  const input = event.currentTarget;
  const control = CONTROL_CONFIG.find((item) => item.key === input.dataset.key);
  if (!control) {
    return;
  }

  state[control.key] = normalizeInputValue(input.value, control);
  state.submitted = false;
  render();
}

function handleFieldChange(event) {
  const field = event.currentTarget;
  const { fieldKey } = field.dataset;
  if (!fieldKey) {
    return;
  }

  state[fieldKey] = field.value.trim();
  if (!NON_PERSISTED_KEYS.has(fieldKey)) {
    saveState();
  }

  renderWizard();
  renderPreviewState(calculateFarm(state, pricing));
}

function renderYieldToggle() {
  elements.yieldScenarioToggle.innerHTML = pricing.yieldScenarios.map((scenario) => `
    <button
      class="toggle-button${scenario.id === state.yieldScenario ? " is-active" : ""}"
      data-yield-scenario="${scenario.id}"
      type="button"
      aria-pressed="${scenario.id === state.yieldScenario}"
    >
      ${scenario.name}
    </button>
  `).join("");

  elements.yieldScenarioToggle.querySelectorAll("[data-yield-scenario]").forEach((button) => {
    button.addEventListener("click", () => {
      state.yieldScenario = button.dataset.yieldScenario;
      render();
    });
  });
}

function goBack() {
  state.currentStep = clampStep(state.currentStep - 1);
  saveState();
  renderWizard();
}

function goForward() {
  if (state.currentStep >= STEP_META.length - 1) {
    state.submitted = true;
    saveState();
    render();
    document.getElementById("result-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  state.currentStep = clampStep(state.currentStep + 1);
  saveState();
  renderWizard();
}

function resetState() {
  state = {
    ...createDefaultState(pricing),
    ...UI_DEFAULTS
  };
  render();
}

async function copyLink() {
  try {
    await copyText(window.location.href);
    flashButton(elements.copyLinkButton, "Ссылка скопирована");
  } catch (error) {
    console.error(error);
  }
}

async function copyBrief() {
  try {
    const calculation = calculateFarm(state, pricing);
    await copyText(buildBriefText(calculation));
    flashButton(elements.copyBriefButton, "Вводные скопированы");
    if (elements.resultCopyBriefButton) {
      flashButton(elements.resultCopyBriefButton, "Вводные скопированы");
    }
  } catch (error) {
    console.error(error);
  }
}

function flashButton(button, nextLabel) {
  const originalLabel = button.textContent;
  button.textContent = nextLabel;
  window.setTimeout(() => {
    button.textContent = originalLabel;
  }, 1600);
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
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

function render() {
  const calculation = calculateFarm(state, pricing);
  saveState();

  syncInputs();
  renderWizard();
  renderSummary(calculation);
  renderPreviewState(calculation);
  renderEquipment(calculation);
  renderExpenseBlock(calculation);
  renderRevenueBlock(calculation);
  renderAssumptions(calculation);
}

function syncInputs() {
  CONTROL_CONFIG.forEach((control) => {
    const inputs = document.querySelectorAll(`[data-key="${control.key}"]`);
    inputs.forEach((input) => {
      input.value = String(state[control.key]);
    });

    const valueLabel = document.getElementById(`${control.key}-value`);
    if (valueLabel) {
      valueLabel.textContent = `${formatValueWithUnit(state[control.key], control.unit)}`;
    }
  });

  document.querySelectorAll("[data-choice-key]").forEach((button) => {
    const isActive = state[button.dataset.choiceKey] === button.dataset.choiceValue;
    button.classList.toggle("is-active", isActive);
  });

  document.querySelectorAll("[data-field-key]").forEach((field) => {
    const key = field.dataset.fieldKey;
    if (field.value !== state[key]) {
      field.value = state[key];
    }
  });

  elements.expenseModeToggle.querySelectorAll("[data-expense-mode]").forEach((button) => {
    const isActive = button.dataset.expenseMode === state.expenseMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  elements.yieldScenarioToggle.querySelectorAll("[data-yield-scenario]").forEach((button) => {
    const isActive = button.dataset.yieldScenario === state.yieldScenario;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderWizard() {
  const stepIndex = clampStep(state.currentStep);
  const stepMeta = STEP_META[stepIndex];

  elements.wizardTitle.textContent = stepMeta.title;
  elements.wizardIntro.textContent = stepMeta.intro;
  elements.wizardStepCurrent.textContent = String(stepIndex + 1);
  elements.wizardProgressFill.style.width = `${((stepIndex + 1) / STEP_META.length) * 100}%`;

  elements.wizardPanels.forEach((panel) => {
    panel.classList.toggle("is-active", Number(panel.dataset.stepPanel) === stepIndex);
  });

  elements.wizardChips.forEach((button) => {
    const chipIndex = Number(button.dataset.goStep);
    button.classList.toggle("is-active", chipIndex === stepIndex);
    button.classList.toggle("is-complete", chipIndex < stepIndex || (state.submitted && chipIndex === stepIndex));
  });

  elements.wizardBack.disabled = stepIndex === 0;
  elements.wizardNext.textContent = stepIndex === STEP_META.length - 1 ? "Показать результат" : "Продолжить";
}

function renderSummary(calculation) {
  elements.totalEquipmentCost.textContent = formatRub(calculation.totalEquipmentCost);

  const summaryItems = [
    { label: "Площадь помещения", value: `${formatSmart(calculation.area)} м²` },
    { label: "Стеллажи", value: `${formatSmart(calculation.totalRacks)} шт.` },
    { label: "Кустов в модели", value: `${formatSmart(calculation.plantCount)} шт.` },
    {
      label: state.expenseMode === "month" ? "Расходы в месяц" : "Расходы в год",
      value: formatRub(state.expenseMode === "month" ? calculation.monthlyCosts.total : calculation.yearlyCosts.total)
    },
    { label: "Саженцев в закупке", value: `${formatSmart(calculation.seedlingPurchaseCount)} шт.` },
    { label: "Выручка в год", value: formatRub(calculation.activeScenario.annualRevenue) }
  ];

  elements.summaryGrid.innerHTML = summaryItems.map((item) => `
    <div class="summary-item">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");
}

function renderPreviewState(calculation) {
  const chips = [
    LABELS.scenarioType[state.scenarioType],
    LABELS.growingFormat[state.growingFormat],
    `${formatSmart(state.a0)} × ${formatSmart(state.a1)} м`,
    LABELS.scaleType[state.scaleType],
    LABELS.goal[state.goal],
    LABELS.channel[state.channel]
  ];

  elements.briefChipList.innerHTML = chips.map((item) => `<span class="brief-chip">${item}</span>`).join("");

  const route = buildRouteAdvice(calculation);
  elements.nextStepTitle.textContent = route.title;
  elements.nextStepText.textContent = route.text;
  elements.projectBriefLink.href = route.primary.href;
  elements.projectBriefLink.textContent = route.primary.label;

  elements.resultRouteTitle.textContent = route.title;
  elements.resultRouteText.textContent = route.text;
  elements.resultProjectLink.href = route.primary.href;
  elements.resultProjectLink.textContent = route.primary.label;
  elements.resultSecondaryLink.href = route.secondary.href;
  elements.resultSecondaryLink.textContent = route.secondary.label;
  renderPersonalResult(calculation);
  renderRelatedRecommendations(calculation);

  if (state.submitted) {
    elements.resultStatusTitle.textContent = "Расчёт по вашим вводным готов";
    elements.resultStatusText.textContent = "Данные сохранены. Ниже уже собрана рамка по вашей конфигурации, масштабу и бюджету.";
  } else {
    elements.resultStatusTitle.textContent = "Расчёт уже собирается по текущим вводным";
    elements.resultStatusText.textContent = "Завершите шаги и оставьте контакт, чтобы сохранить персональный результат и спокойно вернуться к нему позже.";
  }
}

function buildRouteAdvice(calculation) {
  const farmLink = buildFarmLink(calculation);
  const consultationsLink = "../consultations/#request";
  const managerLink = state.objectState === "active" || state.scenarioType === "existing" ? "../study/" : consultationsLink;

  if (state.goal === "bottleneck") {
    return {
      title: "Сначала соберите расчёт именно по вашей ферме",
      text: "Когда речь о узком месте, важнее понять текущую схему и вводные, чем сразу искать отдельную позицию в каталоге.",
      primary: {
        label: "Продолжить по моей ферме",
        href: farmLink
      },
      secondary: {
        label: "Разобрать с менеджером",
        href: "../study/"
      }
    };
  }

  if (state.objectState === "active" || state.scenarioType === "existing" || state.goal === "bottleneck") {
    return {
      title: "Лучше обсудить расчёт действующей фермы",
      text: "У вас не типовой старт. Здесь важнее сверить текущую схему, ограничения объекта и совместимость узлов, а уже потом решать, что менять или докупать.",
      primary: {
        label: "Открыть расчёт фермы",
        href: farmLink
      },
      secondary: {
        label: "Разобрать с менеджером",
        href: managerLink
      }
    };
  }

  if (state.scaleType === "current" || state.scaleType === "expand" || state.scenarioType === "expand") {
    return {
      title: "Лучше продолжить расчёт уже по вашему объекту",
      text: "На расширении уже важны проходы, высота, этапность закупки и связка стеллажей, света и полива. Здесь нужен персональный расчёт, а не общий ориентир.",
      primary: {
        label: "Продолжить по моей ферме",
        href: farmLink
      },
      secondary: {
        label: "Обсудить объект",
        href: managerLink
      }
    };
  }

  return {
    title: "Дальше можно перейти к подробному расчёту фермы",
    text: "Даже если задача выглядит типовой, персональный расчёт всё равно помогает не ошибиться с составом. Каталог и готовые решения лучше смотреть после него.",
    primary: {
      label: "Открыть расчёт фермы",
      href: farmLink
    },
    secondary: {
      label: "Разобрать с менеджером",
      href: managerLink
    }
  };
}

function renderPersonalResult(calculation) {
  const budgetRange = buildBudgetRange(calculation.totalEquipmentCost);
  const objectLabel = `${formatSmart(state.a0)} × ${formatSmart(state.a1)} м`;

  elements.resultPersonalTitle.textContent = state.submitted
    ? "Персональная рамка фермы по вашим вводным"
    : "Предварительный ориентир по текущим вводным";

  elements.resultPersonalText.textContent = [
    LABELS.scenarioType[state.scenarioType],
    LABELS.growingFormat[state.growingFormat],
    `${objectLabel}, ${LABELS.scaleType[state.scaleType].toLowerCase()}`
  ].join(" · ");

  const metrics = [
    { label: "Объект и масштаб", value: `${objectLabel} · ${formatSmart(calculation.area)} м²` },
    { label: "Конфигурация", value: `${formatSmart(calculation.totalRacks)} стеллажей · ${formatSmart(calculation.plantCount)} кустов` },
    { label: "Ориентир по бюджету", value: `${formatRub(budgetRange.min)} – ${formatRub(budgetRange.max)}` },
    { label: "Расходы / выручка", value: `${formatRub(calculation.monthlyCosts.total)} / мес · ${formatRub(calculation.activeScenario.annualRevenue)} / год` }
  ];

  elements.resultPersonalMetrics.innerHTML = metrics.map((item) => `
    <div class="result-personal-metric">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");

  elements.resultIncludesList.innerHTML = [
    `По узлам уже собрана базовая рамка: стеллажи, свет, полив и корневая зона под ${formatSmart(calculation.totalRacks)} модулей.`,
    `Ориентир по закупке оборудования и посадочного материала на ${formatRub(calculation.totalEquipmentCost)} в текущей модели.`,
    `Сценарная экономика: ${formatRub(calculation.monthlyCosts.total)} расходов в месяц и ${formatRub(calculation.activeScenario.annualRevenue)} выручки в год.`,
    `Понимание, что лучше делать дальше: считать подробнее, обсудить объект или уже потом добирать релевантные решения.`
  ].map((item) => `<li>${item}</li>`).join("");
}

function renderRelatedRecommendations(calculation) {
  if (!elements.resultRelatedSection || !elements.resultRelatedGrid) {
    return;
  }

  if (!state.submitted) {
    elements.resultRelatedSection.hidden = true;
    elements.resultRelatedGrid.innerHTML = "";
    return;
  }

  const cards = buildRelatedRecommendations(calculation);
  elements.resultRelatedSection.hidden = false;
  elements.resultRelatedGrid.innerHTML = cards.map((card) => `
    <article class="card result-card result-related-card">
      <div class="tag">${card.tag}</div>
      <h3>${card.title}</h3>
      <p class="sublead">${card.text}</p>
      <div class="btn-row">
        <a class="btn btn-secondary" href="${card.href}">${card.label}</a>
      </div>
    </article>
  `).join("");
}

function buildRelatedRecommendations(calculation) {
  const managerLink = state.objectState === "active" || state.scenarioType === "existing" ? "../study/" : "../consultations/#request";
  const needsTypicalSolutions = state.scaleType === "pilot" || state.goal === "kit";
  const nodeLink = state.growingFormat === "multi-tier" ? "../catalog/racks/index.html" : "../catalog/index.html";
  const lightingLink = "../catalog/led/index.html";
  const solutionLink = "../shop/solutions/";

  return [
    {
      tag: "Подходящие узлы",
      title: needsTypicalSolutions ? "Стеллажи и базовые узлы для первого контура" : "Релевантные узлы каталога под вашу конфигурацию",
      text: needsTypicalSolutions
        ? `Для рамки на ${formatSmart(calculation.totalRacks)} модулей сначала стоит смотреть конструкцию и базовую связку узлов.`
        : "После персонального расчёта уже проще перейти к узлам каталога и смотреть только то, что действительно подходит.",
      label: "Открыть узлы каталога",
      href: nodeLink
    },
    {
      tag: "Типовые решения",
      title: "Если нужен быстрый вход, посмотрите типовые решения",
      text: "Это уже следующий уровень: сначала расчёт вашей фермы, потом типовые решения и каталог.",
      label: "Открыть готовые решения",
      href: needsTypicalSolutions ? solutionLink : lightingLink
    },
    {
      tag: "Что дальше",
      title: "Сверить расчёт с менеджером или перейти к разбору",
      text: "Если объект нестандартный, действующий или поэтапный, полезнее не каталог, а разговор по вашей схеме.",
      label: "Открыть разбор",
      href: managerLink
    }
  ];
}

function buildBudgetRange(total) {
  return {
    min: Math.round(total * 0.9),
    max: Math.round(total * 1.15)
  };
}

function buildFarmLink(calculation) {
  const params = new URLSearchParams();
  const goalToNeed = {
    kit: "Состав комплекта",
    budget: "Всю ферму",
    compare: "Всю ферму",
    launch: "Всю ферму",
    bottleneck: "Состав комплекта"
  };

  if (state.name) {
    params.set("name", state.name);
  }
  if (state.contact) {
    params.set("contact", state.contact);
  }
  if (state.email) {
    params.set("email", state.email);
  }
  if (state.city) {
    params.set("city", state.city);
  }

  params.set("object", `${formatSmart(state.a0)} × ${formatSmart(state.a1)} м, ${LABELS.growingFormat[state.growingFormat]}`);
  params.set("stage", LABELS.scenarioType[state.scenarioType]);
  params.set("need", goalToNeed[state.goal] || "Всю ферму");
  params.set(
    "details",
    [
      `Масштаб: ${LABELS.scaleType[state.scaleType]}`,
      `Площадь: ${formatSmart(calculation.area)} м²`,
      `Стеллажи: ${formatSmart(calculation.totalRacks)} шт.`,
      `Смета: ${formatRub(calculation.totalEquipmentCost)}`,
      `Расходы в месяц: ${formatRub(calculation.monthlyCosts.total)}`,
      `Выручка в год: ${formatRub(calculation.activeScenario.annualRevenue)}`,
      `Канал: ${LABELS.channel[state.channel]}`,
      `Климатическая база: ${LABELS.climateReady[state.climateReady]}`
    ].join(" | ")
  );

  return `../farm/?${params.toString()}#brief`;
}

function buildBriefText(calculation) {
  return [
    "Калькулятор клубничной фермы — вводные",
    "",
    `Сценарий: ${LABELS.scenarioType[state.scenarioType]}`,
    `Объект: ${LABELS.objectState[state.objectState]}, ${LABELS.roomStatus[state.roomStatus]}`,
    `Размер помещения: ${formatSmart(state.a0)} × ${formatSmart(state.a1)} м`,
    `Высота: ${LABELS.roomHeight[state.roomHeight]}`,
    `Формат выращивания: ${LABELS.growingFormat[state.growingFormat]}`,
    `Фокус: ${LABELS.strawberryFocus[state.strawberryFocus]}`,
    `Масштаб: ${LABELS.scaleType[state.scaleType]}`,
    `Цель расчёта: ${LABELS.goal[state.goal]}`,
    `Канал: ${LABELS.channel[state.channel]}`,
    "",
    `Смета: ${formatRub(calculation.totalEquipmentCost)}`,
    `Оборудование без саженцев: ${formatRub(calculation.equipmentWithoutSeedlings)}`,
    `Посадочный материал: ${formatRub(calculation.seedlingsTotalCost)}`,
    `Расходы в месяц: ${formatRub(calculation.monthlyCosts.total)}`,
    `Выручка в год: ${formatRub(calculation.activeScenario.annualRevenue)}`,
    "",
    state.name ? `Имя: ${state.name}` : null,
    state.contact ? `Контакт: ${state.contact}` : null,
    state.email ? `Email: ${state.email}` : null,
    state.city ? `Город: ${state.city}` : null
  ].filter(Boolean).join("\n");
}

function renderEquipment(calculation) {
  elements.equipmentWithoutSeedlings.textContent = formatRub(calculation.equipmentWithoutSeedlings);
  elements.seedlingsTotalCost.textContent = formatRub(calculation.seedlingsTotalCost);

  const groupedBudget = [
    {
      title: "Конструкция и ярусы",
      total: sumLines(calculation.equipmentLines, ["rack-basic", "rack-extra", "trays"]),
      note: "Каркас, дополнительные секции и лотки, на которых собирается сама ферма."
    },
    {
      title: "Свет",
      total: sumLines(calculation.equipmentLines, ["lights"]),
      note: "Досветка под ярусную схему и текущую конфигурацию проекта."
    },
    {
      title: "Полив и узлы подачи",
      total: sumLines(calculation.equipmentLines, ["droppers", "blind-tube", "fittings", "filter", "pump", "punch", "meters"]),
      note: "Магистраль, капельницы, дозирование, фильтрация и базовый контроль раствора."
    },
    {
      title: "Корневая зона и запуск",
      total: sumLines(calculation.equipmentLines, ["mats", "holder", "support-tape", "fertilizer"]),
      note: "Субстрат, стартовые расходники и базовые позиции, без которых узел не запускается."
    }
  ];

  elements.budgetStructureGrid.innerHTML = groupedBudget.map((group) => `
    <div class="budget-structure-card">
      <span>${group.title}</span>
      <strong>${formatRub(group.total)}</strong>
      <p>${group.note}</p>
    </div>
  `).join("");
}

function sumLines(lines, ids) {
  const idSet = new Set(ids);
  return lines.reduce((sum, line) => sum + (idSet.has(line.id) ? line.total : 0), 0);
}

function renderExpenseBlock(calculation) {
  const currentCosts = state.expenseMode === "month" ? calculation.monthlyCosts : calculation.yearlyCosts;
  const modeLabel = state.expenseMode === "month" ? "в месяц" : "в год";

  const expenseItems = [
    { name: `СЗР и питание ${modeLabel}`, value: currentCosts.care },
    { name: `Электроэнергия ${modeLabel}`, value: currentCosts.electricity },
    { name: `Аренда ${modeLabel}`, value: currentCosts.rent },
    { name: `Вода ${modeLabel}`, value: currentCosts.water }
  ];

  elements.expenseList.innerHTML = expenseItems.map((item) => `
    <div class="expense-card">
      <span>${item.name}</span>
      <strong>${formatRub(item.value)}</strong>
    </div>
  `).join("");

  elements.expenseTotalValue.textContent = formatRub(currentCosts.total);
}

function renderRevenueBlock(calculation) {
  const activeScenario = calculation.activeScenario;

  elements.scenarioGrid.innerHTML = [
    { label: "Допущение по урожайности на 1 растение в год", value: `${formatSmart(activeScenario.kgPerPlantPerYear)} кг` },
    { label: "Ориентир по годовому объёму ягоды", value: `${formatSmart(activeScenario.annualHarvest)} кг` },
    { label: "Ориентир по денежному потоку в месяц", value: formatRub(activeScenario.monthlyRevenue) },
    { label: "Ориентир по денежному потоку в год", value: formatRub(activeScenario.annualRevenue) }
  ].map((item) => `
    <div class="scenario-card-lite">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");

  elements.paybackTableBody.innerHTML = activeScenario.cumulative.map((entry) => `
    <tr>
      <td>${entry.year} год</td>
      <td>${formatRub(entry.value)}</td>
    </tr>
  `).join("");

  elements.annualHarvest.textContent = `${formatSmart(activeScenario.annualHarvest)} кг`;
  elements.annualRevenue.textContent = formatRub(activeScenario.annualRevenue);
  elements.modelInvestmentCost.textContent = formatRub(calculation.modelInvestmentCost);
  elements.annualModelOpex.textContent = formatRub(calculation.annualModelOpex);
}

function renderAssumptions() {
}

function formatValueWithUnit(value, unit) {
  return `${formatSmart(value)} ${unit}`;
}

function clampStep(value) {
  return Math.max(0, Math.min(STEP_META.length - 1, Number.isFinite(value) ? value : 0));
}
