export const CONTROL_CONFIG = [
  {
    key: "a0",
    label: "Ширина помещения",
    unit: "м",
    min: 2,
    max: 20,
    step: 0.5,
    note: "От ширины зависит число рядов стеллажей."
  },
  {
    key: "a1",
    label: "Длина помещения",
    unit: "м",
    min: 4,
    max: 30,
    step: 0.5,
    note: "От длины зависит число секций по длине."
  },
  {
    key: "a2",
    label: "Высота помещения",
    unit: "м",
    min: 2,
    max: 6,
    step: 0.1,
    note: "Высота определяет рабочую плотность посадки."
  },
  {
    key: "a3",
    label: "Цена 1 кВт",
    unit: "руб/кВт",
    min: 0,
    max: 100000,
    step: 0.5,
    note: "Тариф для ориентировочной энергетики."
  },
  {
    key: "a4",
    label: "Аренда",
    unit: "руб/м² в мес",
    min: 0,
    max: 100000,
    step: 50,
    note: "Ставка аренды за квадратный метр в месяц."
  }
];

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});

const smartFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1
});

export function normalizeInputValue(rawValue, control) {
  const parsed = Number.parseFloat(rawValue);
  const fallback = Number.isFinite(control.min) ? control.min : 0;
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  const clamped = Math.min(control.max, Math.max(control.min, safeValue));
  const step = Number(control.step || 1);
  const precision = countPrecision(step);
  const normalized = Math.round(clamped / step) * step;

  return Number(normalized.toFixed(precision));
}

function countPrecision(step) {
  const value = String(step);
  if (!value.includes(".")) {
    return 0;
  }

  return value.split(".")[1].length;
}

export function createDefaultState(loadedPricing) {
  const optionDefaults = Object.fromEntries((loadedPricing.optionGroups || []).map((group) => [
    group.stateKey,
    Boolean(group.includedByDefault)
  ]));

  return {
    a0: normalizeInputValue(loadedPricing.inputs.a0, CONTROL_CONFIG[0]),
    a1: normalizeInputValue(loadedPricing.inputs.a1, CONTROL_CONFIG[1]),
    a2: normalizeInputValue(loadedPricing.inputs.a2, CONTROL_CONFIG[2]),
    a3: normalizeInputValue(loadedPricing.inputs.a3, CONTROL_CONFIG[3]),
    a4: normalizeInputValue(loadedPricing.inputs.a4, CONTROL_CONFIG[4]),
    phaseMode: "three-phase",
    cableLayoutMode: "tray",
    ...optionDefaults
  };
}

export function formatRub(value) {
  return rubFormatter.format(Math.round(value || 0));
}

export function formatSmart(value) {
  return smartFormatter.format(Number(value || 0));
}

