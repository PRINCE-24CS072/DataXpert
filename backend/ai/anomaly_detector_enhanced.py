import numpy as np
import pandas as pd
from scipy import stats

# Machine Learning for advanced detection
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("[WARN] scikit-learn not installed. Using statistical anomaly detection only.")

class AnomalyDetector:
    def __init__(self, use_ml=True):
        self.threshold = 3  # Z-score threshold
        self.use_ml = use_ml and ML_AVAILABLE
        self.scaler = StandardScaler() if ML_AVAILABLE else None
        print(f"[ANOMALY DETECTOR] ML mode: {'enabled' if self.use_ml else 'disabled'}")
    
    def detect_anomalies(self, business_data):
        """Detect anomalies in business data using ML (Isolation Forest) or statistical methods"""
        if not business_data or len(business_data) < 3:
            return {
                'detected': False,
                'anomalies': [],
                'count': 0,
                'method': 'none'
            }
        
        df = pd.DataFrame(business_data)
        
        # Use ML-based detection if available and sufficient data
        if self.use_ml and len(df) >= 10:
            return self._ml_anomaly_detection(df)
        else:
            return self._statistical_anomaly_detection(df)
    
    def _ml_anomaly_detection(self, df):
        """Advanced ML-based anomaly detection using Isolation Forest"""
        try:
            # Prepare features
            features = df[['sales', 'profit', 'expenses']].values
            features_scaled = self.scaler.fit_transform(features)
            
            # Train Isolation Forest
            iso_forest = IsolationForest(
                contamination=0.1,  # Expect 10% anomalies
                random_state=42,
                n_estimators=100
            )
            predictions = iso_forest.fit_predict(features_scaled)
            anomaly_scores = iso_forest.score_samples(features_scaled)
            
            # Identify anomalies (-1 = anomaly, 1 = normal)
            anomaly_indices = np.where(predictions == -1)[0]
            
            anomalies = []
            for idx in anomaly_indices:
                row = df.iloc[idx]
                date = row.get('record_date', f'Entry {idx}')
                score = abs(anomaly_scores[idx])
                
                # Determine what's anomalous
                sales_z = abs((row['sales'] - df['sales'].mean()) / df['sales'].std()) if df['sales'].std() > 0 else 0
                profit_z = abs((row['profit'] - df['profit'].mean()) / df['profit'].std()) if df['profit'].std() > 0 else 0
                
                anomaly_type = []
                if sales_z > 2:
                    anomaly_type.append(f"sales: ${row['sales']:,.0f}")
                if profit_z > 2:
                    anomaly_type.append(f"profit: ${row['profit']:,.0f}")
                
                if anomaly_type:
                    anomalies.append(
                        f"🤖 ML-detected anomaly on {date}: {', '.join(anomaly_type)} (severity: {score:.2f})"
                    )
                else:
                    anomalies.append(
                        f"🤖 Pattern anomaly on {date}: unusual combination detected"
                    )
            
            # Add statistical anomalies too
            statistical_results = self._statistical_anomaly_detection(df)
            
            return {
                'detected': len(anomalies) > 0 or statistical_results['detected'],
                'anomalies': anomalies + statistical_results['anomalies'],
                'count': len(anomalies) + statistical_results['count'],
                'method': 'isolation_forest'
            }
        except Exception as e:
            print(f"[ERROR] ML anomaly detection failed: {e}")
            # Fallback to statistical method
            return self._statistical_anomaly_detection(df)
    
    def _statistical_anomaly_detection(self, df):
        """Statistical anomaly detection using Z-scores"""
        anomalies = []
        
        # Check for anomalies in sales
        sales_anomalies = self._detect_column_anomalies(df, 'sales', 'Sales')
        anomalies.extend(sales_anomalies)
        
        # Check for anomalies in profit
        profit_anomalies = self._detect_column_anomalies(df, 'profit', 'Profit')
        anomalies.extend(profit_anomalies)
        
        # Check for anomalies in expenses
        expense_anomalies = self._detect_column_anomalies(df, 'expenses', 'Expenses')
        anomalies.extend(expense_anomalies)
        
        # Check for unusual profit margins
        margin_anomalies = self._detect_margin_anomalies(df)
        anomalies.extend(margin_anomalies)
        
        # Check for negative profits (losses)
        loss_anomalies = self._detect_loss_anomalies(df)
        anomalies.extend(loss_anomalies)
        
        return {
            'detected': len(anomalies) > 0,
            'anomalies': anomalies,
            'count': len(anomalies),
            'method': 'z_score'
        }
    
    def _detect_column_anomalies(self, df, column, label):
        """Detect anomalies in a specific column using Z-score"""
        if column not in df.columns:
            return []
        
        values = df[column].values
        mean = np.mean(values)
        std = np.std(values)
        
        if std == 0:
            return []
        
        anomalies = []
        
        for i, value in enumerate(values):
            z_score = abs((value - mean) / std)
            
            if z_score > self.threshold:
                date = df.iloc[i].get('record_date', f'Entry {i}')
                
                if value > mean:
                    anomalies.append(
                        f"{label} spike detected on {date}: ${value:,.2f} (unusually high)"
                    )
                else:
                    anomalies.append(
                        f"{label} drop detected on {date}: ${value:,.2f} (unusually low)"
                    )
        
        return anomalies
    
    def _detect_margin_anomalies(self, df):
        """Detect unusual profit margins"""
        if 'profit' not in df.columns or 'sales' not in df.columns:
            return []
        
        # Calculate profit margins
        df = df.copy()
        df['margin'] = (df['profit'] / df['sales'] * 100).replace([np.inf, -np.inf], 0)
        
        mean_margin = df['margin'].mean()
        std_margin = df['margin'].std()
        
        if std_margin == 0:
            return []
        
        anomalies = []
        
        for i, row in df.iterrows():
            margin = row['margin']
            z_score = abs((margin - mean_margin) / std_margin)
            
            if z_score > self.threshold:
                date = row.get('record_date', f'Entry {i}')
                anomalies.append(
                    f"Unusual profit margin on {date}: {margin:.1f}% (typical: {mean_margin:.1f}%)"
                )
        
        return anomalies
    
    def _detect_loss_anomalies(self, df):
        """Detect losses"""
        if 'profit' not in df.columns:
            return []
        
        anomalies = []
        losses = df[df['profit'] < 0]
        
        if len(losses) > 0:
            total_loss = abs(losses['profit'].sum())
            
            if len(losses) > len(df) * 0.3:  # More than 30% losses
                anomalies.append(
                    f"High frequency of losses: {len(losses)}/{len(df)} periods with total loss of ${total_loss:,.2f}"
                )
            elif total_loss > df['sales'].sum() * 0.05:  # Losses > 5% of total sales
                anomalies.append(
                    f"Significant losses detected: ${total_loss:,.2f} across {len(losses)} periods"
                )
        
        return anomalies
    
    def detect_outliers_iqr(self, data):
        """Detect outliers using IQR method"""
        if len(data) < 4:
            return []
        
        q1 = np.percentile(data, 25)
        q3 = np.percentile(data, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers = []
        for i, value in enumerate(data):
            if value < lower_bound or value > upper_bound:
                outliers.append((i, value))
        
        return outliers
    
    def detect_trend_changes(self, data, window=5):
        """Detect sudden trend changes"""
        if len(data) < window * 2:
            return []
        
        changes = []
        
        for i in range(window, len(data) - window):
            before = np.mean(data[i-window:i])
            after = np.mean(data[i:i+window])
            
            if before == 0:
                continue
            
            change_pct = abs((after - before) / before * 100)
            
            if change_pct > 50:  # 50% change
                changes.append({
                    'index': i,
                    'change': change_pct,
                    'direction': 'increase' if after > before else 'decrease'
                })
        
        return changes
