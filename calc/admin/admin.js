import {
  CONTROL_CONFIG,
  calculateFarm,
  createDefaultState,
  formatRub,
  formatSmart,
  normalizeInputValue
} from "../calc-core.js?v=20260404ah";

const STORAGE_KEY = "klubnikaproject.calc.admin.draft.v2";

const CONSTANT_FIELDS = [
  {
    key: "heightBreakpoints.threeTierMax",
    label: "Порог 3 этажей",
    unit: "м",
    note: "До этой высоты считаем 3 этажа."
  },
  {
    key: "heightBreakpoints.fourTierMax",
    label: "Порог 4 этажей",
    unit: "м",
    note: "До этой высоты считаем 4 этажа."
  },
  {
    key: "rackGeometry.segmentLength",
    label: "Шаг длины стеллажа",
    unit: "м",
    note: "Стеллаж считаем кратно этой длине."
  },
  {
    key: "rackGeometry.maxRackLength",
    label: "Максимум длины стеллажа",
    unit: "м",
    note: "Стеллаж не делаем длиннее этого значения."
  },
  {
    key: "rackGeometry.rackWidth",
    label: "Ширина стеллажа",
    unit: "м",
    note: "Ширина одного стеллажа."
  },
  {
    key: "rackGeometry.aisleWidth",
    label: "Проход между стеллажами",
    unit: "м",
    note: "Проход нужен между соседними стеллажами."
  },
  {
    key: "rackGeometry.wallOffset",
    label: "Отступ от стены",
    unit: "м",
    note: "Отступ слева и справа от крайних стеллажей."
  },
  {
    key: "trayKit.plantsPerTray",
    label: "Растений на 1 лоток",
    unit: "шт.",
    note: "На одном лотке одного этажа."
  },
  {
    key: "trayKit.matsPerTray",
    label: "Матов на 1 лоток",
    unit: "шт.",
    note: "На одном лотке одного этажа."
  },
  {
    key: "trayKit.drippersPerTray",
    label: "Капельниц на 1 лоток",
    unit: "шт.",
    note: "На одном лотке одного этажа."
  },
  {
    key: "trayKit.lightsPerTray",
    label: "Светильников на 1 лоток",
    unit: "шт.",
    note: "На одном лотке одного этажа."
  },
  {
    key: "trayKit.blindTubePerTray",
    label: "Слепой трубки на лоток",
    unit: "м",
    note: "На одном лотке одного этажа."
  },
  {
    key: "trayKit.blindTubePerRack",
    label: "Подача к стеллажу",
    unit: "м",
    note: "Дополнительно к каждому стеллажу вне зависимости от этажности."
  },
  {
    key: "purchaseUnits.matPackSize",
    label: "Матов в пачке",
    unit: "шт.",
    note: "Закупочная упаковка матов."
  },
  {
    key: "purchaseUnits.minMatReserve",
    label: "Минимальный запас матов",
    unit: "шт.",
    note: "Если запас ниже, добавляем ещё пачку."
  },
  {
    key: "purchaseUnits.blindTubeCoilMeters",
    label: "Трубки в бухте",
    unit: "м",
    note: "Закупочная длина одной бухты."
  },
  {
    key: "assemblyPerPlant",
    label: "Базовая сборка на растение",
    unit: "руб.",
    note: "Каркас, свет, полив, субстрат и базовый контроль раствора."
  },
  {
    key: "electricalModel.fixturePowerW",
    label: "Мощность светильника",
    unit: "Вт",
    note: "Один светильник на один лоток."
  },
  {
    key: "electricalModel.maxLinePowerW",
    label: "Максимум на линию света",
    unit: "Вт",
    note: "Выше этого делим свет на большее число линий."
  },
  {
    key: "electricalModel.panelToRackZoneM",
    label: "От щита до стеллажей",
    unit: "м",
    note: "Базовая длина трассы до зоны стеллажей."
  },
  {
    key: "electricalModel.exhaustPowerW",
    label: "Вытяжка",
    unit: "Вт",
    note: "Суммарная электрическая мощность вытяжки."
  },
  {
    key: "electricalModel.serviceReserveW",
    label: "Резерв сервисной группы",
    unit: "Вт",
    note: "Насос, автоматика и свободные точки."
  },
  {
    key: "electricalModel.splitColdFactor",
    label: "Коэффициент холода сплита",
    unit: "x",
    note: "Во сколько раз холодопроизводительность выше света."
  },
  {
    key: "electricalModel.splitEer",
    label: "EER сплита",
    unit: "x",
    note: "Грубый перевод холода в электрическое потребление."
  }
];

