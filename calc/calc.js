import {
  CONTROL_CONFIG,
  calculateFarm,
  createDefaultState,
  formatRub,
  formatSmart,
  normalizeInputValue
} from "./calc-core.js?v=20260405q";

const STORAGE_KEY = "klubnikaproject.calc.state.v4";
const BUILD_ID = "calc-20260405q";

const GOAL_COPY = {
  entry: {
    title: "Уже видно, где начинается рабочий вход в проект",
    meaning: "Это ориентир по порогу входа, а не попытка продать максимальную конфигурацию.",
    next: "Если рамка вам подходит, следующий шаг — проверить ваш объект и убрать лишнее."
  },
  object: {
    title: "Уже видно, что этот размер может дать по сборке",
    meaning: "Это помогает понять, стоит ли дальше работать именно с этим помещением.",
    next: "Если помещение реально существует, уже есть смысл перейти к разбору под объект."
  },
  kit: {
    title: "Уже видно, из чего складывается базовая сборка",
    meaning: "Это ориентир по составу, чтобы обсуждать уже не идею, а конфигурацию.",
    next: "Если состав близок к вашей задаче, дальше имеет смысл уточнить ограничения объекта."
  }
};

const UI_DEFAULTS = {
  goalType: "entry",
  roomMode: "need-room",
  presetSize: "4x8",
  phaseMode: "three-phase",
  cableLayoutMode: "tray"
};

let pricing = null;
let state = null;
const acceptedFields = new Set();

const elements = {
  goalChoiceGrid: document.getElementById("goal-choice-grid"),
  roomModeGrid: document.getElementById("room-mode-grid"),
  presetGrid: document.getElementById("preset-grid"),
  phaseModeGrid: document.getElementById("phase-mode-grid"),
  cableLayoutGrid: document.getElementById("cable-layout-grid"),
  roomPanels: Array.from(document.querySelectorAll("[data-room-panel]")),
  featureGrid: document.getElementById("feature-grid"),
  microResultTitle: document.getElementById("micro-result-title"),
  microResultValue: document.getElementById("micro-result-value"),
  microResultText: document.getElementById("micro-result-text"),
  microResultPills: document.getElementById("micro-result-pills"),
  microResultElectricity: document.getElementById("micro-result-electricity"),
  microResultWater: document.getElementById("micro-result-water"),
  microResultRent: document.getElementById("micro-result-rent"),
  microResultOperating: document.getElementById("micro-result-operating"),
  microResultPowerProfile: document.getElementById("micro-result-power-profile"),
  calcEntryStatus: document.getElementById("calc-entry-status"),
  microNextStep: document.getElementById("micro-next-step"),
  summaryProgressCount: document.getElementById("summary-progress-count"),
  summaryProgressText: document.getElementById("summary-progress-text"),
  totalEquipmentCost: document.getElementById("total-equipment-cost"),
  summaryMeaningNote: document.getElementById("summary-meaning-note"),
  summaryGrid: document.getElementById("summary-grid"),
  summaryBreakdown: document.getElementById("summary-breakdown"),
  briefChipList: document.getElementById("brief-chip-list"),
  nextStepTitle: document.getElementById("next-step-title"),
  nextStepText: document.getElementById("next-step-text"),
  summaryInterpretationTitle: document.getElementById("summary-interpretation-title"),
  summaryInterpretationText: document.getElementById("summary-interpretation-text"),
  equipmentWithoutSeedlings: document.getElementById("equipment-without-seedlings"),
  seedlingsTotalCost: document.getElementById("seedlings-total-cost"),
  assemblyIncludesList: document.getElementById("assembly-includes-list"),
  budgetStructureGrid: document.getElementById("budget-structure-grid"),
  detailNotes: document.getElementById("detail-notes"),
  electricalSummaryGrid: document.getElementById("electrical-summary-grid"),
  electricalKitGrid: document.getElementById("electrical-kit-grid"),
  electricalScheme: document.getElementById("electrical-scheme"),
  electricalLines: document.getElementById("electrical-lines"),
  dimensionHelperTitle: document.getElementById("dimension-helper-title"),
  dimensionHelperText: document.getElementById("dimension-helper-text"),
  resetDefaultsButton: document.getElementById("reset-defaults-button"),
  debugBuildId: document.getElementById("debug-build-id"),
  debugAppPhase: document.getElementById("debug-app-phase"),
  debugTotal: document.getElementById("debug-total"),
  debugGoal: document.getElementById("debug-goal"),
  debugRoom: document.getElementById("debug-room"),
  debugSize: document.getElementById("debug-size"),
  debugAppError: document.getElementById("debug-app-error"),
  debugGlobalError: document.getElementById("debug-global-error")
};

