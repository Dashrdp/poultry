from __future__ import annotations

import io
from datetime import datetime, timezone
from xml.sax.saxutils import escape

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

RANGE_LABELS = {
    "current_month": "Current month",
    "previous_month": "Previous month",
    "year": "Year",
}


def _period_label(payload: dict) -> str:
    if "from" in payload and "to" in payload:
        start = str(payload["from"])
        end = str(payload["to"])
        if start == end:
            return start
        return f"{start} – {end}"
    range_key = payload.get("range", "")
    return RANGE_LABELS.get(str(range_key), str(range_key))



def _chart_timeseries(series: list[dict]) -> bytes | None:
    if not series:
        return None
    labels = [p["label"] for p in series]
    eggs = [int(p["eggs"]) for p in series]
    fig, ax = plt.subplots(figsize=(7.2, 2.4))
    ax.plot(range(len(eggs)), eggs, color="#1a1a1a", linewidth=1.5)
    step = max(1, len(labels) // 8)
    ax.set_xticks(range(0, len(labels), step))
    ax.set_xticklabels([labels[i] for i in range(0, len(labels), step)], rotation=30, ha="right")
    ax.set_ylabel("Eggs")
    ax.set_title("Egg production")
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _chart_eggs_pie(compare_sheds: list[dict]) -> bytes | None:
    labels = []
    sizes = []
    for row in compare_sheds:
        eggs = int(row.get("eggs_period") or 0)
        if eggs <= 0:
            continue
        labels.append(str(row.get("name") or row.get("id")))
        sizes.append(eggs)
    if not sizes:
        return None
    fig, ax = plt.subplots(figsize=(4.5, 3.2))
    ax.pie(sizes, labels=labels, autopct="%1.0f%%", startangle=90)
    ax.set_title("Eggs by shed")
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def render_dashboard_pdf(payload: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        # Per-document: uncompressed streams so tests can find farm name as literal bytes.
        pageCompression=0,
    )
    styles = getSampleStyleSheet()
    story: list = []

    farm = payload["farm"]
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    story.append(Paragraph(escape(str(farm["name"])), styles["Title"]))
    story.append(
        Paragraph(
            f"{escape(str(farm.get('location') or '—'))} · "
            f"{escape(_period_label(payload))} · Generated {generated}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.4 * cm))

    kpis = payload["kpis"]
    hen = kpis.get("hen_day_pct")
    hen_s = "—" if hen is None else f"{hen}%"
    kpi_rows = [
        ["Birds", "Eggs (period)", "Deaths", "Hen-day", "Feed"],
        [
            str(kpis["birds"]),
            str(kpis["eggs_period"]),
            str(kpis["deaths_period"]),
            hen_s,
            f"{kpis['feed_qty']} {kpis['feed_unit']}",
        ],
    ]
    t = Table(kpi_rows, hAlign="LEFT")
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.92, 0.92, 0.92)),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(Paragraph("Period snapshot", styles["Heading2"]))
    story.append(t)
    story.append(Spacer(1, 0.35 * cm))

    story.append(Paragraph("Alerts", styles["Heading2"]))
    alerts = payload.get("alerts") or []
    if not alerts:
        story.append(Paragraph("No alerts", styles["Normal"]))
    else:
        for alert in alerts:
            story.append(Paragraph(f"• {escape(str(alert['message']))}", styles["Normal"]))
    story.append(Spacer(1, 0.35 * cm))

    story.append(Paragraph("Rough margin", styles["Heading2"]))
    money = payload.get("money")
    if money is None:
        story.append(Paragraph("Rates not set", styles["Normal"]))
    else:
        money_rows = [
            ["Revenue", "Feed cost", "Margin"],
            [str(money["revenue"]), str(money["feed_cost"]), str(money["margin"])],
        ]
        mt = Table(money_rows, hAlign="LEFT")
        mt.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.92, 0.92, 0.92)),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(mt)
    story.append(Spacer(1, 0.35 * cm))

    ts_png = _chart_timeseries(payload.get("series") or [])
    story.append(Paragraph("Egg production", styles["Heading2"]))
    if ts_png is None:
        story.append(Paragraph("No data", styles["Normal"]))
    else:
        story.append(Image(io.BytesIO(ts_png), width=16 * cm, height=5.3 * cm))
    story.append(Spacer(1, 0.35 * cm))

    pie_png = _chart_eggs_pie(payload.get("compare_sheds") or [])
    story.append(Paragraph("Eggs by shed", styles["Heading2"]))
    if pie_png is None:
        story.append(Paragraph("No data", styles["Normal"]))
    else:
        story.append(Image(io.BytesIO(pie_png), width=10 * cm, height=7 * cm))
    story.append(Spacer(1, 0.35 * cm))

    story.append(Paragraph("Shed compare", styles["Heading2"]))
    shed_header = ["#", "Name", "Birds", "Eggs", "Deaths", "Hen-day"]
    shed_rows = [shed_header]
    for row in payload.get("compare_sheds") or []:
        hd = row.get("hen_day_pct")
        shed_rows.append(
            [
                str(row.get("number", "")),
                str(row.get("name", "")),
                str(row.get("birds", "")),
                str(row.get("eggs_period", "")),
                str(row.get("deaths_period", "")),
                "—" if hd is None else f"{hd}%",
            ]
        )
    if len(shed_rows) == 1:
        story.append(Paragraph("No data", styles["Normal"]))
    else:
        st = Table(shed_rows, hAlign="LEFT")
        st.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.92, 0.92, 0.92)),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                ]
            )
        )
        story.append(st)
    story.append(Spacer(1, 0.35 * cm))

    story.append(Paragraph("Farm compare", styles["Heading2"]))
    farm_header = ["Name", "Birds", "Eggs", "Deaths", "Hen-day"]
    farm_rows = [farm_header]
    for row in payload.get("compare_farms") or []:
        hd = row.get("hen_day_pct")
        farm_rows.append(
            [
                str(row.get("name", "")),
                str(row.get("birds", "")),
                str(row.get("eggs_period", "")),
                str(row.get("deaths_period", "")),
                "—" if hd is None else f"{hd}%",
            ]
        )
    if len(farm_rows) == 1:
        story.append(Paragraph("No data", styles["Normal"]))
    else:
        ft = Table(farm_rows, hAlign="LEFT")
        ft.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.92, 0.92, 0.92)),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("PADDING", (0, 0), (-1, -1), 5),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                ]
            )
        )
        story.append(ft)

    doc.build(story)
    return buffer.getvalue()