export function calculateFarm(currentState, loadedPricing) {
  const width = normalizeInputValue(currentState.a0, CONTROL_CONFIG[0]);
  const length = normalizeInputValue(currentState.a1, CONTROL_CONFIG[1]);
  const height = normalizeInputValue(currentState.a2, CONTROL_CONFIG[2]);
  const powerRate = normalizeInputValue(currentState.a3, CONTROL_CONFIG[3]);
  const rentRate = normalizeInputValue(currentState.a4, CONTROL_CONFIG[4]);
  const area = width * length;
  const heightProfile = resolveHeightProfile(height, loadedPricing.constants);
  const geometry = loadedPricing.constants.rackGeometry;
  const trayKit = loadedPricing.constants.trayKit;
  const purchaseUnits = loadedPricing.constants.purchaseUnits;
  const rackLength = resolveRackLength(length, geometry);
  const rackCount = resolveRackCount(width, geometry);
  const segmentsPerRack = Math.max(1, Math.round(rackLength / geometry.segmentLength));
  const trayCount = rackCount * segmentsPerRack * heightProfile.tiers;
  const plantCount = trayCount * trayKit.plantsPerTray;
  const lightsCount = trayCount * trayKit.lightsPerTray;
  const matCount = trayCount * trayKit.matsPerTray;
  const dripperCount = trayCount * trayKit.drippersPerTray;
  const blindTubeMeters = trayCount * trayKit.blindTubePerTray + rackCount * trayKit.blindTubePerRack;
  const blindTubeCoils = Math.max(1, Math.ceil(blindTubeMeters / purchaseUnits.blindTubeCoilMeters));
  const blindTubeMetersForPurchase = blindTubeCoils * purchaseUnits.blindTubeCoilMeters;
  const totalRackLength = rackCount * rackLength * heightProfile.tiers;
  const usedWidth = getRackFootprintWidth(rackCount, geometry);
  const effectiveRackArea = rackCount * rackLength * geometry.rackWidth;
  const matPacks = resolveMatPackCount(matCount, purchaseUnits);
  const matUnitsForPurchase = matPacks * purchaseUnits.matPackSize;
  const spareMats = matUnitsForPurchase - matCount;

  const electrical = calculateElectricalModel({
    currentState,
    loadedPricing,
    powerRate,
    width,
    length,
    area,
    rackCount,
    rackLength,
    trayCount,
    heightProfile
  });
  const water = calculateWaterModel({
    loadedPricing,
    dripperCount
  });
  const berrySalePricePerKg = normalizeNonNegativeNumber(
    loadedPricing.constants?.economyProfile?.berrySalePricePerKg,
    1600
  );
  const monthlyRentCost = Math.max(0, roundToStep(area * rentRate, 1, "nearest"));
  const monthlyOperatingCost = monthlyRentCost + electrical.monthlyPowerCost + water.monthlyWaterCost;

  const lineItems = [
    {
      id: "assembly",
      label: "Стеллажи в сборе",
      qty: plantCount,
      unit: "растений",
      unitPrice: loadedPricing.constants.assemblyPerPlant,
      total: plantCount * loadedPricing.constants.assemblyPerPlant,
      included: true,
      note: "Базовая сборка на растение"
    }
  ];

  (loadedPricing.optionGroups || []).forEach((group) => {
    const included = Boolean(currentState[group.stateKey]);
    const qty = resolveOptionQuantity(group, { plantCount, area, electrical });
    const total = resolveOptionTotal(group, qty, electrical);

    lineItems.push({
      id: group.id,
      label: group.label,
      qty: included ? qty : 0,
      unit: group.unitLabel || resolveOptionUnit(group),
      unitPrice: group.unitPrice,
      total: included ? total : 0,
      included,
      note: group.note || "",
      includes: group.includes || []
    });
  });

  const totalEquipmentCost = lineItems.reduce((sum, item) => sum + item.total, 0);
  const selectedItems = lineItems.filter((item) => item.included);
  const optionalItems = lineItems.filter((item) => !item.included && item.id !== "assembly");
  const seedlingsItem = lineItems.find((item) => item.id === "seedlings");
  const seedlingsTotalCost = seedlingsItem?.total || 0;
  return {
    width,
    length,
    height,
    powerRate,
    rentRate,
    area,
    rackCount,
    rackLength,
    segmentsPerRack,
    trayCount,
    tiers: heightProfile.tiers,
    plantsPerRack: segmentsPerRack * heightProfile.tiers * trayKit.plantsPerTray,
    lightsCount,
    matCount,
    matPacks,
    matUnitsForPurchase,
    spareMats,
    dripperCount,
    blindTubeMeters,
    blindTubeCoils,
    blindTubeMetersForPurchase,
    totalRackLength,
    usedWidth,
    effectiveRackArea,
    heightProfile,
    plantCount,
    totalEquipmentCost,
    equipmentWithoutSeedlings: totalEquipmentCost - seedlingsTotalCost,
    seedlingsTotalCost,
    electrical,
    water,
    berrySalePricePerKg,
    monthlyRentCost,
    monthlyOperatingCost,
    baseAssemblyIncludes: loadedPricing.baseAssemblyIncludes || [],
    lineItems,
    selectedItems,
    optionalItems
  };
}