setDebugAppPhase("module");
window.addEventListener("error", (event) => {
  setDebugGlobalError(event.error?.message || event.message || "window error");
});
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason?.message || String(event.reason || "unhandled rejection");
  setDebugGlobalError(reason);
});

init().catch((error) => {
  console.error(error);
  setDebugAppError(error?.message || String(error));
  setDebugAppPhase("init-error");
});

async function init() {
  setDebugAppPhase("init");
  setDebugAppError("-");
  setDebugGlobalError("-");
  setDebugAppPhase("load-pricing");
  pricing = await loadPricing();
  setDebugAppPhase("build-state");
  state = buildInitialState();
  setDebugAppPhase("render-presets");
  renderPresetCards();
  renderFeatureToggles();
  setDebugAppPhase("bind-events");
  bindEvents();
  setDebugAppPhase("first-render");
  render();
  setDebugAppPhase("ready");
}

async function loadPricing() {
  const response = await fetch("./pricing.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`pricing.json not loaded: ${response.status}`);
  }

  return response.json();
}

function buildInitialState() {
  const stored = loadStoredState();
  const base = {
    ...UI_DEFAULTS,
    ...createDefaultState(pricing),
    ...stored
  };

  CONTROL_CONFIG.forEach((control) => {
    base[control.key] = normalizeInputValue(base[control.key], control);
  });

  if (!pricing.presets.some((preset) => preset.id === base.presetSize)) {
    base.presetSize = UI_DEFAULTS.presetSize;
  }

  syncPresetIntoState(base);
  return base;
}

function loadStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderPresetCards() {
  if (!elements.presetGrid) {
    return;
  }

  elements.presetGrid.innerHTML = pricing.presets.map((preset) => `
    <button class="scenario-card preset-card" type="button" data-choice-key="presetSize" data-choice-value="${preset.id}">
      <strong>${preset.label}</strong>
      <span>${preset.note}</span>
    </button>
  `).join("");
}

function renderFeatureToggles() {
  if (!elements.featureGrid) {
    return;
  }

  elements.featureGrid.innerHTML = (pricing.optionGroups || []).map((group) => `
    <label class="feature-toggle">
      <input type="checkbox" data-toggle-key="${group.stateKey}" />
      <span>
        <strong>${group.label}</strong>
        <small data-option-note="${group.id}">${formatOptionPrice(group)}</small>
      </span>
    </label>
  `).join("");
}

function bindEvents() {
  document.querySelectorAll("[data-choice-key]").forEach((button) => {
    button.addEventListener("click", handleChoiceClick);
  });

  document.querySelectorAll("[data-input-type='number'][data-key]").forEach((input) => {
    input.addEventListener("input", handleNumericInput);
    input.addEventListener("change", handleNumericInput);
    input.addEventListener("blur", handleNumericAccept);
  });

  document.querySelectorAll("[data-toggle-key]").forEach((input) => {
    input.addEventListener("change", handleToggleChange);
  });

  document.querySelectorAll("[data-step-control]").forEach((button) => {
    button.addEventListener("click", handleStepControlClick);
  });

  if (elements.resetDefaultsButton) {
    elements.resetDefaultsButton.addEventListener("click", handleResetDefaultsClick);
  }
}

