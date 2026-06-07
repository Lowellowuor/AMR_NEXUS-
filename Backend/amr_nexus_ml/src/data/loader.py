import pandas as pd
import numpy as np
from pathlib import Path
from src.utils.config import config
from src.utils.logger import logger

PATHOGEN_TO_CODE = {
    'Escherichia coli': 'eco',
    'Klebsiella pneumoniae': 'kpn',
    'Staphylococcus aureus': 'sau',
    'Salmonella spp.': 'sal',
    'Campylobacter jejuni': 'cam',
    'Pseudomonas aeruginosa': 'pae',
    'Acinetobacter baumannii': 'aba',
    'Enterococcus faecalis': 'efc',
    'Streptococcus pneumoniae': 'spn',
    'Enterobacter cloacae': 'ecl',
}

ANTIBIOTIC_TO_CLASS = {
    'Ciprofloxacin': 'Fluoroquinolone',
    'Amoxicillin': 'Penicillin',
    'Gentamicin': 'Aminoglycoside',
    'Carbapenem': 'Carbapenem',
    'Tetracycline': 'Tetracycline',
    'Azithromycin': 'Macrolide',
    'Ceftriaxone': 'Cephalosporin',
    'Trimethoprim': 'Folate inhibitor',
    'Vancomycin': 'Glycopeptide',
    'Colistin': 'Polymyxin',
}

def load_training_data(limit: int = None) -> pd.DataFrame:
    data_path = Path(config.DATA_FILE_PATH)
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")
    
    logger.info(f"Loading data from {data_path}")
    
    try:
        df = pd.read_csv(data_path, encoding='utf-8')
    except Exception:
        df = pd.read_excel(data_path, engine='openpyxl')
    
    # ------------------- REAL DATA COLUMNS -------------------
    if 'classification' in df.columns and 'resistance_rate' in df.columns:
        # Real Kenyan data
        df['mdr_flag'] = df['classification'].astype(str).str.upper().isin(['MDR', 'XDR', 'PDR']).astype(int)
        df['sir_result'] = df['resistance_rate'].apply(lambda x: 'R' if x > 0.5 else 'S')
        df['pathogen_code'] = df['pathogen'].map(PATHOGEN_TO_CODE)
        df['antibiotic_class'] = df['antibiotic'].map(ANTIBIOTIC_TO_CLASS)
        df = df.dropna(subset=['pathogen_code', 'antibiotic_class'])
        df['sector'] = df['sector'].astype(str).str.upper().replace({'POULTRY': 'ANIMAL'})
        if 'month' in df.columns:
            df['sample_month'] = pd.to_numeric(df['month'], errors='coerce')
        elif 'sample_month' in df.columns:
            df['sample_month'] = pd.to_numeric(df['sample_month'], errors='coerce')
    else:
        # ------------------- SYNTHETIC DATA (already has required columns) -------------------
        # Ensure required columns exist
        required = ['mdr_flag', 'pathogen_code', 'sir_result', 'antibiotic_class', 'sector', 'county', 'sample_month']
        for col in required:
            if col not in df.columns:
                raise KeyError(f"Synthetic data missing column '{col}'. Please generate synthetic data with correct columns.")
        # For synthetic data, pathogen_code is already a code (eco, kpn, etc.)
        # No need to map. Ensure numeric.
        df['sample_month'] = pd.to_numeric(df['sample_month'], errors='coerce')
        df['sector'] = df['sector'].str.upper()
    
    # Common post-processing
    if 'specimen_type' not in df.columns:
        df['specimen_type'] = 'unknown'
    if 'test_method' not in df.columns:
        df['test_method'] = 'Disk diffusion'
    if 'sub_sector' not in df.columns:
        df['sub_sector'] = df['sector'].apply(lambda x: 'Inpatient' if x == 'HUMAN' else 'Poultry-Broiler')
    if 'patient_age_years' not in df.columns:
        df['patient_age_years'] = -1
    if 'county' in df.columns:
        df['county'] = df['county'].fillna('unknown')
    
    # Drop rows with missing critical values
    critical = ['mdr_flag', 'pathogen_code', 'sir_result', 'antibiotic_class', 'sector', 'county', 'sample_month']
    df = df.dropna(subset=critical)
    df['sample_month'] = df['sample_month'].astype(int)
    
    if limit:
        df = df.head(limit)
    
    logger.info(f"Loaded {len(df)} records after mapping")
    return df