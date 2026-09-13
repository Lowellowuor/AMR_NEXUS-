import sqlite3
import hashlib
from datetime import datetime

conn = sqlite3.connect('amr_data.db')
cur = conn.cursor()

# Build county -> (lat, lon) lookup from sub_county_locations
cur.execute("SELECT DISTINCT county, latitude, longitude FROM sub_county_locations WHERE latitude IS NOT NULL AND longitude IS NOT NULL")
county_centroids = {}
for county, lat, lon in cur.fetchall():
    if county not in county_centroids:
        county_centroids[county] = (float(lat), float(lon))

# Fallback: Kenya center
KENYA_CENTER = (-0.0236, 37.9062)

# Normalize county names (handle hyphenation variants)
def normalize_county(c):
    if not c:
        return c
    return c.replace('-', ' ').replace('  ', ' ').strip()

# Build a normalized lookup
norm_centroids = {normalize_county(k): v for k, v in county_centroids.items()}

def get_county_centroid(county):
    if not county:
        return KENYA_CENTER
    key = normalize_county(county)
    if key in norm_centroids:
        return norm_centroids[key]
    # Try partial match (case-insensitive)
    for k, v in norm_centroids.items():
        if k.lower() == key.lower():
            return v
    return KENYA_CENTER

def offset_coords(lat, lon, seed_str):
    """Generate a deterministic offset around (lat, lon) using a hash of seed_str."""
    h = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    # Offset up to ±0.15 deg (~15 km)
    dlat = ((h % 300) - 150) / 1000.0
    dlon = (((h // 300) % 300) - 150) / 1000.0
    return lat + dlat, lon + dlon

# Clear existing hotspots
cur.execute("DELETE FROM hotspots")
cur.execute("UPDATE amr_isolate_records SET hotspot_id = NULL")

# Get all distinct (county, sub_county) pairs from records
cur.execute("""
    SELECT county, sub_county, COUNT(*) as cnt
    FROM amr_isolate_records
    WHERE county IS NOT NULL AND sub_county IS NOT NULL
    GROUP BY county, sub_county
    ORDER BY county, sub_county
""")
pairs = cur.fetchall()

created = 0
linked = 0
exact = 0
derived = 0

for county, sub_county, cnt in pairs:
    # Try exact match in sub_county_locations
    cur.execute(
        "SELECT latitude, longitude FROM sub_county_locations WHERE county = ? AND sub_county = ?",
        (county, sub_county)
    )
    row = cur.fetchone()
    if row:
        lat, lon = float(row[0]), float(row[1])
        exact += 1
    else:
        # Derive from county centroid
        clat, clon = get_county_centroid(county)
        lat, lon = offset_coords(clat, clon, f"{county}_{sub_county}")
        derived += 1

    cur.execute("""
        INSERT INTO hotspots (name, type, latitude, longitude, county, sub_county, is_active, created_at, updated_at)
        VALUES (?, 'sub_county', ?, ?, ?, ?, 1, ?, ?)
    """, (f"{sub_county} Health Facility", lat, lon, county, sub_county, datetime.now(), datetime.now()))
    hotspot_id = cur.lastrowid
    created += 1

    cur.execute("""
        UPDATE amr_isolate_records
        SET hotspot_id = ?
        WHERE county = ? AND sub_county = ?
    """, (hotspot_id, county, sub_county))
    linked += cur.rowcount

conn.commit()
conn.close()

print(f"Exact coordinates:   {exact}")
print(f"Derived coordinates: {derived}")
print(f"Created {created} hotspots, linked {linked} records")