function handleChoiceClick(event) {
  const button = event.currentTarget.closest("[data-choice-key]") || event.target.closest("[data-choice-key]");
  if (!button) {
    return;
  }

  const { choiceKey, choiceValue } = button.dataset;
  state[choiceKey] = choiceValue;

  if (choiceKey === "presetSize") {
    syncPresetIntoState(state);
  }

  if (choiceKey === "roomMode" && choiceValue === "need-room") {
    syncPresetIntoState(state);
  }

  render();
}

function handleNumericInput(event) {
  const input = event.currentTarget;
  const control = CONTROL_CONFIG.find((item) => item.key === input.dataset.key);
  if (!control) {
    return;
  }

  state[control.key] = normalizeInputValue(input.value, control);
  acceptedFields.add(control.key);
  input.value = state[control.key];
  render();
}

function handleNumericAccept(event) {
  const key = event.currentTarget.dataset.key;
  if (!key) {
    return;
  }

  acceptedFields.add(key);
  render();
}

function handleToggleChange(event) {
  const key = event.currentTarget.dataset.toggleKey;
  state[key] = event.currentTarget.checked;
  render();
}

function handleStepControlClick(event) {
  const button = event.currentTarget;
  const key = button.dataset.stepControl;
  const direction = Number(button.dataset.stepDirection || 0);
  if (!key || !direction) {
    return;
  }

  const control = CONTROL_CONFIG.find((item) => item.key === key);
  if (!control) {
    return;
  }

  const step = Number(control.step || 1);
  const currentValue = normalizeInputValue(state[key], control);
  const nextValue = normalizeInputValue(currentValue + direction * step, control);
  state[key] = nextValue;
  acceptedFields.add(key);

  const input = document.querySelector(`[data-input-type='number'][data-key='${key}']`);
  if (input) {
    input.value = nextValue;
  }

  render();
}

function handleResetDefaultsClick() {
  const defaults = createDefaultState(pricing);

  CONTROL_CONFIG.forEach((control) => {
    state[control.key] = defaults[control.key];
    acceptedFields.add(control.key);
  });

  if (state.roomMode === "need-room") {
    state.presetSize = UI_DEFAULTS.presetSize;
    syncPresetIntoState(state);
  }

  render();
}

function syncPresetIntoState(targetState) {
  if (targetState.roomMode !== "need-room") {
    return;
  }

  const preset = pricing.presets.find((entry) => entry.id === targetState.presetSize) || pricing.presets[0];
  targetState.a0 = normalizeInputValue(preset.width, CONTROL_CONFIG[0]);
  targetState.a1 = normalizeInputValue(preset.length, CONTROL_CONFIG[1]);
}

function render() {
  saveState();

  const calc = calculateFarm(state, pricing);
  renderChoiceStates();
  renderPanels();
  renderInputs();
  renderAcceptedFields();
  renderFeatureToggleNotes(calc);
  renderDimensionHelper(calc);
  renderMicroResult(calc);
  renderSummary(calc);
  renderDetails(calc);
  renderDebug(calc);
}

function renderChoiceStates() {
  document.querySelectorAll("[data-choice-key]").forEach((button) => {
    const { choiceKey, choiceValue } = button.dataset;
    button.classList.toggle("is-active", String(state[choiceKey]) === choiceValue);
  });

  document.querySelectorAll("[data-toggle-key]").forEach((input) => {
    input.checked = Boolean(state[input.dataset.toggleKey]);
  });

}

function renderPanels() {
  elements.roomPanels.forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.roomPanel === state.roomMode);
  });
}

function renderInputs() {
  CONTROL_CONFIG.forEach((control) => {
    document.querySelectorAll(`[data-key="${control.key}"]`).forEach((input) => {
      input.value = state[control.key];
    });
  });
}

function renderAcceptedFields() {
  document.querySelectorAll(".compact-control[data-control-key]").forEach((field) => {
    field.classList.toggle("is-accepted", acceptedFields.has(field.dataset.controlKey));
  });

  document.querySelectorAll("[data-accepted-mark]").forEach((mark) => {
    mark.hidden = !acceptedFields.has(mark.dataset.acceptedMark);
  });
}

