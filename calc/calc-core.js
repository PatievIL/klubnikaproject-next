export const DEFAULT_EXPENSE_MODE = "month";

export const CONTROL_CONFIG = [
  {
    key: "a0",
    label: "Ширина помещения",
    unit: "м",
    min: 2,
    max: 20,
    step: 0.5,
    note: "От ширины зависит количество базовых стеллажей."
  },
  {
    key: "a1",
    label: "Длина помещения",
    unit: "м",
    min: 2,
    max: 50,
    step: 0.5,
    note: "Длина влияет на количество дополнительных секций."
  },
  {
    key: "a2",
    label: "Средняя цена реализации клубники",
    unit: "руб./кг",
    min: 600,
    max: 2000,
    step: 50,
    note: "Используется в сценариях выручки."
  },
  {
    key: "a3",
    label: "Аренда помещения",
    unit: "руб./м² в месяц",
    min: 0,
    max: 1000,
    step: 5,
    note: "Если аренды нет, оставьте 0."
  },
  {
    key: "a4",
    label: "Стоимость электроэнергии",
    unit: "руб./кВт·ч",
    min: 0,
    max: 15,
    step: 1,
    note: "Нужна для операционных расходов и модели окупаемости."
  },
  {
    key: "a5",
    label: "Стоимость воды",
    unit: "руб./м³",
    min: 0,
    max: 40,
    step: 1,
    note: "Используется в рамке ежемесячных и годовых расходов."
  }
];

export const EQUIPMENT_LINE_CONFIG = [
  { id: "rack-basic", name: "Каркас фермы на 16 матов Баз.", unit: "шт." },
  { id: "rack-extra", name: "Каркас фермы на 16 матов Доп.", unit: "шт." },
  { id: "trays", name: "Лоток", unit: "шт." },
  { id: "lights", name: "Светильник", unit: "шт." },
  { id: "droppers", name: "Капельница компенсированная, в сборе. 2,2 л/ч", unit: "шт." },
  { id: "blind-tube", name: "Трубка слепая, белая. 16 мм", unit: "м" },
  { id: "mats", name: "Мат минеральной ваты Grodan", unit: "шт." },
  { id: "holder", name: "Держатель ленты цветоноса", unit: "шт." },
  { id: "fittings", name: "Комплект фитингов для подключения капельного полива", unit: "шт." },
  { id: "support-tape", name: "Лента поддержки цветоноса", unit: "рул." },
  { id: "filter", name: "Фильтр дисковый", unit: "шт." },
  { id: "pump", name: "Дозировочный насос D25RE2VF", unit: "шт." },
  { id: "punch", name: "Пробойник полуавтоматический", unit: "шт." },
  { id: "meters", name: "Приборы измерения раствора PH/EC", unit: "шт." },
  { id: "fertilizer", name: "Комплект удобрений на 100 кустов", unit: "компл." },
  { id: "seedlings", name: "Рассада", unit: "шт." }
];

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});

const intFormatter = new Intl.NumberFormat("ru-RU");

export function normalizeInputValue(rawValue, control) {
  const parsed = Number.parseFloat(rawValue);
  const fallback = control.min;
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  const clamped = Math.min(control.max, Math.max(control.min, safeValue));
  const step = Number(control.step);
  const precision = countPrecision(step);
  const normalized = Math.round(clamped / step) * step;

  return Number(normalized.toFixed(precision));
}

export function countPrecision(step) {
  const stepString = String(step);
  if (!stepString.includes(".")) {
    return 0;
  }

  return stepString.split(".")[1].length;
}

export function normalizeExpenseMode(value) {
  return value === "year" ? "year" : DEFAULT_EXPENSE_MODE;
}

export function normalizeYieldScenario(value, loadedPricing) {
  const exists = loadedPricing.yieldScenarios.some((scenario) => scenario.id === value);
  return exists ? value : loadedPricing.yieldScenarios[0].id;
}

export function createDefaultState(loadedPricing) {
  const nextState = {
    expenseMode: DEFAULT_EXPENSE_MODE,
    yieldScenario: loadedPricing.yieldScenarios[0].id
  };

  CONTROL_CONFIG.forEach((control) => {
    nextState[control.key] = normalizeInputValue(loadedPricing.inputs[control.key], control);
  });

  return nextState;
}

export function formatRub(value) {
  return rubFormatter.format(Math.round(value));
}

export function formatSmart(value) {
  if (Number.isInteger(value)) {
    return intFormatter.format(value);
  }

  const oneDecimal = Number(value.toFixed(1));
  if (Number.isInteger(oneDecimal)) {
    return intFormatter.format(oneDecimal);
  }

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(oneDecimal);
}

