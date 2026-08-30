from sqlalchemy.orm import Session
from src.db.models import AMRIsolateRecord


def get_county_name_from_db(db: Session, county_code: str) -> str:
    if not county_code:
        return county_code
    result = (
        db.query(AMRIsolateRecord.county)
        .filter(AMRIsolateRecord.county.ilike(county_code))
        .first()
    )
    return result[0] if result else county_code