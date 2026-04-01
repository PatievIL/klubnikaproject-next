from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "klubnikaproject-brandbook-project-v2.pdf"
CACHE = ROOT / "docs" / ".brandbook-cache"
CACHE.mkdir(parents=True, exist_ok=True)

FONT_CANDIDATES_REGULAR = [
    os.environ.get("KP_FONT_REGULAR"),
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]
FONT_CANDIDATES_BOLD = [
    os.environ.get("KP_FONT_BOLD"),
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]

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
MINT = colors.HexColor("#EEF4EF")
BURGUNDY = colors.HexColor("#7D3B36")
SAGE = colors.HexColor("#D9E5DB")
GRAY = colors.HexColor("#ECE8E0")

PAGE_W = 1600
PAGE_H = 900
LEFT_W = 472
MARGIN = 58


def register_fonts() -> None:
    font_regular = resolve_font(FONT_CANDIDATES_REGULAR, "regular")
    font_bold = resolve_font(FONT_CANDIDATES_BOLD, "bold")
    pdfmetrics.registerFont(TTFont("BrandArial", str(font_regular)))
    pdfmetrics.registerFont(TTFont("BrandArial-Bold", str(font_bold)))


def resolve_font(candidates: list[str | None], weight: str) -> Path:
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return Path(candidate)
    raise FileNotFoundError(
        f"Could not find a {weight} font. Set KP_FONT_{weight.upper()} or install Arial/DejaVu Sans."
    )


H1 = ParagraphStyle("H1", fontName="BrandArial-Bold", fontSize=44, leading=48, textColor=TEXT)
H2 = ParagraphStyle("H2", fontName="BrandArial-Bold", fontSize=18, leading=23, textColor=TEXT)
BODY = ParagraphStyle("Body", fontName="BrandArial", fontSize=15.5, leading=22, textColor=TEXT)
SMALL = ParagraphStyle("Small", fontName="BrandArial", fontSize=11, leading=14, textColor=MUTED)


def ensure_preview(svg_name: str, size: int = 1800) -> Path:
    src = ROOT / "assets" / svg_name
    out = CACHE / f"{svg_name}.png"
    if out.exists():
        postprocess_preview(out)
        return out
    quicklook = shutil.which("qlmanage")
    if not quicklook:
        raise RuntimeError(
            "qlmanage is required to build brandbook previews from SVG. Run on macOS or pre-render assets into docs/.brandbook-cache."
        )
    subprocess.run(
        [quicklook, "-t", "-s", str(size), "-o", str(CACHE), str(src)],
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
    raise FileNotFoundError(svg_name)


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


def draw_image_cover(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float, radius: float | None = None):
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    ox = x + (w - dw) / 2
    oy = y + (h - dh) / 2
    if radius:
        c.saveState()
        p = c.beginPath()
        p.roundRect(x, y, w, h, radius)
        c.clipPath(p, stroke=0)
        c.drawImage(img, ox, oy, dw, dh, mask="auto")
        c.restoreState()
    else:
        c.drawImage(img, ox, oy, dw, dh, mask="auto")


def draw_lockup(c: canvas.Canvas, path: Path, x: float, y: float, w: float):
    img = ImageReader(str(path))
    iw, ih = img.getSize()
    c.drawImage(img, x, y, w, w * ih / iw, mask="auto")


def p(c: canvas.Canvas, text: str, style: ParagraphStyle, x: float, top: float, width: float) -> float:
    para = Paragraph(text, style)
    _, h = para.wrap(width, PAGE_H)
    para.drawOn(c, x, top - h)
    return top - h


def left_panel(c: canvas.Canvas, page: int, section: str, title: str, paragraphs: list[str], bullets: list[str] | None = None, fill=CREAM):
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(fill)
    c.rect(0, 0, LEFT_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 11)
    c.drawString(MARGIN, PAGE_H - 34, section)
    y = PAGE_H - 116
    y = p(c, title, H1, MARGIN, y, LEFT_W - 2 * MARGIN)
    y -= 26
    for para in paragraphs:
        y = p(c, para, BODY, MARGIN, y, LEFT_W - 2 * MARGIN)
        y -= 14
    if bullets:
        y -= 4
        for item in bullets:
            c.setFillColor(ACCENT)
            c.circle(MARGIN + 5, y - 10, 4, fill=1, stroke=0)
            y = p(c, item, BODY, MARGIN + 18, y, LEFT_W - 2 * MARGIN - 18)
            y -= 10
    page_num(c, page)


def page_num(c: canvas.Canvas, n: int):
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 12)
    c.drawRightString(PAGE_W - 34, 28, str(n))


def section_break(c: canvas.Canvas, page: int, code: str, title: str):
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(0, 0, 14, PAGE_H, fill=1, stroke=0)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 96)
    c.drawString(90, PAGE_H / 2 + 28, title)
    c.setFillColor(GREEN)
    c.setFont("BrandArial-Bold", 78)
    c.drawString(90, PAGE_H / 2 - 58, code)
    page_num(c, page)