export function calculateFarm(currentState, loadedPricing) {
  const items = new Map(loadedPricing.items.map((item) => [item.id, item]));
  const width = currentState.a0;
  const length = currentState.a1;
  const area = width * length;

  const basicRacks = Math.floor(width / 2);
  const extraRackRows = Math.floor((length - 2) / 2);
  const extraRacks = extraRackRows * basicRacks;
  const totalRacks = basicRacks + extraRacks;
  const plantsPerRack = loadedPricing.constants.plantsPerRack;
  const plantCount = totalRacks * plantsPerRack;

  const frameComponentIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const basicRackUnitCost = frameComponentIds.reduce((sum, id) => {
    const item = items.get(id);
    return sum + item.unitPrice * (item.basicQty || 0);
  }, 0);
  const extraRackUnitCost = frameComponentIds.reduce((sum, id) => {
    const item = items.get(id);
    return sum + item.unitPrice * (item.extraQty || 0);
  }, 0);

  const traysQty = quantityByRack(items.get(12), basicRacks, extraRacks);
  const lightsQty = quantityByRack(items.get(13), basicRacks, extraRacks);
  const droppersQty = quantityByRack(items.get(14), basicRacks, extraRacks);
  const blindTubeBaseQty = quantityByRack(items.get(15), basicRacks, extraRacks);
  const blindTubeQty = blindTubeBaseQty + blindTubeBaseQty * 0.1;
  const matsQty = quantityByRack(items.get(16), basicRacks, extraRacks);
  const holderQty = quantityByRack(items.get(17), basicRacks, extraRacks);
  const fittingsQty = basicRacks;
  const supportTapeQty = Math.ceil(holderQty / 100);
  const filterQty = 1;
  const pumpQty = 2;
  const punchQty = 1;
  const meterQty = 2;
  const fertilizerQty = Math.ceil(droppersQty / 100);
  const seedlingsQty = Math.ceil(droppersQty / 100) * 100;

  const equipmentLines = [
    {
      id: "rack-basic",
      name: EQUIPMENT_LINE_CONFIG[0].name,
      qty: basicRacks,
      unit: EQUIPMENT_LINE_CONFIG[0].unit,
      total: basicRackUnitCost * basicRacks
    },
    {
      id: "rack-extra",
      name: EQUIPMENT_LINE_CONFIG[1].name,
      qty: extraRacks,
      unit: EQUIPMENT_LINE_CONFIG[1].unit,
      total: extraRackUnitCost * extraRacks
    },
    {
      id: "trays",
      name: EQUIPMENT_LINE_CONFIG[2].name,
      qty: traysQty,
      unit: EQUIPMENT_LINE_CONFIG[2].unit,
      total: traysQty * items.get(12).unitPrice
    },
    {
      id: "lights",
      name: EQUIPMENT_LINE_CONFIG[3].name,
      qty: lightsQty,
      unit: EQUIPMENT_LINE_CONFIG[3].unit,
      total: lightsQty * items.get(13).unitPrice
    },
    {
      id: "droppers",
      name: EQUIPMENT_LINE_CONFIG[4].name,
      qty: droppersQty,
      unit: EQUIPMENT_LINE_CONFIG[4].unit,
      total: droppersQty * items.get(14).unitPrice
    },
    {
      id: "blind-tube",
      name: EQUIPMENT_LINE_CONFIG[5].name,
      qty: blindTubeQty,
      unit: EQUIPMENT_LINE_CONFIG[5].unit,
      total: blindTubeQty * items.get(15).unitPrice
    },
    {
      id: "mats",
      name: EQUIPMENT_LINE_CONFIG[6].name,
      qty: matsQty,
      unit: EQUIPMENT_LINE_CONFIG[6].unit,
      total: matsQty * items.get(16).unitPrice
    },
    {
      id: "holder",
      name: EQUIPMENT_LINE_CONFIG[7].name,
      qty: holderQty,
      unit: EQUIPMENT_LINE_CONFIG[7].unit,
      total: holderQty * items.get(17).unitPrice
    },
    {
      id: "fittings",
      name: EQUIPMENT_LINE_CONFIG[8].name,
      qty: fittingsQty,
      unit: EQUIPMENT_LINE_CONFIG[8].unit,
      total: fittingsQty * items.get(18).unitPrice
    },
    {
      id: "support-tape",
      name: EQUIPMENT_LINE_CONFIG[9].name,
      qty: supportTapeQty,
      unit: EQUIPMENT_LINE_CONFIG[9].unit,
      total: supportTapeQty * items.get(19).unitPrice
    },
    {
      id: "filter",
      name: EQUIPMENT_LINE_CONFIG[10].name,
      qty: filterQty,
      unit: EQUIPMENT_LINE_CONFIG[10].unit,
      total: filterQty * items.get(20).unitPrice
    },
    {
      id: "pump",
      name: EQUIPMENT_LINE_CONFIG[11].name,
      qty: pumpQty,
      unit: EQUIPMENT_LINE_CONFIG[11].unit,
      total: pumpQty * items.get(21).unitPrice
    },
    {
      id: "punch",
      name: EQUIPMENT_LINE_CONFIG[12].name,
      qty: punchQty,
      unit: EQUIPMENT_LINE_CONFIG[12].unit,
      total: punchQty * items.get(22).unitPrice
    },
    {
      id: "meters",
      name: EQUIPMENT_LINE_CONFIG[13].name,
      qty: meterQty,
      unit: EQUIPMENT_LINE_CONFIG[13].unit,
      total: meterQty * items.get(23).unitPrice
    },
    {
      id: "fertilizer",
      name: EQUIPMENT_LINE_CONFIG[14].name,
      qty: fertilizerQty,
      unit: EQUIPMENT_LINE_CONFIG[14].unit,
      total: fertilizerQty * items.get(24).unitPrice
    },
    {
      id: "seedlings",
      name: EQUIPMENT_LINE_CONFIG[15].name,
      qty: seedlingsQty,
      unit: EQUIPMENT_LINE_CONFIG[15].unit,
      total: seedlingsQty * items.get(25).unitPrice
    }
  ];

  const totalEquipmentCost = equipmentLines.reduce((sum, line) => sum + line.total, 0);
  const seedlingsLine = equipmentLines[equipmentLines.length - 1];
  const equipmentWithoutSeedlings = totalEquipmentCost - seedlingsLine.total;

  const monthlyCare = plantCount * loadedPricing.constants.cropProtectionAndNutritionPerPlantPerMonth;
  const monthlyElectricity =
    loadedPricing.constants.electricityKwPerRack *
    totalRacks *
    loadedPricing.constants.monthlyPreviewLightHoursPerDay *
    365 /
    12 *
    currentState.a4;
  const monthlyRent = area * currentState.a3;
  const monthlyWater = totalRacks * 0.6 * currentState.a5;
  const monthlyExpenseTotal = monthlyCare + monthlyElectricity + monthlyRent + monthlyWater;

  const yearlyCosts = {
    care: monthlyCare * 12,
    electricity: monthlyElectricity * 12,
    rent: monthlyRent * 12,
    water: monthlyWater * 12
  };
  const yearlyExpenseTotal = yearlyCosts.care + yearlyCosts.electricity + yearlyCosts.rent + yearlyCosts.water;

  const modelInvestmentCost =
    loadedPricing.constants.rackModelCost * totalRacks +
    loadedPricing.constants.irrigationNodeModelCost +
    equipmentLines.find((line) => line.id === "meters").total;
  const annualModelOpex =
    plantCount * loadedPricing.constants.cropProtectionAndNutritionPerPlantPerMonth * 12 +
    loadedPricing.constants.electricityKwPerRack *
      totalRacks *
      loadedPricing.constants.paybackModelLightHoursPerDay *
      365 *
      currentState.a4 +
    area * currentState.a3 * 12 +
    ((loadedPricing.constants.waterLitersPerRackPerDay * totalRacks) / 1000 * currentState.a5 * 30) * 12 +
    items.get(25).unitPrice * plantCount;

  const yieldScenarios = loadedPricing.yieldScenarios.map((scenario) => {
    const annualHarvest = plantCount * scenario.kgPerPlantPerYear;
    const annualRevenue = annualHarvest * currentState.a2;
    const monthlyRevenue = annualRevenue / 12;
    const cumulative = [];

    let currentTotal = annualRevenue - (annualModelOpex + modelInvestmentCost);
    for (let year = 1; year <= 4; year += 1) {
      if (year > 1) {
        currentTotal = currentTotal - annualModelOpex + annualRevenue;
      }

      cumulative.push({
        year,
        value: currentTotal
      });
    }

    return {
      ...scenario,
      annualHarvest,
      annualRevenue,
      monthlyRevenue,
      cumulative
    };
  });

  const activeScenario = yieldScenarios.find((scenario) => scenario.id === currentState.yieldScenario) || yieldScenarios[0];

  return {
    area,
    basicRacks,
    extraRacks,
    totalRacks,
    plantCount,
    seedlingPurchaseCount: seedlingsQty,
    equipmentLines,
    equipmentWithoutSeedlings,
    totalEquipmentCost,
    seedlingsTotalCost: seedlingsLine.total,
    monthlyCosts: {
      care: monthlyCare,
      electricity: monthlyElectricity,
      rent: monthlyRent,
      water: monthlyWater,
      total: monthlyExpenseTotal
    },
    yearlyCosts: {
      ...yearlyCosts,
      total: yearlyExpenseTotal
    },
    modelInvestmentCost,
    annualModelOpex,
    yieldScenarios,
    activeScenario
  };
}

function quantityByRack(item, basicRacks, extraRacks) {
  return (item.basicQty || 0) * basicRacks + (item.extraQty || 0) * extraRacks;
}