let publishedPricing = null;
let draftPricing = null;
let previewState = null;

const elements = {
  constantsGrid: document.getElementById("constants-grid"),
  defaultsGrid: document.getElementById("defaults-grid"),
  priceGroups: document.getElementById("price-groups"),
  priceSearch: document.getElementById("price-search"),
  previewInputs: document.getElementById("preview-inputs"),
  previewTotalCost: document.getElementById("preview-total-cost"),
  previewMetrics: document.getElementById("preview-metrics"),
  jsonOutput: document.getElementById("json-output"),
  draftStatus: document.getElementById("draft-status"),
  downloadJsonButton: document.getElementById("download-json-button"),
  copyJsonButton: document.getElementById("copy-json-button"),
  resetDraftButton: document.getElementById("reset-draft-button")
};

init().catch((error) => {
  console.error(error);
  if (elements.draftStatus) {
    elements.draftStatus.textContent = "Не удалось загрузить pricing.json.";
  }
});

async function init() {
  publishedPricing = await loadPricing();
  hydrateDraft();
  renderAll();
  bindEvents();
}

async function loadPricing() {
  const response = await fetch("../pricing.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`pricing.json not loaded: ${response.status}`);
  }

  return response.json();
}

function hydrateDraft() {
  const stored = loadStoredDraft();
  draftPricing = stored?.draftPricing ? stored.draftPricing : clone(publishedPricing);
  previewState = stored?.previewState ? stored.previewState : createDefaultState(draftPricing);
  const previewDefaults = createDefaultState(draftPricing);

  previewState.phaseMode = previewState.phaseMode || previewDefaults.phaseMode;
  previewState.cableLayoutMode = previewState.cableLayoutMode || previewDefaults.cableLayoutMode;

  CONTROL_CONFIG.forEach((control) => {
    previewState[control.key] = normalizeInputValue(previewState[control.key], control);
  });
}

function loadStoredDraft() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function bindEvents() {
  elements.priceSearch.addEventListener("input", renderOptionFields);
  elements.downloadJsonButton.addEventListener("click", downloadJson);
  elements.copyJsonButton.addEventListener("click", copyJson);
  elements.resetDraftButton.addEventListener("click", resetDraft);
}

function renderAll() {
  renderConstants();
  renderDefaults();
  renderOptionFields();
  renderPreviewInputs();
  renderPreview();
}

function renderConstants() {
  elements.constantsGrid.innerHTML = CONSTANT_FIELDS.map((field) => `
    <label class="admin-field">
      <span class="admin-field-label">${field.label}</span>
      <span class="admin-field-note">${field.note}</span>
      <input
        class="admin-input"
        data-kind="constant"
        data-key="${field.key}"
        type="number"
        step="0.1"
        value="${readConstant(field.key)}"
      />
      <span class="admin-field-note">${field.unit}</span>
    </label>
  `).join("");

  elements.constantsGrid.querySelectorAll("[data-kind='constant']").forEach((input) => {
    input.addEventListener("input", handleConstantChange);
    input.addEventListener("change", handleConstantChange);
  });
}

function renderDefaults() {
  elements.defaultsGrid.innerHTML = CONTROL_CONFIG.map((field) => `
    <label class="admin-field">
      <span class="admin-field-label">${field.label}</span>
      <span class="admin-field-note">${field.note}</span>
      <input
        class="admin-input"
        data-kind="default"
        data-key="${field.key}"
        type="number"
        min="${field.min}"
        max="${field.max}"
        step="${field.step}"
        value="${draftPricing.inputs[field.key]}"
      />
      <span class="admin-field-note">${field.unit}</span>
    </label>
  `).join("");

  elements.defaultsGrid.querySelectorAll("[data-kind='default']").forEach((input) => {
    input.addEventListener("input", handleDefaultChange);
    input.addEventListener("change", handleDefaultChange);
  });
}