function calculateWaterModel(context) {
  const { loadedPricing, dripperCount } = context;
  const waterProfile = loadedPricing.constants?.waterProfile || {};
  const perDripperMlPerDay = normalizeNonNegativeNumber(waterProfile.perDripperMlPerDay, 250);
  const daysPerMonth = normalizeNonNegativeInteger(waterProfile.daysPerMonth, 30, 365);
  const waterTariffPerM3 = normalizeNonNegativeNumber(waterProfile.waterTariffPerM3, 60);
  const dailyLiters = dripperCount * (perDripperMlPerDay / 1000);
  const monthlyLiters = Math.max(0, roundToStep(dailyLiters * daysPerMonth, 1, "nearest"));
  const monthlyM3 = Math.max(0, roundToStep(monthlyLiters / 1000, 0.1, "nearest"));
  const monthlyWaterCost = Math.max(0, roundToStep(monthlyM3 * waterTariffPerM3, 1, "nearest"));

  return {
    perDripperMlPerDay,
    daysPerMonth,
    waterTariffPerM3,
    dailyLiters: roundToStep(dailyLiters, 1, "nearest"),
    monthlyLiters,
    monthlyM3,
    monthlyWaterCost
  };
}

export function resolveHeightProfile(height, constants) {
  if (height <= constants.heightBreakpoints.threeTierMax) {
    return {
      tiers: 3,
      title: "До 250 см",
      note: "В ориентире считаем 3 этажа."
    };
  }

  if (height <= constants.heightBreakpoints.fourTierMax) {
    return {
      tiers: 4,
      title: "250–400 см",
      note: "В ориентире считаем 4 этажа."
    };
  }

  return {
    tiers: 4,
    title: "Выше 400 см",
    note: "В ориентире считаем 4 этажа. Для более высокой конфигурации можно получить индивидуальный расчёт."
  };
}

function resolveRackLength(length, geometry) {
  const baseLength = Math.floor(length / geometry.segmentLength) * geometry.segmentLength;
  return Math.max(geometry.segmentLength, Math.min(geometry.maxRackLength, baseLength));
}

function resolveRackCount(width, geometry) {
  let count = 1;

  while (getRackFootprintWidth(count + 1, geometry) <= width) {
    count += 1;
  }

  return count;
}

function getRackFootprintWidth(rackCount, geometry) {
  if (rackCount <= 1) {
    return geometry.rackWidth + geometry.wallOffset * 2;
  }

  return rackCount * geometry.rackWidth
    + (rackCount - 1) * geometry.aisleWidth
    + geometry.wallOffset * 2;
}

function resolveMatPackCount(matCount, purchaseUnits) {
  const basePacks = Math.max(1, Math.ceil(matCount / purchaseUnits.matPackSize));
  const spareMats = basePacks * purchaseUnits.matPackSize - matCount;
  return spareMats < purchaseUnits.minMatReserve ? basePacks + 1 : basePacks;
}

function resolveOptionQuantity(group, metrics) {
  if (group.type === "perPlant") {
    return metrics.plantCount;
  }

  if (group.type === "perAreaRounded") {
    return metrics.area;
  }

  if (group.type === "electricalAuto") {
    return metrics.electrical.totalLightLines;
  }

  return 1;
}

function resolveOptionUnit(group) {
  if (group.type === "perPlant") {
    return "растений";
  }

  if (group.type === "perAreaRounded") {
    return "м²";
  }

  if (group.type === "electricalAuto") {
    return "линий";
  }

  return "комплект";
}

