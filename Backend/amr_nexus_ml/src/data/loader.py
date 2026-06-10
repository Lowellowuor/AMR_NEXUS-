"""
AMR Nexus ML Pipeline — Resilient Data Loader Module (v1.8)
Handles automated file signature sniffing and defensive schema parsing.
"""

from pathlib import Path
import pandas as pd
import numpy as np
from src.utils.config import config
from src.utils.logger import logger

PATHOGEN_TO_CODE = {
    'escherichia coli': 'eco',
    'klebsiella pneumoniae': 'kpn',
    'staphylococcus aureus': 'sau',
    'salmonella spp.': 'sal',
    'campylobacter jejuni': 'cam',
    'pseudomonas aeruginosa': 'pae',
    'acinetobacter baumannii': 'aba',
    'enterococcus faecalis': 'efc',
    'streptococcus pneumoniae': 'spn',
    'enterobacter cloacae': 'ecl',
}

ANTIBIOTIC_TO_CLASS = {
    'ciprofloxacin': 'Fluoroquinolone',
    'amoxicillin': 'Penicillin',
    'gentamicin': 'Aminoglycoside',
    'carbapenem': 'Carbapenem',
    'tetracycline': 'Tetracycline',
    'azithromycin': 'Macrolide',
    'ceftriaxone': 'Cephalosporin',
    'trimethoprim': 'Folate inhibitor',
    'vancomycin': 'Glycopeptide',
    'colistin': 'Polymyxin',
}


def load_training_data(limit: int = None) -> pd.DataFrame:
    data_path = Path(config.DATA_FILE_PATH)
    if not data_path.exists():
        raise FileNotFoundError(f"Data file not found: {data_path}")
    
    logger.info(f"Loading data securely from {data_path}")
    
    lower_path = data_path.name.lower()
    if lower_path.endswith('.xlsx') or lower_path.endswith('.xls'):
        df = pd.read_excel(data_path, engine='openpyxl')
    else:
        try:
            df = pd.read_csv(data_path, encoding='utf-8')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(data_path, encoding='utf-8-sig')
            except UnicodeDecodeError:
                df = pd.read_excel(data_path, engine='openpyxl')

    df.columns = df.columns.str.strip()

    if 'classification' in df.columns and 'resistance_rate' in df.columns:
        logger.info("Real Kenyan AMR dataset structure detected. Formatting columns...")
        
        df['mdr_flag'] = df['classification'].astype(str).str.upper().str.strip().isin(['MDR', 'XDR', 'PDR']).astype(int)
        df['sir_result'] = df['resistance_rate'].apply(lambda x: 'R' if x > 0.5 else 'S')
        
        df['pathogen_code'] = df['pathogen'].astype(str).str.lower().str.strip().map(PATHOGEN_TO_CODE)
        df['antibiotic_class'] = df['antibiotic'].astype(str).str.lower().str.strip().map(ANTIBIOTIC_TO_CLASS)
        
        df['sector'] = df['sector'].astype(str).str.upper().str.strip().replace({'POULTRY': 'ANIMAL'})
        
        # FIX: Explicitly enforce backfill of sample_month column from month key
        if 'month' in df.columns:
            df['sample_month'] = pd.to_numeric(df['month'], errors='coerce')
        elif 'sample_month' in df.columns:
            df['sample_month'] = pd.to_numeric(df['sample_month'], errors='coerce')
        else:
            df['sample_month'] = 1
    else:
        logger.info("Synthetic or Pre-mapped AMR dataset layout detected.")
        required = ['mdr_flag', 'pathogen_code', 'sir_result', 'antibiotic_class', 'sector', 'county', 'sample_month']
        for col in required:
            if col not in df.columns:
                if col == 'mdr_flag':
                    df['mdr_flag'] = 0
                elif col == 'sample_month':
                    df['sample_month'] = 1
                else:
                    df[col] = 'unknown'
        
        df['sample_month'] = pd.to_numeric(df['sample_month'], errors='coerce')
        df['sector'] = df['sector'].astype(str).str.upper().str.strip()
    
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
    else:
        df['county'] = 'unknown'
    
    # Force backfill of any NaNs in sample_month before converting types
    df['sample_month'] = df['sample_month'].fillna(1).astype(int)
    
    critical = ['mdr_flag', 'pathogen_code', 'sir_result', 'antibiotic_class', 'sector', 'county', 'sample_month']
    df = df.dropna(subset=critical)
    
    if limit:
        df = df.head(limit)
    
    logger.info(f"Loaded {len(df)} records safely after dynamic format mapping.")
    return df