def draw_cover(c: canvas.Canvas, page: int, lockup: Path):
    c.setFillColor(GREEN)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(0, 0, PAGE_W, 16, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.setFont("BrandArial", 14)
    c.drawString(56, PAGE_H - 48, "РУКОВОДСТВО ПО ИСПОЛЬЗОВАНИЮ")
    c.drawString(56, PAGE_H - 72, "ФИРМЕННОГО СТИЛЯ")
    c.setFillColor(CREAM)
    c.roundRect(920, 460, 420, 260, 40, fill=1, stroke=0)
    draw_lockup(c, lockup, 410, 330, 660)
    c.setStrokeColor(CREAM)
    c.setLineWidth(2)
    c.line(56, 170, 560, 170)
    c.setStrokeColor(ACCENT)
    c.line(56, 154, 300, 154)
    c.setFillColor(CREAM)
    c.setFont("BrandArial-Bold", 64)
    c.drawString(56, 116, "KlubnikaProject")
    c.setFont("BrandArial", 26)
    c.drawString(56, 78, "Digital brandbook / UI system / art direction")
    page_num(c, page)


def draw_contents(c: canvas.Canvas, page: int):
    c.setFillColor(WHITE)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.setFont("BrandArial-Bold", 48)
    c.drawString(88, PAGE_H - 92, "СОДЕРЖАНИЕ")
    c.setStrokeColor(LINE)
    c.setLineWidth(1)
    c.line(88, PAGE_H - 120, PAGE_W - 88, PAGE_H - 120)

    left = [
        ("Характер бренда", "4"),
        ("Логотип", "5"),
        ("Цвета", "6"),
        ("Типографика", "7"),
        ("Фотостиль", "8"),
        ("Фирменные формы", "9"),
        ("Композиция", "10"),
        ("Grid / UI principles", "11"),
    ]
    right = [
        ("Home", "13"),
        ("Farm", "14"),
        ("Shop", "15"),
        ("Calc", "16"),
        ("Адаптация", "18"),
        ("Responsive screens", "19"),
        ("Checklist", "20"),
        ("Исходники", "21"),
    ]

    def draw_col(items, x, top):
        y = top
        for title, num in items:
            c.setFillColor(TEXT)
            c.setFont("BrandArial", 18)
            c.drawString(x, y, title)
            c.drawRightString(x + 560, y, num)
            c.setStrokeColor(LINE)
            c.line(x, y - 16, x + 560, y - 16)
            y -= 54

    draw_col(left, 88, PAGE_H - 190)
    draw_col(right, 830, PAGE_H - 190)
    page_num(c, page)


def draw_word_block(c: canvas.Canvas, words: list[str], x: float, top: float):
    y = top
    for word in words:
        c.setFont("BrandArial-Bold", 48)
        c.setFillColor(TEXT)
        c.drawString(x, y, word)
        y -= 58


def card(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill=WHITE, stroke=LINE, radius=24):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(1)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def chip(c: canvas.Canvas, x: float, y: float, text: str, fill=MINT, fg=GREEN, w: float | None = None):
    ww = w or (len(text) * 8 + 34)
    c.setFillColor(fill)
    c.roundRect(x, y, ww, 38, 19, fill=1, stroke=0)
    c.setFillColor(fg)
    c.setFont("BrandArial-Bold", 13)
    c.drawCentredString(x + ww / 2, y + 13, text)


def button(c: canvas.Canvas, x: float, y: float, text: str, primary=True, w=220):
    c.setFillColor(GREEN if primary else CREAM)
    c.setStrokeColor(GREEN if primary else LINE)
    c.setLineWidth(1)
    c.roundRect(x, y, w, 54, 16, fill=1, stroke=1)
    c.setFillColor(CREAM if primary else GREEN)
    c.setFont("BrandArial-Bold", 17)
    c.drawCentredString(x + w / 2, y + 19, text)


def browser_shell(c: canvas.Canvas, x: float, y: float, w: float, h: float, nav_fill=WHITE, page_fill=CREAM_3):
    card(c, x, y, w, h, fill=page_fill, stroke=colors.HexColor("#E6D8C5"), radius=30)
    c.setFillColor(nav_fill)
    c.roundRect(x + 24, y + h - 96, w - 48, 74, 22, fill=1, stroke=0)
    c.setFillColor(TEXT if nav_fill != GREEN else CREAM)
    c.circle(x + 52, y + h - 58, 6, fill=1, stroke=0)
    c.circle(x + 72, y + h - 58, 6, fill=1, stroke=0)
    c.circle(x + 92, y + h - 58, 6, fill=1, stroke=0)


def input_field(c: canvas.Canvas, x: float, y: float, w: float, label: str):
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 12)
    c.drawString(x, y + 56, label)
    c.setFillColor(WHITE)
    c.setStrokeColor(LINE)
    c.roundRect(x, y, w, 44, 12, fill=1, stroke=1)


def metric(c: canvas.Canvas, x: float, y: float, w: float, label: str, value: str):
    card(c, x, y, w, 102, fill=WHITE, stroke=LINE, radius=20)
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 12)
    c.drawString(x + 18, y + 70, label)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 28)
    c.drawString(x + 18, y + 28, value)