function resolveOptionTotal(group, qty, electrical) {
  const rawTotal = qty * group.unitPrice;
  if (group.type === "perAreaRounded" && group.roundTo) {
    const roundedTotal = roundToStep(rawTotal, group.roundTo, group.roundMode);
    return Math.max(roundedTotal, group.minTotal || 0);
  }

  if (group.type === "electricalAuto") {
    const pricingModel = group.pricingModel || {};
    const rawElectricalTotal = (pricingModel.shieldBase || 0)
      + (pricingModel.inputBreakerUnitPrice || 0)
      + electrical.totalLightLines * (pricingModel.lightLineBreakerUnitPrice || 0)
      + electrical.contactorCount * (pricingModel.contactorUnitPrice || 0)
      + electrical.smartRelayCount * (pricingModel.smartRelayUnitPrice || 0)
      + (electrical.exhaustPowerW ? (pricingModel.exhaustBreakerUnitPrice || 0) : 0)
      + (electrical.serviceSocketPoints ? (pricingModel.serviceBreakerUnitPrice || 0) : 0)
      + (electrical.splitInputW ? (pricingModel.splitBreakerUnitPrice || 0) : 0)
      + electrical.allLightLinesM * (pricingModel.lightCablePerMeter || 0)
      + electrical.exhaustLineM * (pricingModel.exhaustCablePerMeter || 0)
      + electrical.serviceLineM * (pricingModel.serviceCablePerMeter || 0)
      + electrical.splitLineM * (pricingModel.splitCablePerMeter || 0)
      + electrical.wagoCount * (pricingModel.wagoUnitPrice || 0)
      + electrical.junctionBoxCount * (pricingModel.junctionBoxUnitPrice || 0);
    const roundedElectricalTotal = roundToStep(rawElectricalTotal, pricingModel.roundTo || 5000, "up");
    return Math.max(roundedElectricalTotal, pricingModel.minTotal || 0);
  }

  return rawTotal;
}