function renderDimensionHelper(calc) {
  if (!elements.dimensionHelperTitle || !elements.dimensionHelperText) {
    return;
  }

  elements.dimensionHelperTitle.textContent = `${formatSmart(calc.rackCount)} стеллажей × ${formatSmart(calc.rackLength)} м • ${formatSmart(calc.plantCount)} растений`;
  if (elements.dimensionHelperText) {
    elements.dimensionHelperText.textContent = `${calc.heightProfile.title}: ${calc.heightProfile.note} Дальше можно посмотреть состав и закупку ниже.`;
  }
}

function renderMicroResult(calc) {
  const copy = GOAL_COPY[state.goalType] || GOAL_COPY.entry;
  const selectedOptions = calc.selectedItems.filter((item) => item.id !== "assembly").length;
  const driverText = state.roomMode === "have-room"
    ? "Размер, этажность и выбранные блоки"
    : "Типовой размер, этажность и выбранные блоки";
  const nextText = state.roomMode === "have-room"
    ? "Если помещение уже выбрано, дальше можно считать под объект"
    : "Если рамка подходит, дальше можно привязать её к реальному помещению";

  elements.microResultTitle.textContent = copy.title;
  elements.microResultValue.textContent = formatRub(calc.totalEquipmentCost);
  if (elements.microResultText) {
    elements.microResultText.textContent = copy.meaning;
  }
  elements.calcEntryStatus.textContent = driverText;
  elements.microNextStep.textContent = nextText;
  if (elements.microResultElectricity) {
    elements.microResultElectricity.textContent = `${formatRub(calc.electrical.monthlyPowerCost)} / ${formatSmart(calc.electrical.monthlyKwh)} кВт⋅ч`;
  }
  if (elements.microResultWater) {
    elements.microResultWater.textContent = `${formatSmart(calc.water.monthlyM3)} м³ · ${formatRub(calc.water.monthlyWaterCost)}`;
  }
  if (elements.microResultRent) {
    elements.microResultRent.textContent = formatRub(calc.monthlyRentCost);
  }
  if (elements.microResultOperating) {
    elements.microResultOperating.textContent = formatRub(calc.monthlyOperatingCost);
  }
  if (elements.microResultPowerProfile) {
    elements.microResultPowerProfile.textContent = `Считаем по тарифу ${formatRub(calc.powerRate)} за кВт⋅ч и добавляем ориентир расхода воды по капельному поливу.`;
  }
  elements.microResultPills.innerHTML = [
    `${formatSmart(calc.width)} × ${formatSmart(calc.length)} м`,
    `${formatSmart(calc.rackCount)} стеллажей`,
    `${formatSmart(calc.rackLength)} м длина`,
    `${calc.heightProfile.tiers} этажа`,
    `${formatSmart(calc.plantCount)} растений`,
    selectedOptions ? `${selectedOptions} доп. блока` : "Только базовая сборка"
  ].map((item) => `<span class="chip">${item}</span>`).join("");
}