def draw_line_chart(c: canvas.Canvas, x: float, y: float, w: float, h: float):
    card(c, x, y, w, h, fill=WHITE, stroke=LINE, radius=22)
    c.setStrokeColor(colors.HexColor("#E9DFD1"))
    for i in range(1, 4):
        yy = y + i * h / 4
        c.line(x + 20, yy, x + w - 20, yy)
    pts = [
        (x + 40, y + 70),
        (x + 140, y + 120),
        (x + 220, y + 110),
        (x + 310, y + 200),
        (x + 430, y + 190),
        (x + 520, y + 250),
    ]
    c.setStrokeColor(GREEN)
    c.setLineWidth(4)
    for a, b in zip(pts, pts[1:]):
        c.line(a[0], a[1], b[0], b[1])
    for px, py in pts:
        c.setFillColor(ACCENT)
        c.circle(px, py, 7, fill=1, stroke=0)


def draw_home_mock(c: canvas.Canvas, x: float, y: float, w: float, h: float, lockup: Path):
    browser_shell(c, x, y, w, h, nav_fill=GREEN, page_fill=CREAM_3)
    draw_lockup(c, lockup, x + 42, y + h - 76, 150)
    c.setFillColor(CREAM)
    c.setFont("BrandArial", 15)
    for idx, item in enumerate(["Главная", "Решения", "Каталог", "Калькулятор"]):
        c.drawString(x + 430 + idx * 115, y + h - 62, item)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 44)
    c.drawString(x + 42, y + h - 170, "Клубничная ферма:")
    c.drawString(x + 42, y + h - 220, "расчёт, комплектация")
    c.drawString(x + 42, y + h - 270, "и запуск в одной логике")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 18)
    c.drawString(x + 42, y + h - 320, "Сначала сценарий, потом каталог и действие.")
    button(c, x + 42, y + h - 400, "Рассчитать ферму", True, 230)
    button(c, x + 292, y + h - 400, "Перейти в магазин", False, 230)
    draw_image_cover(c, photo("greenhouse-rack.webp"), x + 520, y + 180, 370, 370, radius=24)
    draw_image_cover(c, photo("berry-red.webp"), x + 760, y + 80, 160, 150, radius=18)
    card(c, x + 42, y + 42, 276, 112, fill=WHITE, stroke=LINE, radius=22)
    card(c, x + 334, y + 42, 276, 112, fill=WHITE, stroke=LINE, radius=22)
    card(c, x + 626, y + 42, 276, 112, fill=WHITE, stroke=LINE, radius=22)
    for idx, text in enumerate(["Запуск и расчёт", "Магазин и расходники", "Подбор и консультация"]):
        xx = x + 42 + idx * 292
        c.setFillColor(TEXT)
        c.setFont("BrandArial-Bold", 19)
        c.drawString(xx + 18, y + 98, text)
        c.setFillColor(MUTED)
        c.setFont("BrandArial", 12)
        c.drawString(xx + 18, y + 68, "Сценарий разведен в отдельный следующий шаг.")


def draw_farm_mock(c: canvas.Canvas, x: float, y: float, w: float, h: float, lockup: Path):
    browser_shell(c, x, y, w, h, nav_fill=WHITE, page_fill=CREAM_2)
    draw_lockup(c, lockup, x + 42, y + h - 76, 150)
    chip(c, x + 42, y + h - 154, "Расчёт фермы", MINT, GREEN)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 40)
    c.drawString(x + 42, y + h - 208, "Собрать состав фермы")
    c.drawString(x + 42, y + h - 252, "без хаотичных закупок")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 17)
    c.drawString(x + 42, y + h - 300, "Страница должна ощущаться инженерной и спокойной.")
    for i, label in enumerate(["Объект", "Площадь", "Свет", "Полив"]):
        input_field(c, x + 42 + (i % 2) * 250, y + h - 510 - (i // 2) * 84, 220, label)
    button(c, x + 42, y + h - 620, "Получить состав", True, 220)
    card(c, x + 560, y + 146, 320, 482, fill=WHITE, stroke=LINE, radius=26)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 24)
    c.drawString(x + 588, y + 584, "Этапы")
    for idx, step in enumerate(["1. Параметры объекта", "2. Конфигурация системы", "3. Рамка бюджета", "4. Следующий шаг"]):
        yy = y + 530 - idx * 90
        card(c, x + 584, yy - 24, 272, 56, fill=MINT if idx == 0 else CREAM_3, stroke=LINE, radius=18)
        c.setFillColor(TEXT)
        c.setFont("BrandArial-Bold" if idx == 0 else "BrandArial", 16)
        c.drawString(x + 604, yy - 2, step)
    draw_image_cover(c, photo("rack-aisle.webp"), x + 900, y + 146, 260, 482, radius=26)


def draw_shop_mock(c: canvas.Canvas, x: float, y: float, w: float, h: float, lockup: Path):
    browser_shell(c, x, y, w, h, nav_fill=WHITE, page_fill=WHITE)
    draw_lockup(c, lockup, x + 42, y + h - 76, 150)
    chip(c, x + 42, y + h - 154, "Каталог", MINT, GREEN)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 38)
    c.drawString(x + 42, y + h - 208, "Магазин как система")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 16)
    c.drawString(x + 42, y + h - 250, "Категории, фильтры, разделение типового товара и проектного решения.")
    card(c, x + 42, y + 74, 232, 430, fill=CREAM_2, stroke=LINE, radius=22)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 22)
    c.drawString(x + 66, y + 468, "Фильтры")
    for idx, name in enumerate(["LED", "Полив", "Стеллажи", "Субстрат", "Рассада"]):
        chip(c, x + 66, y + 406 - idx * 56, name, WHITE, GREEN, 130 + (idx % 2) * 20)
    grid_x = x + 304
    positions = [(0, 0), (280, 0), (560, 0), (0, -222), (280, -222), (560, -222)]
    images = ["berry-close.webp", "greenhouse-rack.webp", "berry-cluster.webp", "rack-aisle.webp", "berry-red.webp", "hero-process.webp"]
    for idx, (dx, dy) in enumerate(positions):
        cx = grid_x + dx
        cy = y + 298 + dy
        card(c, cx, cy, 250, 192, fill=CREAM_3, stroke=LINE, radius=20)
        draw_image_cover(c, photo(images[idx]), cx + 14, cy + 82, 222, 96, radius=14)
        c.setFillColor(TEXT)
        c.setFont("BrandArial-Bold", 16)
        c.drawString(cx + 16, cy + 58, f"Категория {idx + 1}")
        c.setFillColor(MUTED)
        c.setFont("BrandArial", 12)
        c.drawString(cx + 16, cy + 36, "Чистый сценарий выбора и понятный CTA")