function renderOptionFields() {
  const query = elements.priceSearch.value.trim().toLowerCase();
  const rows = (draftPricing.optionGroups || []).filter((group) => {
    if (!query) {
      return true;
    }

    return group.label.toLowerCase().includes(query) || group.stateKey.toLowerCase().includes(query);
  });

  elements.priceGroups.innerHTML = `
    <section class="admin-price-group">
      <div class="admin-price-group-head">
        <strong>Цены опций</strong>
        <span>Это те значения, которые использует калькулятор в правой сборке.</span>
      </div>
      <div class="admin-price-rows">
        ${rows.map((group) => `
          <label class="admin-price-row">
            <div>
              <div class="admin-price-name">${group.label}</div>
              <div class="admin-price-meta">${group.note}</div>
            </div>
            <input
              class="admin-input"
              data-kind="option-group-price"
              data-option-id="${group.id}"
              type="number"
              min="0"
              step="1"
              value="${group.unitPrice}"
            />
          </label>
        `).join("")}
      </div>
    </section>
  `;

  elements.priceGroups.querySelectorAll("[data-kind='option-group-price']").forEach((input) => {
    input.addEventListener("input", handleOptionPriceChange);
    input.addEventListener("change", handleOptionPriceChange);
  });
}

function renderPreviewInputs() {
  elements.previewInputs.innerHTML = `
    ${CONTROL_CONFIG.map((field) => `
      <label class="admin-field">
        <span class="admin-field-label">${field.label}</span>
        <input
          class="admin-input"
          data-kind="preview"
          data-key="${field.key}"
          type="number"
          min="${field.min}"
          max="${field.max}"
          step="${field.step}"
          value="${previewState[field.key]}"
        />
        <span class="admin-field-note">${field.unit}</span>
      </label>
    `).join("")}
    <label class="admin-field">
      <span class="admin-field-label">Питание</span>
      <select class="admin-input" data-kind="preview-choice" data-key="phaseMode">
        <option value="one-phase" ${previewState.phaseMode === "one-phase" ? "selected" : ""}>1 фаза</option>
        <option value="three-phase" ${previewState.phaseMode === "three-phase" ? "selected" : ""}>3 фазы</option>
      </select>
    </label>
    <label class="admin-field">
      <span class="admin-field-label">Прокладка кабеля</span>
      <select class="admin-input" data-kind="preview-choice" data-key="cableLayoutMode">
        <option value="short" ${previewState.cableLayoutMode === "short" ? "selected" : ""}>Коротко</option>
        <option value="tray" ${previewState.cableLayoutMode === "tray" ? "selected" : ""}>По лотку</option>
        <option value="real" ${previewState.cableLayoutMode === "real" ? "selected" : ""}>С запасом</option>
      </select>
    </label>
    ${(draftPricing.optionGroups || []).map((group) => `
      <label class="admin-field">
        <span class="admin-field-label">${group.label}</span>
        <input class="admin-input" data-kind="preview-toggle" data-key="${group.stateKey}" type="checkbox" ${previewState[group.stateKey] ? "checked" : ""} />
      </label>
    `).join("")}
  `;

  elements.previewInputs.querySelectorAll("[data-kind='preview']").forEach((input) => {
    input.addEventListener("input", handlePreviewChange);
    input.addEventListener("change", handlePreviewChange);
  });

  elements.previewInputs.querySelectorAll("[data-kind='preview-choice']").forEach((input) => {
    input.addEventListener("change", handlePreviewChoice);
  });

  elements.previewInputs.querySelectorAll("[data-kind='preview-toggle']").forEach((input) => {
    input.addEventListener("change", handlePreviewToggle);
  });
}

