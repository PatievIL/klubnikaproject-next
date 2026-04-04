import {
  CONTROL_CONFIG,
  calculateFarm,
  createDefaultState,
  formatRub,
  formatSmart,
  normalizeInputValue
} from "./calc-core.js?v=20260405ab";

const STORAGE_KEY = "klubnikaproject.calc.state.v4";
const BUILD_ID = "calc-20260405ay";
const AUTH_API_BASE_DEFAULT = "https://api.klubnikaproject.ru/site/v1";

const GOAL_COPY = {
  entry: {
    title: "Уже видно, где начинается рабочий вход в проект",
    meaning: "Ориентир по порогу входа без лишних опций.",
    next: "Если рамка подходит, следующий шаг — проверка объекта."
  },
  object: {
    title: "Уже видно, что этот размер может дать по сборке",
    meaning: "Можно быстро понять, стоит ли работать с этим помещением.",
    next: "Если помещение реальное, переходим к разбору объекта."
  },
  kit: {
    title: "Уже видно, из чего складывается базовая сборка",
    meaning: "Ориентир по составу для предметного обсуждения.",
    next: "Если состав подходит, уточняем ограничения объекта."
  }
};

const UI_DEFAULTS = {
  goalType: "entry",
  roomMode: "have-room",
  presetSize: "4x8",
  phaseMode: "three-phase",
  cableLayoutMode: "tray"
};

let pricing = null;
let state = null;
const acceptedFields = new Set();
let totalDisplayValue = null;
let totalDisplayAnimationFrame = null;
let totalFlashTimeout = null;
let summaryUnlocked = false;