function renderSummary(calc) {
  const copy = GOAL_COPY[state.goalType] || GOAL_COPY.entry;
  const sizeLabel = `${formatSmart(calc.width)} × ${formatSmart(calc.length)} м`;

  elements.summaryProgressCount.textContent = state.roomMode === "have-room" ? "Считаем по вашему помещению" : "Считаем по примеру";
  if (elements.summaryProgressText) {
    elements.summaryProgressText.textContent = state.roomMode === "have-room"
      ? "Размеры уже учтены в расчёте."
      : "Пока считаем на типовом размере.";
  }
  elements.totalEquipmentCost.textContent = formatRub(calc.totalEquipmentCost);
  elements.summaryMeaningNote.textContent = `Это ориентир по рабочей конфигурации: ${formatSmart(calc.plantCount)} растений, ${formatSmart(calc.trayCount)} лотков и ${formatSmart(calc.totalRackLength)} м рабочей длины.`;

  elements.summaryGrid.innerHTML = [
    { label: "Размер", value: sizeLabel },
    { label: "Стеллажей", value: `${formatSmart(calc.rackCount)} шт` },
    { label: "Длина стеллажа", value: `${formatSmart(calc.rackLength)} м` },
    { label: "Этажей", value: formatSmart(calc.heightProfile.tiers) },
    { label: "Растений", value: formatSmart(calc.plantCount) },
    { label: "Питание", value: calc.electrical.phaseLabel },
    { label: "Электроэнергия", value: `${formatSmart(calc.electrical.monthlyKwh)} кВт⋅ч` },
    { label: "Энергия/мес", value: formatRub(calc.electrical.monthlyPowerCost) },
    { label: "Вода/мес", value: `${formatSmart(calc.water.monthlyM3)} м³` },
    { label: "Вода стоимость/мес", value: formatRub(calc.water.monthlyWaterCost) },
    { label: "Аренда/мес", value: formatRub(calc.monthlyRentCost) },
    { label: "Расходы всего/мес", value: formatRub(calc.monthlyOperatingCost) },
    { label: "Нагрузка", value: `${formatSmart(calc.electrical.totalPowerKw)} кВт` },
    { label: "Ток", value: `${formatSmart(calc.electrical.runningAmps)} А` }
  ].map(renderSummaryItem).join("");

  elements.summaryBreakdown.innerHTML = calc.lineItems.map((item) => `
    <div class="summary-breakdown-row ${item.included ? "is-included" : "is-muted"}">
      <div>
        <strong>${item.label}</strong>
        <span>${item.included ? formatLineMeta(item) : "Не включено в текущий ориентир"}</span>
      </div>
      <b>${item.included ? formatRub(item.total) : "0 ₽"}</b>
    </div>
  `).join("");

  elements.briefChipList.innerHTML = buildDriverChips(calc).map((item) => `<span class="brief-chip">${item}</span>`).join("");
  elements.nextStepTitle.textContent = state.roomMode === "have-room"
    ? "Если цифра подходит, следующий шаг — проверить объект детально"
    : "Если цифра подходит, следующий шаг — подставить реальный объект";
  if (elements.nextStepText) {
    elements.nextStepText.textContent = state.roomMode === "have-room"
      ? "Проверить проходы, коммуникации, логистику и после этого собрать финальную конфигурацию."
      : "Когда появится помещение, этот расчёт можно быстро привязать к его реальным ограничениям.";
  }
  elements.summaryInterpretationTitle.textContent = state.roomMode === "have-room"
    ? "Это уже не абстрактная сумма"
    : "Это рабочий ориентир для старта";
  if (elements.summaryInterpretationText) {
    elements.summaryInterpretationText.textContent = state.roomMode === "have-room"
      ? "Сумма собрана по вашим размерам и показывает, сколько реально помещается в этой конфигурации."
      : "Даже без точного объекта уже видно порядок цифр, масштаб и следующий шаг.";
  }
}