function calculateElectricalModel(context) {
  const {
    currentState,
    loadedPricing,
    powerRate,
    length,
    area,
    rackCount,
    rackLength,
    trayCount,
    heightProfile
  } = context;
  const electricalModel = loadedPricing.constants.electricalModel || {};
  const energyProfile = loadedPricing.constants.energyProfile || {};
  const phaseMode = currentState.phaseMode === "one-phase" ? "one-phase" : "three-phase";
  const cableLayoutMode = electricalModel.layoutCoefficients?.[currentState.cableLayoutMode]
    ? currentState.cableLayoutMode
    : "tray";
  const layoutCoeff = electricalModel.layoutCoefficients?.[cableLayoutMode] || 1;
  const lightCount = trayCount;
  const fixturePowerW = electricalModel.fixturePowerW || 100;
  const lightPowerTotalW = lightCount * fixturePowerW;
  const driverSidePowerW = lightPowerTotalW / 2;
  const maxLinePowerW = electricalModel.maxLinePowerW || 2500;
  const driverSideLineCount = Math.max(1, Math.ceil(driverSidePowerW / maxLinePowerW));
  const totalLightLines = driverSideLineCount * 2;
  const lightingGroups = driverSideLineCount;
  const racksPerLine = Math.max(1, Math.ceil(rackCount / driverSideLineCount));
  const panelToRackZoneM = electricalModel.panelToRackZoneM || 4;
  const lightLineTerminalReserveM = electricalModel.lightLineTerminalReserveM || 2;
  const oneLightLineM = panelToRackZoneM + racksPerLine * rackLength + lightLineTerminalReserveM;
  const allLightLinesM = Math.ceil(totalLightLines * oneLightLineM * layoutCoeff);
  const exhaustPowerW = electricalModel.exhaustPowerW || 1000;
  const exhaustLineM = Math.ceil((panelToRackZoneM + length / 2 + 2) * layoutCoeff);
  const climateEnabled = Boolean(currentState.includeClimatePack);
  const electricityTariff = normalizeNonNegativeNumber(powerRate, 0);
  const daysPerMonth = normalizeNonNegativeInteger(energyProfile.daysPerMonth, 30, 365);
  const lightFullHours = normalizeNonNegativeNumber(energyProfile.lightHoursFull, 12);
  const lightHalfHours = normalizeNonNegativeNumber(energyProfile.lightHoursHalf, 4);
  const lightHalfFactor = Math.min(
    1,
    Math.max(0, normalizeNonNegativeNumber(energyProfile.lightHalfFactor, 0.5))
  );
  const condenserDuty = Math.min(
    1,
    Math.max(0, normalizeNonNegativeNumber(energyProfile.condenserDuty, 0.5))
  );
  const exhaustHours = normalizeNonNegativeNumber(energyProfile.exhaustHours, 24);
  const exhaustDuty = Math.min(
    1,
    Math.max(0, normalizeNonNegativeNumber(energyProfile.exhaustDuty, 1))
  );
  const pumpPowerW = normalizeNonNegativeNumber(energyProfile.pumpPowerW, 200);
  const pumpMinutesPerDay = normalizeNonNegativeNumber(energyProfile.pumpMinutesPerDay, 5);
  const automationPowerW = normalizeNonNegativeNumber(energyProfile.automationPowerW, 200);
  const automationHoursPerDay = normalizeNonNegativeNumber(energyProfile.automationHoursPerDay, 24);
  const splitColdFactor = electricalModel.splitColdFactor || 1.2;
  const btuPerW = electricalModel.btuPerW || 3.412;
  const splitEer = electricalModel.splitEer || 3.2;
  const splitColdW = climateEnabled ? lightPowerTotalW * splitColdFactor : 0;
  const splitBtu = Math.ceil(splitColdW * btuPerW);
  const splitInputW = climateEnabled ? Math.ceil(splitColdW / splitEer) : 0;
  const splitLineM = climateEnabled ? Math.ceil((panelToRackZoneM + length / 2 + 3) * layoutCoeff) : 0;
  const serviceReserveW = electricalModel.serviceReserveW || 1500;
  const serviceLineM = Math.ceil((panelToRackZoneM + rackLength + 3) * layoutCoeff);
  const totalCableM = allLightLinesM + exhaustLineM + splitLineM + serviceLineM;
  const totalPowerW = lightPowerTotalW + exhaustPowerW + splitInputW + serviceReserveW;
  const runningAmps = phaseMode === "one-phase"
    ? totalPowerW / 220
    : totalPowerW / (1.73 * 380);
  const inputSizingPowerW = lightPowerTotalW * 2 + exhaustPowerW + splitInputW + serviceReserveW;
  const inputSizingAmps = phaseMode === "one-phase"
    ? inputSizingPowerW / 220
    : inputSizingPowerW / (1.73 * 380);
  const lineAmps = maxLinePowerW / 220;
  const standardBreakers = electricalModel.standardBreakersA || [6, 10, 16, 20, 25, 32, 40, 50, 63];
  const lightLineBreakerA = Math.max(pickStandardBreaker(lineAmps, standardBreakers), 16);
  const exhaustBreakerA = Math.max(pickStandardBreaker(exhaustPowerW / 220, standardBreakers), 10);
  const serviceBreakerA = Math.max(pickStandardBreaker(serviceReserveW / 220, standardBreakers), 16);
  const splitBreakerA = splitInputW ? Math.max(pickStandardBreaker(splitInputW / 220, standardBreakers), 16) : 0;
  const smartRelayCount = lightingGroups;
  const lightPowerKwhPerDay = (lightPowerTotalW / 1000) * (lightFullHours + lightHalfHours * lightHalfFactor);
  const exhaustPowerWForEnergy = Math.min(exhaustPowerW, 1000);
  const exhaustKwhPerDay = (exhaustPowerWForEnergy / 1000) * exhaustHours * exhaustDuty;
  const condenserKwhPerDay = climateEnabled ? (splitInputW / 1000) * 24 * condenserDuty : 0;
  const pumpKwhPerDay = (pumpPowerW / 1000) * (pumpMinutesPerDay / 60);
  const automationKwhPerDay = (automationPowerW / 1000) * automationHoursPerDay;
  const totalKwhPerDay = lightPowerKwhPerDay + exhaustKwhPerDay + condenserKwhPerDay + pumpKwhPerDay + automationKwhPerDay;
  const monthlyKwh = roundToStep(totalKwhPerDay * daysPerMonth, 0.1, "nearest");
  const monthlyPowerCost = Math.max(0, monthlyKwh * electricityTariff);
  const monthlyElectricitySummary = {
    lightKwhPerDay: roundToStep(lightPowerKwhPerDay, 0.1, "nearest"),
    exhaustKwhPerDay: roundToStep(exhaustKwhPerDay, 0.1, "nearest"),
    condenserKwhPerDay: roundToStep(condenserKwhPerDay, 0.1, "nearest"),
    pumpKwhPerDay: roundToStep(pumpKwhPerDay, 0.1, "nearest"),
    automationKwhPerDay: roundToStep(automationKwhPerDay, 0.1, "nearest"),
    monthlyKwh,
    monthlyPowerCost
  };
  const inputBreakerPoles = phaseMode === "one-phase" ? 2 : 4;
  const cableSpecLight = "ВВГнг-LS 3×2.5";
  const cableSpecExhaust = "ВВГнг-LS 3×1.5";
  const cableSpecSplit = "ВВГнг-LS 3×2.5";
  const cableSpecService = "ВВГнг-LS 3×2.5";
  const junctionBoxCount = rackCount;
  const wagoCount = lightCount * 4;
  const shieldNote = phaseMode === "one-phase"
    ? `под ${inputBreakerAPlaceholder(inputSizingAmps, standardBreakers)} А ввод 2P и ${totalLightLines} световых линий`
    : `под ${inputBreakerAPlaceholder(inputSizingAmps, standardBreakers)} А ввод 4P и ${totalLightLines} световых линий`;
  const inputBreakerA = pickStandardBreaker(inputSizingAmps, standardBreakers);
  const bomItems = [
    {
      id: "dist-board",
      label: "Распределительный щит",
      qty: 1,
      unit: "шт",
      spec: phaseMode === "one-phase" ? "ввод 2P" : "ввод 4P",
      note: shieldNote
    },
    {
      id: "input-breaker",
      label: "Вводной автомат",
      qty: 1,
      unit: "шт",
      spec: `${inputBreakerPoles}P ${inputBreakerA} А`,
      note: "С запасом по свету и остальным нагрузкам"
    },
    {
      id: "light-breakers",
      label: "Автоматы света",
      qty: totalLightLines,
      unit: "шт",
      spec: `1P ${lightLineBreakerA} А`,
      note: "Отдельно на каждую линию драйверов"
    },
    {
      id: "light-contactors",
      label: "Контакторы света",
      qty: totalLightLines,
      unit: "шт",
      spec: `2P ${electricalModel.lineContactorA || 25} А`,
      note: "Размыкаем фазу и ноль по каждой линии"
    },
    {
      id: "smart-relays",
      label: "Умные реле",
      qty: smartRelayCount,
      unit: "шт",
      spec: "управление группами",
      note: "По одному на пару линий драйверов 1/2"
    },
    {
      id: "exhaust-breaker",
      label: "Автомат вытяжки",
      qty: 1,
      unit: "шт",
      spec: `1P ${exhaustBreakerA} А`,
      note: "Отдельная группа вытяжки"
    },
    {
      id: "service-breaker",
      label: "Автомат сервисной группы",
      qty: 1,
      unit: "шт",
      spec: `1P ${serviceBreakerA} А`,
      note: `${electricalModel.serviceSocketPoints || 7} сервисных точек`
    },
    {
      id: "junction-boxes",
      label: "Распаячные коробки",
      qty: junctionBoxCount,
      unit: "шт",
      spec: "по одной на стеллаж",
      note: "Для разводки на зону стеллажей"
    },
    {
      id: "wago-connectors",
      label: "Клеммы WAGO",
      qty: wagoCount,
      unit: "шт",
      spec: "4 на светильник",
      note: "На подключение драйверов и светильников"
    },
    {
      id: "light-cable",
      label: "Кабель света",
      qty: allLightLinesM,
      unit: "м",
      spec: cableSpecLight,
      note: `${totalLightLines} линий до стеллажей`
    },
    {
      id: "exhaust-cable",
      label: "Кабель вытяжки",
      qty: exhaustLineM,
      unit: "м",
      spec: cableSpecExhaust,
      note: "Отдельная линия"
    },
    {
      id: "service-cable",
      label: "Кабель сервисной группы",
      qty: serviceLineM,
      unit: "м",
      spec: cableSpecService,
      note: "Насос, автоматика и запас"
    }
  ];

  if (splitInputW) {
    bomItems.splice(7, 0, {
      id: "split-breaker",
      label: "Автомат сплита",
      qty: 1,
      unit: "шт",
      spec: `1P ${splitBreakerA} А`,
      note: "Отдельная линия климата"
    });

    bomItems.push({
      id: "split-cable",
      label: "Кабель сплита",
      qty: splitLineM,
      unit: "м",
      spec: cableSpecSplit,
      note: "Линия канального сплита"
    });
  }

  return {
    phaseMode,
    phaseLabel: phaseMode === "one-phase" ? "1 фаза" : "3 фазы",
    cableLayoutMode,
    cableLayoutLabel: formatCableLayoutMode(cableLayoutMode),
    layoutCoeff,
    lightCount,
    lightPowerTotalW,
    lightPowerTotalKw: lightPowerTotalW / 1000,
    driverSidePowerW,
    lightingGroups,
    driverSideLineCount,
    totalLightLines,
    racksPerLine,
    oneLightLineM: Math.ceil(oneLightLineM),
    allLightLinesM,
    exhaustPowerW,
    exhaustLineM,
    splitColdW,
    splitBtu,
    splitInputW,
    splitLineM,
    serviceReserveW,
    serviceLineM,
    totalCableM,
    totalPowerW,
    totalPowerKw: totalPowerW / 1000,
    runningAmps,
    inputSizingPowerW,
    inputSizingAmps,
    inputBreakerA,
    inputBreakerPoles,
    lightLineBreakerA,
    lightLineAmps: lineAmps,
    exhaustBreakerA,
    serviceBreakerA,
    splitBreakerA,
    contactorCount: totalLightLines,
    contactorRatingA: electricalModel.lineContactorA || 25,
    serviceSocketPoints: electricalModel.serviceSocketPoints || 7,
    smartRelayCount,
    junctionBoxCount,
    wagoCount,
    monthlyKwh,
    monthlyPowerCost,
    monthlyElectricitySummary,
    tierLabel: heightProfile.tiers,
    cableSpecLight,
    cableSpecExhaust,
    cableSpecSplit,
    cableSpecService,
    bomItems
  };
}

function roundToStep(value, step, mode = "nearest") {
  const safeValue = value || 0;
  if (!step) return safeValue;
  if (mode === "up") {
    return Math.ceil(safeValue / step) * step;
  }
  return Math.round(safeValue / step) * step;
}

function pickStandardBreaker(currentA, standardBreakers) {
  const safeCurrent = Math.ceil(currentA || 0);
  const sorted = [...standardBreakers].sort((left, right) => left - right);
  return sorted.find((value) => value >= safeCurrent) || sorted[sorted.length - 1];
}

function formatCableLayoutMode(mode) {
  if (mode === "short") {
    return "Короткая трасса";
  }

  if (mode === "real") {
    return "С запасом на монтаж";
  }

  return "По лотку";
}

function inputBreakerAPlaceholder(currentA, standardBreakers) {
  return pickStandardBreaker(currentA, standardBreakers);
}

function normalizeNonNegativeNumber(rawValue, fallback) {
  const value = Number.parseFloat(rawValue);
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function normalizeNonNegativeInteger(rawValue, fallback = 0, maxValue = Infinity) {
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maxValue, Math.max(0, Math.trunc(value)));
}
