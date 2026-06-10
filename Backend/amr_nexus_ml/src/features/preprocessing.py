
import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder, LabelEncoder, StandardScaler
from joblib import dump, load
from src.utils.logger import logger


class FeaturePreprocessor:
    def __init__(self):
        self.label_encoders = {}
        self.ohe = None
        self.scaler = StandardScaler()
        self.cat_cols = ['sector', 'specimen_type', 'antibiotic_class', 'test_method',
                         'age_group', 'gender', 'facility']
        self.numeric_cols = ['patient_age_years', 'sample_month', 'prior_antibiotic_use', 'hospitalised']
        self.high_card_cols = ['pathogen_code', 'county', 'sub_sector']
        
    def fit(self, df: pd.DataFrame) -> 'FeaturePreprocessor':
        df_clean = self._ensure_columns(df.copy())
        df_clean = self._clean_binary_strings(df_clean)
        df_clean = self._handle_missing(df_clean)
        
        for col in self.high_card_cols:
            if col in df_clean.columns:
                le = LabelEncoder()
                df_clean[f'{col}_enc'] = le.fit_transform(df_clean[col].astype(str))
                self.label_encoders[col] = le
                
        existing_cat = [c for c in self.cat_cols if c in df_clean.columns]
        if existing_cat:
            self.ohe = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            self.ohe.fit(df_clean[existing_cat].astype(str))
            
        existing_num = [c for c in self.numeric_cols if c in df_clean.columns]
        if existing_num:
            self.scaler.fit(df_clean[existing_num])
            
        return self
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        df_clean = self._ensure_columns(df.copy())
        df_clean = self._clean_binary_strings(df_clean)
        df_clean = self._handle_missing(df_clean)
        
        for col in self.high_card_cols:
            if col in df_clean.columns and col in self.label_encoders:
                le = self.label_encoders[col]
                df_clean[f'{col}_enc'] = df_clean[col].astype(str).apply(
                    lambda x: le.transform([x])[0] if x in le.classes_ else -1
                )
                
        existing_cat = [c for c in self.cat_cols if c in df_clean.columns]
        if existing_cat and self.ohe is not None:
            ohe_arr = self.ohe.transform(df_clean[existing_cat].astype(str))
            ohe_df = pd.DataFrame(ohe_arr, columns=self.ohe.get_feature_names_out(existing_cat), index=df_clean.index)
        else:
            ohe_df = pd.DataFrame(index=df_clean.index)
            
        existing_num = [c for c in self.numeric_cols if c in df_clean.columns]
        if existing_num:
            numeric_df = df_clean[existing_num].copy()
            numeric_scaled = self.scaler.transform(numeric_df)
            numeric_scaled_df = pd.DataFrame(numeric_scaled, columns=existing_num, index=df_clean.index)
        else:
            numeric_scaled_df = pd.DataFrame(index=df_clean.index)
            
        encoded_dfs = [numeric_scaled_df]
        enc_cols = [f'{c}_enc' for c in self.high_card_cols if f'{c}_enc' in df_clean.columns]
        if enc_cols:
            encoded_dfs.append(df_clean[enc_cols])
        if not ohe_df.empty:
            encoded_dfs.append(ohe_df)
            
        encoded_df = pd.concat(encoded_dfs, axis=1)
        return encoded_df
    
    def _clean_binary_strings(self, df: pd.DataFrame) -> pd.DataFrame:
        binary_fields = ['prior_antibiotic_use', 'hospitalised']
        mapping = {'YES': 1, 'TRUE': 1, '1': 1, 'NO': 0, 'FALSE': 0, '0': 0, '-1': 0}
        
        for field in binary_fields:
            if field in df.columns:
                df[field] = df[field].astype(str).str.strip().str.upper()
                df[field] = df[field].map(mapping).fillna(0).astype(int)
                
        for field in ['patient_age_years', 'sample_month']:
            if field in df.columns:
                df[field] = pd.to_numeric(df[field], errors='coerce')
                
        return df

    def _ensure_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        defaults = {
            'specimen_type': 'unknown',
            'test_method': 'unknown',
            'sub_sector': 'unknown',
            'patient_age_years': -1,
            'sample_month': 6,
            'pathogen_code': 'unknown',
            'county': 'unknown',
            'age_group': 'Unknown',
            'gender': 'U',
            'facility': 'Unknown',
            'prior_antibiotic_use': 0,
            'hospitalised': 0,
        }
        for col, default in defaults.items():
            if col not in df.columns:
                df[col] = default
        for col in self.numeric_cols:
            if col not in df.columns:
                df[col] = defaults.get(col, 0)
        for col in self.cat_cols:
            if col not in df.columns:
                df[col] = defaults.get(col, 'unknown')
        for col in self.high_card_cols:
            if col not in df.columns:
                df[col] = defaults.get(col, 'unknown')
        return df
    
    def _handle_missing(self, df: pd.DataFrame) -> pd.DataFrame:
        df['patient_age_years'] = df['patient_age_years'].fillna(-1)
        df['sample_month'] = df['sample_month'].fillna(6)
        df['prior_antibiotic_use'] = df['prior_antibiotic_use'].fillna(0)
        df['hospitalised'] = df['hospitalised'].fillna(0)
        
        for col in self.cat_cols + self.high_card_cols:
            if col in df.columns:
                df[col] = df[col].fillna('unknown')
        return df
    
    def save(self, path: str):
        dump(self, path)
    
    @classmethod
    def load(cls, path: str):
        return load(path)
