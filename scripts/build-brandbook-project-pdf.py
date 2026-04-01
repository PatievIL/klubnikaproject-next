from __future__ import annotations

import math
import subprocess
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle


ROOT = Path("/Users/ilapatiev/klubnikaproject")
OUT = ROOT / "docs" / "klubnikaproject-brandbook-project.pdf"
CACHE = ROOT / "docs" / ".brandbook-cache"
CACHE.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

GREEN = colors.HexColor("#004D2B")
GREEN_2 = colors.HexColor("#0F653E")
ACCENT = colors.HexColor("#FFD5A0")
CREAM = colors.HexColor("#F5ECDF")
CREAM_2 = colors.HexColor("#FBF4E8")
CREAM_3 = colors.HexColor("#FFF8F0")
TEXT = colors.HexColor("#153224")
MUTED = colors.HexColor("#586359")
LINE = colors.HexColor("#D9C8B0")
WHITE = colors.white
BURGUNDY = colors.HexColor("#7D3B36")
LIGHT_GRAY = colors.HexColor("#E6E5E1")

PAGE_W = 1600
PAGE_H = 900
LEFT_W = 520
MARGIN = 64


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("BrandArial", FONT_REGULAR))
    pdfmetrics.registerFont(TTFont("BrandArial-Bold", FONT_BOLD))


H1 = ParagraphStyle(
    "H1",
    fontName="BrandArial-Bold",
    fontSize=42,
    leading=46,
    textColor=TEXT,
)
H2 = ParagraphStyle(
    "H2",
    fontName="BrandArial-Bold",
    fontSize=18,
    leading=22,
    textColor=TEXT,
)
BODY = ParagraphStyle(
    "Body",
    fontName="BrandArial",
    fontSize=15.5,
    leading=22,
    textColor=TEXT,
)
SMALL = ParagraphStyle(
    "Small",
    fontName="BrandArial",
    fontSize=11,
    leading=15,
    textColor=MUTED,
)
BIG_WORD = ParagraphStyle(
    "BigWord",
    fontName="BrandArial-Bold",
    fontSize=38,
    leading=40,
    textColor=TEXT,
)
UI_LABEL = ParagraphStyle(
    "UILabel",
    fontName="BrandArial-Bold",
    fontSize=13,
    leading=15,
    textColor=TEXT,
)


