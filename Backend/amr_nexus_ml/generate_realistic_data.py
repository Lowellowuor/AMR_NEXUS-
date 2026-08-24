import csv
import random

counties = [
    "Nairobi", "Mombasa", "Kiambu", "Nakuru", "Kisumu", "Uasin Gishu",
    "Machakos", "Kajiado", "Meru", "Nyeri", "Murang'a", "Bomet",
    "Kericho", "Bungoma", "Kakamega", "Busia", "Trans Nzoia", "West Pokot",
    "Turkana", "Laikipia", "Embu", "Kirinyaga", "Nyandarua", "Nandi",
    "Elgeyo-Marakwet", "Baringo", "Samburu", "Marsabit", "Isiolo",
    "Garissa", "Wajir", "Mandera", "Lamu", "Taita-Taveta", "Tana River", "Kilifi"
]
county_weights = [0.10,0.08,0.07,0.06,0.05,0.05,0.04,0.04,0.03,0.03,0.03,0.03,
                  0.03,0.03,0.03,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,0.02,
                  0.02,0.02,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01]

sectors = ['human', 'poultry', 'environment']
human_sub = ['ICU', 'General ward', 'Outpatient', 'Maternity', 'Surgical']
poultry_sub = ['Broiler', 'Layer', 'Indigenous', 'Hatchery']
env_sub = ['Water', 'Soil', 'Wastewater', 'Surface swab']

pathogens = ['ECO', 'KPN', 'ABA', 'PAE', 'SAU', 'EFC', 'SAL', 'CIT']
human_specimen = ['Blood culture', 'Urine', 'Wound swab', 'Respiratory', 'CSF']
poultry_specimen = ['Cloacal swab', 'Fecal', 'Tissue', 'Egg']
env_specimen = ['Water sample', 'Soil sample', 'Swab']

antibiotics = ['Penicillins', 'Cephalosporins', 'Carbapenems', 'Fluoroquinolones',
               'Aminoglycosides', 'Tetracyclines', 'Macrolides', 'Sulfonamides', 'Polymyxins']
test_methods = ['Disk diffusion', 'Broth microdilution', 'E-test', 'VITEK 2']

# Base MDR rates per sector
sector_mdr_base = {'human': 0.4, 'poultry': 0.3, 'environment': 0.2}
# Pathogen MDR multipliers
pathogen_mdr_mult = {'ECO': 1.0, 'KPN': 1.3, 'ABA': 1.5, 'PAE': 1.4,
                     'SAU': 0.9, 'EFC': 1.2, 'SAL': 0.7, 'CIT': 0.8}

random.seed(42)
rows = []
for _ in range(3000):
    sector = random.choices(sectors, weights=[0.55, 0.30, 0.15], k=1)[0]
    if sector == 'human':
        sub_sector = random.choice(human_sub)
        specimen = random.choice(human_specimen)
    elif sector == 'poultry':
        sub_sector = random.choice(poultry_sub)
        specimen = random.choice(poultry_specimen)
    else:
        sub_sector = random.choice(env_sub)
        specimen = random.choice(env_specimen)

    pathogen = random.choices(pathogens,
                              weights=[0.3,0.25,0.1,0.1,0.1,0.05,0.05,0.05], k=1)[0]
    county = random.choices(counties, weights=county_weights, k=1)[0]
    antibiotic = random.choice(antibiotics)
    test_method = random.choice(test_methods)
    sample_month = random.randint(1, 12)

    prior_exposure_prob = 0.2
    if sector == 'human' and sub_sector == 'ICU':
        prior_exposure_prob = 0.6
    elif sector == 'human':
        prior_exposure_prob = 0.35
    elif sector == 'poultry':
        prior_exposure_prob = 0.25
    prior_exposure = 1 if random.random() < prior_exposure_prob else 0

    mdr_prob = sector_mdr_base[sector] * pathogen_mdr_mult[pathogen]
    if prior_exposure == 1:
        mdr_prob *= 2.5
    if sample_month in [3,4,5,10,11]:
        mdr_prob *= 1.2
    mdr_prob = min(0.95, mdr_prob)
    mdr_flag = 1 if random.random() < mdr_prob else 0

    rows.append([sector, sub_sector, pathogen, specimen, county, antibiotic,
                 test_method, sample_month, prior_exposure, mdr_flag])

with open('kenya_amr_3000_isolates.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['sector','sub_sector','pathogen_code','specimen_type','county',
                     'antibiotic_class','test_method','sample_month',
                     'prior_antibiotic_exposure','mdr_flag'])
    writer.writerows(rows)

print("Generated 3000 realistic AMR records.")