def draw_calc_mock(c: canvas.Canvas, x: float, y: float, w: float, h: float, lockup: Path):
    browser_shell(c, x, y, w, h, nav_fill=WHITE, page_fill=CREAM_3)
    draw_lockup(c, lockup, x + 42, y + h - 76, 150)
    chip(c, x + 42, y + h - 154, "Калькулятор", MINT, GREEN)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 38)
    c.drawString(x + 42, y + h - 208, "Инструмент, а не промо")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 16)
    c.drawString(x + 42, y + h - 250, "Четкие поля, понятные метрики, быстрый ориентир до проектного разбора.")
    metric(c, x + 42, y + 432, 210, "Стеллажи", "84")
    metric(c, x + 272, y + 432, 210, "Площадь", "1700 м²")
    metric(c, x + 42, y + 310, 210, "Свет", "M23")
    metric(c, x + 272, y + 310, 210, "Выручка", "≈ 4.2M")
    draw_line_chart(c, x + 520, y + 292, 392, 320)
    card(c, x + 42, y + 82, 440, 176, fill=WHITE, stroke=LINE, radius=22)
    input_field(c, x + 64, y + 140, 170, "Ширина")
    input_field(c, x + 254, y + 140, 170, "Длина")
    input_field(c, x + 64, y + 84, 170, "Количество рядов")
    input_field(c, x + 254, y + 84, 170, "Канал сбыта")
    button(c, x + 520, y + 124, "Рассчитать", True, 190)
    button(c, x + 730, y + 124, "Скачать смету", False, 190)