function renderDetails(calc) {
  elements.equipmentWithoutSeedlings.textContent = formatRub(calc.equipmentWithoutSeedlings);
  elements.seedlingsTotalCost.textContent = formatRub(calc.seedlingsTotalCost);
  if (elements.assemblyIncludesList) {
    elements.assemblyIncludesList.innerHTML = calc.baseAssemblyIncludes.map((item) => `
      <div class="brief-chip">${item}</div>
    `).join("");
  }

  elements.budgetStructureGrid.innerHTML = calc.selectedItems.map((item) => `
    <div class="summary-item">
      <span>${item.label}</span>
      <strong>${formatRub(item.total)}</strong>
    </div>
  `).join("");

  elements.detailNotes.innerHTML = [
    "Ориентир не учитывает индивидуальные строительные работы и нестандартную доработку объекта.",
    "Если помещение уже есть, финальная цифра зависит от проходов, логистики и фактической полезной площади.",
    "Если помещения ещё нет, этот расчёт нужен как рамка бюджета, чтобы не обсуждать проект вслепую.",
    `Цена реализации ягоды для ориентиров принята: ${formatRub(calc.berrySalePricePerKg)} за кг.`,
    `Вода: ориентир ${formatSmart(calc.water.monthlyM3)} м³/мес (${formatSmart(calc.water.dailyLiters)} л/день) из нормы до ${formatSmart(calc.water.perDripperMlPerDay)} мл/день на одну капельницу.`,
    `Маты: нужно ${formatSmart(calc.matCount)} шт, на закупку ${formatSmart(calc.matPacks)} пач. по 12 = ${formatSmart(calc.matUnitsForPurchase)} шт. Запас после округления: ${formatSmart(calc.spareMats)} шт.`,
    `Слепая трубка: нужно ${formatSmart(calc.blindTubeMeters)} м, на закупку ${formatSmart(calc.blindTubeCoils)} бух. по 200 м = ${formatSmart(calc.blindTubeMetersForPurchase)} м.`
  ].concat(
    calc.lineItems
      .filter((item) => item.id !== "assembly" && item.includes?.length)
      .map((item) => `${item.label}: ${item.includes.join(", ")}`)
  ).map((item) => `<div class="detail-note">${item}</div>`).join("");

  if (elements.electricalSummaryGrid) {
    elements.electricalSummaryGrid.innerHTML = [
      { label: "Питание", value: calc.electrical.phaseLabel },
      { label: "Нагрузка", value: `${formatSmart(calc.electrical.totalPowerKw)} кВт` },
      { label: "Ток", value: `${formatSmart(calc.electrical.runningAmps)} А` },
      { label: "Вводной автомат", value: `${formatSmart(calc.electrical.inputBreakerA)} А` },
      { label: "Линии света", value: `${formatSmart(calc.electrical.totalLightLines)} шт` },
      { label: "Контакторы 2P", value: `${formatSmart(calc.electrical.contactorCount)} × ${formatSmart(calc.electrical.contactorRatingA)} А` },
      { label: "Кабель света", value: `${formatSmart(calc.electrical.allLightLinesM)} м` },
      { label: "Кабель всего", value: `${formatSmart(calc.electrical.totalCableM)} м` }
    ].map(renderSummaryItem).join("");
  }

  if (elements.electricalKitGrid) {
    elements.electricalKitGrid.innerHTML = calc.electrical.bomItems.map((item) => `
      <div class="summary-item">
        <span>${item.label}</span>
        <strong>${formatSmart(item.qty)} ${item.unit}</strong>
        <span>${item.spec}</span>
      </div>
    `).join("");
  }

  if (elements.electricalScheme) {
    elements.electricalScheme.textContent = "ВРУ -> щит фермы -> вводной автомат -> автоматы линий -> 2P контакторы -> линии драйверов 1/2 -> стеллажи. Отдельно идут вытяжка, сплит и сервисная группа.";
  }

  if (elements.electricalLines) {
    const energy = calc.electrical.monthlyElectricitySummary || {};
    elements.electricalLines.innerHTML = [
      `Свет: ${formatSmart(calc.electrical.lightCount)} светильников = ${formatSmart(calc.electrical.lightPowerTotalKw)} кВт. Считаем ${formatSmart(calc.electrical.driverSideLineCount)} линий драйверов 1 и ${formatSmart(calc.electrical.driverSideLineCount)} линий драйверов 2.`,
      `На одну линию света закладываем до ${formatSmart(calc.electrical.lightLineAmps)} А. Рекомендуемый автомат линии = ${formatSmart(calc.electrical.lightLineBreakerA)} А, контактор = ${formatSmart(calc.electrical.contactorRatingA)} А 2P.`,
      `Кабель до стеллажей: ${formatSmart(calc.electrical.totalLightLines)} линий по ${formatSmart(calc.electrical.oneLightLineM)} м. По схеме "${calc.electrical.cableLayoutLabel}" это даёт около ${formatSmart(calc.electrical.allLightLinesM)} м силового кабеля света.`,
      `Вытяжка: до ${formatSmart(calc.electrical.exhaustPowerW / 1000)} кВт, кабель около ${formatSmart(calc.electrical.exhaustLineM)} м. Сервисная группа: ${formatSmart(calc.electrical.serviceSocketPoints)} точек, резерв ${formatSmart(calc.electrical.serviceReserveW / 1000)} кВт, кабель около ${formatSmart(calc.electrical.serviceLineM)} м.`
      ,
      `Расход на месяц: ${formatSmart(calc.electrical.monthlyKwh)} кВт⋅ч · ${formatRub(calc.electrical.monthlyPowerCost)} (свет: ${formatSmart(energy.lightKwhPerDay || 0)} кВт⋅ч/день, кондер: ${formatSmart(energy.condenserKwhPerDay || 0)} кВт⋅ч/день, вытяжка: ${formatSmart(energy.exhaustKwhPerDay || 0)} кВт⋅ч/день, насос: ${formatSmart(energy.pumpKwhPerDay || 0)} кВт⋅ч/день, автоматика: ${formatSmart(energy.automationKwhPerDay || 0)} кВт⋅ч/день), вода: ${formatSmart(calc.water.monthlyM3)} м³ · ${formatRub(calc.water.monthlyWaterCost)}, аренда: ${formatRub(calc.monthlyRentCost)}, всего: ${formatRub(calc.monthlyOperatingCost)}.`
    ].concat(
      calc.electrical.splitInputW
        ? [`Сплит: холодопроизводительность около ${formatSmart(calc.electrical.splitBtu)} BTU/h, потребление примерно ${formatSmart(calc.electrical.splitInputW / 1000)} кВт, кабель около ${formatSmart(calc.electrical.splitLineM)} м.`]
        : []
    ).map((item) => `<div class="detail-note">${item}</div>`).join("");
  }
}