const elements = {
  goalChoiceGrid: document.getElementById("goal-choice-grid"),
  roomModeGrid: document.getElementById("room-mode-grid"),
  presetGrid: document.getElementById("preset-grid"),
  phaseModeGrid: document.getElementById("phase-mode-grid"),
  cableLayoutGrid: document.getElementById("cable-layout-grid"),
  roomPanels: Array.from(document.querySelectorAll("[data-room-panel]")),
  electricalStep: document.getElementById("electrical-step"),
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
  summaryRevealShell: document.getElementById("summary-reveal-shell"),
  summaryLoginLink: document.getElementById("summary-login-link"),
  calcDetailsRevealShell: document.getElementById("calc-details-reveal-shell"),
  calcDetailsLoginLink: document.getElementById("calc-details-login-link"),
  briefChipList: document.getElementById("brief-chip-list"),
  nextStepTitle: document.getElementById("next-step-title"),
  nextStepText: document.getElementById("next-step-text"),
  summaryInterpretationTitle: document.getElementById("summary-interpretation-title"),
  summaryInterpretationText: document.getElementById("summary-interpretation-text"),
  equipmentWithoutSeedlings: document.getElementById("equipment-without-seedlings"),
  seedlingsTotalCost: document.getElementById("seedlings-total-cost"),
  assemblyIncludesList: document.getElementById("assembly-includes-list"),
  budgetStructureGrid: document.getElementById("budget-structure-grid"),
  economyCapex: document.getElementById("economy-capex"),
  economyOpexTotal: document.getElementById("economy-opex-total"),
  economyOpexEnergy: document.getElementById("economy-opex-energy"),
  economyOpexWater: document.getElementById("economy-opex-water"),
  economyOpexRent: document.getElementById("economy-opex-rent"),
  economyBerryKg: document.getElementById("economy-berry-kg"),
  economyRevenueMonthReal: document.getElementById("economy-revenue-month-real"),
  economyRevenueYearReal: document.getElementById("economy-revenue-year-real"),
  economyNetMonthReal: document.getElementById("economy-net-month-real"),
  economyPaybackReal: document.getElementById("economy-payback-real"),
  economyScenariosGrid: document.getElementById("economy-scenarios-grid"),
  detailNotes: document.getElementById("detail-notes"),
  electricalSummaryGrid: document.getElementById("electrical-summary-grid"),
  electricalKitGrid: document.getElementById("electrical-kit-grid"),
  electricalScheme: document.getElementById("electrical-scheme"),
  electricalLines: document.getElementById("electrical-lines"),
  dimensionHelperTitle: document.getElementById("dimension-helper-title"),
  dimensionHelperText: document.getElementById("dimension-helper-text"),
  resetDefaultsButton: document.getElementById("reset-defaults-button"),
  roomQuickPresets: Array.from(document.querySelectorAll("[data-quick-preset]")),
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
  setDebugAppPhase("auth-check");
  summaryUnlocked = await checkCabinetSession();
  setDebugAppPhase("render-presets");
  renderPresetCards();
  renderFeatureToggles();
  syncSummaryLoginLink();
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

  base.roomMode = "have-room";
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
      ${preset.discountPercent ? `<i class="preset-discount-badge">−${preset.discountPercent}%</i>` : ""}
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

  elements.roomQuickPresets.forEach((button) => {
    button.addEventListener("click", handleQuickPresetClick);
  });
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

function handleQuickPresetClick(event) {
  const button = event.currentTarget;
  const presetId = button.dataset.quickPreset;
  if (!presetId) {
    return;
  }

  state.presetSize = presetId;
  applyPresetSize(state, presetId);
  acceptedFields.add("a0");
  acceptedFields.add("a1");
  render();
}

function syncPresetIntoState(targetState) {
  if (targetState.roomMode !== "need-room") {
    return;
  }

  applyPresetSize(targetState, targetState.presetSize);
}

function applyPresetSize(targetState, presetId) {
  const preset = pricing.presets.find((entry) => entry.id === presetId) || pricing.presets[0];
  targetState.a0 = normalizeInputValue(preset.width, CONTROL_CONFIG[0]);
  targetState.a1 = normalizeInputValue(preset.length, CONTROL_CONFIG[1]);
}

function render() {
  saveState();

  const calc = calculateFarm(state, pricing);
  renderChoiceStates();
  renderPanels();
  renderConditionalSteps();
  renderInputs();
  renderAcceptedFields();
  renderFeatureToggleNotes(calc);
  renderDimensionHelper(calc);
  renderMicroResult(calc);
  renderSummary(calc);
  renderSummaryReveal();
  renderDetails(calc);
  renderDebug(calc);
}

function renderSummaryReveal() {
  if (elements.summaryRevealShell) {
    elements.summaryRevealShell.classList.toggle("is-locked", !summaryUnlocked);
  }
  if (elements.calcDetailsRevealShell) {
    elements.calcDetailsRevealShell.classList.toggle("is-locked", !summaryUnlocked);
  }
  document.body.classList.toggle("calc-auth-locked", !summaryUnlocked);
}

function syncSummaryLoginLink() {
  const next = encodeURIComponent(window.location.pathname || "/calc/");
  if (elements.summaryLoginLink) {
    elements.summaryLoginLink.href = `../cabinet/login/?next=${next}`;
  }
  if (elements.calcDetailsLoginLink) {
    elements.calcDetailsLoginLink.href = `../cabinet/login/?next=${next}`;
  }
}

function detectRuntimeApiBase(configuredBase) {
  const configured = String(configuredBase || "").trim().replace(/\/+$/, "");
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return "http://127.0.0.1:8010/v1";
  }
  return configured;
}

async function checkCabinetSession() {
  const apiBase = detectRuntimeApiBase(AUTH_API_BASE_DEFAULT);
  const hasAdminSession = await hasSession(`${apiBase}/admin/auth/session`);
  if (hasAdminSession) {
    return true;
  }
  return hasSession(`${apiBase}/auth/session`);
}

async function hasSession(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include"
    });
    return response.ok;
  } catch {
    return false;
  }
}