def ensure_preview(svg_name: str, size: int = 1800) -> Path:
    src = ROOT / "assets" / svg_name
    out = CACHE / f"{svg_name}.png"
    if out.exists():
        postprocess_preview(out)
        return out
    subprocess.run(
        ["qlmanage", "-t", "-s", str(size), "-o", str(CACHE), str(src)],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    generated = CACHE / f"{svg_name}.png"
    if generated.exists():
        postprocess_preview(generated)
        return generated
    quicklook = CACHE / f"{svg_name}.svg.png"
    if quicklook.exists():
        quicklook.rename(out)
        postprocess_preview(out)
        return out
    raise FileNotFoundError(f"Could not render preview for {svg_name}")


def postprocess_preview(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 248 and g > 248 and b > 248:
                px[x, y] = (255, 255, 255, 0)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(path)


def photo(name: str) -> Path:
    return ROOT / "assets" / "photos" / "optimized" / name


def p(c: canvas.Canvas, text: str, style: ParagraphStyle, x: float, top: float, width: float) -> float:
    para = Paragraph(text, style)
    w, h = para.wrap(width, PAGE_H)
    para.drawOn(c, x, top - h)
    return top - h


def bullets(c: canvas.Canvas, items: list[str], x: float, top: float, width: float, gap: float = 10) -> float:
    y = top
    for item in items:
        c.setFillColor(ACCENT)
        c.circle(x + 6, y - 10, 4, fill=1, stroke=0)
        y = p(c, item, BODY, x + 20, y, width - 20)
        y -= gap
    return y


def page_num(c: canvas.Canvas, n: int):
    c.setFont("BrandArial", 12)
    c.setFillColor(MUTED)
    c.drawRightString(PAGE_W - 36, 28, str(n))


def split_page(c: canvas.Canvas, n: int, section: str, title: str, body: list[str], bullets_list: list[str] | None = None):
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(CREAM)
    c.rect(0, 0, LEFT_W, PAGE_H, fill=1, stroke=0)

    c.setFillColor(MUTED)
    c.setFont("BrandArial", 11)
    c.drawString(MARGIN, PAGE_H - 34, section)

    y = PAGE_H - 120
    y = p(c, title, H1, MARGIN, y, LEFT_W - 2 * MARGIN)
    y -= 26
    for para in body:
        y = p(c, para, BODY, MARGIN, y, LEFT_W - 2 * MARGIN)
        y -= 14
    if bullets_list:
        y -= 4
        bullets(c, bullets_list, MARGIN, y, LEFT_W - 2 * MARGIN)
    page_num(c, n)


def draw_image_cover(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float):
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    ox = x + (w - dw) / 2
    oy = y + (h - dh) / 2
    c.drawImage(img, ox, oy, dw, dh, mask="auto")


def draw_lockup(c: canvas.Canvas, path: Path, x: float, y: float, w: float):
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    h = w * ih / iw
    c.drawImage(img, x, y, w, h, mask="auto")


def draw_contents(c: canvas.Canvas, n: int):
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFont("BrandArial-Bold", 48)
    c.setFillColor(GREEN)
    c.drawString(88, PAGE_H - 92, "СОДЕРЖАНИЕ")

    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.line(88, PAGE_H - 118, PAGE_W - 88, PAGE_H - 118)

    left = [
        ("Введение", "3"),
        ("Характер бренда", "4"),
        ("Логотип", "5"),
        ("Версии логотипа", "6"),
        ("Логотип на фоне", "7"),
        ("Цветовая система", "8"),
        ("Типографика", "9"),
        ("Фирменные элементы", "10"),
    ]
    right = [
        ("Фотостиль", "11"),
        ("Композиция", "12"),
        ("Сайт", "13"),
        ("UI-система", "14"),
        ("Адаптация", "15"),
        ("Структура страниц", "16"),
        ("Чек-лист", "17"),
        ("Исходники", "18"),
    ]

    def draw_col(items, x, top):
        y = top
        for title, num in items:
            c.setFont("BrandArial", 18)
            c.setFillColor(TEXT)
            c.drawString(x, y, title)
            c.drawRightString(x + 560, y, num)
            c.setStrokeColor(LINE)
            c.line(x, y - 16, x + 560, y - 16)
            y -= 54

    draw_col(left, 88, PAGE_H - 190)
    draw_col(right, 830, PAGE_H - 190)
    page_num(c, n)


def draw_cover(c: canvas.Canvas, n: int, lockup: Path):
    c.setFillColor(GREEN)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(0, 0, PAGE_W, 16, fill=1, stroke=0)

    c.setFillColor(ACCENT)
    c.setFont("BrandArial", 14)
    c.drawString(56, PAGE_H - 48, "РУКОВОДСТВО ПО ИСПОЛЬЗОВАНИЮ")
    c.drawString(56, PAGE_H - 72, "ФИРМЕННОГО СТИЛЯ")

    draw_lockup(c, lockup, 470, 325, 660)

    c.setFillColor(CREAM)
    c.setFont("BrandArial-Bold", 64)
    c.drawString(56, 126, "KlubnikaProject")
    c.setFont("BrandArial", 26)
    c.drawString(56, 88, "Digital brandbook / UI system / adaptation guide")
    page_num(c, n)


def draw_section_break(c: canvas.Canvas, n: int, title: str, code: str):
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFont("BrandArial-Bold", 96)
    c.setFillColor(TEXT)
    c.drawString(90, PAGE_H / 2 + 30, title)
    c.setFont("BrandArial-Bold", 74)
    c.setFillColor(GREEN)
    c.drawString(92, PAGE_H / 2 - 52, code)
    page_num(c, n)


def draw_logo_page(c: canvas.Canvas, n: int, lockup_beige: Path):
    split_page(
        c,
        n,
        "01 / Логотип",
        "Основная версия",
        [
            "Логотип — главный идентификатор проекта. В цифровых сценариях он используется как опорный брендовый элемент, а не как декоративная маркировка.",
            "Основная версия логотипа применяется по умолчанию: в хедере, на первых экранах, в баннерах и в структурных брендовых блоках.",
        ],
        ["Не пересобирать логотип из текста и знака.", "Не менять пропорции, цвет и композицию."],
    )
    c.setFillColor(GREEN)
    c.rect(LEFT_W, 0, PAGE_W - LEFT_W, PAGE_H, fill=1, stroke=0)
    draw_lockup(c, lockup_beige, LEFT_W + 220, 345, 580)


def draw_logo_versions(c: canvas.Canvas, n: int, lockup_green: Path, berry_green: Path):
    split_page(
        c,
        n,
        "01 / Логотип",
        "Версии логотипа",
        [
            "В системе используются две версии: основная и компактная. Основная используется везде, где есть место для полноценного lockup.",
            "Компактный знак используется только в малых UI-зонах: favicon, app icon, микрологотипы и узкие интерфейсные состояния.",
        ],
    )
    c.setFillColor(WHITE)
    c.rect(LEFT_W, 0, PAGE_W - LEFT_W, PAGE_H, fill=1, stroke=0)
    c.roundRect(620, 470, 820, 220, 24, stroke=1, fill=0)
    draw_lockup(c, lockup_green, 725, 535, 560)
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 16)
    c.drawString(650, 486, "Основная версия")

    c.setFillColor(GREEN)
    c.roundRect(760, 150, 220, 220, 36, stroke=0, fill=1)
    draw_lockup(c, berry_green, 810, 200, 120)
    c.setFillColor(TEXT)
    c.setFont("BrandArial", 16)
    c.drawString(1020, 258, "Компактная версия")
    c.setFillColor(MUTED)
    c.drawString(1020, 232, "Иконки, favicon, малые UI-состояния")


def draw_backgrounds_page(c: canvas.Canvas, n: int, lockup_green: Path, lockup_beige: Path):
    split_page(
        c,
        n,
        "01 / Логотип",
        "Логотип на фоне",
        [
            "На светлых фонах используется зеленая версия логотипа. На темных и насыщенных фонах — бежевая.",
            "Если фон сложный, логотип переносится в спокойную зону либо получает подложку. Приоритет всегда у читаемости.",
        ],
    )
    cells = [
        (LEFT_W + 60, 470, 430, 250, GREEN, lockup_beige),
        (LEFT_W + 520, 470, 430, 250, CREAM, lockup_green),
        (LEFT_W + 60, 170, 430, 250, LIGHT_GRAY, lockup_green),
        (LEFT_W + 520, 170, 430, 250, BURGUNDY, lockup_beige),
    ]
    for x, y, w, h, bg, asset in cells:
        c.setFillColor(bg)
        c.rect(x, y, w, h, fill=1, stroke=0)
        draw_lockup(c, asset, x + 88, y + 88, 250)


def draw_colors_page(c: canvas.Canvas, n: int):
    split_page(
        c,
        n,
        "02 / Базовая система",
        "Цветовая система",
        [
            "Сайт держится на трех опорных цветах: темно-зеленый, теплый бежевый и светлый фоновый.",
            "Зеленый отвечает за структуру и действия. Бежевый работает как теплый акцент. Светлый тон держит воздух и чистоту интерфейса.",
        ],
    )
    swatches = [
        (ACCENT, "Акцент", "RGB 255 213 160", "HEX #FFD5A0", "CMYK 0 17 40 0"),
        (GREEN, "Системный", "RGB 0 77 43", "HEX #004D2B", "CMYK 100 25 90 55"),
        (CREAM, "Фон", "RGB 245 236 223", "HEX #F5ECDF", "CMYK 3 5 10 0"),
    ]
    y = 610
    for fill, name, l1, l2, l3 in swatches:
        c.setFillColor(fill)
        c.rect(LEFT_W + 48, y, PAGE_W - LEFT_W - 96, 150, fill=1, stroke=0)
        c.setFillColor(TEXT if fill != GREEN else CREAM)
        c.setFont("BrandArial-Bold", 20)
        c.drawString(LEFT_W + 88, y + 96, name)
        c.setFont("BrandArial", 16)
        c.drawString(PAGE_W - 360, y + 100, l1)
        c.drawString(PAGE_W - 360, y + 72, l2)
        c.drawString(PAGE_W - 360, y + 44, l3)
        y -= 184


def draw_typography_page(c: canvas.Canvas, n: int):
    split_page(
        c,
        n,
        "02 / Базовая система",
        "Типографика",
        [
            "Основная гарнитура проекта — Exo 2. Она уже используется в коде сайта и должна оставаться базовой для всех экранов и новых интерфейсных блоков.",
            "Тон набора: плотный, спокойный, без декоративных эффектов. Заголовки крупные и собранные, основной текст короткими абзацами.",
        ],
        ["Заголовки: плотные, крупные, с минимальным шумом.", "Основной текст: всегда про читаемость, а не про декоративность."],
    )
    c.setFillColor(WHITE)
    c.rect(LEFT_W, 0, PAGE_W - LEFT_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 56)
    c.drawString(620, 690, "Клубничная ферма:")
    c.drawString(620, 625, "расчёт, комплектация")
    c.drawString(620, 560, "и запуск в одной логике")
    c.setFont("BrandArial-Bold", 28)
    c.drawString(620, 458, "Подзаголовок / Medium")
    c.setFont("BrandArial", 18)
    text = (
        "Основной текст не должен быть рыхлым или слишком длинным. "
        "Его задача — быстро объяснять смысл, а не заполнять экран."
    )
    c.drawString(620, 405, text)
    c.setFont("BrandArial", 16)
    c.setFillColor(MUTED)
    c.drawString(620, 352, "Подпись / supporting text / UI note")


def draw_elements_page(c: canvas.Canvas, n: int, berry_green: Path, berry_beige: Path):
    split_page(
        c,
        n,
        "02 / Базовая система",
        "Фирменные элементы",
        [
            "Главная фирменная форма — ягода из логотипа. Она используется как акцентный модуль, контейнер, иконка или фоновая геометрия.",
            "Эти элементы должны усиливать структуру интерфейса, а не превращать экран в декоративный коллаж.",
        ],
    )
    c.setFillColor(GREEN)
    c.rect(LEFT_W, 0, PAGE_W - LEFT_W, PAGE_H, fill=1, stroke=0)
    draw_lockup(c, berry_beige, 960, 520, 210)
    draw_lockup(c, berry_beige, 760, 220, 110)
    draw_lockup(c, berry_beige, 965, 205, 120)
    draw_lockup(c, berry_beige, 1185, 220, 110)
    c.setFillColor(ACCENT)
    c.circle(760, 510, 10, fill=1, stroke=0)


def draw_photos_page(c: canvas.Canvas, n: int):
    split_page(
        c,
        n,
        "03 / Визуальный контент",
        "Фотостиль",
        [
            "Фото — это доказательная часть бренда. Приоритет у реальной ягоды, тепличной среды, рук, стеллажей, света, полива и контролируемого процесса.",
            "Нельзя уходить в дачную стилистику, холодную стоковость или переобработанный агромаркетинг.",
        ],
        ["Подходят: реальный продукт, controlled environment, чистая фактура.", "Не подходят: шумные, случайные, серо-синие или пафосные фото."],
    )
    x = LEFT_W + 24
    y = 456
    w = 510
    h = 380
    draw_image_cover(c, photo("berry-red.webp"), x, y, w, h)
    draw_image_cover(c, photo("greenhouse-rack.webp"), x + 530, y, w, h)
    draw_image_cover(c, photo("berry-close.webp"), x, 38, w, 380)
    draw_image_cover(c, photo("hero-process.webp"), x + 530, 38, w, 380)


def draw_composition_page(c: canvas.Canvas, n: int, lockup_green: Path):
    split_page(
        c,
        n,
        "03 / Визуальный контент",
        "Композиция и верстка",
        [
            "На широких экранах логика почти всегда одна: смысл слева, доминирующий визуал справа. Ниже — понятный следующий шаг.",
            "В одном блоке не должно быть нескольких равных акцентов. Если экран перегружен, сначала убирается вторичное, а не уменьшается всё сразу.",
        ],
    )
    c.setStrokeColor(colors.HexColor("#D2C3AE"))
    c.setLineWidth(2)
    frames = [
        (650, 470, 340, 200),
        (1030, 470, 420, 280),
        (650, 170, 420, 220),
        (1110, 170, 300, 250),
    ]
    for x, y, w, h in frames:
        c.roundRect(x, y, w, h, 20, stroke=1, fill=0)
        c.setStrokeColor(colors.HexColor("#E6DAC9"))
        c.line(x + 28, y + h - 46, x + w - 28, y + h - 46)
        c.setStrokeColor(colors.HexColor("#D2C3AE"))
        c.rect(x + 26, y + 26, 90, 18, stroke=1, fill=0)
        c.rect(x + w - 160, y + 32, 130, h - 86, stroke=1, fill=0)
    draw_lockup(c, lockup_green, 710, 602, 120)


def draw_site_page(c: canvas.Canvas, n: int, lockup_beige: Path):
    split_page(
        c,
        n,
        "04 / Сайт",
        "Первый экран сайта",
        [
            "Hero не должен быть одновременно каталогом, презентацией и FAQ. На первом экране должен быть один сильный смысл, короткий лид и максимум два CTA.",
            "Визуал справа усиливает сообщение, а не конкурирует с ним. Ниже пользователь должен видеть понятный маршрут: расчёт, магазин или сопровождение.",
        ],
    )
    x, y, w, h = 585, 92, 945, 700
    c.setFillColor(CREAM_3)
    c.roundRect(x, y, w, h, 28, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.roundRect(x + 26, y + h - 118, w - 52, 92, 22, fill=1, stroke=0)
    draw_lockup(c, lockup_beige, x + 42, y + h - 92, 180)
    c.setFillColor(CREAM)
    c.setFont("BrandArial", 16)
    c.drawString(x + 560, y + h - 68, "Главная")
    c.drawString(x + 660, y + h - 68, "Решения")
    c.drawString(x + 790, y + h - 68, "Каталог")
    c.drawString(x + 910, y + h - 68, "Калькулятор")
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 42)
    c.drawString(x + 40, y + 484, "Клубничная ферма:")
    c.drawString(x + 40, y + 434, "расчёт, комплектация")
    c.drawString(x + 40, y + 384, "и запуск в одной логике")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 18)
    c.drawString(x + 40, y + 334, "Сначала маршрут пользователя, потом каталог и действия.")
    c.setFillColor(GREEN)
    c.roundRect(x + 40, y + 258, 220, 54, 15, fill=1, stroke=0)
    c.setFillColor(CREAM)
    c.setFont("BrandArial-Bold", 17)
    c.drawCentredString(x + 150, y + 278, "Рассчитать ферму")
    c.setFillColor(WHITE)
    draw_image_cover(c, photo("greenhouse-rack.webp"), x + 520, y + 220, 370, 350)
    draw_image_cover(c, photo("berry-red.webp"), x + 736, y + 110, 160, 150)