function renderDebug(calc) {
  if (elements.debugBuildId) {
    elements.debugBuildId.textContent = BUILD_ID;
  }
  if (elements.debugTotal) {
    elements.debugTotal.textContent = formatRub(calc.totalEquipmentCost);
  }
  if (elements.debugGoal) {
    elements.debugGoal.textContent = state.goalType;
  }
  if (elements.debugRoom) {
    elements.debugRoom.textContent = state.roomMode;
  }
  if (elements.debugSize) {
    elements.debugSize.textContent = `${formatSmart(state.a0)}×${formatSmart(state.a1)}×${formatSmart(state.a2)}`;
  }
}

function setDebugAppPhase(value) {
  if (elements.debugAppPhase) {
    elements.debugAppPhase.textContent = value;
  }
}

function setDebugAppError(value) {
  if (elements.debugAppError) {
    elements.debugAppError.textContent = String(value).slice(0, 120);
  }
}

function setDebugGlobalError(value) {
  if (elements.debugGlobalError) {
    elements.debugGlobalError.textContent = String(value).slice(0, 120);
  }
}

function renderSummaryItem(item) {
  return `
    <div class="summary-item">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `;
}

function buildDriverChips(calc) {
  const chips = [
    `${formatSmart(calc.width)} × ${formatSmart(calc.length)} м`,
    `${formatSmart(calc.rackCount)} стеллажей`,
    `${calc.heightProfile.tiers} этажа`,
    `${formatSmart(calc.plantCount)} растений`,
    calc.electrical.phaseLabel,
    `${formatSmart(calc.electrical.runningAmps)} А`
  ];

  calc.selectedItems
    .filter((item) => item.id !== "assembly")
    .slice(0, 3)
    .forEach((item) => chips.push(item.label));

  return chips;
}