function renderChoiceStates() {
  document.querySelectorAll("[data-choice-key]").forEach((button) => {
    const { choiceKey, choiceValue } = button.dataset;
    button.classList.toggle("is-active", String(state[choiceKey]) === choiceValue);
  });

  document.querySelectorAll("[data-toggle-key]").forEach((input) => {
    input.checked = Boolean(state[input.dataset.toggleKey]);
    const toggleCard = input.closest(".feature-toggle");
    if (toggleCard) {
      toggleCard.classList.toggle("is-active", input.checked);
    }
  });

  elements.roomQuickPresets.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.quickPreset === state.presetSize);
  });

}

function renderPanels() {
  elements.roomPanels.forEach((panel) => {
    panel.classList.toggle("is-visible", panel.dataset.roomPanel === state.roomMode);
  });
}

function renderConditionalSteps() {
  if (!elements.electricalStep) {
    return;
  }

  const hasElectricalAddon = Boolean(state.includeElectrical);
  elements.electricalStep.classList.toggle("is-visible", hasElectricalAddon);
  elements.electricalStep.setAttribute("aria-hidden", hasElectricalAddon ? "false" : "true");
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
  if (!elements.microResultTitle || !elements.microResultValue || !elements.microResultPills) {
    return;
  }

  const copy = GOAL_COPY[state.goalType] || GOAL_COPY.entry;
  const selectedOptions = calc.selectedItems.filter((item) => !isBaseAssemblyItem(item.id)).length;
  const driverText = state.roomMode === "have-room"
    ? "Размер, этажность и выбранные блоки"
    : "Типовой размер, этажность и выбранные блоки";
  const nextText = state.roomMode === "have-room"
    ? "Если помещение уже выбрано, дальше можно считать под объект"
    : "Если рамка подходит, дальше можно привязать её к реальному помещению";

  elements.microResultTitle.textContent = copy.title;
  elements.microResultValue.textContent = "Ключевые цифры собраны справа";
  if (elements.microResultText) {
    elements.microResultText.textContent = copy.meaning;
  }
  elements.calcEntryStatus.textContent = driverText;
  elements.microNextStep.textContent = nextText;
  if (elements.microResultElectricity) {
    elements.microResultElectricity.textContent = "Учтено в ежемесячных расходах";
  }
  if (elements.microResultWater) {
    elements.microResultWater.textContent = "Учтено в ежемесячных расходах";
  }
  if (elements.microResultRent) {
    elements.microResultRent.textContent = "Учтено в ежемесячных расходах";
  }
  if (elements.microResultOperating) {
    elements.microResultOperating.textContent = "Смотрите свод справа";
  }
  if (elements.microResultPowerProfile) {
    elements.microResultPowerProfile.textContent = "Детализация затрат и условий вынесена в правый сводный блок.";
  }
  elements.microResultPills.innerHTML = [
    "Геометрия помещения",
    "Этажность и размещение",
    "Техническая схема",
    "Комплектация проекта",
    selectedOptions ? "Выбраны доп. блоки" : "Базовая сборка"
  ].map((item) => `<span class="chip">${item}</span>`).join("");
}