def draw_ui_page(c: canvas.Canvas, n: int):
    split_page(
        c,
        n,
        "04 / Сайт",
        "UI-система",
        [
            "Интерфейс не должен выглядеть как чужой шаблон. Его задача — продолжать бренд: светлая база, точные акценты, аккуратные радиусы и спокойная глубина.",
            "Кнопки, карточки, формы и бейджи собираются в единую систему. Главное правило — ясность и ровный ритм.",
        ],
    )
    x = 610
    c.setFillColor(CREAM_2)
    c.roundRect(x, 560, 220, 64, 16, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.roundRect(x + 240, 560, 240, 64, 16, fill=1, stroke=0)
    c.setFillColor(CREAM)
    c.roundRect(x + 500, 560, 210, 64, 16, fill=1, stroke=0)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 17)
    c.drawCentredString(x + 110, 584, "Secondary")
    c.setFillColor(CREAM)
    c.drawCentredString(x + 360, 584, "Primary")
    c.setFillColor(GREEN)
    c.drawCentredString(x + 605, 584, "Accent")

    c.setFillColor(WHITE)
    c.roundRect(x, 330, 420, 170, 24, fill=1, stroke=1)
    c.roundRect(x + 450, 330, 420, 170, 24, fill=1, stroke=1)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 22)
    c.drawString(x + 28, 455, "Карточка сценария")
    c.drawString(x + 478, 455, "Форма / поле ввода")
    c.setFont("BrandArial", 15)
    c.drawString(x + 28, 420, "Чистая структура, короткий текст, один outcome и одно действие.")
    c.setStrokeColor(LINE)
    c.roundRect(x + 478, 378, 360, 46, 12, fill=0, stroke=1)
    c.setFillColor(MUTED)
    c.drawString(x + 498, 394, "Введите параметры фермы")

    c.setFillColor(colors.HexColor("#EEF4EF"))
    for i, label in enumerate(["Tag", "Badge", "Filter"]):
        xx = x + i * 138
        c.roundRect(xx, 230, 118, 42, 21, fill=1, stroke=0)
        c.setFillColor(GREEN)
        c.setFont("BrandArial-Bold", 14)
        c.drawCentredString(xx + 59, 245, label)
        c.setFillColor(colors.HexColor("#EEF4EF"))


