from __future__ import annotations

import io
from datetime import UTC, datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from src.db.models import AMRIsolateRecord, Case

INK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#64748b")
ACCENT = colors.HexColor("#0d9488")
CRITICAL = colors.HexColor("#dc2626")
WARNING = colors.HexColor("#d97706")
SUCCESS = colors.HexColor("#16a34a")
BORDER = colors.HexColor("#cbd5e1")
BG_SOFT = colors.HexColor("#f8fafc")


def _styles() -> dict[str, ParagraphStyle]:
    ss = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "title",
            parent=ss["Title"],
            fontSize=18,
            textColor=INK,
            spaceAfter=2,
            alignment=0,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            parent=ss["Normal"],
            fontSize=9,
            textColor=MUTED,
            spaceAfter=10,
        ),
        "section": ParagraphStyle(
            "section",
            parent=ss["Heading2"],
            fontSize=12,
            textColor=ACCENT,
            spaceBefore=14,
            spaceAfter=6,
        ),
        "label": ParagraphStyle(
            "label",
            parent=ss["Normal"],
            fontSize=8,
            textColor=MUTED,
        ),
        "value": ParagraphStyle(
            "value",
            parent=ss["Normal"],
            fontSize=10,
            textColor=INK,
        ),
        "body": ParagraphStyle(
            "body",
            parent=ss["Normal"],
            fontSize=9,
            textColor=INK,
            leading=12,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=ss["Normal"],
            fontSize=7,
            textColor=MUTED,
        ),
    }


def _fmt(value: Any, fallback: str = "—") -> str:
    if value is None or value == "":
        return fallback
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _kv_table(rows: list[tuple[str, str]], styles: dict[str, ParagraphStyle]) -> Table:
    data = []
    for label, value in rows:
        data.append(
            [
                Paragraph(label, styles["label"]),
                Paragraph(value, styles["value"]),
            ]
        )
    table = Table(data, colWidths=[42 * mm, 108 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -2), 0.25, BORDER),
            ]
        )
    )
    return table


def _mdr_colour(flag: bool | None) -> colors.Color:
    if flag is True:
        return CRITICAL
    if flag is False:
        return SUCCESS
    return MUTED


def _mdr_label(flag: bool | None) -> str:
    if flag is True:
        return "MDR detected"
    if flag is False:
        return "Not MDR"
    return "Not determined"


