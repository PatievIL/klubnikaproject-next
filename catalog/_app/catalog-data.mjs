import { catalogLegacyOverrides } from "./catalog-legacy-overrides.mjs";

const SITE_ORIGIN = "https://klubnikaproject.ru";
const CATALOG_BASE_PATH = "/catalog/";
const DEFAULT_PAGE_SIZE = 12;

export const CATALOG_META = {
  siteOrigin: SITE_ORIGIN,
  catalogBasePath: CATALOG_BASE_PATH,
  brandName: "Klubnika Project",
  shopName: "Каталог для клубничной фермы",
  slogan: "Свет, полив, стеллажи, субстрат, посадочный материал и сервисные позиции для рабочей закупки клубничной фермы.",
  phones: [
    {
      label: "Связь",
      href: "tel:+79255831669",
      value: "+7 925 583-16-69",
    },
  ],
  email: "info@klubnikaproject.ru",
  address: "Москва, проектная комплектация с отгрузкой по РФ",
  socialLinks: [
    { label: "Telegram", href: "https://t.me/patiev_admin" },
    { label: "WhatsApp", href: "https://wa.me/79891250150" },
    { label: "Instagram", href: "https://www.instagram.com/ilya_patiev/" },
    { label: "YouTube", href: "https://www.youtube.com/@Ilya_patiev" },
  ],
  siteLinks: [
    {
      title: "Главная",
      href: "/",
      summary: "Маршрутизатор сценариев: расчёт, магазин, сопровождение и консультации.",
    },
    {
      title: "Расчёт фермы",
      href: "/farm/",
      summary: "Понять состав фермы и рамку бюджета до закупки оборудования.",
    },
    {
      title: "Калькулятор",
      href: "/calc/",
      summary: "Быстрый ориентир по модулю, полке и базовой смете.",
    },
    {
      title: "Консультации",
      href: "/consultations/",
      summary: "Разбор действующей фермы, совместимости узлов и следующего шага.",
    },
    {
      title: "Сопровождение",
      href: "/study/",
      summary: "Длинная работа по действующему проекту и технологии выращивания.",
    },
  ],
};

export const BADGE_META = {
  hit: { label: "Хит", tone: "amber" },
  recommended: { label: "Советуем", tone: "green" },
  new: { label: "Новинка", tone: "blue" },
  sale: { label: "Акция", tone: "rose" },
};

export const STOCK_META = {
  in_stock: {
    label: "В наличии",
    shortLabel: "В наличии",
    tone: "green",
    purchasable: true,
  },
  limited: {
    label: "Осталось мало",
    shortLabel: "Мало",
    tone: "amber",
    purchasable: true,
  },
  preorder: {
    label: "Под заказ",
    shortLabel: "Под заказ",
    tone: "blue",
    purchasable: true,
  },
  out_of_stock: {
    label: "Нет в наличии",
    shortLabel: "Нет",
    tone: "gray",
    purchasable: false,
  },
};

export const SORT_OPTIONS = [
  { value: "popularity-desc", label: "По популярности: сначала популярные" },
  { value: "popularity-asc", label: "По популярности: сначала нишевые" },
  { value: "alphabet-desc", label: "По алфавиту: Я-А" },
  { value: "alphabet-asc", label: "По алфавиту: А-Я" },
  { value: "price-desc", label: "По цене: сначала дорогие" },
  { value: "price-asc", label: "По цене: сначала доступные" },
];

export const DISPLAY_OPTIONS = [
  { value: "grid", label: "Плитка" },
  { value: "table", label: "Список" },
];

export const REVIEW_SORT_OPTIONS = [
  { value: "newest", label: "Сначала новые" },
  { value: "oldest", label: "Сначала старые" },
  { value: "useful", label: "Сначала полезные" },
  { value: "positive", label: "Сначала с высокой оценкой" },
  { value: "negative", label: "Сначала с низкой оценкой" },
];

const money = (value) => Math.round(value);

const attr = (key, label, value, group = "Основные") => ({
  key,
  label,
  value,
  group,
});

const faq = (question, answer, askedAt, answeredAt = askedAt) => ({
  question,
  answer,
  askedAt,
  answeredAt,
});

const documentRef = (id, title, fileUrl, fileSize) => ({
  id,
  title,
  fileUrl,
  fileSize,
});

const priceTiersFor = (price, special = []) => {
  if (special.length) return special;
  return [
    {
      label: "Розница",
      minQty: 1,
      price: money(price),
      summary: "Поштучная покупка для точечного добора.",
    },
    {
      label: "Мелкий опт",
      minQty: 10,
      price: money(price * 0.95),
      summary: "Для стандартных дооснащений на один модуль.",
    },
    {
      label: "Проектная партия",
      minQty: 30,
      price: money(price * 0.91),
      summary: "Для связки нескольких рядов и крупных отправок.",
    },
  ];
};

const fullDescriptionFrom = ({ overview, fit, bullets, wrapUp }) => `
  <p>${overview}</p>
  <p>${fit}</p>
  <ul>${bullets.map((item) => `<li>${item}</li>`).join("")}</ul>
  <p>${wrapUp}</p>
`;

const sharedDocuments = {
  "led-passport": documentRef(
    "led-passport",
    "Паспорт серии линейных светильников",
    "catalog/files/passport-led-series.txt",
    "124 KB"
  ),
  "mounting-checklist": documentRef(
    "mounting-checklist",
    "Чек-лист монтажа и подвеса",
    "catalog/files/mounting-checklist.txt",
    "88 KB"
  ),
  "irrigation-passport": documentRef(
    "irrigation-passport",
    "Паспорт линии полива и узлов",
    "catalog/files/irrigation-passport.txt",
    "112 KB"
  ),
  "rack-spec": documentRef(
    "rack-spec",
    "Спецификация модулей и стоек",
    "catalog/files/rack-specification.txt",
    "136 KB"
  ),
  "substrate-guide": documentRef(
    "substrate-guide",
    "Памятка по субстрату и предувлажнению",
    "catalog/files/substrate-guide.txt",
    "76 KB"
  ),
  "planting-note": documentRef(
    "planting-note",
    "Памятка по приёмке посадочного материала",
    "catalog/files/planting-note.txt",
    "68 KB"
  ),
  "climate-sheet": documentRef(
    "climate-sheet",
    "Шпаргалка по климатическому контуру",
    "catalog/files/climate-sheet.txt",
    "94 KB"
  ),
  "nutrition-sheet": documentRef(
    "nutrition-sheet",
    "Карта растворов и сервисных замеров",
    "catalog/files/nutrition-sheet.txt",
    "84 KB"
  ),
  "monitoring-guide": documentRef(
    "monitoring-guide",
    "Памятка по датчикам и интеграции",
    "catalog/files/monitoring-guide.txt",
    "72 KB"
  ),
  "packaging-sheet": documentRef(
    "packaging-sheet",
    "Памятка по упаковке урожая",
    "catalog/files/packaging-sheet.txt",
    "53 KB"
  ),
};

const categoriesSeed = [
  {
    id: "led",
    parentId: null,
    slug: "led",
    name: "LED-освещение",
    image: "assets/photos/optimized/greenhouse-rack.webp",
    description: "Линейный свет, тепличные штанги и сценарии досветки для полок, рядов и сервисных зон.",
    sortOrder: 10,
    seoTitle: "LED-освещение для клубничной фермы",
    seoDescription: "Линейные и тепличные светильники для клубничной фермы: длина, мощность, подвес и логика ряда.",
  },
  {
    id: "linear-led",
    parentId: "led",
    slug: "linear-led",
    name: "Линейные светильники",
    image: "assets/catalog/50590287.webp",
    description: "Линейка под ярус, стеллаж и сервисный ряд с фиксированной длиной пролёта.",
    sortOrder: 11,
    seoTitle: "Линейные светильники для ярусов и стеллажей",
    seoDescription: "Компактные и длинные линейные светильники для клубничной фермы с контролируемой геометрией ряда.",
  },
  {
    id: "greenhouse-led",
    parentId: "led",
    slug: "greenhouse-led",
    name: "Тепличные световые модули",
    image: "assets/catalog/67446574.webp",
    description: "Более мощные позиции для зон досветки, тепличных рядов и комбинированных сценариев.",
    sortOrder: 12,
    seoTitle: "Тепличные световые модули",
    seoDescription: "Мощные световые модули для зон досветки и тепличных рядов клубничной фермы.",
  },
  {
    id: "irrigation",
    parentId: null,
    slug: "irrigation",
    name: "Полив и дозирование",
    image: "assets/catalog/80128135.webp",
    description: "Капельницы, магистрали, фитинги и готовые наборы под стеллаж и рабочий модуль.",
    sortOrder: 20,
    seoTitle: "Полив и дозирование для клубничной фермы",
    seoDescription: "Капельницы, магистрали, фильтры, фитинги и комплекты полива для клубничной фермы.",
  },
  {
    id: "drippers",
    parentId: "irrigation",
    slug: "drippers",
    name: "Капельницы и узлы подачи",
    image: "assets/catalog/80128135.webp",
    description: "Точечная подача раствора, компенсирующие капельницы и готовые узлы на растение.",
    sortOrder: 21,
    seoTitle: "Капельницы и узлы подачи",
    seoDescription: "Капельницы и узлы подачи для равномерной работы поливочной линии на клубничной ферме.",
  },
  {
    id: "fittings",
    parentId: "irrigation",
    slug: "fittings",
    name: "Фитинги и магистрали",
    image: "assets/catalog/IMG_4724.webp",
    description: "Магистрали, пробойники, фильтры и расходники для сборки линии без лишних переходников.",
    sortOrder: 22,
    seoTitle: "Фитинги и магистрали полива",
    seoDescription: "Фитинги, трубка, фильтры и расходники для сборки поливочной линии клубничной фермы.",
  },
  {
    id: "irrigation-kits",
    parentId: "irrigation",
    slug: "irrigation-kits",
    name: "Готовые наборы полива",
    image: "assets/catalog/IMG_6061.webp",
    description: "Наборы под базовый модуль, дополнительный ряд и типовые схемы дооснащения.",
    sortOrder: 23,
    seoTitle: "Готовые наборы полива",
    seoDescription: "Готовые наборы полива для стеллажа, модуля и типовых рядов на клубничной ферме.",
  },
  {
    id: "racks",
    parentId: null,
    slug: "racks",
    name: "Стеллажные системы",
    image: "assets/photos/optimized/rack-aisle.webp",
    description: "Каркасы, ряды, лотки и сервисные узлы для построения рабочей геометрии фермы.",
    sortOrder: 30,
    seoTitle: "Стеллажные системы для клубничной фермы",
    seoDescription: "Каркасы, ряды, сервисные узлы и лотки для клубничной фермы.",
  },
  {
    id: "rack-frames",
    parentId: "racks",
    slug: "rack-frames",
    name: "Каркасы и модули",
    image: "assets/photos/optimized/rack-aisle.webp",
    description: "Базовые и расширенные каркасы под заданное число матов и рядов.",
    sortOrder: 31,
    seoTitle: "Каркасы и модули",
    seoDescription: "Каркасы и рабочие модули для ярусной клубничной фермы.",
  },
  {
    id: "trays-gutters",
    parentId: "racks",
    slug: "trays-gutters",
    name: "Лотки и сервисные элементы",
    image: "assets/catalog/11811908.webp",
    description: "Лотки, желоба и сервисные полки для аккуратной сборки ряда.",
    sortOrder: 32,
    seoTitle: "Лотки и сервисные элементы",
    seoDescription: "Лотки, желоба и сервисные элементы для клубничного стеллажа.",
  },
  {
    id: "substrates",
    parentId: null,
    slug: "substrates",
    name: "Субстраты и старт-корневая зона",
    image: "assets/catalog/grodan_prestige_6_ho.webp",
    description: "Субстратные маты, кубики и стартовые форматы под посадку и пересадку.",
    sortOrder: 40,
    seoTitle: "Субстраты для клубничной фермы",
    seoDescription: "Маты, кубики и стартовые решения для корневой зоны клубничной фермы.",
  },
  {
    id: "substrate-slabs",
    parentId: "substrates",
    slug: "substrate-slabs",
    name: "Субстратные маты",
    image: "assets/catalog/grodan_prestige_6_ho.webp",
    description: "Маты под плодоношение и рабочий ряд с контролируемым дренажом.",
    sortOrder: 41,
    seoTitle: "Субстратные маты",
    seoDescription: "Субстратные маты под плодоношение, рабочий ряд и контролируемый дренаж.",
  },
  {
    id: "propagation-plugs",
    parentId: "substrates",
    slug: "propagation-plugs",
    name: "Кубики и стартовые пробки",
    image: "assets/catalog/20550842.webp",
    description: "Стартовые форматы для рассады, пикировки и раннего этапа до пересадки в мат.",
    sortOrder: 42,
    seoTitle: "Кубики и стартовые пробки",
    seoDescription: "Стартовые пробки и кубики для раннего этапа клубничной рассады.",
  },
  {
    id: "planting-material",
    parentId: null,
    slug: "planting-material",
    name: "Посадочный материал",
    image: "assets/photos/optimized/berry-red.webp",
    description: "Frigo и семенные серии под старт, ротацию и типовые производственные сценарии.",
    sortOrder: 50,
    seoTitle: "Посадочный материал для клубничной фермы",
    seoDescription: "Frigo и семенные серии для запуска и ротации клубничной фермы.",
  },
  {
    id: "frigo-plants",
    parentId: "planting-material",
    slug: "frigo-plants",
    name: "Frigo-рассада",
    image: "assets/photos/optimized/berry-close.webp",
    description: "Классы Frigo под быстрый старт цикла и выровненный запуск ряда.",
    sortOrder: 51,
    seoTitle: "Frigo-рассада",
    seoDescription: "Frigo-рассада для клубничной фермы с контролируемым стартом ряда.",
  },
  {
    id: "seed-series",
    parentId: "planting-material",
    slug: "seed-series",
    name: "Семенные серии",
    image: "assets/photos/optimized/berry-cluster.webp",
    description: "Семенные гибриды и серии под плановую загрузку фермы и стабильную фасовку.",
    sortOrder: 52,
    seoTitle: "Семенные серии клубники",
    seoDescription: "Семенные серии клубники для управляемого запуска и повторяемой продукции.",
  },
  {
    id: "climate",
    parentId: null,
    slug: "climate",
    name: "Климат и воздух",
    image: "assets/photos/optimized/hero-process.webp",
    description: "Вентиляция, туман, сервисные климатические позиции и мягкое управление микроклиматом.",
    sortOrder: 60,
    seoTitle: "Климат и воздух для клубничной фермы",
    seoDescription: "Вентиляция, увлажнение и сервисные климатические позиции для клубничной фермы.",
  },
  {
    id: "air-circulation",
    parentId: "climate",
    slug: "air-circulation",
    name: "Циркуляция воздуха",
    image: "assets/photos/optimized/hero-process.webp",
    description: "Вентиляторы и циркуляционные узлы под плотную посадку и равномерную среду.",
    sortOrder: 61,
    seoTitle: "Циркуляция воздуха",
    seoDescription: "Вентиляторы и циркуляционные узлы для клубничной фермы.",
  },
  {
    id: "humidification",
    parentId: "climate",
    slug: "humidification",
    name: "Увлажнение и туман",
    image: "assets/photos/optimized/greenhouse-rack.webp",
    description: "Компактные станции тумана и сервисные контуры под мягкое регулирование влажности.",
    sortOrder: 62,
    seoTitle: "Увлажнение и туман",
    seoDescription: "Увлажнение и станции тумана для клубничной фермы.",
  },
  {
    id: "nutrition",
    parentId: null,
    slug: "nutrition",
    name: "Питание и сервис раствора",
    image: "assets/catalog/IMG_4924.webp",
    description: "Базовые растворы, буферы, корректоры pH/EC и сервисные наборы контроля.",
    sortOrder: 70,
    seoTitle: "Питание и сервис раствора",
    seoDescription: "Питание, буферы и сервисные наборы контроля раствора для клубничной фермы.",
  },
  {
    id: "base-nutrition",
    parentId: "nutrition",
    slug: "base-nutrition",
    name: "Базовые линии питания",
    image: "assets/catalog/IMG_4924.webp",
    description: "Растворы под рост, плодоношение и плавный переход между фазами.",
    sortOrder: 71,
    seoTitle: "Базовые линии питания",
    seoDescription: "Базовые линии питания для клубничной фермы.",
  },
  {
    id: "ph-ec-control",
    parentId: "nutrition",
    slug: "ph-ec-control",
    name: "pH / EC контроль",
    image: "assets/catalog/18341837.webp",
    description: "Буферы, корректоры и сервисные наборы под регулярные замеры раствора.",
    sortOrder: 72,
    seoTitle: "pH и EC контроль",
    seoDescription: "Буферы и сервисные наборы контроля pH и EC для клубничной фермы.",
  },
  {
    id: "monitoring",
    parentId: null,
    slug: "monitoring",
    name: "Датчики и автоматика",
    image: "assets/catalog/92611106.webp",
    description: "Контроллеры, датчики среды и телеметрия для рабочего контроля фермы.",
    sortOrder: 80,
    seoTitle: "Датчики и автоматика",
    seoDescription: "Контроллеры, датчики среды и телеметрия для клубничной фермы.",
  },
  {
    id: "controllers",
    parentId: "monitoring",
    slug: "controllers",
    name: "Контроллеры",
    image: "assets/catalog/92611106.webp",
    description: "Компактные контроллеры для сервиса климата, полива и тревог по объекту.",
    sortOrder: 81,
    seoTitle: "Контроллеры фермы",
    seoDescription: "Контроллеры климата и полива для клубничной фермы.",
  },
  {
    id: "sensors",
    parentId: "monitoring",
    slug: "sensors",
    name: "Датчики среды",
    image: "assets/catalog/20880535.webp",
    description: "Температура, влажность, лист, дренаж и сигналы, которые видны без похода к ряду.",
    sortOrder: 82,
    seoTitle: "Датчики среды",
    seoDescription: "Датчики среды, листа и дренажа для клубничной фермы.",
  },
  {
    id: "packaging",
    parentId: null,
    slug: "packaging",
    name: "Упаковка и отгрузка",
    image: "assets/photos/optimized/berry-close.webp",
    description: "Фасовка, этикетка и сервисные расходники для аккуратной отгрузки ягоды.",
    sortOrder: 90,
    seoTitle: "Упаковка и отгрузка",
    seoDescription: "Упаковка, этикетка и расходники для отгрузки клубники.",
  },
  {
    id: "consumer-packaging",
    parentId: "packaging",
    slug: "consumer-packaging",
    name: "Потребительская упаковка",
    image: "assets/photos/optimized/berry-close.webp",
    description: "Контейнеры, клипсы и маркировка для аккуратной выдачи и фасовки урожая.",
    sortOrder: 91,
    seoTitle: "Потребительская упаковка",
    seoDescription: "Контейнеры, этикетки и расходники для фасовки клубники.",
  },
];