function renderPreview() {
  const calculation = calculateFarm(previewState, draftPricing);
  const selectedExtras = calculation.selectedItems.filter((item) => item.id !== "assembly");

  elements.previewTotalCost.textContent = formatRub(calculation.totalEquipmentCost);
  elements.previewMetrics.innerHTML = [
    { label: "Размер", value: `${formatSmart(calculation.width)} × ${formatSmart(calculation.length)} × ${formatSmart(calculation.height)} м` },
    { label: "Стеллажи / этажи", value: `${formatSmart(calculation.rackCount)} / ${formatSmart(calculation.tiers)}` },
    { label: "Лотки / растения", value: `${formatSmart(calculation.trayCount)} / ${formatSmart(calculation.plantCount)}` },
    { label: "Питание / ток", value: `${calculation.electrical.phaseLabel} / ${formatSmart(calculation.electrical.runningAmps)} А` },
    { label: "Кабель / линии", value: `${formatSmart(calculation.electrical.totalCableM)} м / ${formatSmart(calculation.electrical.totalLightLines)} шт` },
    { label: "Без рассады", value: formatRub(calculation.equipmentWithoutSeedlings) },
    { label: "Рассада", value: formatRub(calculation.seedlingsTotalCost) },
    { label: "Доп. блоки", value: selectedExtras.length ? selectedExtras.map((item) => item.label).join(", ") : "нет" }
  ].map((item) => `
    <div class="summary-item">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join("");

  elements.jsonOutput.value = JSON.stringify(draftPricing, null, 2);
  updateStatus();
  persistDraft();
}

function handleConstantChange(event) {
  writeConstant(event.currentTarget.dataset.key, safeNumber(event.currentTarget.value));
  renderPreview();
}

function handleDefaultChange(event) {
  const key = event.currentTarget.dataset.key;
  const field = CONTROL_CONFIG.find((item) => item.key === key);
  draftPricing.inputs[key] = normalizeInputValue(event.currentTarget.value, field);
  event.currentTarget.value = draftPricing.inputs[key];
  renderPreview();
}

function handleOptionPriceChange(event) {
  const group = draftPricing.optionGroups.find((item) => item.id === event.currentTarget.dataset.optionId);
  if (!group) {
    return;
  }

  group.unitPrice = safeNumber(event.currentTarget.value);
  renderPreview();
}

function handlePreviewChange(event) {
  const key = event.currentTarget.dataset.key;
  const field = CONTROL_CONFIG.find((item) => item.key === key);
  previewState[key] = normalizeInputValue(event.currentTarget.value, field);
  event.currentTarget.value = previewState[key];
  renderPreview();
}

function handlePreviewToggle(event) {
  previewState[event.currentTarget.dataset.key] = event.currentTarget.checked;
  renderPreview();
}

function handlePreviewChoice(event) {
  previewState[event.currentTarget.dataset.key] = event.currentTarget.value;
  renderPreview();
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(draftPricing, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pricing.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Файл pricing.json подготовлен к скачиванию.");
}

async function copyJson() {
  try {
    await copyText(elements.jsonOutput.value);
    setStatus("JSON скопирован в буфер.");
  } catch (error) {
    console.error(error);
    setStatus("Не удалось скопировать JSON.");
  }
}

function resetDraft() {
  draftPricing = clone(publishedPricing);
  previewState = createDefaultState(draftPricing);
  elements.priceSearch.value = "";
  renderAll();
  setStatus("Черновик сброшен к опубликованной версии.");
}

function updateStatus() {
  elements.draftStatus.textContent = JSON.stringify(draftPricing) === JSON.stringify(publishedPricing)
    ? "Черновик совпадает с опубликованной версией."
    : "Есть несохранённые изменения в draft. Скачайте JSON и замените pricing.json в проекте.";
}

function setStatus(message) {
  elements.draftStatus.textContent = message;
}

function persistDraft() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ draftPricing, previewState }));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readConstant(path) {
  return path.split(".").reduce((acc, key) => acc?.[key], draftPricing.constants);
}

function writeConstant(path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((acc, key) => acc[key], draftPricing.constants);
  target[last] = value;
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  return Promise.reject(new Error("Clipboard API unavailable"));
}