def draw_adaptation_page(c: canvas.Canvas, n: int):
    split_page(
        c,
        n,
        "04 / Сайт",
        "Адаптация",
        [
            "При уменьшении экрана не нужно механически сжимать desktop-layout. Структура должна упрощаться: сначала смысл, затем визуал, потом вторичные элементы.",
            "Mobile-first для проекта означает не минимализм ради минимализма, а сохранение маршрута, CTA и читаемости на узком экране.",
        ],
        ["Сначала убирать вторичную декоративность.", "Не оставлять lockup слишком мелким на мобильном."],
    )
    frames = [
        (640, 170, 500, 580, "Desktop"),
        (1185, 220, 240, 500, "Tablet"),
        (1450, 260, 110, 430, "Mobile"),
    ]
    for x, y, w, h, label in frames:
        c.setStrokeColor(colors.HexColor("#CDBDA4"))
        c.setLineWidth(2)
        c.roundRect(x, y, w, h, 24, fill=0, stroke=1)
        c.setFillColor(MUTED)
        c.setFont("BrandArial-Bold", 14)
        c.drawCentredString(x + w / 2, y - 24, label)
        c.setStrokeColor(colors.HexColor("#E5D7C5"))
        c.line(x + 24, y + h - 60, x + w - 24, y + h - 60)
        c.rect(x + 24, y + h - 44, 70, 12, stroke=1, fill=0)
        c.rect(x + 24, y + 24, w - 48, h - 110, stroke=1, fill=0)
        if w > 200:
            c.rect(x + w - 170, y + 40, 130, h - 150, stroke=1, fill=0)