const productsSeed = [
  {
    id: "prod-luma-line-60",
    categoryId: "linear-led",
    slug: "luma-line-60",
    name: "Линейный светильник Luma Line 60",
    article: "LED-L60-50",
    shortDescription: "Компактный линейный светильник под короткий пролёт, сервисный ряд и дооснащение узких полок.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Luma Line 60 собран под короткие пролёты и сервисные зоны, где нужен чистый линейный свет без избыточной мощности.",
      fit:
        "Подходит для короткой полки, зоны доращивания и компактных участков, где уже известна геометрия подвеса и шаг посадки.",
      bullets: [
        "Фиксированная длина 60 см для короткого пролёта и узкой ячейки.",
        "Тонкий профиль не перегружает ряд и не мешает сервису.",
        "Подходит для замены единичных светильников без перестройки линии.",
      ],
      wrapUp:
        "Если у ряда плавает высота подвеса или меняется плотность посадки, лучше сначала сверить схему, а потом брать позицию в розницу.",
    }),
    price: 3890,
    oldPrice: 4290,
    stockStatus: "in_stock",
    badges: ["recommended"],
    popularity: 96,
    images: [
      "assets/catalog/12315466.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
      "assets/photos/optimized/rack-aisle.webp",
    ],
    documents: [sharedDocuments["led-passport"], sharedDocuments["mounting-checklist"]],
    attributes: [
      attr("power", "Мощность", "50 Вт"),
      attr("length", "Длина", "60 см"),
      attr("spectrum", "Спектр", "full-cycle mix"),
      attr("mount", "Тип подвеса", "линейный клипсовый", "Монтаж"),
      attr("protection", "Защита", "IP54", "Монтаж"),
    ],
    priceTiers: priceTiersFor(3890),
    faq: [
      faq("Можно ли ставить в сервисный ряд?", "Да, модель часто используют как сервисный или локальный досвет.", "2026-02-11"),
      faq("Подойдёт ли для рассады?", "Да, если уже известна высота подвеса и не нужен длинный пролёт.", "2026-02-19"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-luma-line-95",
    categoryId: "linear-led",
    slug: "luma-line-95",
    name: "Линейный светильник Luma Line 95",
    article: "LED-L95-50",
    shortDescription: "Рабочая длина около метра для типовой ячейки и спокойного добора света без проектной сборки.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Luma Line 95 закрывает типовой пролёт около метра, когда конфигурация стеллажа уже не вызывает вопросов и нужен быстрый добор света.",
      fit:
        "Чаще всего берут для ярусов, где нужно заменить одну позицию или добрать линию под понятный шаг растения.",
      bullets: [
        "Длина 95 см удобна для типового ряда без лишних стыков.",
        "Режим мощности рассчитан на длительную работу без перегрева зоны листа.",
        "Позиция хорошо подходит для дооснащения уже работающего модуля.",
      ],
      wrapUp:
        "Если одновременно меняется подвес, высота листа и световой режим, лучше идти через подбор, а не через замену SKU.",
    }),
    price: 4950,
    stockStatus: "limited",
    badges: ["hit"],
    popularity: 93,
    images: [
      "assets/catalog/62602669.webp",
      "assets/catalog/50590287.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
    ],
    documents: [sharedDocuments["led-passport"], sharedDocuments["mounting-checklist"]],
    attributes: [
      attr("power", "Мощность", "50 Вт"),
      attr("length", "Длина", "95 см"),
      attr("spectrum", "Спектр", "balanced berry mix"),
      attr("mount", "Тип подвеса", "тросовый / клипсовый", "Монтаж"),
      attr("zone", "Рабочая зона", "типовой стеллажный пролёт", "Сценарий"),
    ],
    priceTiers: priceTiersFor(4950),
    faq: [
      faq("Можно ли сочетать с Luma Line 60?", "Да, если схема ряда допускает смешанную длину и не ломается равномерность света.", "2026-01-28"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-luma-line-191",
    categoryId: "linear-led",
    slug: "luma-line-191",
    name: "Линейный светильник Luma Line 191",
    article: "LED-L191-100",
    shortDescription: "Длинный линейный светильник для многоярусного ряда и понятной схемы подвеса.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Luma Line 191 рассчитан на длинный пролёт и работает там, где стеллаж, посадка и сервис уже описаны до уровня ряда.",
      fit:
        "Используется в длинных ярусах, где нужна цельная линия без лишних разрывов и уже известен режим мощности.",
      bullets: [
        "Длина 191 см для длинного пролёта и аккуратной равномерности.",
        "Два рабочих сценария по мощности под рост и плодоношение.",
        "Удобен, когда в узле уже не пересобирают стеллаж и электрику.",
      ],
      wrapUp:
        "Если меняется не один светильник, а целая линия, стоит проверить связку света со стеллажом и обслуживанием ряда.",
    }),
    price: 9900,
    oldPrice: 10650,
    stockStatus: "in_stock",
    badges: ["hit", "recommended"],
    popularity: 99,
    images: [
      "assets/catalog/50590287.webp",
      "assets/catalog/300wt.webp",
      "assets/photos/optimized/rack-aisle.webp",
    ],
    documents: [sharedDocuments["led-passport"], sharedDocuments["mounting-checklist"]],
    attributes: [
      attr("power", "Мощность", "50 / 100 Вт"),
      attr("length", "Длина", "191 см"),
      attr("spectrum", "Спектр", "berry production mix"),
      attr("mount", "Тип подвеса", "линейный профиль", "Монтаж"),
      attr("zone", "Рабочая зона", "многоярусный ряд", "Сценарий"),
    ],
    priceTiers: priceTiersFor(9900, [
      { label: "Розница", minQty: 1, price: 9900, summary: "Одна линия или замена поштучно." },
      { label: "Модуль", minQty: 8, price: 9450, summary: "Комплект на модуль или сервисный добор." },
      { label: "Партия", minQty: 24, price: 8990, summary: "Ряд или партия под несколько модулей." },
    ]),
    faq: [
      faq("Можно ли брать без подбора?", "Да, если у вас уже понятный стеллаж и известна длина рабочего пролёта.", "2026-02-05"),
      faq("Есть ли крепёж в комплекте?", "Базовый крепёж входит, дополнительный подвес выбирают по схеме ряда.", "2026-02-07"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-canopy-boost-140",
    categoryId: "greenhouse-led",
    slug: "canopy-boost-140",
    name: "Световой модуль Canopy Boost 140",
    article: "LED-CB140-300",
    shortDescription: "Мощный модуль под досветку ряда, где важна высота подвеса и общая геометрия зоны.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Canopy Boost 140 относится к более мощным позициям и нужен там, где важнее схема зоны досветки, чем просто мощность на коробке.",
      fit:
        "Подходит для длинного ряда, зоны наращивания урожайной волны и интенсивного сценария плодоношения.",
      bullets: [
        "Работает как мощная линия на длинный пролёт.",
        "Требует проверки подвеса и воздухообмена.",
        "Обычно заказывают как часть проектной партии, а не одиночный SKU.",
      ],
      wrapUp:
        "Если задача ещё не сведена к конкретной зоне досветки, сначала надо уточнить сценарий, чтобы не перегрузить ряд.",
    }),
    price: 22000,
    stockStatus: "preorder",
    badges: ["new"],
    popularity: 77,
    images: [
      "assets/catalog/57331861.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
      "assets/photos/optimized/hero-process.webp",
    ],
    documents: [sharedDocuments["led-passport"], sharedDocuments["mounting-checklist"], sharedDocuments["climate-sheet"]],
    attributes: [
      attr("power", "Мощность", "300 Вт"),
      attr("length", "Длина", "140 см"),
      attr("mount", "Тип подвеса", "усиленный тросовый", "Монтаж"),
      attr("coverage", "Покрытие", "интенсивная зона досветки", "Сценарий"),
      attr("cooling", "Охлаждение", "пассивное", "Монтаж"),
    ],
    priceTiers: priceTiersFor(22000),
    faq: [
      faq("Это розничная позиция?", "Скорее проектная: обычно берут после сверки с зоной и вентиляцией.", "2026-01-18"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-canopy-boost-200",
    categoryId: "greenhouse-led",
    slug: "canopy-boost-200",
    name: "Световой модуль Canopy Boost 200",
    article: "LED-CB200-450",
    shortDescription: "Световой модуль под длинный ряд и интенсивную досветку тепличного сценария.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Canopy Boost 200 закрывает длинный ряд и работает там, где нужно держать управляемый световой режим на вытянутой зоне.",
      fit:
        "Чаще всего ставится в длинных рядах и связках с активным воздухообменом и понятным режимом сервиса.",
      bullets: [
        "Длина 200 см под длинный ряд.",
        "Интенсивная мощность под контролируемый сценарий плодоношения.",
        "Требует проверки подвеса, вентиляции и ряда до оплаты.",
      ],
      wrapUp:
        "Это не тот SKU, который стоит брать вслепую: если сомневаетесь в схеме, сначала запросите расчёт зоны.",
    }),
    price: 28900,
    stockStatus: "preorder",
    badges: ["sale"],
    popularity: 74,
    images: [
      "assets/catalog/67446574.webp",
      "assets/photos/optimized/rack-aisle.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
    ],
    documents: [sharedDocuments["led-passport"], sharedDocuments["climate-sheet"]],
    attributes: [
      attr("power", "Мощность", "450 Вт"),
      attr("length", "Длина", "200 см"),
      attr("coverage", "Покрытие", "длинный тепличный ряд", "Сценарий"),
      attr("mount", "Тип подвеса", "усиленный профиль", "Монтаж"),
      attr("protection", "Защита", "IP65", "Монтаж"),
    ],
    priceTiers: priceTiersFor(28900),
    faq: [
      faq("Можно ли ставить в один ярус без проекта?", "Только если у вас уже есть проверенная схема по подвесу и воздуху.", "2026-02-14"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-rivulet-dripper-22",
    categoryId: "drippers",
    slug: "rivulet-dripper-22",
    name: "Капельница Rivulet 2,2 л/ч",
    article: "DR-22-SET",
    shortDescription: "Собранная капельница под рабочую схему полива и контролируемую подачу раствора.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Rivulet 2,2 л/ч помогает быстро закрыть вопрос по подаче раствора, когда схема полива уже не пересобирается с нуля.",
      fit:
        "Подходит для модулей с понятной длиной линии, известным числом растений и стабильным режимом подачи.",
      bullets: [
        "Компенсирующая капельница с номиналом 2,2 л/ч.",
        "Готовый узел под типовую фермерскую схему.",
        "Удобна для сервисной замены без полной пересборки линии.",
      ],
      wrapUp:
        "Если меняется длина линии или состав ряда, важно проверить не только капельницу, но и общую гидравлику узла.",
    }),
    price: 44,
    stockStatus: "in_stock",
    badges: ["hit"],
    popularity: 97,
    images: [
      "assets/catalog/80128135.webp",
      "assets/catalog/IMG_6061.webp",
      "assets/catalog/IMG_4724.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"]],
    attributes: [
      attr("flow", "Расход", "2,2 л/ч"),
      attr("connection", "Подключение", "микротрубка 3x5 мм"),
      attr("use", "Сценарий", "рабочий ряд и сервисная замена", "Сценарий"),
      attr("compensation", "Компенсация", "да", "Основные"),
      attr("material", "Материал", "техполимер", "Монтаж"),
    ],
    priceTiers: priceTiersFor(44, [
      { label: "Поштучно", minQty: 1, price: 44, summary: "Для сервисной замены." },
      { label: "Модуль", minQty: 50, price: 41, summary: "На один рабочий модуль." },
      { label: "Партия", minQty: 200, price: 38, summary: "На несколько рядов или запуск." },
    ]),
    faq: [
      faq("Можно ли ставить на длинные линии?", "Да, но только если длина линии и давление уже посчитаны.", "2026-01-22"),
      faq("Есть ли сборка с микротрубкой?", "Да, готовый узел приходит в сборе.", "2026-02-13"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-pressure-stick-20",
    categoryId: "drippers",
    slug: "pressure-stick-20",
    name: "Стойка подачи Pressure Stick 2,0 л/ч",
    article: "DR-ST20",
    shortDescription: "Готовый узел подачи под контролируемый ввод в мат или кубик без провисающей линии.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Pressure Stick 2,0 л/ч нужен там, где важно не просто подать раствор, а аккуратно завести точку подачи в рабочую корневую зону.",
      fit:
        "Обычно ставится на аккуратные линии с матом и фиксированным шагом, когда важна повторяемость узла.",
      bullets: [
        "Жёсткая стойка подачи под мат и сервисную чистоту ряда.",
        "Расход 2,0 л/ч для ровной дозировки.",
        "Подходит для обновления существующего модуля.",
      ],
      wrapUp:
        "Перед заказом стоит проверить длину микротрубки и схему укладки, чтобы не собирать узел дважды.",
    }),
    price: 58,
    stockStatus: "limited",
    badges: ["recommended"],
    popularity: 83,
    images: [
      "assets/catalog/80999720.webp",
      "assets/catalog/IMG_6061.webp",
      "assets/catalog/IMG_4724.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"]],
    attributes: [
      attr("flow", "Расход", "2,0 л/ч"),
      attr("connection", "Подключение", "микротрубка 3x5 мм"),
      attr("delivery", "Форма подачи", "жёсткая стойка", "Сценарий"),
      attr("material", "Материал", "полимер / капельная игла", "Монтаж"),
      attr("mount", "Монтаж", "в мат или кубик", "Монтаж"),
    ],
    priceTiers: priceTiersFor(58),
    faq: [
      faq("Подходит для кубика?", "Да, если размер кубика и глубина ввода уже определены.", "2026-02-03"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-micro-spike-assembly",
    categoryId: "drippers",
    slug: "micro-spike-assembly",
    name: "Микроузел подачи Micro Spike",
    article: "DR-MS18",
    shortDescription: "Точечный узел подачи для расстановки по растению, когда важна управляемая раскладка линии.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Micro Spike нужен для спокойной и понятной раскладки подачи, когда по ряду важна аккуратность и повторяемый ввод у каждого растения.",
      fit:
        "Чаще всего берут для линий, где нужно выровнять раскладку по кусту и убрать хаос микротрубки.",
      bullets: [
        "Точечная подача под растение.",
        "Удобно использовать в компактных рядах и сервисных перестановках.",
        "Даёт аккуратную раскладку линии без провисов.",
      ],
      wrapUp:
        "Если у вас не определён шаг растения и плотность посадки, лучше сначала уточнить схему ряда.",
    }),
    price: 36,
    stockStatus: "in_stock",
    badges: ["new"],
    popularity: 78,
    images: [
      "assets/catalog/65274928.webp",
      "assets/catalog/IMG_6061.webp",
      "assets/photos/optimized/berry-red.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"]],
    attributes: [
      attr("flow", "Расход", "1,8 л/ч"),
      attr("layout", "Схема", "точка на растение", "Сценарий"),
      attr("connection", "Подключение", "микротрубка 3x5 мм"),
      attr("mount", "Монтаж", "в субстрат", "Монтаж"),
    ],
    priceTiers: priceTiersFor(36),
    faq: [faq("Можно ли использовать вместо капельницы?", "Только если схема ряда и длина линии это допускают.", "2026-02-20")],
    quickViewEnabled: true,
  },
  {
    id: "prod-tube-blank-16",
    categoryId: "fittings",
    slug: "tube-blank-16",
    name: "Слепая трубка White Line 16 мм",
    article: "IR-TB16-50",
    shortDescription: "Чистая магистраль под врезку узлов и сборку линии без лишних переходников.",
    fullDescription: fullDescriptionFrom({
      overview:
        "White Line 16 мм используется как спокойная и предсказуемая магистраль под сборку капельной линии в фермерском модуле.",
      fit:
        "Подходит, когда схема линии уже известна и нужно собрать или заменить рабочий участок без лишней экзотики.",
      bullets: [
        "Диаметр 16 мм под типовую фермерскую схему.",
        "Гибкая белая трубка для чистой укладки ряда.",
        "Хорошо комбинируется с базовыми фитингами и врезкой узлов.",
      ],
      wrapUp:
        "Если меняете не трубку, а всю схему линии, лучше сначала перепроверить длину, давление и количество точек подачи.",
    }),
    price: 92,
    stockStatus: "in_stock",
    badges: [],
    popularity: 82,
    images: [
      "assets/catalog/11811908.webp",
      "assets/catalog/IMG_4724.webp",
      "assets/catalog/IMG_6063.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"]],
    attributes: [
      attr("diameter", "Диаметр", "16 мм"),
      attr("length", "Длина", "1 м"),
      attr("material", "Материал", "PE белый", "Монтаж"),
      attr("scenario", "Сценарий", "магистраль под врезку", "Сценарий"),
    ],
    priceTiers: priceTiersFor(92),
    faq: [faq("Есть бухты?", "Да, отдельная позиция с бухтой доступна в этой же категории.", "2026-01-17")],
    quickViewEnabled: true,
  },
  {
    id: "prod-tube-blank-roll",
    categoryId: "fittings",
    slug: "tube-blank-roll",
    name: "Слепая трубка White Line 16 мм, бухта 100 м",
    article: "IR-TB16-100",
    shortDescription: "Бухта под быстрый монтаж ряда и спокойный запас магистрали на запуск или ремонт.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Бухта White Line 100 м нужна тем, кто собирает новый участок линии или держит нормальный запас магистрали на сервис.",
      fit:
        "Подходит для базового запуска, расширения ряда и случаев, когда важно не добирать трубку кусками.",
      bullets: [
        "Бухта 100 м для запуска или запаса.",
        "Подходит для типовой фермерской схемы с диаметром 16 мм.",
        "Удобно резать под модуль, не зависеть от остатков.",
      ],
      wrapUp:
        "Перед заказом стоит сверить объём линии и узлов, чтобы не брать бухту под несобранную схему.",
    }),
    price: 6990,
    stockStatus: "limited",
    badges: ["sale"],
    popularity: 79,
    images: [
      "assets/catalog/29752526.webp",
      "assets/catalog/IMG_4724.webp",
      "assets/catalog/IMG_6063.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"]],
    attributes: [
      attr("diameter", "Диаметр", "16 мм"),
      attr("length", "Длина", "100 м"),
      attr("material", "Материал", "PE белый", "Монтаж"),
      attr("scenario", "Сценарий", "запуск ряда / запас магистрали", "Сценарий"),
    ],
    priceTiers: priceTiersFor(6990),
    faq: [faq("Можно ли резать на модуль?", "Да, бухта рассчитана на свободную нарезку под нужный метраж.", "2026-02-01")],
    quickViewEnabled: true,
  },
  {
    id: "prod-punch-16-20",
    categoryId: "fittings",
    slug: "punch-16-20",
    name: "Пробойник 16/20 мм Quick Punch",
    article: "IR-QP1620",
    shortDescription: "Инструмент для чистой врезки узлов в магистраль без рваного отверстия и лишней переделки.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Quick Punch нужен там, где важна аккуратная врезка и спокойная сборка линии без перекошенных отверстий.",
      fit:
        "Полезен для сервисных работ, дооснащения и сборки новых участков, когда линия делается руками на месте.",
      bullets: [
        "Подходит под диаметр 16/20 мм.",
        "Даёт чистую врезку без рваного края.",
        "Экономит время на монтаже и переделке фитингов.",
      ],
      wrapUp:
        "Это сервисная позиция, но она сильно экономит нервы на реальном монтаже и обслуживании ряда.",
    }),
    price: 540,
    stockStatus: "in_stock",
    badges: ["recommended"],
    popularity: 75,
    images: [
      "assets/catalog/86171232.webp",
      "assets/catalog/IMG_6063.webp",
      "assets/catalog/IMG_4724.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"]],
    attributes: [
      attr("diameter", "Диаметр", "16 / 20 мм"),
      attr("type", "Тип позиции", "монтажный инструмент"),
      attr("scenario", "Сценарий", "сборка и сервис линии", "Сценарий"),
      attr("material", "Материал", "армированный пластик", "Монтаж"),
    ],
    priceTiers: priceTiersFor(540),
    faq: [faq("Это расходник или инструмент?", "Инструмент под монтаж и сервис, обычно берут в один экземпляр на бригаду.", "2026-02-23")],
    quickViewEnabled: true,
  },
  {
    id: "prod-disc-filter-34",
    categoryId: "fittings",
    slug: "disc-filter-34",
    name: "Дисковый фильтр Clear Disc 3/4",
    article: "IR-FD34",
    shortDescription: "Компактный дисковый фильтр для спокойной работы линии на типовом модуле.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Clear Disc 3/4 помогает держать линию чище и стабильнее там, где модуль уже понятен и нужен предсказуемый сервис.",
      fit:
        "Ставится на базовые схемы полива и сервисные контуры, где важна повторяемая фильтрация без тяжелого узла.",
      bullets: [
        "Компактный фильтр 3/4 для типового модуля.",
        "Дисковая сборка под сервисную промывку.",
        "Хорошо встаёт в простые схемы дозирования и магистрали.",
      ],
      wrapUp:
        "Если у вас проблема не в фильтре, а в общей логике подачи, лучше сначала проверить весь узел, а не только поставить новый фильтр.",
    }),
    price: 1740,
    stockStatus: "preorder",
    badges: [],
    popularity: 71,
    images: [
      "assets/catalog/75043878.webp",
      "assets/catalog/IMG_6063.webp",
      "assets/catalog/IMG_4724.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"]],
    attributes: [
      attr("diameter", "Присоединение", "3/4"),
      attr("filter", "Тип фильтрации", "дисковая"),
      attr("service", "Сервис", "разборный узел", "Монтаж"),
      attr("scenario", "Сценарий", "типовой модуль", "Сценарий"),
    ],
    priceTiers: priceTiersFor(1740),
    faq: [faq("Подойдёт для стартового набора?", "Да, если диаметр подключения и расход совпадают со схемой.", "2026-02-11")],
    quickViewEnabled: true,
  },
  {
    id: "prod-dosatron",
    categoryId: "irrigation-kits",
    slug: "dosatron",
    name: "Дозирующий узел Dosatron",
    article: "IR-DS45",
    shortDescription: "Узел дозирования под понятную схему полива, когда расход и логика подачи уже зафиксированы.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Dosatron нужен не сам по себе, а как часть уже описанного узла полива, где понятны расход, фильтрация и сценарий подачи раствора.",
      fit:
        "Обычно его берут для запуска новой линии, замены слабого узла или пересборки дозирования на действующей ферме.",
      bullets: [
        "Встаёт в понятную схему подачи и бака.",
        "Используется там, где уже известен расход по линии.",
        "Требует проверки fit по всей магистрали, а не только по цене самого дозатора.",
      ],
      wrapUp:
        "Если вопрос звучит как «что-то не так с поливом», сначала лучше разобрать весь узел, а потом покупать дозатор.",
    }),
    price: 45000,
    stockStatus: "preorder",
    badges: ["recommended"],
    popularity: 63,
    images: [
      "assets/catalog/18341837.webp",
      "assets/photos/optimized/hero-process.webp",
      "assets/photos/optimized/rack-aisle.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"], sharedDocuments["nutrition-sheet"]],
    attributes: [
      attr("scenario", "Сценарий", "дозирование раствора", "Сценарий"),
      attr("mount", "Монтаж", "в узел полива", "Монтаж"),
      attr("line", "Линия", "магистраль / бак", "Основные"),
      attr("service", "Сервис", "проверка расхода и fit", "Монтаж"),
    ],
    priceTiers: priceTiersFor(45000),
    faq: [faq("Можно ли брать без схемы линии?", "Лучше нет: дозатор имеет смысл только после проверки расхода, бака и фильтрации.", "2026-02-28")],
    quickViewEnabled: true,
  },
  {
    id: "prod-fittings-kit-module",
    categoryId: "fittings",
    slug: "fittings-kit-module",
    name: "Комплект фитингов для модульного стеллажа",
    article: "IR-FKM-01",
    shortDescription: "Типовой набор фитингов для уже понятного модуля, когда геометрия узла и линия подачи не плавают.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Комплект фитингов работает только внутри уже собранной схемы полива, где понятны переходы, магистраль и сценарий обслуживания.",
      fit:
        "Подходит для модульных стеллажей с известной геометрией и для сервисного добора типового набора.",
      bullets: [
        "Набор мелких фитингов под понятный узел.",
        "Удобен, когда модуль уже описан по подаче.",
        "Помогает не добирать переходники по одному в последний момент.",
      ],
      wrapUp:
        "Если меняется сама логика узла, сначала нужно сверить состав линии, а уже потом забирать комплект фитингов.",
    }),
    price: 671,
    stockStatus: "in_stock",
    badges: [],
    popularity: 57,
    images: [
      "assets/catalog/80999720.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
      "assets/photos/optimized/hero-process.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"]],
    attributes: [
      attr("type", "Тип позиции", "комплект фитингов"),
      attr("scenario", "Сценарий", "модульный стеллаж", "Сценарий"),
      attr("assembly", "Сборка", "типовой узел", "Монтаж"),
      attr("service", "Сервис", "добор и замена", "Монтаж"),
    ],
    priceTiers: priceTiersFor(671),
    faq: [faq("Подходит к любому модулю?", "Нет, комплект нужно сверять с геометрией и схемой именно вашего узла.", "2026-02-28")],
    quickViewEnabled: true,
  },
  {
    id: "prod-starter-irrigation-96",
    categoryId: "irrigation-kits",
    slug: "starter-irrigation-96",
    name: "Стартовый набор полива Starter 96",
    article: "IR-K96",
    shortDescription: "Набор полива на 96 растений под базовый модуль и спокойный старт без ручной сборки поштучно.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Starter 96 нужен тем, кто уже понимает геометрию модуля и хочет быстро собрать типовой полив без ручного подбора каждой мелочи.",
      fit:
        "Подходит для модулей на 96 растений, где известны длина ряда, число точек подачи и базовая логика дозирования.",
      bullets: [
        "Комплект под типовой модуль на 96 растений.",
        "Содержит магистраль, подачу и базовые соединения.",
        "Экономит время на сборке и снижает риск забыть мелкий расходник.",
      ],
      wrapUp:
        "Если модуль ещё не определён по длине и числу растений, лучше сначала уточнить схему, а потом брать комплект.",
    }),
    price: 18400,
    stockStatus: "in_stock",
    badges: ["hit"],
    popularity: 91,
    images: [
      "assets/catalog/IMG_6061.webp",
      "assets/catalog/IMG_4724.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"], sharedDocuments["rack-spec"]],
    attributes: [
      attr("plants", "Число растений", "96"),
      attr("zones", "Зоны", "1 рабочая зона"),
      attr("line", "Длина линии", "до 12 м"),
      attr("scenario", "Сценарий", "базовый модуль", "Сценарий"),
      attr("assembly", "Сборка", "готовый набор", "Монтаж"),
    ],
    priceTiers: priceTiersFor(18400),
    faq: [
      faq("Есть ли фитинги в комплекте?", "Да, набор рассчитан на запуск базового модуля без добора критичных мелочей.", "2026-01-30"),
      faq("Подходит ли для 120 растений?", "Лучше брать комплект после уточнения фактического числа точек подачи.", "2026-02-08"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-irrigation-base-rack",
    categoryId: "irrigation-kits",
    slug: "irrigation-base-rack",
    name: "Комплект полива для базового стеллажа",
    article: "IR-BR-BASE",
    shortDescription: "Готовый узел полива под стартовый стеллажный модуль, когда геометрия ряда уже понятна.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Это стартовый поливочный узел под базовый модуль, когда вам нужен не набор случайных фитингов, а собранная логика под первый рабочий ряд.",
      fit:
        "Подходит для базового стеллажа с понятной геометрией и известной линией подачи.",
      bullets: [
        "Готовый комплект под базовый стеллаж.",
        "Снижает число ошибок на первом запуске модуля.",
        "Удобен, когда вы не хотите собирать узел по мелочам.",
      ],
      wrapUp:
        "Если базовый стеллаж ещё меняется по конфигурации, сначала лучше зафиксировать модуль, а потом переходить к комплекту полива.",
    }),
    price: 2167,
    stockStatus: "in_stock",
    badges: ["recommended"],
    popularity: 64,
    images: [
      "assets/catalog/65274928.webp",
      "assets/photos/optimized/hero-process.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"], sharedDocuments["rack-spec"]],
    attributes: [
      attr("scenario", "Сценарий", "базовый стеллаж", "Сценарий"),
      attr("assembly", "Сборка", "готовый узел", "Монтаж"),
      attr("line", "Подача", "стартовый модуль", "Основные"),
      attr("service", "Сервис", "первый запуск ряда", "Монтаж"),
    ],
    priceTiers: priceTiersFor(2167),
    faq: [faq("Это комплект под весь проект?", "Нет, это именно узел под базовый модуль, а не под всю очередь фермы.", "2026-02-28")],
    quickViewEnabled: true,
  },
  {
    id: "prod-rack-irrigation-module",
    categoryId: "irrigation-kits",
    slug: "rack-irrigation-module",
    name: "Набор полива Rack Module",
    article: "IR-RM16",
    shortDescription: "Набор под рабочий стеллажный модуль с понятным рядом и заранее известной геометрией.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Rack Module закрывает полив для рабочего стеллажного модуля, когда ряд и длина линии уже определены.",
      fit:
        "Обычно берут при дооснащении или повторении уже работающей схемы на новом модуле.",
      bullets: [
        "Готовый набор под рабочий модуль.",
        "Снижает риск недобора фитингов и точек подачи.",
        "Удобен для повторения уже проверенной схемы.",
      ],
      wrapUp:
        "Если вы только собираете концепцию ряда, сначала уточните схему и только потом переходите к готовому набору.",
    }),
    price: 23600,
    stockStatus: "preorder",
    badges: ["recommended"],
    popularity: 80,
    images: [
      "assets/catalog/IMG_6061.webp",
      "assets/photos/optimized/rack-aisle.webp",
      "assets/catalog/IMG_4724.webp",
    ],
    documents: [sharedDocuments["irrigation-passport"], sharedDocuments["rack-spec"]],
    attributes: [
      attr("plants", "Число растений", "128"),
      attr("zones", "Зоны", "2 зоны подачи"),
      attr("line", "Длина линии", "до 16 м"),
      attr("scenario", "Сценарий", "рабочий модуль", "Сценарий"),
      attr("assembly", "Сборка", "готовый набор", "Монтаж"),
    ],
    priceTiers: priceTiersFor(23600),
    faq: [faq("Можно ли доукомплектовать датчиками?", "Да, набор легко дополняется контролем и сервисными датчиками.", "2026-02-16")],
    quickViewEnabled: true,
  },
  {
    id: "prod-frame-base-12",
    categoryId: "rack-frames",
    slug: "frame-base-12",
    name: "Каркас Base Frame 12",
    article: "RK-B12",
    shortDescription: "Базовый каркас под 12 матов и понятную рабочую геометрию для компактного модуля.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Base Frame 12 нужен для компактного модуля, где важна простая геометрия и предсказуемый сервис по ряду.",
      fit:
        "Подходит для запуска небольшого модуля, тестовой линии и повторения уже проверенной конструкции.",
      bullets: [
        "Каркас под 12 матов и сервисный проход.",
        "Собран под рабочую логику фермы без лишней конструктивной сложности.",
        "Удобен для компактного запуска и повторяемой геометрии.",
      ],
      wrapUp:
        "Если ещё не понятны проход, уровень обслуживания и длина ряда, лучше сначала описать модуль целиком.",
    }),
    price: 54900,
    stockStatus: "preorder",
    badges: ["recommended"],
    popularity: 85,
    images: [
      "assets/photos/optimized/rack-aisle.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
      "assets/catalog/11811908.webp",
    ],
    documents: [sharedDocuments["rack-spec"], sharedDocuments["mounting-checklist"]],
    attributes: [
      attr("mats", "Число матов", "12"),
      attr("tiers", "Ярусы", "2"),
      attr("length", "Длина модуля", "4,2 м"),
      attr("load", "Нагрузка", "до 420 кг", "Монтаж"),
      attr("material", "Материал", "оцинкованная сталь", "Монтаж"),
    ],
    priceTiers: priceTiersFor(54900),
    faq: [faq("Есть ли сервисная схема?", "Да, спецификация и базовая схема монтажа доступны в документах.", "2026-02-10")],
    quickViewEnabled: true,
  },
  {
    id: "prod-frame-plus-16",
    categoryId: "rack-frames",
    slug: "frame-plus-16",
    name: "Каркас Plus Frame 16",
    article: "RK-P16",
    shortDescription: "Расширенный каркас под 16 матов для рабочего ряда с нормальным сервисным доступом.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Plus Frame 16 рассчитан на более плотный модуль, где уже важны проход, сервис и нагрузка по ряду.",
      fit:
        "Хорошо работает как повторяемая база для рабочего модуля на выровненной схеме фермы.",
      bullets: [
        "Каркас на 16 матов с усиленным профилем.",
        "Учитывает сервисный доступ и стабильную ежедневную работу.",
        "Подходит для повторения типового рабочего модуля.",
      ],
      wrapUp:
        "Если меняется вся логика прохода и обслуживания, лучше пересчитать модуль до оплаты каркаса.",
    }),
    price: 68900,
    stockStatus: "preorder",
    badges: ["hit"],
    popularity: 88,
    images: [
      "assets/photos/optimized/rack-aisle.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
      "assets/catalog/50590287.webp",
    ],
    documents: [sharedDocuments["rack-spec"], sharedDocuments["mounting-checklist"]],
    attributes: [
      attr("mats", "Число матов", "16"),
      attr("tiers", "Ярусы", "3"),
      attr("length", "Длина модуля", "5,6 м"),
      attr("load", "Нагрузка", "до 580 кг", "Монтаж"),
      attr("material", "Материал", "оцинкованная сталь", "Монтаж"),
    ],
    priceTiers: priceTiersFor(68900),
    faq: [faq("Можно ли докупить только доборный ряд?", "Да, если базовый каркас совпадает по геометрии.", "2026-02-05")],
    quickViewEnabled: true,
  },
  {
    id: "prod-aisle-rack-kit",
    categoryId: "rack-frames",
    slug: "aisle-rack-kit",
    name: "Модуль Aisle Rack Kit",
    article: "RK-AK24",
    shortDescription: "Готовый рядовой модуль с сервисным проходом под повторяемую промышленную геометрию.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Aisle Rack Kit нужен там, где модуль уже описан по проходу, числу ярусов и логике обслуживания, и нужна готовая повторяемая геометрия.",
      fit:
        "Берут для длинных рядов, модульного расширения и проектных партий, когда конструкция уже зафиксирована.",
      bullets: [
        "Готовый рядовой модуль с проходом.",
        "Подходит для повторяемой промышленной схемы.",
        "Чаще идёт как проектная позиция, а не розничный импульсный товар.",
      ],
      wrapUp:
        "Если проход и сценарий сервиса ещё обсуждаются, сначала опишите модуль и только потом переходите к закупке ряда.",
    }),
    price: 124000,
    stockStatus: "preorder",
    badges: ["new"],
    popularity: 73,
    images: [
      "assets/photos/optimized/greenhouse-rack.webp",
      "assets/photos/optimized/rack-aisle.webp",
      "assets/catalog/50590287.webp",
    ],
    documents: [sharedDocuments["rack-spec"], sharedDocuments["mounting-checklist"]],
    attributes: [
      attr("mats", "Число матов", "24"),
      attr("tiers", "Ярусы", "3"),
      attr("length", "Длина модуля", "8,4 м"),
      attr("load", "Нагрузка", "до 840 кг", "Монтаж"),
      attr("scenario", "Сценарий", "готовый рядовой модуль", "Сценарий"),
    ],
    priceTiers: priceTiersFor(124000),
    faq: [faq("Это комплект под ключ?", "По каркасу да, но полив и свет добираются отдельно под вашу схему.", "2026-02-12")],
    quickViewEnabled: true,
  },
  {
    id: "prod-rack-extra-16mats",
    categoryId: "rack-frames",
    slug: "rack-extra-16mats",
    name: "Дополнительный модуль на 16 матов",
    article: "RK-EX16",
    shortDescription: "Модуль под расширение уже работающего ряда, когда базовая геометрия фермы подтверждена.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Дополнительный модуль нужен не как отдельная покупка, а как шаг роста существующей линии, где уже подтверждены проход, свет и полив.",
      fit:
        "Подходит для расширения модульной фермы без пересборки стартового ядра.",
      bullets: [
        "Модуль на 16 матов и 800 Вт света.",
        "Работает как шаг расширения готового ряда.",
        "Требует проверки, выдержит ли объект следующий модуль без пересборки схемы.",
      ],
      wrapUp:
        "Если расширение тянет за собой пересмотр проходов, света или полива, лучше сразу идти в расчёт всей очереди.",
    }),
    price: 104500,
    stockStatus: "preorder",
    badges: ["new"],
    popularity: 60,
    images: [
      "assets/catalog/IMG_4924.webp",
      "assets/catalog/IMG_6061.webp",
      "assets/photos/optimized/rack-aisle.webp",
    ],
    documents: [sharedDocuments["rack-spec"], sharedDocuments["mounting-checklist"]],
    attributes: [
      attr("mats", "Число матов", "16"),
      attr("power", "Мощность света", "800 Вт"),
      attr("scenario", "Сценарий", "расширение модульного ряда", "Сценарий"),
      attr("service", "Сервис", "рост без пересборки базы", "Монтаж"),
    ],
    priceTiers: priceTiersFor(104500),
    faq: [faq("Это замена базовому модулю?", "Нет, это именно дополнительный шаг роста на уже подтверждённой базе.", "2026-02-28")],
    quickViewEnabled: true,
  },
  {
    id: "prod-metal-gutter-210",
    categoryId: "trays-gutters",
    slug: "metal-gutter-210",
    name: "Металлический лоток Gutter 210",
    article: "TR-G210",
    shortDescription: "Рабочий лоток под ряд и мат с аккуратным сбором влаги и понятным сервисом.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Gutter 210 нужен для аккуратного ряда, когда важен не только сам лоток, но и логика обслуживания, уклона и сбора дренажа.",
      fit:
        "Используется в рядах с матом и понятным сервисным сценарием, когда геометрия стеллажа уже зафиксирована.",
      bullets: [
        "Ширина 210 мм под типовой субстратный мат.",
        "Металл держит форму и упрощает сервисный доступ.",
        "Подходит для ряда с аккуратным сбором влаги.",
      ],
      wrapUp:
        "Если меняется не лоток, а общий профиль ряда и дренажа, сначала нужно пересчитать весь модуль.",
    }),
    price: 3900,
    stockStatus: "limited",
    badges: ["hit"],
    popularity: 84,
    images: [
      "assets/catalog/11811908.webp",
      "assets/photos/optimized/rack-aisle.webp",
      "assets/catalog/IMG_4924.webp",
    ],
    documents: [sharedDocuments["rack-spec"]],
    attributes: [
      attr("width", "Ширина", "210 мм"),
      attr("material", "Материал", "оцинкованная сталь", "Монтаж"),
      attr("drainage", "Дренаж", "центральный уклон", "Сценарий"),
      attr("scenario", "Сценарий", "рабочий ряд и мат", "Сценарий"),
    ],
    priceTiers: priceTiersFor(3900),
    faq: [faq("Подходит ли под 2 ряда?", "Нет, это позиция под один рабочий ряд и типовой лоток.", "2026-01-20")],
    quickViewEnabled: true,
  },
  {
    id: "prod-berry-tray-160",
    categoryId: "trays-gutters",
    slug: "berry-tray-160",
    name: "Сервисный лоток Berry Tray 160",
    article: "TR-B160",
    shortDescription: "Облегчённый лоток под сервисный ряд, локальную зону и компактные схемы.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Berry Tray 160 нужен там, где рабочая схема компактнее и важна лёгкая сервисная зона, а не тяжёлый основной лоток.",
      fit:
        "Подходит для сервисных линий, коротких модулей и локальных схем доращивания.",
      bullets: [
        "Ширина 160 мм под компактную схему.",
        "Удобен для сервисного ряда и короткого участка.",
        "Легче по весу и быстрее в монтаже.",
      ],
      wrapUp:
        "Если ряд работает на мате и полном плодоношении, стоит проверить, не нужен ли более широкий рабочий лоток.",
    }),
    price: 2790,
    stockStatus: "in_stock",
    badges: ["recommended"],
    popularity: 69,
    images: [
      "assets/catalog/44332731.webp",
      "assets/photos/optimized/rack-aisle.webp",
      "assets/catalog/11811908.webp",
    ],
    documents: [sharedDocuments["rack-spec"]],
    attributes: [
      attr("width", "Ширина", "160 мм"),
      attr("material", "Материал", "оцинкованная сталь", "Монтаж"),
      attr("scenario", "Сценарий", "сервисный ряд", "Сценарий"),
      attr("mount", "Монтаж", "на лёгкий профиль", "Монтаж"),
    ],
    priceTiers: priceTiersFor(2790),
    faq: [faq("Можно ли использовать как основной?", "Лучше только в компактных сценариях и после проверки нагрузки ряда.", "2026-02-06")],
    quickViewEnabled: true,
  },
  {
    id: "prod-service-shelf-rail",
    categoryId: "trays-gutters",
    slug: "service-shelf-rail",
    name: "Сервисная полка Rail Service",
    article: "TR-RS90",
    shortDescription: "Полка под обслуживание, вынос расходников и спокойную работу по ряду без лишней суеты.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Rail Service не выращивает ягоду напрямую, но сильно упрощает обслуживание ряда и снижает хаос вокруг инструмента и расходников.",
      fit:
        "Чаще всего берут в рабочие ряды, где нужен понятный сервисный вынос и регулярный доступ к узлу.",
      bullets: [
        "Длина 90 см под сервисную зону.",
        "Подходит для инструмента, мелких расходников и замеров.",
        "Помогает не захламлять рабочий проход.",
      ],
      wrapUp:
        "Это сервисная позиция, но именно она часто делает модуль удобным в ежедневной работе.",
    }),
    price: 1960,
    stockStatus: "limited",
    badges: ["new"],
    popularity: 58,
    images: [
      "assets/catalog/20880535.webp",
      "assets/photos/optimized/rack-aisle.webp",
      "assets/photos/optimized/hero-process.webp",
    ],
    documents: [sharedDocuments["rack-spec"]],
    attributes: [
      attr("length", "Длина", "90 см"),
      attr("material", "Материал", "оцинкованная сталь", "Монтаж"),
      attr("scenario", "Сценарий", "обслуживание ряда", "Сценарий"),
      attr("mount", "Монтаж", "на сервисный профиль", "Монтаж"),
    ],
    priceTiers: priceTiersFor(1960),
    faq: [faq("Можно ли ставить на любой каркас?", "Нужна проверка совместимости по профилю и точкам крепления.", "2026-02-18")],
    quickViewEnabled: true,
  },
  {
    id: "prod-rootslab-classic-100",
    categoryId: "substrate-slabs",
    slug: "rootslab-classic-100",
    name: "Субстратный мат RootSlab Classic 100",
    article: "SB-RC100",
    shortDescription: "Рабочий мат под базовый ряд плодоношения и стабильный дренажный режим.",
    fullDescription: fullDescriptionFrom({
      overview:
        "RootSlab Classic 100 нужен тем, кто уже определился с размером лотка, схемой дренажа и рабочим количеством растений на мат.",
      fit:
        "Используется в базовых рядах плодоношения, где важна предсказуемая корневая зона без экспериментов по формату.",
      bullets: [
        "Длина 100 см под типовой ряд.",
        "Предсказуемая влагоёмкость и дренаж.",
        "Подходит для повторяемой схемы на рабочем модуле.",
      ],
      wrapUp:
        "Если вы меняете и субстрат, и схему подачи, лучше сверить узел целиком, а не покупать мат отдельно.",
    }),
    price: 760,
    stockStatus: "in_stock",
    badges: ["hit"],
    popularity: 90,
    images: [
      "assets/catalog/grodan_prestige_6_ho.webp",
      "assets/photos/optimized/berry-close.webp",
      "assets/catalog/IMG_4924.webp",
    ],
    documents: [sharedDocuments["substrate-guide"]],
    attributes: [
      attr("length", "Длина", "100 см"),
      attr("format", "Формат", "мат"),
      attr("density", "Плотность", "средняя", "Основные"),
      attr("drainage", "Дренаж", "стабильный", "Сценарий"),
      attr("scenario", "Сценарий", "рабочий ряд плодоношения", "Сценарий"),
    ],
    priceTiers: priceTiersFor(760),
    faq: [
      faq("Подойдёт под капельницу 2,2 л/ч?", "Да, если общий режим полива уже настроен под ваш ряд.", "2026-01-21"),
      faq("Нужен ли предзапуск?", "Да, мат стоит предварительно увлажнить по памятке.", "2026-02-09"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-rootslab-prestige-65",
    categoryId: "substrate-slabs",
    slug: "rootslab-prestige-65",
    name: "Субстратный мат RootSlab Prestige 65",
    article: "SB-RP65",
    shortDescription: "Более компактный мат под плотную посадку и управляемый дренаж на коротком ряду.",
    fullDescription: fullDescriptionFrom({
      overview:
        "RootSlab Prestige 65 подходит для компактного ряда и сценариев, где нужно чуть плотнее работать с геометрией и дренажом.",
      fit:
        "Обычно берут под короткие лотки, плотную посадку и аккуратную схему полива без избыточной длины мата.",
      bullets: [
        "Компактная длина 65 см.",
        "Подходит для короткого ряда и локальных узлов.",
        "Даёт управляемый дренаж в плотной схеме.",
      ],
      wrapUp:
        "Если вы ещё не понимаете итоговую плотность ряда, лучше сначала определить геометрию и только потом переходить к компактному мату.",
    }),
    price: 590,
    stockStatus: "limited",
    badges: ["recommended"],
    popularity: 72,
    images: [
      "assets/catalog/grodan_prestige_6_ho.webp",
      "assets/photos/optimized/berry-close.webp",
      "assets/catalog/20550842.webp",
    ],
    documents: [sharedDocuments["substrate-guide"]],
    attributes: [
      attr("length", "Длина", "65 см"),
      attr("format", "Формат", "мат"),
      attr("density", "Плотность", "средняя+", "Основные"),
      attr("drainage", "Дренаж", "быстрый", "Сценарий"),
      attr("scenario", "Сценарий", "короткий ряд / плотная схема", "Сценарий"),
    ],
    priceTiers: priceTiersFor(590),
    faq: [faq("Подходит ли для длинного ряда?", "Не лучший выбор: на длинный ряд чаще берут более длинный мат.", "2026-02-15")],
    quickViewEnabled: true,
  },
  {
    id: "prod-rootslab-hydro-80",
    categoryId: "substrate-slabs",
    slug: "rootslab-hydro-80",
    name: "Субстратный мат RootSlab Hydro 80",
    article: "SB-RH80",
    shortDescription: "Универсальный мат для переходных схем между коротким и длинным рядом.",
    fullDescription: fullDescriptionFrom({
      overview:
        "RootSlab Hydro 80 закрывает промежуточный сценарий, когда ряд уже не совсем короткий, но ещё не требует длинного мата на метр.",
      fit:
        "Подходит для промежуточных модулей, тестовых рядов и аккуратного перехода между форматами.",
      bullets: [
        "Длина 80 см как компромиссный формат.",
        "Хорош для тестовых рядов и переходных схем.",
        "Помогает не переусложнять корневую зону на старте.",
      ],
      wrapUp:
        "Если вы знаете точную геометрию ряда, лучше брать мат под неё, а не компромиссный формат.",
    }),
    price: 640,
    stockStatus: "preorder",
    badges: ["new"],
    popularity: 64,
    images: [
      "assets/catalog/18341837.webp",
      "assets/photos/optimized/berry-close.webp",
      "assets/catalog/grodan_prestige_6_ho.webp",
    ],
    documents: [sharedDocuments["substrate-guide"]],
    attributes: [
      attr("length", "Длина", "80 см"),
      attr("format", "Формат", "мат"),
      attr("density", "Плотность", "средняя", "Основные"),
      attr("scenario", "Сценарий", "переходная схема", "Сценарий"),
      attr("drainage", "Дренаж", "умеренный", "Сценарий"),
    ],
    priceTiers: priceTiersFor(640),
    faq: [faq("Это универсальная позиция?", "Да, но всё равно лучше сверить длину ряда и число растений.", "2026-02-24")],
    quickViewEnabled: true,
  },
  {
    id: "prod-plug-cube-36",
    categoryId: "propagation-plugs",
    slug: "plug-cube-36",
    name: "Стартовый кубик Plug Cube 36",
    article: "PL-C36",
    shortDescription: "Кубик для рассады и раннего этапа, когда важна ровная стартовая зона без перегруза.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Plug Cube 36 подходит для раннего этапа и старта рассады, где нужна чистая и повторяемая маленькая корневая зона.",
      fit:
        "Берут под рассаду, пикировку и короткий старт до пересадки в рабочий мат.",
      bullets: [
        "Размер 36 мм для раннего этапа.",
        "Удобен для стартовой расстановки и контроля влаги.",
        "Подходит для аккуратной пересадки в мат.",
      ],
      wrapUp:
        "Если вы сразу идёте в рабочий ряд, лучше не перегружать схему лишним этапом и выбрать формат под основной сценарий.",
    }),
    price: 34,
    stockStatus: "in_stock",
    badges: ["recommended"],
    popularity: 67,
    images: [
      "assets/catalog/20550842.webp",
      "assets/photos/optimized/berry-cluster.webp",
      "assets/catalog/IMG_4924.webp",
    ],
    documents: [sharedDocuments["substrate-guide"], sharedDocuments["planting-note"]],
    attributes: [
      attr("size", "Размер", "36 мм"),
      attr("format", "Формат", "кубик"),
      attr("scenario", "Сценарий", "ранний этап / рассада", "Сценарий"),
      attr("transfer", "Пересадка", "в мат", "Сценарий"),
    ],
    priceTiers: priceTiersFor(34),
    faq: [faq("Подходит под семенной старт?", "Да, это типовая позиция для раннего этапа.", "2026-02-04")],
    quickViewEnabled: true,
  },
  {
    id: "prod-plug-cube-77",
    categoryId: "propagation-plugs",
    slug: "plug-cube-77",
    name: "Стартовая пробка Plug Cube 77",
    article: "PL-C77",
    shortDescription: "Более ёмкий кубик под раннее развитие и уверенный переход в рабочий ряд.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Plug Cube 77 нужен там, где ранний этап длится дольше и растению требуется более спокойный объём на старте.",
      fit:
        "Подходит для рассады с более длинным стартом и случаев, когда пересадка в мат не делается сразу.",
      bullets: [
        "Размер 77 мм для более ёмкого старта.",
        "Удобен, когда рассада проводит на старте больше времени.",
        "Даёт чуть больше буфера по влаге и корню.",
      ],
      wrapUp:
        "Если ранний этап короткий, компактный кубик может быть рациональнее по месту и логистике.",
    }),
    price: 52,
    stockStatus: "limited",
    badges: [],
    popularity: 59,
    images: [
      "assets/catalog/20550842.webp",
      "assets/photos/optimized/berry-cluster.webp",
      "assets/catalog/grodan_prestige_6_ho.webp",
    ],
    documents: [sharedDocuments["substrate-guide"], sharedDocuments["planting-note"]],
    attributes: [
      attr("size", "Размер", "77 мм"),
      attr("format", "Формат", "кубик"),
      attr("scenario", "Сценарий", "расширенный старт", "Сценарий"),
      attr("transfer", "Пересадка", "в мат / лоток", "Сценарий"),
    ],
    priceTiers: priceTiersFor(52),
    faq: [faq("Можно ли использовать без пересадки?", "Только на короткий период, это всё же стартовый формат.", "2026-02-21")],
    quickViewEnabled: true,
  },
  {
    id: "prod-frigo-a-plus",
    categoryId: "frigo-plants",
    slug: "frigo-a-plus",
    name: "Frigo A+ Berry Start",
    article: "FG-A-PLUS",
    shortDescription: "Frigo-рассада класса A+ под быстрый и выровненный старт рабочего ряда.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Frigo A+ Berry Start подходит для сценария, где нужен быстрый старт ряда и понятная волна запуска без долгого раскачивания.",
      fit:
        "Обычно используют на запусках, где график фермы уже расписан и нужен выровненный старт посадки.",
      bullets: [
        "Класс A+ под быстрый рабочий старт.",
        "Подходит для выровненной посадки в модуль.",
        "Удобен, когда график запуска уже известен.",
      ],
      wrapUp:
        "Если ещё не определён график запуска и логистика приёмки, сначала стоит сверить сценарий и только потом заказывать рассаду.",
    }),
    price: 119,
    stockStatus: "preorder",
    badges: ["hit"],
    popularity: 87,
    images: [
      "assets/photos/optimized/berry-red.webp",
      "assets/photos/optimized/berry-close.webp",
      "assets/photos/optimized/berry-cluster.webp",
    ],
    documents: [sharedDocuments["planting-note"]],
    attributes: [
      attr("class", "Класс", "A+"),
      attr("fruiting", "Волна запуска", "быстрая"),
      attr("berry", "Размер ягоды", "средне-крупная"),
      attr("scenario", "Сценарий", "быстрый старт ряда", "Сценарий"),
    ],
    priceTiers: priceTiersFor(119, [
      { label: "Пробная партия", minQty: 50, price: 119, summary: "Тестовый запуск." },
      { label: "Модуль", minQty: 500, price: 108, summary: "Партия под один модуль." },
      { label: "Проект", minQty: 2000, price: 99, summary: "Большой запуск под график." },
    ]),
    faq: [
      faq("Какой минимум по заказу?", "Рознично от 50 штук, но основной смысл позиции раскрывается на модуле.", "2026-02-02"),
      faq("Нужна ли приёмка в день поставки?", "Да, для Frigo это критично, инструкция есть в памятке.", "2026-02-17"),
    ],
    quickViewEnabled: true,
  },
  {
    id: "prod-frigo-tray-ready",
    categoryId: "frigo-plants",
    slug: "frigo-tray-ready",
    name: "Frigo Tray Ready",
    article: "FG-TRAY",
    shortDescription: "Frigo-партия под аккуратную высадку в лоток и спокойный производственный старт.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Frigo Tray Ready нужен там, где логистика и высадка уже поставлены на рельсы, и важно быстро загрузить ряд без лишней суеты.",
      fit:
        "Подходит для хозяйств, где уже есть понятная схема высадки, сервис и график запуска.",
      bullets: [
        "Партия под аккуратную высадку в лоток.",
        "Хороша для повторяемой логистики и производственного графика.",
        "Требует готового сценария приёмки и запуска.",
      ],
      wrapUp:
        "Если у вас ещё не определены окна поставки и посадки, эта позиция может сработать хуже, чем кажется.",
    }),
    price: 132,
    stockStatus: "preorder",
    badges: ["new"],
    popularity: 66,
    images: [
      "assets/photos/optimized/berry-red.webp",
      "assets/photos/optimized/berry-cluster.webp",
      "assets/photos/optimized/berry-close.webp",
    ],
    documents: [sharedDocuments["planting-note"]],
    attributes: [
      attr("class", "Класс", "Tray ready"),
      attr("fruiting", "Волна запуска", "ровная"),
      attr("berry", "Размер ягоды", "средняя"),
      attr("scenario", "Сценарий", "серийный запуск", "Сценарий"),
    ],
    priceTiers: priceTiersFor(132),
    faq: [faq("Можно ли брать небольшую партию?", "Да, но позиция эффективнее в серийной логистике.", "2026-02-25")],
    quickViewEnabled: true,
  },
  {
    id: "prod-berry-start-f1",
    categoryId: "seed-series",
    slug: "berry-start-f1",
    name: "Berry Start F1",
    article: "SD-BSF1",
    shortDescription: "Семенная серия под выровненный старт и спокойную фасовку ягоды в коротком цикле.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Berry Start F1 подходит для тех случаев, когда нужна предсказуемая серия под запуск и выровненный цикл.",
      fit:
        "Чаще всего её выбирают под компактные модули, плановый запуск и понятную фасовку по объёму.",
      bullets: [
        "Стабильная семенная серия для ровного рабочего цикла.",
        "Подходит под выровненный запуск ряда.",
        "Удобна для сценария, где важна аккуратная фасовка и повторяемость.",
      ],
      wrapUp:
        "Если запуск ещё не привязан к конкретному модулю и срокам, сначала опишите сценарий, а потом выбирайте серию.",
    }),
    price: 3290,
    stockStatus: "in_stock",
    badges: ["recommended"],
    popularity: 70,
    images: [
      "assets/photos/optimized/berry-cluster.webp",
      "assets/photos/optimized/berry-red.webp",
      "assets/photos/optimized/berry-close.webp",
    ],
    documents: [sharedDocuments["planting-note"]],
    attributes: [
      attr("wave", "Тип плодоношения", "нейтральный день"),
      attr("berry", "Размер ягоды", "средняя"),
      attr("scenario", "Сценарий", "плановый запуск", "Сценарий"),
      attr("pack", "Фасовка", "100 семян", "Логистика"),
    ],
    priceTiers: priceTiersFor(3290),
    faq: [faq("Есть ли фото результата?", "Да, часть отзывов и фото пользователей доступна ниже.", "2026-02-06")],
    quickViewEnabled: true,
  },
  {
    id: "prod-city-harvest-f1",
    categoryId: "seed-series",
    slug: "city-harvest-f1",
    name: "City Harvest F1",
    article: "SD-CHF1",
    shortDescription: "Семенная серия под стабильную фасовку и аккуратную товарную ягоду.",
    fullDescription: fullDescriptionFrom({
      overview:
        "City Harvest F1 выбирают, когда результат оценивают не только по урожаю, но и по удобной фасовке и аккуратному виду ягоды.",
      fit:
        "Подходит для сценариев, где важна стабильность продукции и управляемый цикл внутри фермы.",
      bullets: [
        "Товарная ягода под фасовку.",
        "Хорошо работает в аккуратных repeatable-сценариях.",
        "Серия под стабильный цикл и ровный результат.",
      ],
      wrapUp:
        "Если ещё нет понимания канала отгрузки и объёма, выбор серии стоит сверять вместе со сценарием сбыта.",
    }),
    price: 3490,
    stockStatus: "limited",
    badges: ["hit"],
    popularity: 76,
    images: [
      "assets/photos/optimized/berry-close.webp",
      "assets/photos/optimized/berry-red.webp",
      "assets/photos/optimized/berry-cluster.webp",
    ],
    documents: [sharedDocuments["planting-note"], sharedDocuments["packaging-sheet"]],
    attributes: [
      attr("wave", "Тип плодоношения", "ремонтантный"),
      attr("berry", "Размер ягоды", "средне-крупная"),
      attr("scenario", "Сценарий", "товарная фасовка", "Сценарий"),
      attr("pack", "Фасовка", "100 семян", "Логистика"),
    ],
    priceTiers: priceTiersFor(3490),
    faq: [faq("Подходит для свежей полки?", "Да, серия хорошо работает на аккуратную фасовку и витрину.", "2026-02-19")],
    quickViewEnabled: true,
  },
  {
    id: "prod-compact-sweet-f1",
    categoryId: "seed-series",
    slug: "compact-sweet-f1",
    name: "Compact Sweet F1",
    article: "SD-CSF1",
    shortDescription: "Компактная серия под короткий модуль и ограниченную площадь без потери управляемости.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Compact Sweet F1 нужна там, где модуль компактнее, а площадь ограничена, но всё равно хочется держать товарный и управляемый результат.",
      fit:
        "Подходит для коротких модулей, локальных ферм и аккуратного запуска на небольшой площади.",
      bullets: [
        "Компактная серия под ограниченную площадь.",
        "Удобна для короткого модуля и управляемой посадки.",
        "Помогает не перегружать небольшую ферму избыточной вегетативной массой.",
      ],
      wrapUp:
        "Если модуль вырастет в полноценный ряд, может оказаться рациональнее серия под более длинный цикл и объём.",
    }),
    price: 2990,
    stockStatus: "in_stock",
    badges: ["sale"],
    popularity: 61,
    images: [
      "assets/photos/optimized/berry-close.webp",
      "assets/photos/optimized/berry-red.webp",
      "assets/photos/optimized/berry-cluster.webp",
    ],
    documents: [sharedDocuments["planting-note"]],
    attributes: [
      attr("wave", "Тип плодоношения", "нейтральный день"),
      attr("berry", "Размер ягоды", "средняя"),
      attr("scenario", "Сценарий", "компактный модуль", "Сценарий"),
      attr("pack", "Фасовка", "100 семян", "Логистика"),
    ],
    priceTiers: priceTiersFor(2990),
    faq: [faq("Подойдёт новичку?", "Да, если сценарий запуска не перегружен и площадь ограничена.", "2026-02-22")],
    quickViewEnabled: true,
  },
  {
    id: "prod-airflow-clip-40",
    categoryId: "air-circulation",
    slug: "airflow-clip-40",
    name: "Вентилятор Airflow Clip 40",
    article: "CL-AC40",
    shortDescription: "Компактный циркуляционный вентилятор для сервисной поддержки воздуха на модуле.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Airflow Clip 40 нужен для мягкой циркуляции на небольшом модуле, где надо убрать застой и не перегружать конструкцию.",
      fit:
        "Подходит для сервисных зон, коротких рядов и локального движения воздуха вокруг растения.",
      bullets: [
        "Компактный диаметр 40 см.",
        "Подвес или клипса под сервисный монтаж.",
        "Подходит для небольших модулей и локальной циркуляции.",
      ],
      wrapUp:
        "Если задача в целом климатическом контуре, одного вентилятора обычно недостаточно без проверки всей схемы воздуха.",
    }),
    price: 5200,
    stockStatus: "in_stock",
    badges: ["recommended"],
    popularity: 65,
    images: [
      "assets/photos/optimized/hero-process.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
      "assets/catalog/92611106.webp",
    ],
    documents: [sharedDocuments["climate-sheet"]],
    attributes: [
      attr("diameter", "Диаметр", "40 см"),
      attr("airflow", "Воздушный поток", "2 600 м3/ч"),
      attr("mount", "Монтаж", "клипса / подвес", "Монтаж"),
      attr("scenario", "Сценарий", "локальная циркуляция", "Сценарий"),
    ],
    priceTiers: priceTiersFor(5200),
    faq: [faq("Можно ли ставить в каждый ряд?", "Да, но итоговую схему стоит считать по всему модулю.", "2026-02-14")],
    quickViewEnabled: true,
  },
  {
    id: "prod-row-fan-ec-60",
    categoryId: "air-circulation",
    slug: "row-fan-ec-60",
    name: "Рядовой вентилятор Row Fan EC 60",
    article: "CL-RF60",
    shortDescription: "EC-вентилятор под рабочий ряд и более серьёзную схему выравнивания воздуха.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Row Fan EC 60 ставят в тех случаях, когда модуль уже не маленький и нужна более серьёзная циркуляция воздуха по ряду.",
      fit:
        "Чаще всего берут на рабочий ряд с высокой плотностью посадки и понятным сценарием сервиса.",
      bullets: [
        "EC-вентилятор 60 см под рабочий ряд.",
        "Хорош для длинных модулей и более плотной посадки.",
        "Требует понимания общей схемы воздуха.",
      ],
      wrapUp:
        "Если схема климата не описана, покупать только вентилятор без понимания контура обычно неэффективно.",
    }),
    price: 11800,
    stockStatus: "preorder",
    badges: ["new"],
    popularity: 62,
    images: [
      "assets/photos/optimized/hero-process.webp",
      "assets/photos/optimized/rack-aisle.webp",
      "assets/photos/optimized/greenhouse-rack.webp",
    ],
    documents: [sharedDocuments["climate-sheet"]],
    attributes: [
      attr("diameter", "Диаметр", "60 см"),
      attr("airflow", "Воздушный поток", "4 900 м3/ч"),
      attr("mount", "Монтаж", "рядовой профиль", "Монтаж"),
      attr("scenario", "Сценарий", "рабочий ряд", "Сценарий"),
    ],
    priceTiers: priceTiersFor(11800),
    faq: [faq("Нужен ли частотный контроль?", "Да, в большинстве случаев лучше использовать EC-управление по сценарию ряда.", "2026-02-20")],
    quickViewEnabled: true,
  },
  {
    id: "prod-mistline-6l",
    categoryId: "humidification",
    slug: "mistline-6l",
    name: "Станция MistLine 6L",
    article: "CL-ML6",
    shortDescription: "Компактная станция тумана под небольшую ферму, рассадную или сервисную зону.",
    fullDescription: fullDescriptionFrom({
      overview:
        "MistLine 6L нужна там, где влажность надо подтянуть мягко и локально, а не строить тяжёлый климатический контур.",
      fit:
        "Подходит для небольших зон, рассадных и сервисных сценариев с понятным объёмом воздуха.",
      bullets: [
        "Компактная станция на 6 литров.",
        "Подходит для локальной корректировки влажности.",
        "Удобна в рассадных и небольших зонах.",
      ],
      wrapUp:
        "Если проблема в общем климате ряда, одной станции может быть мало без пересмотра вентиляции и воздухообмена.",
    }),
    price: 7600,
    stockStatus: "limited",
    badges: ["recommended"],
    popularity: 57,
    images: [
      "assets/photos/optimized/greenhouse-rack.webp",
      "assets/photos/optimized/hero-process.webp",
      "assets/photos/optimized/berry-cluster.webp",
    ],
    documents: [sharedDocuments["climate-sheet"]],
    attributes: [
      attr("capacity", "Объём бака", "6 л"),
      attr("coverage", "Покрытие", "до 30 м2"),
      attr("scenario", "Сценарий", "локальная влажность", "Сценарий"),
      attr("mount", "Монтаж", "напольный", "Монтаж"),
    ],
    priceTiers: priceTiersFor(7600),
    faq: [faq("Подходит ли для плодоношения?", "Да, но только как часть понятной климатической схемы.", "2026-01-29")],
    quickViewEnabled: true,
  },
  {
    id: "prod-fogstation-30",
    categoryId: "humidification",
    slug: "fogstation-30",
    name: "FogStation 30",
    article: "CL-FS30",
    shortDescription: "Станция тумана под рабочую зону, где влажность надо вести более системно.",
    fullDescription: fullDescriptionFrom({
      overview:
        "FogStation 30 относится к более системным позициям и нужна, когда речь уже идёт не о точечном увлажнении, а о зоне или модуле.",
      fit:
        "Подходит для рабочих зон с понятным объёмом воздуха и заранее описанной логикой обслуживания.",
      bullets: [
        "Покрытие до 120 м2.",
        "Подходит для системной работы по влажности.",
        "Обычно ставится вместе с контролем по датчикам.",
      ],
      wrapUp:
        "Если датчиков и схемы управления ещё нет, лучше сначала собрать контур, а не покупать станцию отдельно.",
    }),
    price: 26400,
    stockStatus: "preorder",
    badges: ["sale"],
    popularity: 51,
    images: [
      "assets/photos/optimized/greenhouse-rack.webp",
      "assets/photos/optimized/hero-process.webp",
      "assets/catalog/92611106.webp",
    ],
    documents: [sharedDocuments["climate-sheet"], sharedDocuments["monitoring-guide"]],
    attributes: [
      attr("capacity", "Покрытие", "до 120 м2"),
      attr("tank", "Объём бака", "30 л"),
      attr("scenario", "Сценарий", "рабочая зона", "Сценарий"),
      attr("control", "Управление", "по датчику / таймеру", "Монтаж"),
    ],
    priceTiers: priceTiersFor(26400),
    faq: [faq("Можно ли запустить без контроллера?", "Можно, но эффективность выше с автоматикой и датчиками.", "2026-02-26")],
    quickViewEnabled: true,
  },
  {
    id: "prod-berry-feed-grow",
    categoryId: "base-nutrition",
    slug: "berry-feed-grow",
    name: "Berry Feed Grow",
    article: "NT-GROW-A",
    shortDescription: "Базовый раствор под вегетативный старт и мягкое наращивание листовой массы.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Berry Feed Grow нужен для вегетативного старта, когда раствор должен быть спокойным и предсказуемым, а не перегружать растение.",
      fit:
        "Подходит для стартовой фазы и раннего этапа после высадки, если базовая схема питания уже понятна.",
      bullets: [
        "Раствор под вегетативную фазу.",
        "Удобен как база для рабочей схемы фермы.",
        "Хорошо работает при понятном контроле EC и pH.",
      ],
      wrapUp:
        "Если вы не ведёте замеры раствора, лучше сначала наладить контроль, а потом наращивать ассортимент питания.",
    }),
    price: 2980,
    stockStatus: "in_stock",
    badges: ["recommended"],
    popularity: 68,
    images: [
      "assets/catalog/IMG_4924.webp",
      "assets/photos/optimized/berry-close.webp",
      "assets/catalog/18341837.webp",
    ],
    documents: [sharedDocuments["nutrition-sheet"]],
    attributes: [
      attr("phase", "Фаза", "рост"),
      attr("volume", "Фасовка", "5 л"),
      attr("ec", "Рабочий EC", "1.1-1.4"),
      attr("scenario", "Сценарий", "вегетативный старт", "Сценарий"),
    ],
    priceTiers: priceTiersFor(2980),
    faq: [faq("Нужен ли буфер pH?", "Да, если вода нестабильна по исходным параметрам.", "2026-02-18")],
    quickViewEnabled: true,
  },
  {
    id: "prod-berry-feed-fruit",
    categoryId: "base-nutrition",
    slug: "berry-feed-fruit",
    name: "Berry Feed Fruit",
    article: "NT-FRUIT-B",
    shortDescription: "Базовый раствор под плодоношение и ровную товарную ягоду.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Berry Feed Fruit используют в фазе плодоношения, когда важна стабильная отдача и понятная реакция растения на раствор.",
      fit:
        "Подходит для рабочих рядов с налаженным контролем дренажа и регулярными замерами раствора.",
      bullets: [
        "Раствор под плодоношение.",
        "Подходит для стабилизации товарной ягоды.",
        "Лучше раскрывается при нормальном контроле pH и EC.",
      ],
      wrapUp:
        "Если дренаж и подача нестабильны, сначала надо выровнять полив и контроль, а уже потом усиливать питание.",
    }),
    price: 3140,
    stockStatus: "limited",
    badges: ["hit"],
    popularity: 73,
    images: [
      "assets/catalog/IMG_4924.webp",
      "assets/photos/optimized/berry-red.webp",
      "assets/catalog/18341837.webp",
    ],
    documents: [sharedDocuments["nutrition-sheet"]],
    attributes: [
      attr("phase", "Фаза", "плодоношение"),
      attr("volume", "Фасовка", "5 л"),
      attr("ec", "Рабочий EC", "1.4-1.7"),
      attr("scenario", "Сценарий", "рабочий ряд", "Сценарий"),
    ],
    priceTiers: priceTiersFor(3140),
    faq: [faq("Можно ли мешать с Grow?", "Переход лучше делать по фазе, а не смешивать без измерений.", "2026-02-27")],
    quickViewEnabled: true,
  },
  {
    id: "prod-ph-balance-kit",
    categoryId: "ph-ec-control",
    slug: "ph-balance-kit",
    name: "Набор pH Balance Kit",
    article: "NT-PHBK",
    shortDescription: "Буферы и корректоры для спокойного контроля pH без постоянной ручной импровизации.",
    fullDescription: fullDescriptionFrom({
      overview:
        "pH Balance Kit нужен тем, кто хочет держать раствор стабильно и не угадывать каждый раз с коррекцией вручную.",
      fit:
        "Подходит для регулярного сервиса раствора, особенно там, где вода меняется по входным параметрам.",
      bullets: [
        "Буферы и корректоры в одном наборе.",
        "Удобен для регулярного контроля pH.",
        "Помогает сделать сервис раствора повторяемым.",
      ],
      wrapUp:
        "Если у вас нет элементарного графика замеров, даже хороший набор не заменит дисциплину контроля.",
    }),
    price: 1680,
    stockStatus: "in_stock",
    badges: ["recommended"],
    popularity: 64,
    images: [
      "assets/catalog/18341837.webp",
      "assets/catalog/IMG_4924.webp",
      "assets/photos/optimized/hero-process.webp",
    ],
    documents: [sharedDocuments["nutrition-sheet"]],
    attributes: [
      attr("type", "Тип позиции", "буферы и корректоры"),
      attr("volume", "Фасовка", "3 х 250 мл"),
      attr("scenario", "Сценарий", "регулярный сервис раствора", "Сценарий"),
      attr("control", "Контроль", "ручной / сервисный", "Сценарий"),
    ],
    priceTiers: priceTiersFor(1680),
    faq: [faq("Подходит новичку?", "Да, если вы уже ведёте хотя бы базовый журнал замеров.", "2026-02-09")],
    quickViewEnabled: true,
  },
  {
    id: "prod-ec-buffer-pack",
    categoryId: "ph-ec-control",
    slug: "ec-buffer-pack",
    name: "EC Buffer Pack",
    article: "NT-ECBP",
    shortDescription: "Набор буферов и сервисных растворов для быстрой поверки EC-метра и рабочего контроля.",
    fullDescription: fullDescriptionFrom({
      overview:
        "EC Buffer Pack нужен, чтобы замеры не превращались в догадки, а приборы и сервис раствора оставались в адекватном состоянии.",
      fit:
        "Подходит для регулярной поверки, сервисного контроля и хозяйств, где измерения действительно влияют на решения.",
      bullets: [
        "Буферы для поверки EC-метра.",
        "Удобный формат под сервисный график.",
        "Снижает вероятность решений на неверных цифрах.",
      ],
      wrapUp:
        "Даже недорогой набор окупается, если вы реально опираетесь на замеры, а не на ощущения.",
    }),
    price: 1240,
    stockStatus: "in_stock",
    badges: [],
    popularity: 55,
    images: [
      "assets/catalog/18341837.webp",
      "assets/photos/optimized/hero-process.webp",
      "assets/catalog/IMG_4924.webp",
    ],
    documents: [sharedDocuments["nutrition-sheet"]],
    attributes: [
      attr("type", "Тип позиции", "буферы"),
      attr("volume", "Фасовка", "2 х 250 мл"),
      attr("scenario", "Сценарий", "поверка и сервис", "Сценарий"),
      attr("control", "Контроль", "EC", "Сценарий"),
    ],
    priceTiers: priceTiersFor(1240),
    faq: [faq("Нужен ли вместе с pH kit?", "Обычно да, если вы ведёте полноценный контроль раствора.", "2026-02-12")],
    quickViewEnabled: true,
  },
  {
    id: "prod-climate-brain-mini",
    categoryId: "controllers",
    slug: "climate-brain-mini",
    name: "Контроллер Climate Brain Mini",
    article: "CT-CBM",
    shortDescription: "Компактный контроллер для климата и тревог по модулю без сложной интеграции.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Climate Brain Mini нужен тем, кто хочет видеть базовые климатические сигналы и управлять тревогами на модуле без тяжёлой автоматизации.",
      fit:
        "Подходит для небольших ферм, сервисных зон и первых шагов в телеметрии, когда нужен понятный и быстрый слой контроля.",
      bullets: [
        "Компактный контроллер под модуль.",
        "Работает с датчиками температуры и влажности.",
        "Подходит для базовых тревог и уведомлений.",
      ],
      wrapUp:
        "Если вы уже строите полноценную автоматику полива и климата, возможно, стоит сразу смотреть старший контроллер.",
    }),
    price: 28900,
    stockStatus: "preorder",
    badges: ["recommended"],
    popularity: 63,
    images: [
      "assets/catalog/92611106.webp",
      "assets/photos/optimized/hero-process.webp",
      "assets/catalog/20880535.webp",
    ],
    documents: [sharedDocuments["monitoring-guide"]],
    attributes: [
      attr("connectivity", "Связь", "Wi-Fi / Ethernet"),
      attr("inputs", "Входы", "6"),
      attr("scenario", "Сценарий", "базовый контроль модуля", "Сценарий"),
      attr("alerts", "Уведомления", "Telegram / email", "Сценарий"),
    ],
    priceTiers: priceTiersFor(28900),
    faq: [faq("Можно ли подключить датчик влажности?", "Да, это один из базовых сценариев контроллера.", "2026-02-10")],
    quickViewEnabled: true,
  },
  {
    id: "prod-fertigation-hub-pro",
    categoryId: "controllers",
    slug: "fertigation-hub-pro",
    name: "Контроллер Fertigation Hub Pro",
    article: "CT-FHP",
    shortDescription: "Продвинутый контроллер для полива, датчиков и сервисной логики по нескольким зонам.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Fertigation Hub Pro нужен там, где уже есть несколько зон, датчики и реальная потребность управлять контуром системно.",
      fit:
        "Подходит для ферм, где есть несколько рабочих зон и нужна связка полива, тревог и истории по параметрам.",
      bullets: [
        "Управление несколькими зонами.",
        "Интеграция датчиков EC, pH и климата.",
        "История и логика тревог для рабочего контура.",
      ],
      wrapUp:
        "Это не импульсная покупка: чтобы контроллер работал, нужна заранее понятная схема узлов и датчиков.",
    }),
    price: 64900,
    stockStatus: "preorder",
    badges: ["new"],
    popularity: 54,
    images: [
      "assets/catalog/92611106.webp",
      "assets/catalog/20880535.webp",
      "assets/photos/optimized/hero-process.webp",
    ],
    documents: [sharedDocuments["monitoring-guide"], sharedDocuments["nutrition-sheet"]],
    attributes: [
      attr("connectivity", "Связь", "Ethernet / LTE"),
      attr("inputs", "Входы", "16"),
      attr("zones", "Зоны", "до 4"),
      attr("scenario", "Сценарий", "полив + климат + тревоги", "Сценарий"),
    ],
    priceTiers: priceTiersFor(64900),
    faq: [faq("Подходит ли для одной зоны?", "Да, но экономически чаще оправдан на нескольких зонах.", "2026-02-23")],
    quickViewEnabled: true,
  },
  {
    id: "prod-sensor-pack-basic",
    categoryId: "sensors",
    slug: "sensor-pack-basic",
    name: "Набор датчиков Sensor Pack Basic",
    article: "SN-SPB",
    shortDescription: "Стартовый набор датчиков среды для видимости климата без лишней сложности.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Sensor Pack Basic нужен, если вы хотите начать видеть воздух и базовые параметры среды на модуле без сложной автоматики.",
      fit:
        "Подходит для небольших ферм и первых шагов, где уже важно отслеживать температуру и влажность по факту.",
      bullets: [
        "Температура и влажность в одном наборе.",
        "Подходит для базового мониторинга модуля.",
        "Легко стыкуется с компактными контроллерами.",
      ],
      wrapUp:
        "Даже базовые датчики дают больше пользы, чем слепая работа по ощущениям, если вы действительно смотрите на цифры.",
    }),
    price: 9900,
    stockStatus: "in_stock",
    badges: ["hit"],
    popularity: 71,
    images: [
      "assets/catalog/20880535.webp",
      "assets/catalog/92611106.webp",
      "assets/photos/optimized/hero-process.webp",
    ],
    documents: [sharedDocuments["monitoring-guide"]],
    attributes: [
      attr("set", "Состав", "температура + влажность"),
      attr("connectivity", "Связь", "Modbus / Wi-Fi"),
      attr("scenario", "Сценарий", "стартовый мониторинг", "Сценарий"),
      attr("mount", "Монтаж", "подвес / стойка", "Монтаж"),
    ],
    priceTiers: priceTiersFor(9900),
    faq: [faq("Подходит для мобильного контроля?", "Да, можно смотреть данные через веб-интерфейс.", "2026-02-07")],
    quickViewEnabled: true,
  },
  {
    id: "prod-sensor-leaf-temp",
    categoryId: "sensors",
    slug: "sensor-leaf-temp",
    name: "Датчик Leaf Temp Probe",
    article: "SN-LTP",
    shortDescription: "Датчик листа и температуры поверхности для более точного понимания микроклимата.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Leaf Temp Probe нужен, когда базового воздуха уже недостаточно и нужно смотреть на реальную температуру листа и поверхности.",
      fit:
        "Чаще всего его добавляют к рабочим модулям после того, как базовый климатический контроль уже настроен.",
      bullets: [
        "Считывает температуру поверхности листа.",
        "Помогает точнее понимать стресс по микроклимату.",
        "Хорошо работает в связке с базовым контроллером.",
      ],
      wrapUp:
        "Это второй шаг после базовой телеметрии: если воздуха вы ещё не видите, начать стоит с более простого набора.",
    }),
    price: 7800,
    stockStatus: "limited",
    badges: ["new"],
    popularity: 49,
    images: [
      "assets/catalog/20880535.webp",
      "assets/photos/optimized/berry-close.webp",
      "assets/photos/optimized/hero-process.webp",
    ],
    documents: [sharedDocuments["monitoring-guide"]],
    attributes: [
      attr("set", "Состав", "датчик поверхности"),
      attr("connectivity", "Связь", "Modbus"),
      attr("scenario", "Сценарий", "расширенный мониторинг", "Сценарий"),
      attr("mount", "Монтаж", "ряд / лист / профиль", "Монтаж"),
    ],
    priceTiers: priceTiersFor(7800),
    faq: [faq("Можно ли использовать без контроллера?", "Лучше нет: смысл датчика в данных и тревогах, а не просто в подключении.", "2026-02-15")],
    quickViewEnabled: true,
  },
  {
    id: "prod-clamshell-250",
    categoryId: "consumer-packaging",
    slug: "clamshell-250",
    name: "Контейнер Clamshell 250",
    article: "PK-CS250",
    shortDescription: "Контейнер под фасовку 250 г для аккуратной отгрузки и ровной полки.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Clamshell 250 нужен для тех сценариев, где урожай уже доходит до упаковки и важен чистый и предсказуемый формат отгрузки.",
      fit:
        "Подходит для фасовки в retail-формат, тестовых поставок и аккуратной полки без сложного брендинга.",
      bullets: [
        "Формат 250 г для витрины и поставки.",
        "Прозрачный контейнер с хорошей геометрией ягоды.",
        "Удобен для базовой упаковки без перегруза.",
      ],
      wrapUp:
        "Если объём уже промышленный, имеет смысл сразу смотреть и ленту этикетки, и логистику паллеты.",
    }),
    price: 18,
    stockStatus: "in_stock",
    badges: ["hit"],
    popularity: 69,
    images: [
      "assets/photos/optimized/berry-close.webp",
      "assets/photos/optimized/berry-red.webp",
      "assets/photos/optimized/berry-cluster.webp",
    ],
    documents: [sharedDocuments["packaging-sheet"]],
    attributes: [
      attr("volume", "Объём", "250 г"),
      attr("material", "Материал", "PET"),
      attr("scenario", "Сценарий", "розничная фасовка", "Сценарий"),
      attr("pack", "Упаковка", "100 шт", "Логистика"),
    ],
    priceTiers: priceTiersFor(18, [
      { label: "Проба", minQty: 100, price: 18, summary: "Тестовая партия." },
      { label: "Стандарт", minQty: 1000, price: 16, summary: "Регулярная фасовка." },
      { label: "Сезон", minQty: 5000, price: 14, summary: "Сезонный объём." },
    ]),
    faq: [faq("Подходит для мягкой ягоды?", "Да, если логистика и температура после упаковки под контролем.", "2026-02-08")],
    quickViewEnabled: true,
  },
  {
    id: "prod-label-roll-red",
    categoryId: "consumer-packaging",
    slug: "label-roll-red",
    name: "Рулон этикетки Berry Label Red",
    article: "PK-BLR",
    shortDescription: "Этикетка под быструю маркировку партии, даты и базовой информации по фасовке.",
    fullDescription: fullDescriptionFrom({
      overview:
        "Berry Label Red помогает быстро маркировать фасовку, когда уже есть стабильный поток продукции и не хочется писать всё вручную.",
      fit:
        "Подходит для небольших и средних партий, тестовой полки и внутренней логистики по дате и партии.",
      bullets: [
        "Рулон самоклеящихся этикеток.",
        "Подходит для партии, даты и базовой маркировки.",
        "Удобно использовать вместе с фасовкой 250 г.",
      ],
      wrapUp:
        "Если вы уже вышли на сложный брендированный объём, скорее всего потребуется отдельная печать под сеть или канал.",
    }),
    price: 460,
    stockStatus: "in_stock",
    badges: ["sale"],
    popularity: 45,
    images: [
      "assets/photos/optimized/berry-red.webp",
      "assets/photos/optimized/berry-close.webp",
      "assets/photos/optimized/berry-cluster.webp",
    ],
    documents: [sharedDocuments["packaging-sheet"]],
    attributes: [
      attr("format", "Формат", "50 x 30 мм"),
      attr("material", "Материал", "самоклеящаяся бумага"),
      attr("scenario", "Сценарий", "маркировка партии", "Сценарий"),
      attr("pack", "Упаковка", "500 шт", "Логистика"),
    ],
    priceTiers: priceTiersFor(460),
    faq: [faq("Подходит для термопринтера?", "Да, если используете совместимый размер печати.", "2026-02-21")],
    quickViewEnabled: true,
  },
];

