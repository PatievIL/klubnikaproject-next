from __future__ import annotations

import os
import re
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "brand-ui-visual-guide.md"
OUTPUT = ROOT / "docs" / "brand-ui-visual-guide.pdf"
LOGO = ROOT / "assets" / "apple-touch-icon.png"

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


def build_styles():
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="BrandBody",
            parent=styles["BodyText"],
            fontName="BrandArial",
            fontSize=10.8,
            leading=15.2,
            textColor=colors.HexColor("#153224"),
            spaceAfter=3 * mm,
            alignment=TA_LEFT,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BrandH1",
            parent=styles["Heading1"],
            fontName="BrandArial-Bold",
            fontSize=26,
            leading=30,
            textColor=colors.HexColor("#004D2B"),
            spaceAfter=5 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BrandH2",
            parent=styles["Heading2"],
            fontName="BrandArial-Bold",
            fontSize=17,
            leading=22,
            textColor=colors.HexColor("#004D2B"),
            spaceBefore=6 * mm,
            spaceAfter=2.5 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BrandH3",
            parent=styles["Heading3"],
            fontName="BrandArial-Bold",
            fontSize=12.5,
            leading=16,
            textColor=colors.HexColor("#0F653E"),
            spaceBefore=3 * mm,
            spaceAfter=1.5 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BrandSmall",
            parent=styles["BodyText"],
            fontName="BrandArial",
            fontSize=8.8,
            leading=12,
            textColor=colors.HexColor("#586359"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="BrandBullet",
            parent=styles["BodyText"],
            fontName="BrandArial",
            fontSize=10.6,
            leading=14.2,
            textColor=colors.HexColor("#153224"),
            leftIndent=0,
            firstLineIndent=0,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BrandCoverTitle",
            parent=styles["Title"],
            fontName="BrandArial-Bold",
            fontSize=30,
            leading=34,
            textColor=colors.HexColor("#004D2B"),
            spaceAfter=4 * mm,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BrandCoverSub",
            parent=styles["BodyText"],
            fontName="BrandArial",
            fontSize=13,
            leading=18,
            textColor=colors.HexColor("#586359"),
            spaceAfter=3 * mm,
        )
    )
    return styles


def inline_markup(text: str) -> str:
    text = escape(text.strip())
    text = re.sub(
        r"`([^`]+)`",
        r'<font name="BrandArial-Bold" color="#004D2B">\1</font>',
        text,
    )
    text = re.sub(
        r"\*\*([^*]+)\*\*",
        r'<font name="BrandArial-Bold">\1</font>',
        text,
    )
    return text


def parse_markdown(lines, styles):
    story = []
    paragraph_buffer: list[str] = []
    bullets: list[str] = []

    def flush_paragraph():
        nonlocal paragraph_buffer
        if paragraph_buffer:
            text = " ".join(x.strip() for x in paragraph_buffer if x.strip())
            story.append(Paragraph(inline_markup(text), styles["BrandBody"]))
            paragraph_buffer = []

    def flush_bullets():
        nonlocal bullets
        if bullets:
            items = [
                ListItem(Paragraph(inline_markup(item), styles["BrandBullet"]))
                for item in bullets
            ]
            story.append(
                ListFlowable(
                    items,
                    bulletType="bullet",
                    start="circle",
                    bulletFontName="BrandArial-Bold",
                    bulletFontSize=8,
                    bulletColor=colors.HexColor("#004D2B"),
                    leftPadding=10,
                )
            )
            story.append(Spacer(1, 2 * mm))
            bullets = []

    for raw_line in lines:
        line = raw_line.rstrip("\n")
        stripped = line.strip()

        if not stripped:
            flush_paragraph()
            flush_bullets()
            continue

        if stripped.startswith("# "):
            flush_paragraph()
            flush_bullets()
            story.append(Paragraph(inline_markup(stripped[2:]), styles["BrandH1"]))
            story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#D8C7AE")))
            story.append(Spacer(1, 3 * mm))
            continue

        if stripped.startswith("## "):
            flush_paragraph()
            flush_bullets()
            story.append(Paragraph(inline_markup(stripped[3:]), styles["BrandH2"]))
            continue

        if stripped.startswith("### "):
            flush_paragraph()
            flush_bullets()
            story.append(Paragraph(inline_markup(stripped[4:]), styles["BrandH3"]))
            continue

        if stripped.startswith("- "):
            flush_paragraph()
            bullets.append(stripped[2:])
            continue

        paragraph_buffer.append(stripped)

    flush_paragraph()
    flush_bullets()
    return story


def draw_footer(canvas, doc):
    if doc.page <= 1:
        return
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#D8C7AE"))
    canvas.setLineWidth(0.6)
    canvas.line(doc.leftMargin, 14 * mm, A4[0] - doc.rightMargin, 14 * mm)
    canvas.setFont("BrandArial", 8)
    canvas.setFillColor(colors.HexColor("#586359"))
    canvas.drawString(doc.leftMargin, 9.5 * mm, "KlubnikaProject Brand UI Visual Guide")
    canvas.drawRightString(A4[0] - doc.rightMargin, 9.5 * mm, str(doc.page - 1))
    canvas.restoreState()


def build_pdf():
    register_fonts()
    styles = build_styles()
    lines = SOURCE.read_text(encoding="utf-8").splitlines()

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="KlubnikaProject Brand UI Visual Guide",
        author="OpenAI Codex",
    )

    story = []
    if LOGO.exists():
        story.append(Image(str(LOGO), width=22 * mm, height=22 * mm))
        story.append(Spacer(1, 8 * mm))

    story.append(Paragraph("KlubnikaProject Brand UI Visual Guide", styles["BrandCoverTitle"]))
    story.append(
        Paragraph(
            "Рабочая visual-инструкция по бренду, UI-системе, композиции, адаптации и визуальной логике сайта.",
            styles["BrandCoverSub"],
        )
    )
    story.append(
        Paragraph(
            "Источник: <font name=\"BrandArial-Bold\">docs/brand-ui-visual-guide.md</font>",
            styles["BrandSmall"],
        )
    )
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width="100%", thickness=2.2, color=colors.HexColor("#004D2B")))
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(width="42%", thickness=6, color=colors.HexColor("#FFD5A0")))
    story.append(Spacer(1, 120 * mm))
    story.append(
        Paragraph(
            "Этот PDF нужен как переносимая версия бренд-инструкции для сайта. "
            "Править сначала markdown-источник, затем пересобирать PDF.",
            styles["BrandCoverSub"],
        )
    )
    story.append(PageBreak())

    story.extend(parse_markdown(lines, styles))
    doc.build(story, onLaterPages=draw_footer)


if __name__ == "__main__":
    build_pdf()