def draw_page_structure(c: canvas.Canvas, n: int):
    split_page(
        c,
        n,
        "05 / Структура страниц",
        "Прикладная логика разделов",
        [
            "У каждой ключевой страницы должен быть свой визуальный режим. Главная — маршрутизатор, Farm — инженерный вход, Shop — утилитарный каталог, Calc — инструмент.",
            "Нельзя переносить один и тот же эмоциональный режим на все разделы сайта.",
        ],
    )
    cards = [
        ("Home", "Маршрутизатор сценариев", 610, 500),
        ("Farm", "Строже, инженернее, меньше декора", 1010, 500),
        ("Shop", "Категории, фильтры, утилитарность", 610, 250),
        ("Calc", "Инструмент, ясность, контраст", 1010, 250),
    ]
    for title, desc, x, y in cards:
        c.setFillColor(WHITE)
        c.roundRect(x, y, 330, 180, 24, fill=1, stroke=1)
        c.setFillColor(GREEN)
        c.setFont("BrandArial-Bold", 32)
        c.drawString(x + 28, y + 114, title)
        c.setFillColor(TEXT)
        c.setFont("BrandArial", 16)
        c.drawString(x + 28, y + 72, desc)


def draw_checklist_page(c: canvas.Canvas, n: int):
    split_page(
        c,
        n,
        "06 / Контроль",
        "Быстрая проверка экрана",
        [
            "Эта страница нужна не как теория, а как короткий контроль перед публикацией, передачей в дизайн или в верстку.",
        ],
    )
    items = [
        "Логотип стоит на контрастном фоне и не мелкий.",
        "Экран держится на одном главном акценте.",
        "Зеленый и бежевый работают по ролям, а не случайно.",
        "Текст можно быстро прочитать без визуальной усталости.",
        "Фото выглядит реальным и уместным для фермы.",
        "UI-компоненты собраны в одну систему.",
        "Мобильная версия не разваливает иерархию.",
        "CTA ведет к понятному следующему шагу.",
    ]
    x = 620
    y = 700
    for item in items:
        c.setFillColor(colors.HexColor("#EEF4EF"))
        c.roundRect(x, y - 22, 840, 52, 14, fill=1, stroke=0)
        c.setFillColor(GREEN)
        c.circle(x + 24, y + 4, 10, fill=1, stroke=0)
        c.setStrokeColor(CREAM)
        c.setLineWidth(2)
        c.line(x + 19, y + 4, x + 23, y)
        c.line(x + 23, y, x + 31, y + 10)
        c.setFillColor(TEXT)
        c.setFont("BrandArial", 16)
        c.drawString(x + 48, y - 2, item)
        y -= 72