const reviewSeed = [
  {
    id: "review-1",
    productId: "prod-luma-line-191",
    author: "Артем В.",
    rating: 5,
    pros: "Ровный свет и понятная длина без колхоза по подвесу.",
    cons: "Для первого заказа всё равно пришлось уточнять крепёж.",
    comment:
      "Брали на замену линии в рабочем модуле. Понравилось, что светильник встал без переделки профиля и не пришлось угадывать по длине.",
    createdAt: "2026-02-10",
    verified: true,
    helpful: 12,
    media: [
      {
        type: "image",
        url: "assets/photos/optimized/greenhouse-rack.webp",
        title: "Фото ряда после замены",
      },
    ],
  },
  {
    id: "review-2",
    productId: "prod-luma-line-191",
    author: "Марина К.",
    rating: 4,
    pros: "Хорошая длина и понятный сценарий по мощности.",
    cons: "Хотелось бы сразу видеть комплект по крепежу.",
    comment:
      "Для рабочего ряда подошёл хорошо. Уточняли подвес отдельно, но в остальном позиция понятная и без сюрпризов.",
    createdAt: "2026-01-26",
    verified: true,
    helpful: 8,
    media: [],
  },
  {
    id: "review-3",
    productId: "prod-rivulet-dripper-22",
    author: "Илья Т.",
    rating: 5,
    pros: "Стабильный расход и нормальная сборка.",
    cons: "Нет.",
    comment:
      "Брали как сервисную замену, чтобы не перебирать весь узел. Подача ровная, по линии вопросов не возникло.",
    createdAt: "2026-02-03",
    verified: true,
    helpful: 10,
    media: [
      {
        type: "image",
        url: "assets/catalog/IMG_6061.webp",
        title: "Узел на рабочем модуле",
      },
    ],
  },
  {
    id: "review-4",
    productId: "prod-starter-irrigation-96",
    author: "Роман П.",
    rating: 4,
    pros: "Не пришлось собирать комплект поштучно.",
    cons: "Надо заранее понимать длину линии.",
    comment:
      "Комплект удобный, но он реально работает только когда модуль уже описан. Для нас это было как раз то, что нужно.",
    createdAt: "2026-02-18",
    verified: true,
    helpful: 6,
    media: [],
  },
  {
    id: "review-5",
    productId: "prod-frame-plus-16",
    author: "Сергей Н.",
    rating: 5,
    pros: "Жёсткий каркас и понятный сервисный доступ.",
    cons: "Лучше сразу брать со спецификацией и схемой ряда.",
    comment:
      "Каркасом довольны, но это точно не покупка вслепую. Мы сначала сверили проходы и потом только оплатили.",
    createdAt: "2026-01-31",
    verified: true,
    helpful: 9,
    media: [
      {
        type: "image",
        url: "assets/photos/optimized/rack-aisle.webp",
        title: "Рабочий ряд",
      },
    ],
  },
  {
    id: "review-6",
    productId: "prod-rootslab-classic-100",
    author: "Екатерина Л.",
    rating: 5,
    pros: "Стабильный мат и ровный запуск.",
    cons: "Нет.",
    comment:
      "Под наш ряд подошёл без сюрпризов. До этого брали другой формат и не попадали в длину, здесь всё спокойно.",
    createdAt: "2026-02-14",
    verified: true,
    helpful: 7,
    media: [],
  },
  {
    id: "review-7",
    productId: "prod-frigo-a-plus",
    author: "Ольга М.",
    rating: 4,
    pros: "Ровная партия и понятный старт.",
    cons: "Нужно реально соблюдать окно приёмки.",
    comment:
      "Рассада пришла в хорошем состоянии, но важно не затягивать с запуском. Инструкция по приёмке оказалась полезной.",
    createdAt: "2026-02-09",
    verified: true,
    helpful: 5,
    media: [
      {
        type: "image",
        url: "assets/photos/optimized/berry-red.webp",
        title: "Старт партии",
      },
    ],
  },
  {
    id: "review-8",
    productId: "prod-city-harvest-f1",
    author: "Александр Г.",
    rating: 5,
    pros: "Хорошая товарная ягода для полки.",
    cons: "Нужна дисциплина по питанию.",
    comment:
      "Серия хорошо зашла под фасовку. Но если не следить за раствором и климатом, магии не случится.",
    createdAt: "2026-01-24",
    verified: false,
    helpful: 11,
    media: [
      {
        type: "video",
        url: "assets/photos/optimized/berry-close.webp",
        title: "Короткое видео урожая",
      },
    ],
  },
  {
    id: "review-9",
    productId: "prod-airflow-clip-40",
    author: "Владимир Ш.",
    rating: 4,
    pros: "Тихий и удобный для небольшого модуля.",
    cons: "Для длинного ряда маловат.",
    comment:
      "Хорошо сработал в компактной зоне. Для длинной линии уже смотрели бы более старшую модель.",
    createdAt: "2026-02-12",
    verified: true,
    helpful: 4,
    media: [],
  },
  {
    id: "review-10",
    productId: "prod-berry-feed-fruit",
    author: "Наталья С.",
    rating: 5,
    pros: "Понятный раствор для плодоношения.",
    cons: "Нужны регулярные замеры.",
    comment:
      "С ним удобно работать, если EC и pH под контролем. Без замеров лучше не рассчитывать только на бутылку.",
    createdAt: "2026-02-01",
    verified: true,
    helpful: 8,
    media: [],
  },
  {
    id: "review-11",
    productId: "prod-sensor-pack-basic",
    author: "Дмитрий Х.",
    rating: 5,
    pros: "Наконец увидели реальные цифры по модулю.",
    cons: "Надо сразу продумать место установки.",
    comment:
      "После установки базовых датчиков стало понятно, что часть вопросов была не в свете, а в воздухе. Покупка себя оправдала.",
    createdAt: "2026-02-20",
    verified: true,
    helpful: 13,
    media: [],
  },
  {
    id: "review-12",
    productId: "prod-clamshell-250",
    author: "Анна Р.",
    rating: 4,
    pros: "Удобный контейнер, ягода выглядит аккуратно.",
    cons: "Нужно сразу считать расход на сезон.",
    comment:
      "Для пробных поставок отличный вариант. Потом просто докупили этикетку и закрыли базовую фасовку.",
    createdAt: "2026-02-06",
    verified: false,
    helpful: 3,
    media: [
      {
        type: "image",
        url: "assets/photos/optimized/berry-close.webp",
        title: "Фасовка 250 г",
      },
    ],
  },
];