def draw_character_page(c: canvas.Canvas, page: int, berry_beige: Path):
    left_panel(
        c,
        page,
        "01 / Бренд",
        "Характер бренда",
        [
            "KlubnikaProject должен выглядеть как собранная рабочая система для клубничной фермы в controlled environment. Это не агро-ярмарка и не абстрактный tech-продукт.",
            "Дороговизна достигается не декором, а порядком, воздухом, структурой, реальным продуктом и точностью интерфейса.",
        ],
        ["Натуральность без деревенской стилистики.", "Технологичность без неона.", "Спокойная уверенность вместо рекламного давления."],
    )
    c.setFillColor(GREEN)
    c.rect(LEFT_W, 0, PAGE_W - LEFT_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(CREAM)
    c.roundRect(LEFT_W + 120, 116, 770, 668, 46, fill=1, stroke=0)
    draw_lockup(c, berry_beige, LEFT_W + 170, 616, 120)
    draw_word_block(c, ["СВЕЖЕСТЬ", "ПОРЯДОК", "ТОЧНОСТЬ", "СИСТЕМА"], LEFT_W + 340, 658)


def draw_logo_page(c: canvas.Canvas, page: int, lockup_beige: Path):
    left_panel(
        c,
        page,
        "01 / Бренд",
        "Логотип",
        [
            "Lockup — приоритетная версия для сайта, брендовых экранов и структурных модулей. Компактный знак используется только там, где полная версия становится слишком мелкой.",
            "Логотип всегда работает как маркер системы. Он не должен быть декоративным орнаментом и не должен спорить с главным CTA.",
        ],
        ["На светлом фоне — зеленая версия.", "На темном или зеленом фоне — бежевая.", "На сложном фоне — только с гарантированным контрастом."],
    )
    c.setFillColor(GREEN)
    c.rect(LEFT_W, 0, PAGE_W - LEFT_W, PAGE_H, fill=1, stroke=0)
    draw_lockup(c, lockup_beige, LEFT_W + 200, 340, 610)
    c.setFillColor(ACCENT)
    c.roundRect(LEFT_W + 110, 122, 360, 64, 18, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.setFont("BrandArial-Bold", 18)
    c.drawCentredString(LEFT_W + 290, 145, "Основная версия / priority")


def draw_color_page(c: canvas.Canvas, page: int):
    left_panel(
        c,
        page,
        "01 / Бренд",
        "Цвета",
        [
            "Палитра проекта проста: темно-зеленый как системный цвет, теплый бежевый как акцент, светлый тон как базовая среда интерфейса.",
            "В одном экране должен быть один главный цветовой акцент. Новые холодные цвета без отдельной задачи не добавляются.",
        ],
    )
    swatches = [
        (ACCENT, "Accent", "#FFD5A0", "Теплый акцент"),
        (GREEN, "System", "#004D2B", "CTA, nav, actions"),
        (CREAM, "Surface", "#F5ECDF", "Фон, воздух, спокойствие"),
        (SAGE, "Mint UI", "#EEF4EF", "Поддержка UI"),
    ]
    x = LEFT_W + 64
    y = 642
    for color, name, hexv, desc in swatches:
        c.setFillColor(color)
        c.roundRect(x, y, 880, 118, 22, fill=1, stroke=0)
        c.setFillColor(TEXT if color != GREEN else CREAM)
        c.setFont("BrandArial-Bold", 26)
        c.drawString(x + 30, y + 70, name)
        c.setFont("BrandArial", 16)
        c.drawString(x + 30, y + 38, desc)
        c.drawString(x + 710, y + 54, hexv)
        y -= 142


def draw_type_page(c: canvas.Canvas, page: int):
    left_panel(
        c,
        page,
        "01 / Бренд",
        "Типографика",
        [
            "Основная гарнитура — Exo 2. В коде проекта она уже подключена и должна оставаться единственной основной системой набора.",
            "Тон типографики: плотный, уверенный, без лишнего украшательства. Если текст можно сократить на треть без потери смысла, его нужно сократить.",
        ],
        ["Крупные плотные заголовки.", "Короткие лид-абзацы.", "Текст почти всегда выровнен влево."],
    )
    c.setFillColor(WHITE)
    c.rect(LEFT_W, 0, PAGE_W - LEFT_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 58)
    c.drawString(580, 650, "Клубничная ферма:")
    c.drawString(580, 586, "расчёт, комплектация")
    c.drawString(580, 522, "и запуск в одной логике")
    c.setFont("BrandArial-Bold", 26)
    c.drawString(580, 424, "Подзаголовок и supporting copy")
    c.setFont("BrandArial", 18)
    c.drawString(580, 382, "Типографика должна вести по экрану, а не заполнять его.")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 15)
    c.drawString(580, 338, "Exo 2 / fallback Arial / no decorative styles")


def draw_photo_page(c: canvas.Canvas, page: int):
    left_panel(
        c,
        page,
        "01 / Бренд",
        "Фотостиль",
        [
            "Фотографии — это доказательная среда бренда. Приоритет у реальной ягоды, стеллажей, controlled-environment фермы, рук и процесса.",
            "Нельзя использовать дачную эстетику, случайный lifestyle и холодные пересатурированные стоки.",
        ],
        ["Подходит: продукт, ферма, узлы, свет, процесс.", "Не подходит: инфосток, псевдо-люкс, дачные ассоциации."],
    )
    draw_image_cover(c, photo("berry-red.webp"), LEFT_W + 24, 454, 520, 400, radius=26)
    draw_image_cover(c, photo("greenhouse-rack.webp"), LEFT_W + 568, 454, 480, 400, radius=26)
    draw_image_cover(c, photo("hero-process.webp"), LEFT_W + 24, 40, 600, 354, radius=26)
    draw_image_cover(c, photo("berry-close.webp"), LEFT_W + 648, 40, 400, 354, radius=26)


def draw_shapes_page(c: canvas.Canvas, page: int, berry_beige: Path):
    left_panel(
        c,
        page,
        "01 / Бренд",
        "Фирменные формы",
        [
            "Основа формы — ягода из логотипа. В интерфейсе это не орнамент, а контролируемый графический акцент: иконка, контейнер, патч, статусный маркер.",
            "Второй слой системы — мягкая прямоугольная геометрия с уверенными, но не игрушечными радиусами.",
        ],
    )
    c.setFillColor(GREEN)
    c.rect(LEFT_W, 0, PAGE_W - LEFT_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(CREAM)
    c.roundRect(LEFT_W + 86, 108, 884, 684, 56, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.roundRect(LEFT_W + 162, 180, 250, 170, 34, fill=1, stroke=0)
    c.roundRect(LEFT_W + 460, 180, 420, 86, 26, fill=1, stroke=0)
    c.roundRect(LEFT_W + 460, 294, 420, 150, 34, fill=0, stroke=1)
    draw_lockup(c, berry_beige, LEFT_W + 226, 520, 210)
    draw_lockup(c, berry_beige, LEFT_W + 570, 554, 118)
    draw_lockup(c, berry_beige, LEFT_W + 730, 544, 140)


def draw_composition_page(c: canvas.Canvas, page: int, lockup_green: Path):
    left_panel(
        c,
        page,
        "02 / Interface",
        "Композиция",
        [
            "На широких экранах базовое правило почти всегда одно: смысл слева, визуальная доминанта справа. Ниже — понятный следующий шаг.",
            "Если экран не читабелен, убирать нужно вторичное. Уменьшать всё сразу — почти всегда плохое решение.",
        ],
        ["Один экран = один главный акцент.", "После hero нужен понятный route.", "UI не должен спорить с продуктом."],
    )
    c.setStrokeColor(colors.HexColor("#D2C3AE"))
    c.setLineWidth(2)
    for x, y, w, h in [(620, 476, 380, 224), (1036, 476, 420, 268), (620, 172, 420, 236), (1082, 172, 284, 268)]:
        c.roundRect(x, y, w, h, 22, fill=0, stroke=1)
        c.setStrokeColor(colors.HexColor("#E6DAC9"))
        c.line(x + 28, y + h - 44, x + w - 28, y + h - 44)
        c.setStrokeColor(colors.HexColor("#D2C3AE"))
        c.rect(x + 26, y + 26, 86, 18, stroke=1, fill=0)
        c.rect(x + w - 160, y + 36, 132, h - 92, stroke=1, fill=0)
    draw_lockup(c, lockup_green, 700, 592, 132)


def draw_grid_ui_page(c: canvas.Canvas, page: int):
    left_panel(
        c,
        page,
        "02 / Interface",
        "Grid и UI principles",
        [
            "Сетка держится на чистом контейнере, умеренном gap и большом количестве воздуха. Компоненты собираются как инженерные модули, а не как декоративные плитки.",
            "Buttons, cards, tags, fields и banners должны ощущаться как одна семья объектов.",
        ],
        ["Крупный container, не full-bleed chaos.", "Спокойные тени и границы.", "Один primary CTA на смысловой экран."],
    )
    x = 600
    chip(c, x, 720, "Tag")
    chip(c, x + 110, 720, "Filter")
    chip(c, x + 246, 720, "Badge", GREEN, CREAM, 112)
    button(c, x, 634, "Primary", True, 220)
    button(c, x + 240, 634, "Secondary", False, 220)
    input_field(c, x, 526, 300, "Поле ввода")
    input_field(c, x + 326, 526, 300, "Dropdown")
    card(c, x, 280, 310, 188, fill=WHITE, stroke=LINE, radius=24)
    card(c, x + 334, 280, 310, 188, fill=WHITE, stroke=LINE, radius=24)
    card(c, x + 668, 280, 310, 188, fill=WHITE, stroke=LINE, radius=24)
    for idx, label in enumerate(["Scenario card", "Info card", "CTA card"]):
        cx = x + idx * 334
        c.setFillColor(TEXT)
        c.setFont("BrandArial-Bold", 22)
        c.drawString(cx + 20, 420, label)
        c.setFillColor(MUTED)
        c.setFont("BrandArial", 13)
        c.drawString(cx + 20, 390, "Структура, короткий текст, один вектор действия")
    metric(c, x, 100, 200, "Rows", "84")
    metric(c, x + 220, 100, 200, "Area", "1700 м²")
    metric(c, x + 440, 100, 200, "Yield", "36 т")


def draw_ui_system_page(c: canvas.Canvas, page: int):
    left_panel(
        c,
        page,
        "02 / Interface",
        "UI-система",
        [
            "Интерфейс не должен выглядеть как чужой универсальный шаблон. Его задача — продолжать бренд: теплая база, строгая иерархия, точные CTA, реальные фото и ровный ритм карточек.",
            "UI должен помогать выбрать и двигаться дальше, а не просто красиво заполнять экран.",
        ],
        ["Buttons: короткие и точные.", "Cards: не плитки маркетплейса, а модули решения.", "Forms: максимально ясные."],
    )
    x = 590
    browser_shell(c, x, 82, 930, 734, nav_fill=WHITE, page_fill=CREAM_2)
    chip(c, x + 34, 690, "Primary actions")
    chip(c, x + 190, 690, "Cards")
    chip(c, x + 294, 690, "Forms")
    button(c, x + 34, 618, "Рассчитать ферму", True, 230)
    button(c, x + 284, 618, "Перейти в каталог", False, 220)
    card(c, x + 34, 392, 270, 176, fill=WHITE, stroke=LINE, radius=22)
    card(c, x + 326, 392, 270, 176, fill=WHITE, stroke=LINE, radius=22)
    card(c, x + 618, 392, 270, 176, fill=WHITE, stroke=LINE, radius=22)
    for idx, name in enumerate(["Scenario", "Process", "Offer"]):
        xx = x + 34 + idx * 292
        c.setFillColor(TEXT)
        c.setFont("BrandArial-Bold", 22)
        c.drawString(xx + 20, 520, name)
        c.setFillColor(MUTED)
        c.setFont("BrandArial", 13)
        c.drawString(xx + 20, 492, "Одна мысль, короткий outcome, одно действие")
    input_field(c, x + 34, 284, 258, "Площадь")
    input_field(c, x + 312, 284, 258, "Свет")
    input_field(c, x + 590, 284, 258, "Полив")
    draw_image_cover(c, photo("berry-cluster.webp"), x + 34, 102, 330, 134, radius=18)
    draw_image_cover(c, photo("rack-aisle.webp"), x + 388, 102, 500, 134, radius=18)


def page_title_right(c: canvas.Canvas, x: float, y: float, title: str, subtitle: str):
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 34)
    c.drawString(x, y, title)
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 16)
    c.drawString(x, y - 28, subtitle)


def draw_home_page(c: canvas.Canvas, page: int, lockup: Path):
    left_panel(
        c,
        page,
        "03 / Key screens",
        "Home",
        [
            "Главная должна быть маршрутизатором спроса. Она быстро объясняет, что это за проект, кому он нужен и в какой сценарий перейти дальше.",
            "На ней не должно быть ощущения каталога всего сразу. Первый экран — это смысл, route и контролируемый визуальный акцент.",
        ],
    )
    page_title_right(c, 570, 800, "Главная как вход в систему", "Hero + route cards + next step")
    draw_home_mock(c, 560, 88, 970, 650, lockup)


def draw_farm_page(c: canvas.Canvas, page: int, lockup: Path):
    left_panel(
        c,
        page,
        "03 / Key screens",
        "Farm",
        [
            "Страница расчета фермы визуально должна быть строже главной. Здесь выше роль формы, этапов, последовательности и инженерной ясности.",
            "Декор вторичен. Приоритет у структуры решения: параметры, конфигурация, рамка бюджета, следующий шаг.",
        ],
    )
    page_title_right(c, 570, 800, "Farm как инженерный вход", "Form + stages + visual proof")
    draw_farm_mock(c, 560, 88, 970, 650, lockup)


def draw_shop_page(c: canvas.Canvas, page: int, lockup: Path):
    left_panel(
        c,
        page,
        "03 / Key screens",
        "Shop",
        [
            "Магазин должен быть чище и утилитарнее главной. Его задача — помогать выбирать, а не просто показывать карточки.",
            "Важны фильтры, категории, разделение типового товара и проектных решений, короткие product outcomes и понятные CTA.",
        ],
    )
    page_title_right(c, 570, 800, "Shop как рабочий каталог", "Filters + product grid + clean category logic")
    draw_shop_mock(c, 560, 88, 970, 650, lockup)


def draw_calc_page(c: canvas.Canvas, page: int, lockup: Path):
    left_panel(
        c,
        page,
        "03 / Key screens",
        "Calc",
        [
            "Калькулятор — это утилитарный инструмент. Он не должен выглядеть как еще один промо-лендинг. Главное — четкая форма, понятные данные, быстрый расчет и спокойный интерфейс.",
            "Таблицы, метрики и графики должны быть визуально важнее декоративных элементов.",
        ],
    )
    page_title_right(c, 570, 800, "Calc как инструмент", "Metrics + chart + form + actionable output")
    draw_calc_mock(c, 560, 88, 970, 650, lockup)


def draw_adaptation_page(c: canvas.Canvas, page: int):
    left_panel(
        c,
        page,
        "04 / Responsive",
        "Адаптация",
        [
            "При сужении экрана структура должна упрощаться. Сначала смысл, потом визуал, потом вторичные элементы. Нельзя просто пропорционально уменьшить desktop-экран.",
            "Приоритет на мобильном: route, CTA, форма, читаемый lockup, короткие карточки и один главный акцент на экран.",
        ],
        ["Сначала убирать вторичную декоративность.", "Сохранять сценарий выбора и следующий шаг.", "Не делать миниатюрный desktop."],
    )
    c.setStrokeColor(colors.HexColor("#CDBDA4"))
    c.setLineWidth(2)
    frames = [
        (618, 150, 540, 620, "Desktop"),
        (1200, 200, 250, 520, "Tablet"),
        (1480, 238, 92, 448, "Mobile"),
    ]
    for x, y, w, h, label in frames:
        c.roundRect(x, y, w, h, 26, fill=0, stroke=1)
        c.setFillColor(MUTED)
        c.setFont("BrandArial-Bold", 14)
        c.drawCentredString(x + w / 2, y - 22, label)
        c.setStrokeColor(colors.HexColor("#E5D7C5"))
        c.line(x + 22, y + h - 54, x + w - 22, y + h - 54)
        c.setStrokeColor(colors.HexColor("#CDBDA4"))
        c.rect(x + 22, y + h - 40, 70, 12, stroke=1, fill=0)
        c.rect(x + 22, y + 22, w - 44, h - 108, stroke=1, fill=0)
        if w > 220:
            c.rect(x + w - 178, y + 38, 136, h - 142, stroke=1, fill=0)


def draw_responsive_screens(c: canvas.Canvas, page: int, lockup: Path):
    left_panel(
        c,
        page,
        "04 / Responsive",
        "Responsive screens",
        [
            "Адаптация должна сохранять характер бренда, а не только контент. И desktop, и tablet, и mobile должны быть узнаваемо частью одной системы.",
        ],
    )
    draw_home_mock(c, 540, 338, 820, 472, lockup)
    browser_shell(c, 1110, 140, 300, 596, nav_fill=GREEN, page_fill=CREAM_3)
    draw_lockup(c, lockup, 1132, 676, 110)
    c.setFillColor(CREAM)
    c.setFont("BrandArial", 13)
    c.drawString(1244, 692, "Главная")
    c.drawString(1290, 692, "Каталог")
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 22)
    c.drawString(1132, 628, "Клубничная")
    c.drawString(1132, 598, "ферма:")
    button(c, 1132, 510, "Рассчитать", True, 150)
    draw_image_cover(c, photo("greenhouse-rack.webp"), 1132, 330, 228, 160, radius=18)
    card(c, 1132, 206, 228, 94, fill=WHITE, stroke=LINE, radius=18)
    c.setFillColor(TEXT)
    c.setFont("BrandArial-Bold", 15)
    c.drawString(1148, 258, "Route card")
    c.setFillColor(MUTED)
    c.setFont("BrandArial", 12)
    c.drawString(1148, 234, "Короткий следующий шаг")


