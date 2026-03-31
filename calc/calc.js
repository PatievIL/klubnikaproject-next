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

const STORAGE_KEY = "klubnikaproject.calc.state.v1";

let pricing = null;
let state = null;

const elements = {
  controlList: document.getElementById("control-list"),
  totalEquipmentCost: document.getElementById("total-equipment-cost"),
  summaryGrid: document.getElementById("summary-grid"),
  equipmentWithoutSeedlings: document.getElementById("equipment-without-seedlings"),
  seedlingsTotalCost: document.getElementById("seedlings-total-cost"),
  equipmentTableBody: document.getElementById("equipment-table-body"),
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
  assumptionList: document.getElementById("assumption-list"),
  copyLinkButton: document.getElementById("copy-link-button"),
  resetButton: document.getElementById("reset-button")
};

init().catch((error) => {
  console.error(error);
  if (elements.controlList) {
    elements.controlList.innerHTML = `
      <div class="control-card">
        <div class="control-label">Калькулятор не загрузился</div>
        <p class="control-note">Не удалось получить данные с ценами. Проверьте структуру файлов в папке \`/calc\`.</p>
      </div>
    `;
  }
});

async function init() {
  pricing = await loadPricing();
  state = buildInitialState(pricing);

  renderControls();
  renderYieldToggle();
  bindStaticEvents();
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
  const nextState = createDefaultState(loadedPricing);

  nextState.expenseMode = normalizeExpenseMode(params.get("expense") || storedState.expenseMode || nextState.expenseMode);
  nextState.yieldScenario = normalizeYieldScenario(params.get("yield") || storedState.yieldScenario || nextState.yieldScenario, loadedPricing);

  CONTROL_CONFIG.forEach((control) => {
    const rawValue = params.get(control.key) || storedState[control.key] || loadedPricing.inputs[control.key];
    nextState[control.key] = normalizeInputValue(rawValue, control);
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  const params = new URLSearchParams();
  CONTROL_CONFIG.forEach((control) => {
    params.set(control.key, String(state[control.key]));
  });
  params.set("expense", state.expenseMode);
  params.set("yield", state.yieldScenario);

  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", nextUrl);
}

function renderControls() {
  elements.controlList.innerHTML = CONTROL_CONFIG.map((control) => `
    <div class="control-card" data-control="${control.key}">
      <div class="control-top">
        <div>
          <div class="control-label">${control.label}</div>
          <div class="control-note">${control.note}</div>
        </div>
        <div class="control-value" id="${control.key}-value"></div>
      </div>
      <div class="control-inputs">
        <input
          class="control-range"
          data-input-type="range"
          data-key="${control.key}"
          type="range"
          min="${control.min}"
          max="${control.max}"
          step="${control.step}"
          value="${state[control.key]}"
        />
        <input
          class="control-number"
          data-input-type="number"
          data-key="${control.key}"
          type="number"
          min="${control.min}"
          max="${control.max}"
          step="${control.step}"
          value="${state[control.key]}"
        />
      </div>
    </div>
  `).join("");

  elements.controlList.querySelectorAll("[data-key]").forEach((input) => {
    input.addEventListener("input", handleInputChange);
    input.addEventListener("change", handleInputChange);
  });
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

function bindStaticEvents() {
  elements.expenseModeToggle.querySelectorAll("[data-expense-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.expenseMode = button.dataset.expenseMode;
      render();
    });
  });

  elements.copyLinkButton.addEventListener("click", copyLink);
  elements.resetButton.addEventListener("click", resetState);
}

function handleInputChange(event) {
  const input = event.currentTarget;
  const control = CONTROL_CONFIG.find((item) => item.key === input.dataset.key);
  if (!control) {
    return;
  }

  state[control.key] = normalizeInputValue(input.value, control);
  render();
}

function resetState() {
  state = createDefaultState(pricing);
  render();
}