const categoryById = new Map();
const categoryBySlug = new Map();
const productsById = new Map();
const productsBySlug = new Map();
const childrenByCategoryId = new Map();

const categories = categoriesSeed
  .map((category) => ({
    ...category,
    productCount: 0,
    seo: {
      title: category.seoTitle,
      description: category.seoDescription,
    },
  }))
  .sort((a, b) => a.sortOrder - b.sortOrder);

categories.forEach((category) => {
  categoryById.set(category.id, category);
  categoryBySlug.set(category.slug, category);
  if (!childrenByCategoryId.has(category.parentId)) {
    childrenByCategoryId.set(category.parentId, []);
  }
  childrenByCategoryId.get(category.parentId).push(category);
});

const reviews = reviewSeed.map((review) => ({ ...review }));
const reviewsByProductId = reviews.reduce((acc, review) => {
  if (!acc.has(review.productId)) acc.set(review.productId, []);
  acc.get(review.productId).push(review);
  return acc;
}, new Map());

const averageRating = (productId) => {
  const list = reviewsByProductId.get(productId) || [];
  if (!list.length) return 0;
  return Number((list.reduce((sum, review) => sum + review.rating, 0) / list.length).toFixed(1));
};

const products = productsSeed.map((product) => {
  const rating = averageRating(product.id);
  const reviewCount = (reviewsByProductId.get(product.id) || []).length;
  const categorySlug = getCategoryById(product.categoryId)?.slug || "";
  const legacyOverride = catalogLegacyOverrides[product.slug] || null;
  const normalized = {
    ...product,
    ...(legacyOverride || {}),
    categorySlug,
    rating,
    reviewCount,
    images: legacyOverride?.images?.length ? legacyOverride.images : product.images,
    price: legacyOverride?.price ?? product.price,
    article: legacyOverride?.article || product.article,
    name: legacyOverride?.name || product.name,
    shortDescription: legacyOverride?.shortDescription || product.shortDescription,
    fullDescription: legacyOverride?.fullDescription || product.fullDescription,
    attributes: legacyOverride?.attributes?.length ? legacyOverride.attributes : product.attributes,
    faq: legacyOverride?.faq?.length ? legacyOverride.faq : product.faq,
    documents: legacyOverride?.documents?.length ? legacyOverride.documents : product.documents,
  };
  productsById.set(normalized.id, normalized);
  productsBySlug.set(normalized.slug, normalized);
  return normalized;
});