function renderSummary(calc) {
  const sizeLabel = `${formatSmart(calc.width)} × ${formatSmart(calc.length)} м`;

  if (elements.summaryProgressCount) {
    elements.summaryProgressCount.textContent = state.roomMode === "have-room" ? "Считаем по вашему помещению" : "Считаем по примеру";
  }
  if (elements.summaryProgressText) {
    elements.summaryProgressText.textContent = state.roomMode === "have-room"
      ? "Размеры уже учтены в расчёте."
      : "Считаем на типовом размере.";
  }
  setAnimatedTotalEquipmentCost(calc.totalEquipmentCost);
  elements.summaryMeaningNote.textContent = "";

  elements.summaryGrid.innerHTML = [
    { label: "Размер", value: sizeLabel },
    { label: "Конфигурация", value: `${formatSmart(calc.rackCount)} ${pluralize(calc.rackCount, "стеллаж", "стеллажа", "стеллажей")} · ${formatSmart(calc.heightProfile.tiers)} ${pluralize(calc.heightProfile.tiers, "этаж", "этажа", "этажей")}` },
    { label: "Растений", value: formatSmart(calc.plantCount) },
    { label: "Ежемесячные расходы", value: formatRub(calc.monthlyOperatingCost) },
    { label: "Питание и нагрузка", value: `${calc.electrical.phaseLabel} · ${formatSmart(calc.electrical.totalPowerKw)} кВт` },
    { label: "Выход ягоды / мес", value: `${formatSmart(calc.monthlyBerryKg)} кг` }
  ].map(renderSummaryItem).join("");

  const selectedLineItems = calc.lineItems.filter((item) => item.included);
  elements.summaryBreakdown.innerHTML = selectedLineItems.map((item) => `
    <div class="summary-breakdown-row is-included">
      <div>
        <strong>${item.label}</strong>
      </div>
      <b>${formatRub(item.total)}</b>
    </div>
  `).join("") + `
    <div class="summary-breakdown-row is-total">
      <div>
        <strong>Итого</strong>
      </div>
      <b>${formatRub(calc.totalEquipmentCost)}</b>
    </div>
  `;

  if (elements.briefChipList) {
    elements.briefChipList.innerHTML = buildDriverChips(calc).map((item) => `<span class="brief-chip">${item}</span>`).join("");
  }
  if (elements.nextStepTitle) {
    elements.nextStepTitle.textContent = state.roomMode === "have-room"
      ? "Если цифра подходит, проверяем объект детально"
      : "Если цифра подходит, подставляем реальный объект";
  }
  if (elements.nextStepText) {
    elements.nextStepText.textContent = state.roomMode === "have-room"
      ? "Проверяем проходы, коммуникации и собираем финальную конфигурацию."
      : "Когда появится помещение, быстро привязываем расчёт к его ограничениям.";
  }
  elements.summaryInterpretationTitle.textContent = state.roomMode === "have-room"
    ? "Это уже не «пример в вакууме»"
    : "Это понятный ориентир на старте";
  if (elements.summaryInterpretationText) {
    elements.summaryInterpretationText.textContent = state.roomMode === "have-room"
      ? "Простыми словами: видно, что помещается, сколько это стоит и что делать дальше."
      : "Даже без объекта уже понятны порядок цифр и следующий шаг.";
  }
}

function setAnimatedTotalEquipmentCost(nextTotal) {
  if (!elements.totalEquipmentCost) {
    return;
  }

  const target = Math.max(0, Number(nextTotal || 0));
  triggerTotalFlash();
  if (totalDisplayValue === null || !Number.isFinite(totalDisplayValue)) {
    totalDisplayValue = target;
    elements.totalEquipmentCost.textContent = formatRub(target);
    return;
  }

  if (Math.round(totalDisplayValue) === Math.round(target)) {
    totalDisplayValue = target;
    elements.totalEquipmentCost.textContent = formatRub(target);
    return;
  }

  if (totalDisplayAnimationFrame) {
    window.cancelAnimationFrame(totalDisplayAnimationFrame);
    totalDisplayAnimationFrame = null;
  }

  const startValue = totalDisplayValue;
  const delta = target - startValue;
  const duration = 420;
  const startTime = performance.now();

  const animate = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const eased = 1 - ((1 - progress) ** 3);
    totalDisplayValue = startValue + delta * eased;
    elements.totalEquipmentCost.textContent = formatRub(totalDisplayValue);

    if (progress < 1) {
      totalDisplayAnimationFrame = window.requestAnimationFrame(animate);
      return;
    }

    totalDisplayValue = target;
    elements.totalEquipmentCost.textContent = formatRub(target);
    totalDisplayAnimationFrame = null;
  };

  totalDisplayAnimationFrame = window.requestAnimationFrame(animate);
}