async function copyLink() {
  try {
    await copyText(window.location.href);
    const originalLabel = elements.copyLinkButton.textContent;
    elements.copyLinkButton.textContent = "Ссылка скопирована";
    window.setTimeout(() => {
      elements.copyLinkButton.textContent = originalLabel;
    }, 1600);
  } catch (error) {
    console.error(error);
  }
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
  syncControls();

  const calculation = calculateFarm(state, pricing);
  saveState();

  renderSummary(calculation);
  renderEquipment(calculation);
  renderExpenseBlock(calculation);
  renderRevenueBlock(calculation);
  renderAssumptions(calculation);
}

function syncControls() {
  CONTROL_CONFIG.forEach((control) => {
    const rangeInput = elements.controlList.querySelector(`[data-input-type="range"][data-key="${control.key}"]`);
    const numberInput = elements.controlList.querySelector(`[data-input-type="number"][data-key="${control.key}"]`);
    const valueLabel = document.getElementById(`${control.key}-value`);

    if (rangeInput) {
      rangeInput.value = String(state[control.key]);
    }
    if (numberInput) {
      numberInput.value = String(state[control.key]);
    }
    if (valueLabel) {
      valueLabel.textContent = `${formatValueWithUnit(state[control.key], control.unit)}`;
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

function renderSummary(calculation) {
  elements.totalEquipmentCost.textContent = formatRub(calculation.totalEquipmentCost);

  const summaryItems = [
    { label: "Площадь помещения", value: `${formatSmart(calculation.area)} м²` },
    { label: "Стеллажи", value: `${formatSmart(calculation.totalRacks)} шт.` },
    { label: "Базовые / доп.", value: `${calculation.basicRacks} / ${calculation.extraRacks}` },
    { label: "Кустов в модели", value: `${formatSmart(calculation.plantCount)} шт.` },
    { label: "Саженцев в закупке", value: `${formatSmart(calculation.seedlingPurchaseCount)} шт.` },
    {
      label: state.expenseMode === "month" ? "Расходы в месяц" : "Расходы в год",
      value: formatRub(state.expenseMode === "month" ? calculation.monthlyCosts.total : calculation.yearlyCosts.total)
    }
  ];

  elements.summaryGrid.innerHTML = summaryItems.map((item) => `
    <div class="summary-item">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");
}

function renderEquipment(calculation) {
  elements.equipmentWithoutSeedlings.textContent = formatRub(calculation.equipmentWithoutSeedlings);
  elements.seedlingsTotalCost.textContent = formatRub(calculation.seedlingsTotalCost);

  elements.equipmentTableBody.innerHTML = calculation.equipmentLines.map((line) => `
    <tr>
      <td>${line.name}</td>
      <td>${formatSmart(line.qty)}</td>
      <td>${line.unit}</td>
      <td>${formatRub(line.total)}</td>
    </tr>
  `).join("");
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
    { label: "Урожай в год с 1 саженца", value: `${formatSmart(activeScenario.kgPerPlantPerYear)} кг` },
    { label: "Урожай в год со всех саженцев", value: `${formatSmart(activeScenario.annualHarvest)} кг` },
    { label: "Выручка в месяц", value: formatRub(activeScenario.monthlyRevenue) },
    { label: "Выручка в год", value: formatRub(activeScenario.annualRevenue) }
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

function renderAssumptions(calculation) {
  elements.assumptionList.innerHTML = [
    `${calculation.basicRacks} базовых и ${calculation.extraRacks} дополнительных стеллажей. Всего ${calculation.totalRacks} модулей в расчёте.`,
    `${pricing.constants.plantsPerRack} растений на стеллаж. В экономике это ${formatSmart(calculation.plantCount)} растений.`,
    `Блок расходов "в месяц" использует ${pricing.constants.monthlyPreviewLightHoursPerDay} часов света в день, а инвестиционная модель ниже — ${pricing.constants.paybackModelLightHoursPerDay} часов.`,
    `Посадочный материал в смете округляется до партии по 100 шт., а в годовой модели окупаемости считается по точному количеству растений.`
  ].map((item) => `<li>${item}</li>`).join("");
}

function formatValueWithUnit(value, unit) {
  return `${formatSmart(value)} ${unit}`;
}