const descendantCache = new Map();

function collectDescendantIds(categoryId) {
  if (descendantCache.has(categoryId)) return descendantCache.get(categoryId);
  const result = [categoryId];
  const children = childrenByCategoryId.get(categoryId) || [];
  children.forEach((child) => result.push(...collectDescendantIds(child.id)));
  descendantCache.set(categoryId, result);
  return result;
}

categories.forEach((category) => {
  const descendantIds = collectDescendantIds(category.id);
  category.productCount = products.filter((product) => descendantIds.includes(product.categoryId)).length;
});

export const catalogData = {
  categories,
  products,
  reviews,
};

export function formatPrice(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
}

export function resolveAssetPath(siteRoot, path) {
  return `${siteRoot}${path}`;
}

export function getTopCategories() {
  return categories.filter((category) => !category.parentId);
}

export function getCategoryBySlug(slug) {
  return categoryBySlug.get(slug) || null;
}

export function getCategoryById(id) {
  return categoryById.get(id) || null;
}

export function getChildCategories(categoryId) {
  return (childrenByCategoryId.get(categoryId) || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCategoryAncestors(category) {
  const result = [];
  let current = category;
  while (current?.parentId) {
    const parent = getCategoryById(current.parentId);
    if (!parent) break;
    result.unshift(parent);
    current = parent;
  }
  return result;
}

export function getCategoryBreadcrumbs(category) {
  return [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: CATALOG_BASE_PATH },
    ...getCategoryAncestors(category).map((ancestor) => ({
      label: ancestor.name,
      href: `${CATALOG_BASE_PATH}${ancestor.slug}/`,
    })),
    { label: category.name, href: `${CATALOG_BASE_PATH}${category.slug}/` },
  ];
}

export function getProductBreadcrumbs(product, category) {
  return [
    { label: "Главная", href: "/" },
    { label: "Каталог", href: CATALOG_BASE_PATH },
    ...getCategoryAncestors(category).map((ancestor) => ({
      label: ancestor.name,
      href: `${CATALOG_BASE_PATH}${ancestor.slug}/`,
    })),
    { label: category.name, href: `${CATALOG_BASE_PATH}${category.slug}/` },
    { label: product.name, href: `${CATALOG_BASE_PATH}${category.slug}/${product.slug}/` },
  ];
}

export function getCategoryDescendantIds(categoryId) {
  return collectDescendantIds(categoryId);
}

export function getCategoryProducts(category) {
  const descendantIds = getCategoryDescendantIds(category.id);
  return products.filter((product) => descendantIds.includes(product.categoryId));
}

export function getProductByCategoryAndSlug(categorySlug, productSlug) {
  const category = getCategoryBySlug(categorySlug);
  const product = productsBySlug.get(productSlug) || null;
  if (!category || !product) return null;
  const descendantIds = getCategoryDescendantIds(category.id);
  if (!descendantIds.includes(product.categoryId)) return null;
  return {
    category,
    product,
  };
}

export function getProductById(productId) {
  return productsById.get(productId) || null;
}

export function getProductReviews(productId) {
  return (reviewsByProductId.get(productId) || []).slice();
}

export function getProductCatalogPath(product) {
  const categorySlug = product?.categorySlug || getCategoryById(product?.categoryId)?.slug || "";
  return `${CATALOG_BASE_PATH}${categorySlug}/${product.slug}/`;
}

export function summarizeReviewStats(items) {
  const total = items.length;
  const average = total ? Number((items.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(1)) : 0;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: items.filter((item) => item.rating === rating).length,
    percent: total ? Math.round((items.filter((item) => item.rating === rating).length / total) * 100) : 0,
  }));
  return { total, average, distribution };
}

