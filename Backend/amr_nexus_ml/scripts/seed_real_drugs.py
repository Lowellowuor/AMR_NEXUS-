"""Seed real WHO-recognised antibiotics with proper AWaRe classification.

Replaces the placeholder TestDrug entries in the drug reference. Existing
consumption records are re-pointed at the new drugs so historical totals
are preserved.

Run once on a fresh dev database:

    python scripts/seed_real_drugs.py

Safe to run repeatedly: skips if real drugs are already present.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Allow running as a script from any working directory
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from src.database import SessionLocal  # noqa: E402
from src.modules.amu.models import AMUConsumption, AMUDrug  # noqa: E402

# WHO AWaRe 2023. Hand-curated, matching the WHO EML antibiotic book.
# (name, who_category, atc_code, route, species_approved)
REAL_DRUGS = [
    # --- Access (first- and second-line, widely available) ---
    ("Amoxicillin", "Access", "J01CA04", "oral", "human, animal"),
    ("Amoxicillin-clavulanate", "Access", "J01CR02", "oral", "human"),
    ("Ampicillin", "Access", "J01CA01", "IV", "human"),
    ("Benzylpenicillin", "Access", "J01CE01", "IV", "human"),
    ("Cefazolin", "Access", "J01DB04", "IV", "human"),
    ("Cefoxitin", "Access", "J01DC01", "IV", "human"),
    ("Gentamicin", "Access", "J01GB03", "IV", "human, animal"),
    ("Doxycycline", "Access", "J01AA02", "oral", "human, animal"),
    ("Nitrofurantoin", "Access", "J01XE01", "oral", "human"),
    ("Trimethoprim-sulfamethoxazole", "Access", "J01EE01", "oral", "human, animal"),
    # --- Watch (higher resistance potential) ---
    ("Ceftriaxone", "Watch", "J01DD04", "IV", "human, animal"),
    ("Cefotaxime", "Watch", "J01DD01", "IV", "human"),
    ("Ceftazidime", "Watch", "J01DD02", "IV", "human"),
    ("Cefepime", "Watch", "J01DE01", "IV", "human"),
    ("Ciprofloxacin", "Watch", "J01MA02", "oral", "human, animal"),
    ("Levofloxacin", "Watch", "J01MA12", "oral", "human"),
    ("Azithromycin", "Watch", "J01FA10", "oral", "human"),
    ("Clarithromycin", "Watch", "J01FA09", "oral", "human"),
    ("Meropenem", "Watch", "J01DH02", "IV", "human"),
    ("Imipenem", "Watch", "J01DH51", "IV", "human"),
    ("Piperacillin-tazobactam", "Watch", "J01CR05", "IV", "human"),
    ("Vancomycin", "Watch", "J01XA01", "IV", "human"),
    ("Metronidazole", "Watch", "J01XD01", "oral", "human"),
    # --- Reserve (last-resort) ---
    ("Colistin", "Reserve", "J01XB01", "IV", "human, animal"),
    ("Polymyxin B", "Reserve", "J01XB02", "IV", "human"),
    ("Ceftazidime-avibactam", "Reserve", "J01DD52", "IV", "human"),
    ("Meropenem-vaborbactam", "Reserve", "J01DH52", "IV", "human"),
    ("Linezolid", "Reserve", "J01XX08", "oral", "human"),
    ("Tigecycline", "Reserve", "J01AA12", "IV", "human"),
    ("Daptomycin", "Reserve", "J01XX09", "IV", "human"),
]


def _is_placeholder(name: str) -> bool:
    return name.startswith("TestDrug-")


def main() -> int:
    db = SessionLocal()
    try:
        existing = db.execute(select(AMUDrug)).scalars().all()
        real_present = any(not _is_placeholder(d.name) for d in existing)
        if real_present:
            print("[seed] real drugs already present, skipping")
            return 0

        print(f"[seed] found {len(existing)} placeholder drugs, replacing")

        # Insert the real drugs
        new_drugs = []
        for name, who, atc, route, species in REAL_DRUGS:
            d = AMUDrug(
                name=name,
                who_category=who,
                atc_code=atc,
                route=route,
                species_approved=species,
                is_active=True,
            )
            db.add(d)
            new_drugs.append(d)
        db.commit()
        for d in new_drugs:
            db.refresh(d)
        print(f"[seed] inserted {len(new_drugs)} real drugs")

        # Re-point consumption records at the new drugs, round-robin.
        # Preserves total quantity and record count.
        consumption = db.execute(select(AMUConsumption)).scalars().all()
        for i, c in enumerate(consumption):
            c.drug_id = new_drugs[i % len(new_drugs)].id
        db.commit()
        print(f"[seed] reassigned {len(consumption)} consumption records")

        # Deactivate the placeholder drugs (soft delete, keep for FK integrity)
        for d in existing:
            if _is_placeholder(d.name):
                d.is_active = False
        db.commit()
        print(f"[seed] deactivated {len(existing)} placeholder drugs")

        print("[seed] done")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