function formatLineMeta(item) {
  if (item.unit === "м²" && item.total) {
    return `${formatSmart(item.qty)} ${item.unit} × ${formatRub(item.unitPrice)}, округление = ${formatRub(item.total)}`;
  }

  if (item.id === "electrical" && item.total) {
    return `${formatSmart(item.qty)} линий света, щит, автоматы, контакторы, кабель, WAGO и коробки = ${formatRub(item.total)}`;
  }

  return `${formatSmart(item.qty)} ${item.unit} × ${formatRub(item.unitPrice)}`;
}

function formatOptionPrice(group) {
  if (group.type === "electricalAuto") {
    return "Считаем от линий, щита и кабеля";
  }

  if (group.type === "perAreaRounded") {
    return `${formatRub(group.unitPrice)} за м²`;
  }

  return group.type === "perPlant"
    ? `Плюс ${formatRub(group.unitPrice)} на растение`
    : `Плюс ${formatRub(group.unitPrice)}`;
}

function renderFeatureToggleNotes(calc) {
  document.querySelectorAll("[data-option-note]").forEach((node) => {
    const group = (pricing.optionGroups || []).find((item) => item.id === node.dataset.optionNote);
    if (!group) {
      return;
    }

    if (group.id === "fertilizers") {
      const total = roundToThousands(calc.plantCount * group.unitPrice);
      node.textContent = `Около ${formatRub(total)}`;
      return;
    }

    if (group.id === "climate-pack") {
      const total = roundToStep(calc.area * group.unitPrice, group.roundTo || 5000, group.roundMode);
      node.textContent = `Около ${formatRub(total)}`;
      return;
    }

    if (group.id === "project-support-month") {
      const total = Math.max(
        roundToStep(calc.area * group.unitPrice, group.roundTo || 5000, group.roundMode),
        group.minTotal || 0
      );
      node.textContent = total <= (group.minTotal || 0)
        ? `От ${formatRub(group.minTotal || 25000)} в месяц`
        : `Около ${formatRub(total)} в месяц`;
      return;
    }

    if (group.id === "electrical") {
      const pricingModel = group.pricingModel || {};
      const total = Math.max(
        roundToStep(
          (pricingModel.shieldBase || 0)
          + (pricingModel.inputBreakerUnitPrice || 0)
          + calc.electrical.totalLightLines * (pricingModel.lightLineBreakerUnitPrice || 0)
          + calc.electrical.contactorCount * (pricingModel.contactorUnitPrice || 0)
          + calc.electrical.smartRelayCount * (pricingModel.smartRelayUnitPrice || 0)
          + (calc.electrical.exhaustPowerW ? (pricingModel.exhaustBreakerUnitPrice || 0) : 0)
          + (calc.electrical.serviceSocketPoints ? (pricingModel.serviceBreakerUnitPrice || 0) : 0)
          + (calc.electrical.splitInputW ? (pricingModel.splitBreakerUnitPrice || 0) : 0)
          + calc.electrical.allLightLinesM * (pricingModel.lightCablePerMeter || 0)
          + calc.electrical.exhaustLineM * (pricingModel.exhaustCablePerMeter || 0)
          + calc.electrical.serviceLineM * (pricingModel.serviceCablePerMeter || 0)
          + calc.electrical.splitLineM * (pricingModel.splitCablePerMeter || 0)
          + calc.electrical.wagoCount * (pricingModel.wagoUnitPrice || 0)
          + calc.electrical.junctionBoxCount * (pricingModel.junctionBoxUnitPrice || 0),
          pricingModel.roundTo || 5000,
          "up"
        ),
        pricingModel.minTotal || 0
      );
      node.textContent = `Около ${formatRub(total)}`;
      return;
    }

    node.textContent = formatOptionPrice(group);
  });
}

function roundToThousands(value) {
  return Math.round((value || 0) / 1000) * 1000;
}

function roundToStep(value, step, mode = "nearest") {
  const safeValue = value || 0;
  if (!step) return safeValue;
  if (mode === "up") {
    return Math.ceil(safeValue / step) * step;
  }
  return Math.round(safeValue / step) * step;
}