export function sortReviews(items, sortValue) {
  const list = items.slice();
  switch (sortValue) {
    case "oldest":
      return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case "useful":
      return list.sort((a, b) => (b.helpful || 0) - (a.helpful || 0));
    case "positive":
      return list.sort((a, b) => b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt));
    case "negative":
      return list.sort((a, b) => a.rating - b.rating || new Date(b.createdAt) - new Date(a.createdAt));
    case "newest":
    default:
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

export function getTopCategoryForCategory(category) {
  const ancestors = getCategoryAncestors(category);
  return ancestors[0] || category;
}

export function getSiblingTopCategories(category) {
  const topCategory = getTopCategoryForCategory(category);
  return getTopCategories().map((item) => ({
    ...item,
    active: item.id === topCategory.id,
  }));
}

function normalizeSort(value) {
  return SORT_OPTIONS.some((item) => item.value === value) ? value : "popularity-desc";
}

function normalizeDisplay(value) {
  return DISPLAY_OPTIONS.some((item) => item.value === value) ? value : "grid";
}

function parseListParam(value) {
  if (!value) return [];
  return value.split(",").map((item) => decodeURIComponent(item.trim())).filter(Boolean);
}

export function parseCategorySearchParams(searchParams) {
  const price = searchParams.get("price") || "";
  const [minRaw, maxRaw] = price.split("-");
  const priceMin = Number.isFinite(Number(minRaw)) && minRaw !== "" ? Number(minRaw) : null;
  const priceMax = Number.isFinite(Number(maxRaw)) && maxRaw !== "" ? Number(maxRaw) : null;
  const attributes = {};
  Array.from(searchParams.entries()).forEach(([key, value]) => {
    if (key.startsWith("f_")) {
      attributes[key.slice(2)] = parseListParam(value);
    }
  });
  return {
    sort: normalizeSort(searchParams.get("sort") || "popularity-desc"),
    display: normalizeDisplay(searchParams.get("display") || "grid"),
    page: Math.max(Number(searchParams.get("page") || "1") || 1, 1),
    priceMin,
    priceMax,
    stockStatuses: parseListParam(searchParams.get("stock")),
    badges: parseListParam(searchParams.get("badges")),
    attributes,
  };
}

export function categoryStateToSearchParams(state) {
  const params = new URLSearchParams();
  if (state.sort && state.sort !== "popularity-desc") params.set("sort", state.sort);
  if (state.display && state.display !== "grid") params.set("display", state.display);
  if (state.page && state.page !== 1) params.set("page", String(state.page));
  if (state.priceMin !== null || state.priceMax !== null) {
    params.set("price", `${state.priceMin ?? ""}-${state.priceMax ?? ""}`);
  }
  if (state.stockStatuses?.length) params.set("stock", state.stockStatuses.join(","));
  if (state.badges?.length) params.set("badges", state.badges.join(","));
  Object.entries(state.attributes || {}).forEach(([key, values]) => {
    if (values.length) params.set(`f_${key}`, values.join(","));
  });
  return params;
}

export function countSelectedFilters(state) {
  let total = 0;
  if (state.priceMin !== null || state.priceMax !== null) total += 1;
  total += (state.stockStatuses || []).length;
  total += (state.badges || []).length;
  total += Object.values(state.attributes || {}).reduce((sum, values) => sum + values.length, 0);
  return total;
}

function matchesAttribute(product, key, selectedValues) {
  if (!selectedValues.length) return true;
  const matchedAttribute = product.attributes.find((attribute) => attribute.key === key);
  if (!matchedAttribute) return false;
  return selectedValues.includes(matchedAttribute.value);
}

export function filterProducts(items, state) {
  return items.filter((product) => {
    if (state.priceMin !== null && product.price < state.priceMin) return false;
    if (state.priceMax !== null && product.price > state.priceMax) return false;
    if (state.stockStatuses.length && !state.stockStatuses.includes(product.stockStatus)) return false;
    if (state.badges.length && !state.badges.every((badge) => product.badges.includes(badge))) return false;
    return Object.entries(state.attributes).every(([key, values]) => matchesAttribute(product, key, values));
  });
}

export function sortProducts(items, sortValue) {
  const list = items.slice();
  switch (sortValue) {
    case "popularity-asc":
      return list.sort((a, b) => a.popularity - b.popularity);
    case "alphabet-desc":
      return list.sort((a, b) => b.name.localeCompare(a.name, "ru"));
    case "alphabet-asc":
      return list.sort((a, b) => a.name.localeCompare(b.name, "ru"));
    case "price-desc":
      return list.sort((a, b) => b.price - a.price);
    case "price-asc":
      return list.sort((a, b) => a.price - b.price);
    case "popularity-desc":
    default:
      return list.sort((a, b) => b.popularity - a.popularity);
  }
}

export function paginateProducts(items, page, pageSize = DEFAULT_PAGE_SIZE) {
  const totalPages = Math.max(Math.ceil(items.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
    pageSize,
    totalItems: items.length,
  };
}

export function buildFacetData(items) {
  const attributeMap = new Map();
  const stockMap = new Map();
  const badgeMap = new Map();
  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;

  items.forEach((product) => {
    minPrice = Math.min(minPrice, product.price);
    maxPrice = Math.max(maxPrice, product.price);
    stockMap.set(product.stockStatus, (stockMap.get(product.stockStatus) || 0) + 1);
    product.badges.forEach((badge) => badgeMap.set(badge, (badgeMap.get(badge) || 0) + 1));
    product.attributes.forEach((attribute) => {
      if (attribute.filterable === false) return;
      if (!attributeMap.has(attribute.key)) {
        attributeMap.set(attribute.key, {
          key: attribute.key,
          label: attribute.label,
          group: attribute.group,
          values: new Map(),
        });
      }
      const bucket = attributeMap.get(attribute.key);
      bucket.values.set(attribute.value, (bucket.values.get(attribute.value) || 0) + 1);
    });
  });

  return {
    price: {
      min: Number.isFinite(minPrice) ? minPrice : 0,
      max: maxPrice,
    },
    stock: Array.from(stockMap.entries()).map(([value, count]) => ({
      value,
      label: STOCK_META[value]?.label || value,
      count,
    })),
    badges: Array.from(badgeMap.entries()).map(([value, count]) => ({
      value,
      label: BADGE_META[value]?.label || value,
      count,
    })),
    attributes: Array.from(attributeMap.values())
      .map((attribute) => ({
        key: attribute.key,
        label: attribute.label,
        group: attribute.group,
        values: Array.from(attribute.values.entries()).map(([value, count]) => ({
          value,
          count,
        })),
      }))
      .sort((a, b) => `${a.group}-${a.label}`.localeCompare(`${b.group}-${b.label}`, "ru")),
  };
}

export function getCategoryPageData(categorySlug, searchParams = new URLSearchParams()) {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return null;
  const productsForCategory = getCategoryProducts(category);
  const applied = parseCategorySearchParams(searchParams);
  const filtered = sortProducts(filterProducts(productsForCategory, applied), applied.sort);
  const pagination = paginateProducts(filtered, applied.page);
  const draft = JSON.parse(JSON.stringify(applied));
  return {
    category,
    breadcrumbs: getCategoryBreadcrumbs(category),
    children: getChildCategories(category.id),
    siblings: getSiblingTopCategories(category),
    products: productsForCategory,
    filteredProducts: filtered,
    pageItems: pagination.items,
    pagination,
    applied,
    draft,
    facets: buildFacetData(productsForCategory),
    selectedFilterCount: countSelectedFilters(applied),
  };
}

export function getLandingPageData() {
  return {
    breadcrumbs: [
      { label: "Главная", href: "/" },
      { label: "Каталог", href: CATALOG_BASE_PATH },
    ],
    categories: getTopCategories(),
  };
}

export function getProductPageData(categorySlug, productSlug) {
  const result = getProductByCategoryAndSlug(categorySlug, productSlug);
  if (!result) return null;
  const { category, product } = result;
  const productReviews = getProductReviews(product.id);
  return {
    category,
    product,
    breadcrumbs: getProductBreadcrumbs(product, category),
    reviews: sortReviews(productReviews, "newest"),
    reviewStats: summarizeReviewStats(productReviews),
    relatedProducts: getCategoryProducts(category)
      .filter((item) => item.id !== product.id)
      .slice(0, 4),
  };
}

export function getSearchResults(query, scope = "catalog") {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return {
      categories: [],
      products: [],
      siteLinks: [],
    };
  }
  const categoryResults = categories.filter((category) =>
    `${category.name} ${category.description}`.toLowerCase().includes(normalized)
  );
  const productResults = products
    .filter((product) => `${product.name} ${product.article} ${product.shortDescription}`.toLowerCase().includes(normalized))
    .map((product) => ({
      ...product,
      categorySlug: product.categorySlug || getCategoryById(product.categoryId)?.slug || "",
    }));
  const siteLinks =
    scope === "site"
      ? CATALOG_META.siteLinks.filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(normalized))
      : [];
  return {
    categories: categoryResults.slice(0, 6),
    products: productResults.slice(0, 8),
    siteLinks,
  };
}