def draw_checklist_page(c: canvas.Canvas, page: int):
    left_panel(
        c,
        page,
        "05 / Контроль",
        "Checklist",
        [
            "Финальная проверка нужна перед публикацией, дизайном нового блока или крупным редизайном. Это не теоретический список, а рабочий фильтр.",
        ],
    )
    items = [
        "Логотип читается и стоит на контрастном фоне.",
        "Экран держится на одном главном акценте.",
        "Цвета работают по ролям, а не случайно.",
        "Типографика ведет по экрану без визуальной усталости.",
        "Фото реальные и релевантные проекту.",
        "Карточки, кнопки и формы выглядят как одна система.",
        "Mobile не разваливает route и CTA.",
        "Экран помогает выбрать, а не только впечатляет.",
    ]
    x, y = 604, 696
    for item in items:
        card(c, x, y - 20, 842, 54, fill=MINT, stroke=MINT, radius=16)
        c.setFillColor(GREEN)
        c.circle(x + 24, y + 6, 10, fill=1, stroke=0)
        c.setStrokeColor(CREAM)
        c.setLineWidth(2)
        c.line(x + 20, y + 6, x + 24, y + 2)
        c.line(x + 24, y + 2, x + 31, y + 12)
        c.setFillColor(TEXT)
        c.setFont("BrandArial", 16)
        c.drawString(x + 48, y, item)
        y -= 72