def draw_sources_page(c: canvas.Canvas, n: int, berry_beige: Path):
    c.setFillColor(GREEN)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(0, 0, PAGE_W, 14, fill=1, stroke=0)
    draw_lockup(c, berry_beige, 670, 610, 120)
    c.setFillColor(CREAM)
    c.setFont("BrandArial-Bold", 46)
    c.drawCentredString(PAGE_W / 2, 500, "Исходники и рабочая база")
    c.setFont("BrandArial", 22)
    c.drawCentredString(PAGE_W / 2, 446, "styles.css, docs/brand-ui-visual-guide.md, assets/*.svg, assets/photos/*")
    c.drawCentredString(PAGE_W / 2, 402, "Новые визуальные решения сначала сверяются с этой системой, затем идут в код.")
    page_num(c, n)


def build():
    register_fonts()
    lockup_green = ensure_preview("brand-lockup-green.svg")
    lockup_beige = ensure_preview("brand-lockup-beige.svg")
    berry_green = ensure_preview("brand-berry-green.svg")
    berry_beige = ensure_preview("brand-berry-beige.svg")

    c = canvas.Canvas(str(OUT), pagesize=(PAGE_W, PAGE_H))
    pages = [
        lambda: draw_cover(c, 1, lockup_beige),
        lambda: draw_contents(c, 2),
        lambda: draw_section_break(c, 3, "БРЕНД И ОСНОВА", "01"),
        lambda: split_page(
            c,
            4,
            "01 / Основа",
            "Характер бренда",
            [
                "KlubnikaProject должен выглядеть не как агро-маркетинг и не как абстрактный tech-сервис. Это собранная рабочая система для клубничной фермы в controlled environment.",
                "Ключевые ощущения: свежесть, порядок, точность, спокойная уверенность, реальный продукт и взрослая визуальная логика.",
            ],
            ["Натуральность без деревенской стилистики.", "Технологичность без неона и псевдо-SaaS.", "Дороговизна через порядок, воздух и структуру."],
        ),
        lambda: draw_logo_page(c, 5, lockup_beige),
        lambda: draw_logo_versions(c, 6, lockup_green, berry_green),
        lambda: draw_backgrounds_page(c, 7, lockup_green, lockup_beige),
        lambda: draw_colors_page(c, 8),
        lambda: draw_typography_page(c, 9),
        lambda: draw_elements_page(c, 10, berry_green, berry_beige),
        lambda: draw_photos_page(c, 11),
        lambda: draw_composition_page(c, 12, lockup_green),
        lambda: draw_site_page(c, 13, lockup_beige),
        lambda: draw_ui_page(c, 14),
        lambda: draw_adaptation_page(c, 15),
        lambda: draw_page_structure(c, 16),
        lambda: draw_checklist_page(c, 17),
        lambda: draw_sources_page(c, 18, berry_beige),
    ]

    for draw in pages:
        draw()
        c.showPage()
    c.save()


if __name__ == "__main__":
    build()