export function getCanonicalPath(route) {
  if (route.type === "landing") return CATALOG_BASE_PATH;
  if (route.type === "category") return `${CATALOG_BASE_PATH}${route.categorySlug}/`;
  if (route.type === "product") return `${CATALOG_BASE_PATH}${route.categorySlug}/${route.productSlug}/`;
  return CATALOG_BASE_PATH;
}

export function buildCategoryMeta(category) {
  return {
    title: `${category.seo.title} — Klubnika Project`,
    description: category.seo.description,
    canonical: `${SITE_ORIGIN}${CATALOG_BASE_PATH}${category.slug}/`,
    ogImage: category.image,
  };
}

export function buildLandingMeta() {
  return {
    title: "Каталог для клубничной фермы — Klubnika Project",
    description:
      "Каталог Klubnika Project помогает быстро перейти в нужную категорию, проверить наличие и собрать закупку для клубничной фермы без пустой витринной подачи.",
    canonical: `${SITE_ORIGIN}${CATALOG_BASE_PATH}`,
    ogImage: "assets/photos/optimized/greenhouse-rack.webp",
  };
}

export function buildProductMeta(category, product) {
  return {
    title: `${product.name} — ${category.name} — Klubnika Project`,
    description: product.shortDescription,
    canonical: `${SITE_ORIGIN}${CATALOG_BASE_PATH}${category.slug}/${product.slug}/`,
    ogImage: product.images[0],
  };
}

export function buildBreadcrumbListJsonLd(breadcrumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: `${SITE_ORIGIN}${crumb.href}`,
    })),
  };
}

export function buildProductJsonLd(category, product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.article,
    category: category.name,
    description: product.shortDescription,
    image: product.images.map((path) => `${SITE_ORIGIN}/${path}`.replace(/([^:]\/)\/+/g, "$1")),
    brand: {
      "@type": "Brand",
      name: "Klubnika Project",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: product.price,
      availability:
        product.stockStatus === "out_of_stock"
          ? "https://schema.org/OutOfStock"
          : product.stockStatus === "preorder"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/InStock",
      url: `${SITE_ORIGIN}${CATALOG_BASE_PATH}${category.slug}/${product.slug}/`,
    },
    aggregateRating:
      product.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          }
        : undefined,
  };
}

export function createDefaultCategoryDraft(searchParams = new URLSearchParams()) {
  return parseCategorySearchParams(searchParams);
}
