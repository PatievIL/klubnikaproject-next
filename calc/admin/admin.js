import {
  CONTROL_CONFIG,
  calculateFarm,
  createDefaultState,
  formatRub,
  formatSmart,
  normalizeInputValue
} from "../calc-core.js";

const STORAGE_KEY = "klubnikaproject.calc.admin.draft.v1";

const CONSTANT_FIELDS = [
  {
    key: "plantsPerRack",
    label: "Растений на один стеллаж",
    unit: "шт.",
    note: "Используется для расчёта кустов, посадочного материала и выручки."
  },
  {
    key: "cropProtectionAndNutritionPerPlantPerMonth",
    label: "СЗР и питание на растение в месяц",
    unit: "руб.",
    note: "Ложится в блок ежемесячных и годовых расходов."
  },
  {
    key: "electricityKwPerRack",
    label: "Потребление на один стеллаж",
    unit: "кВт",
    note: "Базовая мощность на стеллаж в расчётной модели."
  },
  {
    key: "waterLitersPerRackPerDay",
    label: "Вода на один стеллаж в день",
    unit: "л",
    note: "Используется для расчёта воды в модели расходов."
  },
  {
    key: "monthlyPreviewLightHoursPerDay",
    label: "Часы света в блоке расходов",
    unit: "ч/день",
    note: "Превью ежемесячных расходов."
  },
  {
    key: "paybackModelLightHoursPerDay",
    label: "Часы света в модели окупаемости",
    unit: "ч/день",
    note: "Инвестиционная модель справа."
  },
  {
    key: "rackModelCost",
    label: "Инвест-модель: стоимость стеллажа",
    unit: "руб.",
    note: "Используется только для блока окупаемости."
  },
  {
    key: "irrigationNodeModelCost",
    label: "Инвест-модель: стоимость поливочного узла",
    unit: "руб.",
    note: "Тоже участвует только в инвестиционном слое."
  }
];

const PRICE_GROUPS = [
  {
    id: "frame",
    title: "Каркас и металлоконструкция",
    note: "Позиции 1–11 формируют стоимость базового и дополнительного стеллажа.",
    match: (item) => item.id <= 11
  },
  {
    id: "system",
    title: "Оборудование, расходники и посадочный материал",
    note: "Лотки, свет, полив, субстрат, удобрения и посадочный материал.",
    match: (item) => item.id >= 12
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
    elements.draftStatus.textContent = "Не удалось загрузить админку цен. Проверьте pricing.json и структуру папок.";
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

  CONTROL_CONFIG.forEach((control) => {
    previewState[control.key] = normalizeInputValue(previewState[control.key], control);
  });
}

function loadStoredDraft() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function bindEvents() {
  elements.priceSearch.addEventListener("input", renderPriceGroups);
  elements.downloadJsonButton.addEventListener("click", downloadJson);
  elements.copyJsonButton.addEventListener("click", copyJson);
  elements.resetDraftButton.addEventListener("click", resetDraft);
}

function renderAll() {
  renderConstants();
  renderDefaults();
  renderPriceGroups();
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
        value="${draftPricing.constants[field.key]}"
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

function renderPriceGroups() {
  const query = elements.priceSearch.value.trim().toLowerCase();

  elements.priceGroups.innerHTML = PRICE_GROUPS.map((group) => {
    const rows = draftPricing.items.filter((item) => {
      if (!group.match(item)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return item.name.toLowerCase().includes(query) || String(item.id).includes(query);
    });

    if (!rows.length) {
      return "";
    }

    return `
      <section class="admin-price-group">
        <div class="admin-price-group-head">
          <strong>${group.title}</strong>
          <span>${group.note}</span>
        </div>
        <div class="admin-price-rows">
          ${rows.map((item) => `
            <label class="admin-price-row">
              <div>
                <div class="admin-price-name">${item.name}</div>
                <div class="admin-price-meta">ID ${item.id}</div>
              </div>
              <input
                class="admin-input"
                data-kind="item-price"
                data-id="${item.id}"
                type="number"
                min="0"
                step="1"
                value="${item.unitPrice}"
              />
            </label>
          `).join("")}
        </div>
      </section>
    `;
  }).join("");

  elements.priceGroups.querySelectorAll("[data-kind='item-price']").forEach((input) => {
    input.addEventListener("input", handleItemPriceChange);
    input.addEventListener("change", handleItemPriceChange);
  });
}

function renderPreviewInputs() {
  elements.previewInputs.innerHTML = CONTROL_CONFIG.map((field) => `
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
  `).join("");

  elements.previewInputs.querySelectorAll("[data-kind='preview']").forEach((input) => {
    input.addEventListener("input", handlePreviewChange);
    input.addEventListener("change", handlePreviewChange);
  });
}

function renderPreview() {
  const calculation = calculateFarm(previewState, draftPricing);
  const optimistic = calculation.yieldScenarios.find((scenario) => scenario.id === "optimistic") || calculation.activeScenario;
  const firstYear = optimistic.cumulative[0]?.value || 0;

  elements.previewTotalCost.textContent = formatRub(calculation.totalEquipmentCost);
  elements.previewMetrics.innerHTML = [
    { label: "Оборудование без саженцев", value: formatRub(calculation.equipmentWithoutSeedlings) },
    { label: "Посадочный материал", value: formatRub(calculation.seedlingsTotalCost) },
    { label: "Расходы в месяц", value: formatRub(calculation.monthlyCosts.total) },
    { label: "Выручка в год", value: formatRub(optimistic.annualRevenue) },
    { label: "1-й год по модели", value: formatRub(firstYear) },
    { label: "Стеллажи / кусты", value: `${formatSmart(calculation.totalRacks)} / ${formatSmart(calculation.plantCount)}` }
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
  const key = event.currentTarget.dataset.key;
  draftPricing.constants[key] = safeNumber(event.currentTarget.value);
  renderPreview();
}

function handleDefaultChange(event) {
  const key = event.currentTarget.dataset.key;
  const field = CONTROL_CONFIG.find((item) => item.key === key);
  draftPricing.inputs[key] = normalizeInputValue(event.currentTarget.value, field);
  event.currentTarget.value = draftPricing.inputs[key];
  renderPreview();
}

function handleItemPriceChange(event) {
  const id = Number(event.currentTarget.dataset.id);
  const item = draftPricing.items.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  item.unitPrice = safeNumber(event.currentTarget.value);
  renderPreview();
}

function handlePreviewChange(event) {
  const key = event.currentTarget.dataset.key;
  const field = CONTROL_CONFIG.find((item) => item.key === key);
  previewState[key] = normalizeInputValue(event.currentTarget.value, field);
  event.currentTarget.value = previewState[key];
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
  if (isPublishedVersion()) {
    elements.draftStatus.textContent = "Черновик совпадает с опубликованной версией.";
    return;
  }

  elements.draftStatus.textContent = "Есть несохранённые изменения в draft. Скачайте JSON и замените pricing.json в проекте.";
}

function setStatus(message) {
  elements.draftStatus.textContent = message;
}

function persistDraft() {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      draftPricing,
      previewState
    })
  );
}

function isPublishedVersion() {
  return JSON.stringify(draftPricing) === JSON.stringify(publishedPricing);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
