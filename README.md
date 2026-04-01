# KlubnikaProject

Отдельная рабочая папка под новый сайт `KlubnikaProject`.

База взята из актуального прототипа `klubnika-sprint1`, но вынесена в отдельный каталог без старого `.git`, чтобы дальше вести проект отдельно.

## Что внутри

- `index.html` — главная как маршрутизатор спроса
- `farm/index.html` — сценарий расчёта фермы
- `study/index.html` — сценарий консультаций и сопровождения
- `shop/index.html` — магазин как каталог решений
- `seeds/index.html` — раздел посадочного материала
- `styles.css` — общая дизайн-система
- `docs/strategy-brief.md` — рабочий CRO/UX-бриф по новой версии
- `docs/brand-ui-visual-guide.md` — опорная visual/UI-инструкция по бренду, сайту и адаптации
- `docs/brand-ui-visual-guide.pdf` — экспорт этой инструкции в PDF
- `docs/klubnikaproject-brandbook-project.pdf` — визуальный брендбук в формате проектного документа
- `docs/catalog-cro-prompt.md` — рабочий prompt-стандарт для category/product pages
- `calc/index.html` — новый калькулятор фермы
- `calc/pricing.json` — цены и расчётные константы калькулятора
- `calc/admin/index.html` — внутренняя страница редактирования draft-цен с экспортом JSON

## Локальный запуск

```bash
cd /Users/ilapatiev/klubnikaproject
python3 -m http.server 8011 --bind 127.0.0.1
```

После запуска:

`http://127.0.0.1:8011/`

Дополнительно:

- `http://127.0.0.1:8011/calc/`
- `http://127.0.0.1:8011/calc/admin/`

## PDF бренд-гайда

Пересобрать PDF из markdown-источника:

```bash
/Users/ilapatiev/klubnikaproject/.venv-brandpdf/bin/python \
  /Users/ilapatiev/klubnikaproject/scripts/build-brand-guide-pdf.py
```

Пересобрать визуальный проектный брендбук:

```bash
/Users/ilapatiev/klubnikaproject/.venv-brandpdf/bin/python \
  /Users/ilapatiev/klubnikaproject/scripts/build-brandbook-project-pdf.py
```

## SEO / GEO пакет

В проект добавлен технический SEO/GEO-пакет. Это не разовая заметка, а рабочая поддержка сайта в коде.

Что входит:

- `scripts/build-seo.mjs` — обновляет `canonical`, `robots`, JSON-LD и нормализует бренд в `<title>`
- `robots.txt` — закрывает служебные разделы и публикует sitemap
- `sitemap.xml` — собирается автоматически из индексируемых HTML-страниц
- этот `README.md` — короткая инструкция по поддержке

Запуск:

```bash
cd /Users/ilapatiev/klubnikaproject
node scripts/build-seo.mjs
```

Что делает пакет:

- ставит `canonical` на все индексируемые HTML-страницы
- добавляет `robots`-meta
- закрывает служебные разделы от индексации, включая `calc/admin/`
- генерирует JSON-LD по типу страницы: `WebPage`, `Organization`, `WebSite`, `BreadcrumbList`, `Product`, `FAQPage`
- пересобирает `sitemap.xml`
- нормализует бренд в `<title>` под `Klubnika Project`

Примеры уже в проекте:

- главная: `index.html`
- продуктовая карточка: `shop/products/led-300wt/index.html`
- админка с `noindex`: `calc/admin/index.html`

Когда запускать:

- после добавления новых страниц
- после переименования URL или разделов
- после изменений в логике индексации

Текущее состояние на сегодня:

- обработано `46` HTML-страниц
- в `sitemap.xml` входит `43` публичных URL
- служебные разделы выведены из индексации

Полезные ориентиры по поддержке:

- Google Search Central: SEO Starter Guide
- Google Search Central: canonical / duplicate URLs
- Google Search Central: site names
- Google Search Central: AI features

## Рабочая логика проекта

Новая структура сайта строится вокруг трёх основных сценариев:

1. `Расчёт фермы`
2. `Магазин / подбор оборудования`
3. `Консультации / сопровождение`

Главная не должна продавать всё сразу. Её задача — быстро отправить пользователя в правильный сценарий.

## Следующий этап

- добить главную под финальный CRO-проход
- переработать `/shop` и категории глубже под e-commerce логику
- подключить реальные формы и каналы отправки
- подвязать `pricing.json` к настоящей админке или API-сохранению
