import sqlite3
from datetime import datetime

conn = sqlite3.connect('amr_data.db')
cur = conn.cursor()

# Clear existing hotspots
cur.execute("DELETE FROM hotspots")

# Get distinct county/sub_county from records
cur.execute("""
    SELECT DISTINCT county, sub_county
    FROM amr_isolate_records
    WHERE county IS NOT NULL AND sub_county IS NOT NULL
""")
pairs = cur.fetchall()

created = 0
linked = 0

for county, sub_county in pairs:
    # Look up coordinates
    cur.execute(
        "SELECT latitude, longitude FROM sub_county_locations WHERE county = ? AND sub_county = ?",
        (county, sub_county)
    )
    row = cur.fetchone()
    if row:
        lat, lon = row
    else:
        # Skip if no coordinates available
        print(f"Skipping {sub_county}, {county} (no coordinates)")
        continue

    # Create hotspot
    cur.execute("""
        INSERT INTO hotspots (name, type, latitude, longitude, county, sub_county, is_active, created_at, updated_at)
        VALUES (?, 'sub_county', ?, ?, ?, ?, 1, ?, ?)
    """, (f"{sub_county} Health Facility", lat, lon, county, sub_county, datetime.now(), datetime.now()))
    hotspot_id = cur.lastrowid
    created += 1

    # Link records
    cur.execute("""
        UPDATE amr_isolate_records
        SET hotspot_id = ?
        WHERE county = ? AND sub_county = ?
    """, (hotspot_id, county, sub_county))
    linked += cur.rowcount

conn.commit()
conn.close()
print(f"Created {created} hotspots, linked {linked} records")