function triggerTotalFlash() {
  if (!elements.totalEquipmentCost) {
    return;
  }

  elements.totalEquipmentCost.classList.remove("is-updating");
  if (totalFlashTimeout) {
    window.clearTimeout(totalFlashTimeout);
    totalFlashTimeout = null;
  }

  void elements.totalEquipmentCost.offsetWidth;
  elements.totalEquipmentCost.classList.add("is-updating");
  totalFlashTimeout = window.setTimeout(() => {
    elements.totalEquipmentCost.classList.remove("is-updating");
    totalFlashTimeout = null;
  }, 360);
}

function renderDetails(calc) {
  const fallbackBerryKgPerMonth = Number.isFinite(calc.monthlyBerryKg)
    ? calc.monthlyBerryKg
    : roundToStep((Number(calc.plantCount || 0) * 80) / 1000, 0.1, "nearest");
  const economy = calc.economy || {};
  const berryKgPerMonth = Number.isFinite(economy.monthlyYieldKgReal)
    ? economy.monthlyYieldKgReal
    : fallbackBerryKgPerMonth;
  const revenueMonthReal = Number.isFinite(economy.revenueMonthReal)
    ? economy.revenueMonthReal
    : roundToStep(berryKgPerMonth * (calc.berrySalePricePerKg || 1600), 1, "nearest");
  const revenueYearReal = Number.isFinite(economy.revenueYearReal)
    ? economy.revenueYearReal
    : roundToStep(revenueMonthReal * 12, 1, "nearest");
  const netMonthReal = Number.isFinite(economy.netMonthReal)
    ? economy.netMonthReal
    : roundToStep(revenueMonthReal - (calc.monthlyOperatingCost || 0), 1, "nearest");
  const paybackText = Number.isFinite(economy.paybackMonthsReal)
    ? `${formatSmart(economy.paybackMonthsReal)} мес`
    : "Не рассчитывается";
  if (elements.equipmentWithoutSeedlings) {
    elements.equipmentWithoutSeedlings.textContent = formatRub(calc.equipmentWithoutSeedlings);
  }
  if (elements.seedlingsTotalCost) {
    elements.seedlingsTotalCost.textContent = formatRub(calc.seedlingsTotalCost);
  }
  if (elements.economyCapex) {
    elements.economyCapex.textContent = formatRub(calc.totalEquipmentCost);
  }
  if (elements.economyOpexTotal) {
    elements.economyOpexTotal.textContent = formatRub(calc.monthlyOperatingCost);
  }
  if (elements.economyOpexEnergy) {
    elements.economyOpexEnergy.textContent = formatRub(calc.electrical.monthlyPowerCost);
  }
  if (elements.economyOpexWater) {
    elements.economyOpexWater.textContent = formatRub(calc.water.monthlyWaterCost);
  }
  if (elements.economyOpexRent) {
    elements.economyOpexRent.textContent = formatRub(calc.monthlyRentCost);
  }
  if (elements.economyBerryKg) {
    elements.economyBerryKg.textContent = `${formatSmart(berryKgPerMonth)} кг`;
  }
  if (elements.economyRevenueMonthReal) {
    elements.economyRevenueMonthReal.textContent = formatRub(revenueMonthReal);
  }
  if (elements.economyRevenueYearReal) {
    elements.economyRevenueYearReal.textContent = formatRub(revenueYearReal);
  }
  if (elements.economyNetMonthReal) {
    elements.economyNetMonthReal.textContent = formatRub(netMonthReal);
  }
  if (elements.economyPaybackReal) {
    elements.economyPaybackReal.textContent = paybackText;
  }
  if (elements.economyScenariosGrid) {
    const scenarios = Array.isArray(economy.scenarios) ? economy.scenarios : [];
    elements.economyScenariosGrid.innerHTML = scenarios.map((scenario) => {
      const paybackScenarioText = Number.isFinite(scenario.paybackMonths)
        ? `${formatSmart(scenario.paybackMonths)} мес`
        : "Не рассчитывается";
      return `
        <li class="economy-scenario-row">
          <strong>${scenario.label}</strong>
          <span>Ягода ${formatSmart(scenario.monthlyYieldKg)} кг/мес · Выручка ${formatRub(scenario.revenueMonth)}/мес · Чистый поток ${formatRub(scenario.netMonth)}/мес · Окупаемость ${paybackScenarioText}</span>
        </li>
      `;
    }).join("");
  }
  if (elements.assemblyIncludesList) {
    elements.assemblyIncludesList.innerHTML = calc.baseAssemblyIncludes.map((item) => `
      <div class="brief-chip">${item}</div>
    `).join("");
  }

  if (elements.budgetStructureGrid) {
    elements.budgetStructureGrid.innerHTML = calc.selectedItems.map((item) => `
      <div class="summary-item">
        <span>${item.label}</span>
        <strong>${formatRub(item.total)}</strong>
      </div>
    `).join("");
  }

  if (elements.detailNotes) {
    elements.detailNotes.innerHTML = [
      "Ориентир не учитывает индивидуальные строительные работы и нестандартную доработку объекта.",
      "Если помещение уже есть, финальная цифра зависит от проходов, логистики и фактической полезной площади.",
      "Если помещения ещё нет, этот расчёт нужен как рамка бюджета, чтобы не обсуждать проект вслепую.",
      `Цена реализации ягоды для ориентиров принята: ${formatRub(calc.berrySalePricePerKg)} за кг.`,
      `Оценка выхода ягоды (реалистичный сценарий): ${formatSmart(berryKgPerMonth)} кг/мес.`,
      `Вода: ориентир ${formatSmart(calc.water.monthlyM3)} м³/мес (${formatSmart(calc.water.dailyLiters)} л/день) из нормы до ${formatSmart(calc.water.perDripperMlPerDay)} мл/день на одну капельницу.`,
      `Маты: нужно ${formatSmart(calc.matCount)} шт, на закупку ${formatSmart(calc.matPacks)} пач. по 12 = ${formatSmart(calc.matUnitsForPurchase)} шт. Запас после округления: ${formatSmart(calc.spareMats)} шт.`,
      `Слепая трубка: нужно ${formatSmart(calc.blindTubeMeters)} м, на закупку ${formatSmart(calc.blindTubeCoils)} бух. по 200 м = ${formatSmart(calc.blindTubeMetersForPurchase)} м.`
    ].concat(
      calc.lineItems
        .filter((item) => !isBaseAssemblyItem(item.id) && item.includes?.length)
        .map((item) => `${item.label}: ${item.includes.join(", ")}`)
    ).map((item) => `<div class="detail-note">${item}</div>`).join("");
  }

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
    "Геометрия помещения",
    "Стеллажная схема",
    "Этажность",
    "Инженерный контур",
    "Комплектация",
    "Ограничения объекта"
  ];

  calc.selectedItems
    .filter((item) => !isBaseAssemblyItem(item.id))
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
  if (group.id === "project-support-month") {
    return "Ежемесячный блок сопровождения";
  }

  if (group.type === "electricalAuto") {
    return "Расчёт по нагрузке и линиям";
  }

  if (group.type === "perAreaRounded") {
    return "Расчёт по площади";
  }

  if (group.type === "perPlant") {
    return "Расчёт по количеству растений";
  }

  return "Параметр учитывается в расчёте";
}

function isBaseAssemblyItem(id) {
  return String(id || "").startsWith("base-");
}

function pluralize(value, one, few, many) {
  const n = Math.abs(Math.trunc(Number(value) || 0));
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}

function renderFeatureToggleNotes(calc) {
  document.querySelectorAll("[data-option-note]").forEach((node) => {
    const group = (pricing.optionGroups || []).find((item) => item.id === node.dataset.optionNote);
    if (!group) {
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