def _build_story(
    record: AMRIsolateRecord,
    case: Case | None,
    case_isolates: list[AMRIsolateRecord],
    generated_by: str | None,
    guidance: dict | None = None,
) -> list:
    styles = _styles()
    story: list = []

    story.append(Paragraph("AMR-Nexus — Clinical Summary", styles["title"]))
    story.append(
        Paragraph(
            f"Generated {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}"
            + (f" · by {generated_by}" if generated_by else ""),
            styles["subtitle"],
        )
    )

    mdr_flag = bool(record.mdr_flag) if record.mdr_flag is not None else None
    probability = f"{float(record.mdr_probability) * 100:.1f}%" if record.mdr_probability is not None else "—"

    banner = Table(
        [
            [
                Paragraph(
                    f"<b>Record ID:</b> {_fmt(record.record_id)}",
                    styles["body"],
                ),
                Paragraph(
                    f'<font color="{_mdr_colour(mdr_flag).hexval()}"><b>{_mdr_label(mdr_flag)}</b></font>',
                    styles["body"],
                ),
            ],
            [
                Paragraph(
                    f"<b>MDR probability:</b> {probability}",
                    styles["body"],
                ),
                Paragraph(
                    f"<b>Model:</b> {_fmt(record.model_version)}",
                    styles["body"],
                ),
            ],
        ],
        colWidths=[90 * mm, 60 * mm],
    )
    banner.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), BG_SOFT),
                ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(banner)

    story.append(Paragraph("Isolate", styles["section"]))
    story.append(
        _kv_table(
            [
                ("Pathogen", _fmt(record.pathogen_code)),
                ("Sector", _fmt(record.sector)),
                ("Sub-sector", _fmt(record.sub_sector)),
                ("Species", _fmt(record.animal_species)),
                ("Specimen", _fmt(record.specimen_type)),
                ("Antibiotic class", _fmt(record.antibiotic_class)),
                ("Test method", _fmt(record.test_method)),
                ("SIR result", _fmt(record.sir_result)),
                (
                    "Collection date",
                    _fmt(record.sample_collection_date or record.created_at),
                ),
            ],
            styles,
        )
    )

    story.append(Paragraph("Location", styles["section"]))
    story.append(
        _kv_table(
            [
                ("County", _fmt(record.county)),
                ("Sub-county", _fmt(record.sub_county)),
                ("Urban/rural", _fmt(record.urban_rural)),
                ("Site ID", _fmt(record.site_id)),
            ],
            styles,
        )
    )

    patient_rows = [
        ("Age", _fmt(record.patient_age_years)),
        ("Sex", _fmt(record.patient_sex)),
        ("Ward type", _fmt(record.ward_type)),
        ("Infection origin", _fmt(record.infection_origin)),
        ("Prior antibiotic exposure", _fmt(record.prior_antibiotic_exposure)),
    ]
    if any(v != "—" for _, v in patient_rows):
        story.append(Paragraph("Patient context", styles["section"]))
        story.append(_kv_table(patient_rows, styles))

    story.append(Paragraph("Prediction and explanation", styles["section"]))
    story.append(
        _kv_table(
            [
                ("MDR probability", probability),
                (
                    "Anomaly",
                    "Yes"
                    if record.anomaly_flag
                    else "No"
                    + (
                        f" (score {float(record.anomaly_score):.3f})"
                        if record.anomaly_score is not None
                        else ""
                    ),
                ),
                ("Model version", _fmt(record.model_version)),
                ("Top contributing feature", _fmt(record.shap_top_feature)),
                (
                    "Feature contribution",
                    f"{float(record.shap_value):+.3f}" if record.shap_value is not None else "—",
                ),
            ],
            styles,
        )
    )
    if record.shap_summary:
        story.append(Spacer(1, 4))
        story.append(Paragraph(_fmt(record.shap_summary), styles["body"]))

    if case is not None:
        story.append(Paragraph("Case", styles["section"]))
        story.append(
            _kv_table(
                [
                    ("Case code", _fmt(case.case_code)),
                    ("Status", _fmt(case.status)),
                    ("Type", _fmt(case.case_type)),
                    ("First isolate", _fmt(case.first_isolate_at)),
                    ("Latest isolate", _fmt(case.latest_isolate_at)),
                    ("Total isolates", str(len(case_isolates) + 1)),
                ],
                styles,
            )
        )
        others = [r for r in case_isolates if str(r.record_id) != str(record.record_id)]
        if others:
            story.append(Spacer(1, 4))
            story.append(Paragraph("Other isolates in this case", styles["body"]))
            rows = [["Record ID", "Pathogen", "Specimen", "MDR", "Collected"]]
            for r in others:
                rows.append(
                    [
                        str(r.record_id)[:8],
                        _fmt(r.pathogen_code),
                        _fmt(r.specimen_type),
                        "MDR" if r.mdr_flag else "—",
                        _fmt(r.sample_collection_date or r.created_at),
                    ]
                )
            t = Table(rows, colWidths=[25 * mm, 45 * mm, 30 * mm, 20 * mm, 30 * mm])
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), BG_SOFT),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("LINEBELOW", (0, 0), (-1, -1), 0.25, BORDER),
                    ]
                )
            )
            story.append(t)

    if guidance is None:
        story.append(Paragraph("Clinical interpretation", styles["section"]))
        story.append(
            Paragraph(
                "No observed resistance data available for this pathogen "
                "in the current window. The platform has not recorded enough "
                "classified isolates (S/I/R or MDR flag) to rank antibiotic "
                "classes. Treat the prediction above as a model output only, "
                "not as guidance backed by local resistance data.",
                styles["body"],
            )
        )

    if guidance:
        story.append(Paragraph("Clinical interpretation", styles["section"]))
        story.append(
            Paragraph(
                guidance.get("clinical_annotation_note", ""),
                styles["body"],
            )
        )
        story.append(Spacer(1, 4))

        primary = guidance.get("primary_recommendation")
        if primary:
            story.append(
                Paragraph(
                    f"<b>Primary recommendation:</b> {primary}",
                    styles["body"],
                )
            )
            story.append(Spacer(1, 6))

        ranked = guidance.get("ranked_treatment_alternatives", [])
        if ranked:
            rows = [["Antibiotic class", "AWaRe", "Samples", "Resistance"]]
            for r in ranked[:10]:
                small = " *" if r.get("small_sample") else ""
                rows.append(
                    [
                        str(r["antibiotic_agent"]) + small,
                        str(r["who_category"]),
                        str(r["samples"]),
                        f"{r['resistance_rate']:.1f}%",
                    ]
                )
            t = Table(rows, colWidths=[70 * mm, 25 * mm, 22 * mm, 28 * mm])
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), BG_SOFT),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ("TOPPADDING", (0, 0), (-1, -1), 4),
                        ("LINEBELOW", (0, 0), (-1, -1), 0.25, BORDER),
                    ]
                )
            )
            story.append(t)
            story.append(Spacer(1, 4))
            story.append(
                Paragraph(
                    "* fewer than 10 samples — treat resistance estimate with caution.",
                    styles["footer"],
                )
            )
            story.append(Spacer(1, 4))
            story.append(
                Paragraph(
                    guidance.get("evidence_note", ""),
                    styles["body"],
                )
            )

    story.append(Spacer(1, 16))
    story.append(
        Paragraph(
            "This summary is generated by AMR-Nexus from submitted isolate data. "
            "It is a decision-support aid, not a substitute for clinical judgement. "
            "Confirm any treatment decision against local laboratory results and "
            "national guidance.",
            styles["footer"],
        )
    )

    return story


def _footer(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(
        20 * mm,
        12 * mm,
        "AMR-Nexus — Clinical Summary — for clinical use only",
    )
    canvas.drawRightString(
        A4[0] - 20 * mm,
        12 * mm,
        f"Page {doc.page}",
    )
    canvas.restoreState()


def render_clinical_summary(
    record: AMRIsolateRecord,
    *,
    case: Case | None = None,
    case_isolates: list[AMRIsolateRecord] | None = None,
    generated_by: str | None = None,
    guidance: dict | None = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title=f"AMR-Nexus Clinical Summary {record.record_id}",
        author="AMR-Nexus",
    )
    story = _build_story(
        record,
        case,
        case_isolates or [],
        generated_by,
        guidance,
    )
    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buffer.getvalue()
