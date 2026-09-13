import sqlite3

# Kenya sub-county centroids (approximate, county seat coordinates)
# Covers the 47 counties with 1-2 major sub-counties each
LOCATIONS = [
    ("Nairobi", "Westlands", -1.2673, 36.8017),
    ("Nairobi", "Embakasi", -1.3236, 36.8943),
    ("Nairobi", "Dagoretti North", -1.2970, 36.7541),
    ("Mombasa", "Mvita", -4.0435, 39.6682),
    ("Mombasa", "Kisauni", -4.0333, 39.6833),
    ("Kisumu", "Kisumu Central", -0.0917, 34.7680),
    ("Kisumu", "Nyando", -0.2167, 34.9167),
    ("Nakuru", "Nakuru East", -0.3031, 36.0800),
    ("Nakuru", "Naivasha", -0.7167, 36.4333),
    ("Uasin Gishu", "Eldoret", 0.5167, 35.2833),
    ("Kiambu", "Kiambu", -1.1714, 36.8356),
    ("Kiambu", "Thika", -1.0333, 37.0693),
    ("Machakos", "Machakos", -1.5177, 37.2634),
    ("Kajiado", "Kajiado Central", -1.8521, 36.7768),
    ("Kakamega", "Kakamega", 0.2827, 34.7519),
    ("Bungoma", "Bungoma", 0.5635, 34.5606),
    ("Meru", "Meru Central", 0.0500, 37.6500),
    ("Nyeri", "Nyeri Central", -0.4167, 36.9500),
    ("Kirinyaga", "Kirinyaga Central", -0.4989, 37.2800),
    ("Murang'a", "Murang'a", -0.7167, 37.1500),
    ("Laikipia", "Laikipia East", 0.0333, 36.3667),
    ("Laikipia", "Laikipia West", 0.1500, 36.2000),
    ("Kericho", "Bureti", -0.4500, 35.2000),
    ("Kericho", "Kericho", -0.3667, 35.2833),
    ("Bomet", "Bomet", -0.7833, 35.3500),
    ("Narok", "Narok", -1.0833, 35.8667),
    ("Kisii", "Kisii Central", -0.6817, 34.7667),
    ("Nyamira", "Nyamira", -0.5667, 34.9333),
    ("Homa Bay", "Homa Bay", -0.5273, 34.4571),
    ("Migori", "Migori", -1.0634, 34.4731),
    ("Siaya", "Siaya", 0.0607, 34.2882),
    ("Vihiga", "Vihiga", 0.0500, 34.7167),
    ("Busia", "Busia", 0.4608, 34.1115),
    ("Trans Nzoia", "Kitale", 1.0167, 35.0000),
    ("West Pokot", "Kapenguria", 1.2389, 35.1119),
    ("Turkana", "Lodwar", 3.1191, 35.5972),
    ("Samburu", "Maralal", 1.0967, 36.6986),
    ("Isiolo", "Isiolo", 0.3546, 37.5822),
    ("Marsabit", "Marsabit", 2.3344, 37.9899),
    ("Mandera", "Mandera", 3.9366, 41.8670),
    ("Wajir", "Wajir", 1.7471, 40.0573),
    ("Garissa", "Garissa", -0.4536, 39.6461),
    ("Tana River", "Hola", -1.5000, 40.0333),
    ("Lamu", "Lamu", -2.2717, 40.9020),
    ("Kilifi", "Kilifi", -3.6305, 39.8499),
    ("Kilifi", "Kaloleni", -3.7500, 39.6333),
    ("Taita Taveta", "Voi", -3.3961, 38.5561),
    ("Kwale", "Kwale", -4.1737, 39.4521),
    ("Taita Taveta", "Wundanyi", -3.4000, 38.3667),
    ("Tharaka Nithi", "Kathwana", -0.3167, 37.9333),
    ("Embu", "Embu", -0.5397, 37.4574),
    ("Kitui", "Kitui", -1.3667, 38.0167),
    ("Makueni", "Wote", -1.7833, 37.6333),
    ("Nyandarua", "Ol Kalou", -0.2667, 36.3833),
    ("Elgeyo Marakwet", "Iten", 0.6667, 35.5000),
    ("Baringo", "Kabarnet", 0.4919, 35.7430),
    ("Nandi", "Kapsabet", 0.2000, 35.1000),
    ("Kajiado", "Kitengela", -1.5167, 36.9500),
]

conn = sqlite3.connect('amr_data.db')
cur = conn.cursor()

# Clear existing rows to avoid duplicates
cur.execute("DELETE FROM sub_county_locations")

for county, sub_county, lat, lon in LOCATIONS:
    cur.execute(
        "INSERT INTO sub_county_locations (county, sub_county, latitude, longitude) VALUES (?, ?, ?, ?)",
        (county, sub_county, lat, lon)
    )

conn.commit()
count = cur.execute("SELECT COUNT(*) FROM sub_county_locations").fetchone()[0]
conn.close()
print(f"Inserted {count} sub-county locations")
