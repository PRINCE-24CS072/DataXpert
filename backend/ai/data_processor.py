"""
AI Data Processor Module
Handles automatic data scanning, cleaning, preprocessing, and outlier removal
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import re

class DataProcessor:
    """AI-powered data processor for automatic data cleaning and preprocessing"""
    
    def __init__(self):
        self.supported_date_formats = [
            '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d',
            '%d-%m-%Y', '%m-%d-%Y', '%Y-%m-%d %H:%M:%S',
            '%d/%m/%Y %H:%M:%S', '%m/%d/%Y %H:%M:%S',
            '%Y%m%d', '%d %b %Y', '%d %B %Y', '%b %d, %Y', '%B %d, %Y'
        ]
        
        # Column mapping for auto-detection
        self.column_mappings = {
            'date': ['date', 'record_date', 'transaction_date', 'order_date', 'created_at', 'timestamp', 'day', 'datetime'],
            'sales': ['sales', 'revenue', 'income', 'total_sales', 'amount', 'sale_amount', 'total', 'gross_sales'],
            'expenses': ['expenses', 'expense', 'cost', 'costs', 'spending', 'expenditure', 'total_cost'],
            'profit': ['profit', 'net_profit', 'margin', 'earnings', 'net_income', 'gross_profit'],
            'category': ['category', 'type', 'product_type', 'segment', 'department', 'classification', 'group']
        }
    
    def process_uploaded_data(self, df: pd.DataFrame, options: Dict = None) -> Dict[str, Any]:
        """
        Main processing function that handles the complete data pipeline
        
        Args:
            df: Input DataFrame
            options: Processing options (remove_outliers, fill_missing, etc.)
        
        Returns:
            Dictionary with processed data and metadata
        """
        options = options or {}
        
        report = {
            'original_rows': len(df),
            'original_columns': list(df.columns),
            'processing_steps': [],
            'warnings': [],
            'column_mappings': {},
            'outliers_removed': 0,
            'missing_filled': 0,
            'success': True
        }
        
        try:
            # Step 1: Auto-detect and map columns
            df, column_map = self._auto_map_columns(df)
            report['column_mappings'] = column_map
            report['processing_steps'].append('Auto-detected column mappings')
            
            # Step 2: Clean and standardize data types
            df = self._standardize_data_types(df, report)
            report['processing_steps'].append('Standardized data types')
            
            # Step 3: Handle missing values
            if options.get('fill_missing', True):
                df, missing_count = self._handle_missing_values(df, options.get('fill_method', 'smart'))
                report['missing_filled'] = missing_count
                report['processing_steps'].append(f'Filled {missing_count} missing values')
            
            # Step 4: Remove outliers if requested
            if options.get('remove_outliers', True):
                df, outliers_removed = self._remove_outliers(df, options.get('outlier_method', 'iqr'))
                report['outliers_removed'] = outliers_removed
                report['processing_steps'].append(f'Removed {outliers_removed} outliers')
            
            # Step 5: Calculate derived columns
            df = self._calculate_derived_columns(df)
            report['processing_steps'].append('Calculated derived columns (profit if missing)')
            
            # Step 6: Sort by date
            if 'record_date' in df.columns:
                df = df.sort_values('record_date')
                report['processing_steps'].append('Sorted by date')
            
            # Final validation
            validation_result = self._validate_processed_data(df)
            if not validation_result['valid']:
                report['warnings'].extend(validation_result['warnings'])
            
            report['final_rows'] = len(df)
            report['final_columns'] = list(df.columns)
            
            return {
                'success': True,
                'data': df,
                'report': report
            }
            
        except Exception as e:
            report['success'] = False
            report['error'] = str(e)
            return {
                'success': False,
                'data': None,
                'report': report,
                'error': str(e)
            }
    
    def _auto_map_columns(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        """Auto-detect and map columns to standard names"""
        column_map = {}
        df_columns_lower = {col.lower().strip(): col for col in df.columns}
        
        for standard_name, possible_names in self.column_mappings.items():
            for possible_name in possible_names:
                if possible_name in df_columns_lower:
                    original_col = df_columns_lower[possible_name]
                    if standard_name == 'date':
                        df = df.rename(columns={original_col: 'record_date'})
                        column_map['record_date'] = original_col
                    else:
                        df = df.rename(columns={original_col: standard_name})
                        column_map[standard_name] = original_col
                    break
        
        return df, column_map
    
    def _standardize_data_types(self, df: pd.DataFrame, report: Dict) -> pd.DataFrame:
        """Convert columns to appropriate data types"""
        
        # Handle date column
        if 'record_date' in df.columns:
            df['record_date'] = self._parse_dates(df['record_date'])
        
        # Handle numeric columns
        numeric_cols = ['sales', 'expenses', 'profit']
        for col in numeric_cols:
            if col in df.columns:
                df[col] = self._convert_to_numeric(df[col])
        
        # Handle category column
        if 'category' in df.columns:
            df['category'] = df['category'].astype(str).str.strip()
            # Fill empty categories
            df['category'] = df['category'].replace(['', 'nan', 'None'], 'General')
        
        return df
    
    def _parse_dates(self, date_series: pd.Series) -> pd.Series:
        """Parse dates with multiple format support"""
        def parse_single_date(val):
            if pd.isna(val):
                return None
            
            val_str = str(val).strip()
            
            for fmt in self.supported_date_formats:
                try:
                    return datetime.strptime(val_str, fmt).strftime('%Y-%m-%d')
                except:
                    continue
            
            # Try pandas parser as fallback
            try:
                return pd.to_datetime(val_str).strftime('%Y-%m-%d')
            except:
                return datetime.now().strftime('%Y-%m-%d')
        
        return date_series.apply(parse_single_date)
    
    def _convert_to_numeric(self, series: pd.Series) -> pd.Series:
        """Convert series to numeric, handling currency symbols and commas"""
        def clean_numeric(val):
            if pd.isna(val):
                return np.nan
            
            val_str = str(val).strip()
            # Remove currency symbols and commas
            val_str = re.sub(r'[$€£₹¥,\s]', '', val_str)
            # Handle parentheses for negative numbers
            if val_str.startswith('(') and val_str.endswith(')'):
                val_str = '-' + val_str[1:-1]
            
            try:
                return float(val_str)
            except:
                return np.nan
        
        return series.apply(clean_numeric)
    
    def _handle_missing_values(self, df: pd.DataFrame, method: str = 'smart') -> Tuple[pd.DataFrame, int]:
        """Handle missing values with smart filling strategies"""
        missing_count = 0
        
        numeric_cols = ['sales', 'expenses', 'profit']
        
        for col in numeric_cols:
            if col not in df.columns:
                continue
            
            missing_mask = df[col].isna()
            missing_in_col = missing_mask.sum()
            
            if missing_in_col > 0:
                if method == 'smart':
                    # Use category-based mean if available
                    if 'category' in df.columns:
                        df[col] = df.groupby('category')[col].transform(
                            lambda x: x.fillna(x.mean() if x.notna().any() else 0)
                        )
                    else:
                        df[col] = df[col].fillna(df[col].mean())
                elif method == 'median':
                    df[col] = df[col].fillna(df[col].median())
                elif method == 'zero':
                    df[col] = df[col].fillna(0)
                else:  # mean
                    df[col] = df[col].fillna(df[col].mean())
                
                # Fill any remaining NaN with 0
                df[col] = df[col].fillna(0)
                missing_count += missing_in_col
        
        # Handle category
        if 'category' in df.columns:
            missing_cat = df['category'].isna() | (df['category'] == '')
            df.loc[missing_cat, 'category'] = 'General'
            missing_count += missing_cat.sum()
        
        return df, int(missing_count)
    
    def _remove_outliers(self, df: pd.DataFrame, method: str = 'iqr') -> Tuple[pd.DataFrame, int]:
        """Remove outliers from numeric columns"""
        original_len = len(df)
        numeric_cols = ['sales', 'expenses', 'profit']
        
        mask = pd.Series([True] * len(df))
        
        for col in numeric_cols:
            if col not in df.columns:
                continue
            
            if method == 'iqr':
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                mask &= (df[col] >= lower_bound) & (df[col] <= upper_bound)
            
            elif method == 'zscore':
                mean = df[col].mean()
                std = df[col].std()
                if std > 0:
                    z_scores = np.abs((df[col] - mean) / std)
                    mask &= z_scores <= 3
            
            elif method == 'percentile':
                lower = df[col].quantile(0.01)
                upper = df[col].quantile(0.99)
                mask &= (df[col] >= lower) & (df[col] <= upper)
        
        df_clean = df[mask].copy()
        outliers_removed = original_len - len(df_clean)
        
        return df_clean, outliers_removed
    
    def _calculate_derived_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate derived columns if missing"""
        
        # Calculate profit if not present but sales and expenses are
        if 'profit' not in df.columns or df['profit'].isna().all():
            if 'sales' in df.columns and 'expenses' in df.columns:
                df['profit'] = df['sales'] - df['expenses']
        
        # Ensure all required columns exist
        if 'sales' not in df.columns:
            df['sales'] = 0
        if 'expenses' not in df.columns:
            df['expenses'] = 0
        if 'profit' not in df.columns:
            df['profit'] = df['sales'] - df['expenses']
        if 'category' not in df.columns:
            df['category'] = 'General'
        
        return df
    
    def _validate_processed_data(self, df: pd.DataFrame) -> Dict:
        """Validate the processed data"""
        warnings = []
        
        required_cols = ['record_date', 'sales', 'expenses', 'profit', 'category']
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            warnings.append(f"Missing required columns: {missing_cols}")
        
        if len(df) == 0:
            warnings.append("No data remaining after processing")
            return {'valid': False, 'warnings': warnings}
        
        # Check for negative sales (unusual)
        if 'sales' in df.columns and (df['sales'] < 0).any():
            warnings.append("Some sales values are negative")
        
        return {'valid': len(warnings) == 0, 'warnings': warnings}
    
    def analyze_data_quality(self, df: pd.DataFrame) -> Dict:
        """Analyze the quality of uploaded data"""
        analysis = {
            'total_rows': len(df),
            'total_columns': len(df.columns),
            'columns': list(df.columns),
            'missing_values': {},
            'data_types': {},
            'statistics': {},
            'recommendations': []
        }
        
        # Check missing values
        for col in df.columns:
            missing = df[col].isna().sum()
            if missing > 0:
                analysis['missing_values'][col] = {
                    'count': int(missing),
                    'percentage': round(missing / len(df) * 100, 2)
                }
        
        # Data types
        analysis['data_types'] = {col: str(dtype) for col, dtype in df.dtypes.items()}
        
        # Statistics for numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            analysis['statistics'][col] = {
                'mean': round(df[col].mean(), 2),
                'median': round(df[col].median(), 2),
                'std': round(df[col].std(), 2),
                'min': round(df[col].min(), 2),
                'max': round(df[col].max(), 2)
            }
        
        # Generate recommendations
        if len(analysis['missing_values']) > 0:
            analysis['recommendations'].append("Enable 'Fill Missing Values' to handle missing data")
        
        for col, stats in analysis['statistics'].items():
            if stats['std'] > stats['mean'] * 2:
                analysis['recommendations'].append(f"High variance detected in '{col}' - consider removing outliers")
        
        return analysis
    
    def suggest_graph_types(self, df: pd.DataFrame) -> List[Dict]:
        """Suggest appropriate graph types based on data"""
        suggestions = []
        
        has_date = 'record_date' in df.columns
        has_category = 'category' in df.columns
        has_numeric = any(col in df.columns for col in ['sales', 'expenses', 'profit'])
        
        if has_date and has_numeric:
            suggestions.append({
                'type': 'line',
                'title': 'Time Series Analysis',
                'description': 'Track changes over time',
                'recommended': True,
                'fields': {'x': 'record_date', 'y': ['sales', 'profit', 'expenses']}
            })
            suggestions.append({
                'type': 'area',
                'title': 'Stacked Area Chart',
                'description': 'Show cumulative trends',
                'recommended': False,
                'fields': {'x': 'record_date', 'y': ['sales', 'expenses']}
            })
        
        if has_category and has_numeric:
            suggestions.append({
                'type': 'bar',
                'title': 'Category Comparison',
                'description': 'Compare values across categories',
                'recommended': True,
                'fields': {'x': 'category', 'y': 'sales'}
            })
            suggestions.append({
                'type': 'doughnut',
                'title': 'Category Distribution',
                'description': 'Show proportion of each category',
                'recommended': True,
                'fields': {'label': 'category', 'value': 'sales'}
            })
            suggestions.append({
                'type': 'pie',
                'title': 'Expense Breakdown',
                'description': 'Distribution of expenses by category',
                'recommended': False,
                'fields': {'label': 'category', 'value': 'expenses'}
            })
        
        if has_numeric:
            suggestions.append({
                'type': 'bar',
                'title': 'Sales vs Expenses vs Profit',
                'description': 'Compare key metrics',
                'recommended': True,
                'fields': {'metrics': ['sales', 'expenses', 'profit']}
            })
            suggestions.append({
                'type': 'scatter',
                'title': 'Sales-Profit Correlation',
                'description': 'Analyze relationship between sales and profit',
                'recommended': False,
                'fields': {'x': 'sales', 'y': 'profit'}
            })
        
        return suggestions
