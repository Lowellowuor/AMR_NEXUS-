from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from src.database import SessionLocal
from src.db.models import GlassReferenceMapping

MAPPINGS = [
    # --- specimen ---
    ("specimen", "blood", "BLOOD", "Blood", 10),
    ("specimen", "urine", "URINE", "Urine", 20),
    ("specimen", "stool", "STOOL", "Stool", 30),
    ("specimen", "swab", "SWAB", "Swab", 40),
    ("specimen", "tissue", "TISSUE", "Tissue", 50),
    ("specimen", "water", "ENV_WATER", "Environmental water", 60),
    ("specimen", "soil", "ENV_SOIL", "Environmental soil", 70),
    # --- sector ---
    ("sector", "human", "HUMAN", "Human", 10),
    ("sector", "animal", "ANIMAL", "Animal", 20),
    ("sector", "livestock", "ANIMAL", "Animal", 21),
    ("sector", "poultry", "ANIMAL", "Animal", 22),
    ("sector", "cattle", "ANIMAL", "Animal", 23),
    ("sector", "goat", "ANIMAL", "Animal", 24),
    ("sector", "pig", "ANIMAL", "Animal", 25),
    ("sector", "swine", "ANIMAL", "Animal", 26),
    ("sector", "environment", "ENVIRONMENT", "Environment", 30),
    # --- antibiotic class ---
    ("antibiotic_class", "penicillin", "PEN", "Penicillins", 10),
    ("antibiotic_class", "aminoglycoside", "AMG", "Aminoglycosides", 20),
    ("antibiotic_class", "carbapenem", "CAR", "Carbapenems", 30),
    ("antibiotic_class", "cephalosporin", "CEP", "Cephalosporins", 40),
    ("antibiotic_class", "fluoroquinolone", "FQ", "Fluoroquinolones", 50),
    ("antibiotic_class", "macrolide", "MAC", "Macrolides", 60),
    ("antibiotic_class", "sulfonamide", "SUL", "Sulfonamides", 70),
    ("antibiotic_class", "tetracycline", "TET", "Tetracyclines", 80),
    ("antibiotic_class", "glycopeptide", "GLY", "Glycopeptides", 90),
    ("antibiotic_class", "polymyxin", "POL", "Polymyxins", 100),
    ("antibiotic_class", "oxazolidinone", "OXA", "Oxazolidinones", 110),
    ("antibiotic_class", "lincosamide", "LIN", "Lincosamides", 120),
    ("antibiotic_class", "phenicol", "PHE", "Phenicols", 130),
]


def main() -> int:
    db = SessionLocal()
    try:
        existing = {
            (r.mapping_type, r.raw_value) for r in db.execute(select(GlassReferenceMapping)).scalars().all()
        }
        added = 0
        for mtype, raw, code, label, order in MAPPINGS:
            if (mtype, raw.lower()) in existing:
                continue
            db.add(
                GlassReferenceMapping(
                    mapping_type=mtype,
                    raw_value=raw.lower(),
                    glass_code=code,
                    glass_label=label,
                    display_order=order,
                )
            )
            added += 1
        db.commit()
        print(f"[seed] glass_reference_mappings: {added} added")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