def draw_sources_page(c: canvas.Canvas, page: int, berry_beige: Path):
    c.setFillColor(GREEN)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(0, 0, PAGE_W, 14, fill=1, stroke=0)
    draw_lockup(c, berry_beige, 672, 612, 124)
    c.setFillColor(CREAM)
    c.setFont("BrandArial-Bold", 48)
    c.drawCentredString(PAGE_W / 2, 502, "Исходники и рабочая база")
    c.setFont("BrandArial", 22)
    c.drawCentredString(PAGE_W / 2, 448, "docs/brand-ui-visual-guide.md / styles.css / assets/*.svg / assets/photos/*")
    c.drawCentredString(PAGE_W / 2, 404, "Новые visual-решения сначала сверяются с этой системой, затем идут в код.")
    page_num(c, page)


def build():
    register_fonts()
    lockup_green = ensure_preview("brand-lockup-green.svg")
    lockup_beige = ensure_preview("brand-lockup-beige.svg")
    berry_beige = ensure_preview("brand-berry-beige.svg")

    c = canvas.Canvas(str(OUT), pagesize=(PAGE_W, PAGE_H))
    pages = [
        lambda: draw_cover(c, 1, lockup_beige),
        lambda: draw_contents(c, 2),
        lambda: section_break(c, 3, "01", "БРЕНД И ОСНОВА"),
        lambda: draw_character_page(c, 4, berry_beige),
        lambda: draw_logo_page(c, 5, lockup_beige),
        lambda: draw_color_page(c, 6),
        lambda: draw_type_page(c, 7),
        lambda: draw_photo_page(c, 8),
        lambda: draw_shapes_page(c, 9, berry_beige),
        lambda: section_break(c, 10, "02", "INTERFACE SYSTEM"),
        lambda: draw_composition_page(c, 11, lockup_green),
        lambda: draw_grid_ui_page(c, 12),
        lambda: draw_ui_system_page(c, 13),
        lambda: section_break(c, 14, "03", "KEY SCREENS"),
        lambda: draw_home_page(c, 15, lockup_beige),
        lambda: draw_farm_page(c, 16, lockup_green),
        lambda: draw_shop_page(c, 17, lockup_green),
        lambda: draw_calc_page(c, 18, lockup_green),
        lambda: section_break(c, 19, "04", "RESPONSIVE"),
        lambda: draw_adaptation_page(c, 20),
        lambda: draw_responsive_screens(c, 21, lockup_beige),
        lambda: draw_checklist_page(c, 22),
        lambda: draw_sources_page(c, 23, berry_beige),
    ]
    for draw in pages:
        draw()
        c.showPage()
    c.save()


if __name__ == "__main__":
    build()
