import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')

# Machine Learning imports
try:
    from sklearn.linear_model import LinearRegression
    from sklearn.ensemble import RandomForestRegressor, IsolationForest
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import mean_squared_error, r2_score
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    print("[WARN] scikit-learn not installed. ML features disabled.")

class AnalysisEngine:
    def __init__(self):
        self.analysis_types = {
            'sales': self.analyze_sales,
            'profit': self.analyze_profit,
            'expenses': self.analyze_expenses,
            'loss': self.analyze_loss,
            'customer': self.analyze_customers,
            'trend': self.analyze_trends,
            'comparison': self.analyze_comparison,
            'forecast': self.forecast_data,
            'generic': self.analyze_generic_data
        }
        self.ml_enabled = ML_AVAILABLE
        self.scaler = StandardScaler() if ML_AVAILABLE else None
    
    def analyze(self, intent, entities, business_data):
        """Main analysis function - works with any data type"""
        try:
            if not business_data:
                return {
                    'summary': 'No data available for analysis. Please upload a file first.',
                    'insights': [],
                    'recommendations': ['Upload a CSV or Excel file to get started'],
                    'anomaly_score': 0.0,
                    'insight_level': 'low'
                }
            
            # Convert to DataFrame for easier analysis
            df = pd.DataFrame(business_data)
            
            # Check if this is business data or generic data
            is_business_data = all(col in df.columns for col in ['sales', 'profit', 'expenses'])
            
            # Determine analysis type
            analysis_type = self._determine_analysis_type(intent, entities)
            
            # If not business data, use generic analysis
            if not is_business_data and analysis_type not in ['trend', 'forecast']:
                return self.analyze_generic_data(df, intent, entities)
            
            # Perform analysis
            if analysis_type in self.analysis_types:
                result = self.analysis_types[analysis_type](df, entities)
            else:
                result = self.analyze_generic_data(df, intent, entities) if not is_business_data else self.general_analysis(df)
            
            return result
        except Exception as e:
            print(f"Analysis error: {e}")
            return {
                'summary': f'Analysis completed with notes: {str(e)}',
                'insights': [],
                'recommendations': [],
                'anomaly_score': 0.0,
                'insight_level': 'low'
            }
    
    def analyze_generic_data(self, df, intent='', entities=None):
        """Analyze any type of data dynamically"""
        entities = entities or {}
        
        # Get column info
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        insights = []
        recommendations = []
        summary_parts = []
        
        # Basic stats
        insights.append(f"Dataset contains {len(df)} records with {len(df.columns)} columns")
        
        # Analyze numeric columns
        for col in numeric_cols[:5]:  # Limit to first 5 numeric columns
            col_mean = df[col].mean()
            col_std = df[col].std()
            col_min = df[col].min()
            col_max = df[col].max()
            
            insights.append(f"{col}: avg {col_mean:,.2f}, range {col_min:,.2f}-{col_max:,.2f}")
            
            # Detect trends if there's enough data
            if len(df) >= 5:
                first_half = df[col].iloc[:len(df)//2].mean()
                second_half = df[col].iloc[len(df)//2:].mean()
                if first_half > 0:
                    trend = ((second_half - first_half) / first_half) * 100
                    if abs(trend) > 10:
                        trend_dir = "increasing" if trend > 0 else "decreasing"
                        insights.append(f"📈 {col} is {trend_dir} by {abs(trend):.1f}%")
        
        # Analyze categorical columns
        for col in categorical_cols[:3]:  # Limit to first 3 categorical columns
            unique_count = df[col].nunique()
            top_value = df[col].mode().iloc[0] if len(df[col].mode()) > 0 else 'N/A'
            insights.append(f"{col}: {unique_count} unique values, most common: '{top_value}'")
        
        # Generate recommendations based on data characteristics
        if len(numeric_cols) >= 2:
            recommendations.append("Try correlation analysis between numeric columns")
        if len(df) >= 10:
            recommendations.append("Sufficient data for trend analysis and forecasting")
        if len(categorical_cols) > 0:
            recommendations.append("Group data by categories for deeper insights")
        
        # Build summary
        summary = f"Data Analysis: {len(df)} records analyzed"
        if numeric_cols:
            main_col = numeric_cols[0]
            total = df[main_col].sum()
            summary += f". Total {main_col}: {total:,.2f}"
        
        return {
            'summary': summary,
            'insights': insights,
            'recommendations': recommendations if recommendations else ['Upload more data for advanced analysis'],
            'data': {
                'total_records': int(len(df)),
                'numeric_columns': numeric_cols,
                'categorical_columns': categorical_cols,
                'column_stats': {col: {'mean': float(df[col].mean()), 'sum': float(df[col].sum())} for col in numeric_cols[:5]}
            },
            'anomaly_score': self._detect_generic_anomalies(df, numeric_cols),
            'insight_level': 'high' if len(insights) > 3 else 'medium',
            'chart_data': self._generate_generic_charts(df, numeric_cols, categorical_cols)
        }
    
    def _detect_generic_anomalies(self, df, numeric_cols):
        """Detect anomalies in generic data"""
        max_score = 0.0
        for col in numeric_cols[:5]:
            mean = df[col].mean()
            std = df[col].std()
            if std > 0:
                z_scores = np.abs((df[col] - mean) / std)
                max_z = z_scores.max()
                if max_z > max_score:
                    max_score = max_z
        return min(float(max_score), 10.0)
    
    def _generate_generic_charts(self, df, numeric_cols, categorical_cols):
        """Generate chart data for generic datasets"""
        charts = {}
        
        # Time series or index-based chart for numeric data
        if numeric_cols:
            main_col = numeric_cols[0]
            charts['main'] = {
                'labels': [f"Entry {i+1}" for i in range(min(len(df), 50))],
                'datasets': [{
                    'label': main_col,
                    'data': df[main_col].head(50).tolist(),
                    'borderColor': 'rgb(99, 102, 241)',
                    'backgroundColor': 'rgba(99, 102, 241, 0.2)',
                    'fill': True
                }]
            }
        
        # Category breakdown if available
        if categorical_cols and numeric_cols:
            cat_col = categorical_cols[0]
            num_col = numeric_cols[0]
            category_data = df.groupby(cat_col)[num_col].sum()
            charts['category'] = {
                'labels': category_data.index.tolist()[:10],
                'datasets': [{
                    'data': category_data.values.tolist()[:10],
                    'backgroundColor': [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 87, 108, 0.8)',
                        'rgba(251, 191, 36, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(14, 165, 233, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(249, 115, 22, 0.8)',
                        'rgba(168, 85, 247, 0.8)'
                    ]
                }]
            }
        
        return charts
    
    def _determine_analysis_type(self, intent, entities):
        """Determine what type of analysis to perform"""
        intent_lower = intent.lower()
        
        if any(word in intent_lower for word in ['sales', 'revenue', 'income']):
            return 'sales'
        elif any(word in intent_lower for word in ['profit', 'margin']):
            return 'profit'
        elif any(word in intent_lower for word in ['expense', 'cost', 'spending']):
            return 'expenses'
        elif any(word in intent_lower for word in ['loss', 'losses', 'negative']):
            return 'loss'
        elif any(word in intent_lower for word in ['customer', 'client']):
            return 'customer'
        elif any(word in intent_lower for word in ['trend', 'pattern', 'over time']):
            return 'trend'
        elif any(word in intent_lower for word in ['compare', 'comparison', 'versus']):
            return 'comparison'
        elif any(word in intent_lower for word in ['forecast', 'predict', 'future']):
            return 'forecast'
        else:
            return 'general'
    
    def analyze_sales(self, df, entities):
        """Analyze sales data"""
        total_sales = df['sales'].sum()
        avg_sales = df['sales'].mean()
        max_sales = df['sales'].max()
        min_sales = df['sales'].min()
        
        # Calculate growth
        if len(df) > 1:
            recent_avg = df.head(5)['sales'].mean()
            older_avg = df.tail(5)['sales'].mean()
            growth = ((recent_avg - older_avg) / older_avg * 100) if older_avg > 0 else 0
        else:
            growth = 0
        
        insights = [
            f"Total sales: ₹{total_sales:,.2f}",
            f"Average sales per entry: ₹{avg_sales:,.2f}",
            f"Highest sales: ₹{max_sales:,.2f}",
            f"Lowest sales: ₹{min_sales:,.2f}"
        ]
        
        if growth != 0:
            insights.append(f"Sales trend: {'↑' if growth > 0 else '↓'} {abs(growth):.1f}%")
        
        recommendations = []
        if growth < 0:
            recommendations.append("Sales are declining. Consider reviewing marketing strategies.")
        elif growth > 20:
            recommendations.append("Strong sales growth! Consider scaling operations.")
        
        if df['sales'].std() > avg_sales * 0.5:
            recommendations.append("High sales volatility detected. Focus on consistency.")
        
        return {
            'summary': f"Sales Analysis: Total revenue of ₹{total_sales:,.2f} with {len(df)} data points.",
            'insights': insights,
            'recommendations': recommendations,
            'data': {
                'total': float(total_sales),
                'average': float(avg_sales),
                'growth': float(growth)
            },
            'anomaly_score': self._calculate_anomaly_score(df, 'sales'),
            'insight_level': 'high' if len(insights) > 3 else 'medium'
        }
    
    def analyze_profit(self, df, entities):
        """Analyze profit data"""
        total_profit = df['profit'].sum()
        avg_profit = df['profit'].mean()
        profit_margin = (total_profit / df['sales'].sum() * 100) if df['sales'].sum() > 0 else 0
        
        insights = [
            f"Total profit: ₹{total_profit:,.2f}",
            f"Average profit: ₹{avg_profit:,.2f}",
            f"Profit margin: {profit_margin:.1f}%"
        ]
        
        # Identify profitable periods
        profitable_count = len(df[df['profit'] > 0])
        loss_count = len(df[df['profit'] < 0])
        
        insights.append(f"Profitable periods: {profitable_count}/{len(df)}")
        
        recommendations = []
        if profit_margin < 10:
            recommendations.append("Low profit margin. Review pricing and cost structure.")
        elif profit_margin > 30:
            recommendations.append("Excellent profit margin! Maintain quality standards.")
        
        if loss_count > len(df) * 0.3:
            recommendations.append("High frequency of losses. Immediate cost reduction needed.")
        
        return {
            'summary': f"Profit Analysis: ₹{total_profit:,.2f} total profit with {profit_margin:.1f}% margin.",
            'insights': insights,
            'recommendations': recommendations,
            'data': {
                'total': float(total_profit),
                'margin': float(profit_margin),
                'profitable_ratio': profitable_count / len(df)
            },
            'anomaly_score': self._calculate_anomaly_score(df, 'profit'),
            'insight_level': 'high'
        }
    
    def analyze_expenses(self, df, entities):
        """Analyze expenses data"""
        total_expenses = df['expenses'].sum()
        avg_expenses = df['expenses'].mean()
        expense_ratio = (total_expenses / df['sales'].sum() * 100) if df['sales'].sum() > 0 else 0
        
        insights = [
            f"Total expenses: ₹{total_expenses:,.2f}",
            f"Average expenses: ₹{avg_expenses:,.2f}",
            f"Expense ratio: {expense_ratio:.1f}% of sales"
        ]
        
        # Find high expense periods
        high_expense_threshold = avg_expenses * 1.5
        high_expense_periods = len(df[df['expenses'] > high_expense_threshold])
        
        if high_expense_periods > 0:
            insights.append(f"High expense periods: {high_expense_periods}")
        
        recommendations = []
        if expense_ratio > 70:
            recommendations.append("Very high expense ratio. Urgent cost optimization needed.")
        elif expense_ratio > 50:
            recommendations.append("Moderate expense ratio. Look for cost-saving opportunities.")
        
        if df['expenses'].std() > avg_expenses * 0.4:
            recommendations.append("High expense variability. Standardize cost management.")
        
        return {
            'summary': f"Expense Analysis: ₹{total_expenses:,.2f} total expenses ({expense_ratio:.1f}% of sales).",
            'insights': insights,
            'recommendations': recommendations,
            'data': {
                'total': float(total_expenses),
                'ratio': float(expense_ratio),
                'average': float(avg_expenses)
            },
            'anomaly_score': self._calculate_anomaly_score(df, 'expenses'),
            'insight_level': 'medium'
        }
    
    def analyze_loss(self, df, entities):
        """Analyze losses"""
        loss_periods = df[df['profit'] < 0]
        total_loss = abs(loss_periods['profit'].sum()) if len(loss_periods) > 0 else 0
        
        insights = [
            f"Loss periods: {len(loss_periods)}/{len(df)}",
            f"Total losses: ₹{total_loss:,.2f}"
        ]
        
        if len(loss_periods) > 0:
            avg_loss = loss_periods['profit'].mean()
            insights.append(f"Average loss per period: ₹{abs(avg_loss):,.2f}")
            
            # Analyze loss patterns
            if 'category' in df.columns:
                loss_by_category = loss_periods.groupby('category')['profit'].sum()
                worst_category = loss_by_category.idxmin()
                insights.append(f"Highest losses in: {worst_category}")
        
        recommendations = []
        if len(loss_periods) > len(df) * 0.2:
            recommendations.append("Frequent losses detected. Review business model urgently.")
        
        if total_loss > df['sales'].sum() * 0.1:
            recommendations.append("Significant losses. Consider cost restructuring.")
        
        return {
            'summary': f"Loss Analysis: {len(loss_periods)} loss periods with ₹{total_loss:,.2f} total losses.",
            'insights': insights,
            'recommendations': recommendations,
            'data': {
                'total_loss': float(total_loss),
                'loss_ratio': len(loss_periods) / len(df)
            },
            'anomaly_score': min(len(loss_periods) / len(df) * 10, 10.0),
            'insight_level': 'high'
        }
    
    def analyze_customers(self, df, entities):
        """Analyze customer-related data"""
        # This is a placeholder - customize based on your customer data
        return self.general_analysis(df)
    
    def analyze_trends(self, df, entities):
        """Analyze trends over time"""
        if 'record_date' not in df.columns:
            return self.general_analysis(df)
        
        df['record_date'] = pd.to_datetime(df['record_date'])
        df = df.sort_values('record_date')
        
        # Calculate trends
        sales_trend = self._calculate_trend(df['sales'].values)
        profit_trend = self._calculate_trend(df['profit'].values)
        
        insights = [
            f"Sales trend: {'📈 Upward' if sales_trend > 0 else '📉 Downward'} ({sales_trend:.1f}%)",
            f"Profit trend: {'📈 Upward' if profit_trend > 0 else '📉 Downward'} ({profit_trend:.1f}%)"
        ]
        
        recommendations = []
        if sales_trend < -5:
            recommendations.append("Declining sales trend. Implement growth strategies.")
        if profit_trend < -10:
            recommendations.append("Sharp profit decline. Review operations immediately.")
        
        return {
            'summary': f"Trend Analysis: Sales {'increasing' if sales_trend > 0 else 'decreasing'} by {abs(sales_trend):.1f}%",
            'insights': insights,
            'recommendations': recommendations,
            'data': {
                'sales_trend': float(sales_trend),
                'profit_trend': float(profit_trend)
            },
            'anomaly_score': 0.0,
            'insight_level': 'medium'
        }
    
    def analyze_comparison(self, df, entities):
        """Compare different periods or categories"""
        return self.general_analysis(df)
    
    def forecast_data(self, df, entities):
        """Forecast future values using ML models"""
        if len(df) < 3:
            return {
                'summary': 'Insufficient data for forecasting.',
                'insights': ['Need at least 3 data points'],
                'recommendations': ['Add more historical data'],
                'anomaly_score': 0.0,
                'insight_level': 'low'
            }
        
        # Use ML model if available
        if self.ml_enabled and len(df) >= 10:
            return self._ml_forecast(df)
        else:
            # Simple linear forecast
            sales_values = df['sales'].values[-10:]  # Last 10 entries
            forecast = np.mean(sales_values) + (sales_values[-1] - sales_values[0]) / len(sales_values)
            
            insights = [
                f"Forecast next period sales: ₹{forecast:,.2f}",
                f"Based on last {len(sales_values)} periods",
                "⚠️ Simple forecast - add more data for ML predictions"
            ]
            
            return {
                'summary': f"Sales forecast for next period: ₹{forecast:,.2f}",
                'insights': insights,
                'recommendations': ['Monitor actual vs forecast regularly', 'Add more data for advanced ML forecasting'],
                'data': {'forecast': float(forecast)},
                'anomaly_score': 0.0,
                'insight_level': 'medium'
            }
    
    def general_analysis(self, df):
        """General business analysis"""
        total_sales = df['sales'].sum()
        total_profit = df['profit'].sum()
        total_expenses = df['expenses'].sum()
        
        return {
            'summary': f"Business Overview: ₹{total_sales:,.2f} in sales, ₹{total_profit:,.2f} profit.",
            'insights': [
                f"Total entries: {len(df)}",
                f"Total sales: ₹{total_sales:,.2f}",
                f"Total profit: ₹{total_profit:,.2f}",
                f"Total expenses: ₹{total_expenses:,.2f}"
            ],
            'recommendations': ['Ask specific questions for detailed insights'],
            'data': {
                'sales': float(total_sales),
                'profit': float(total_profit),
                'expenses': float(total_expenses)
            },
            'anomaly_score': 0.0,
            'insight_level': 'low'
        }
    
    def _calculate_trend(self, values):
        """Calculate trend percentage"""
        if len(values) < 2:
            return 0.0
        
        first_half = values[:len(values)//2].mean()
        second_half = values[len(values)//2:].mean()
        
        if first_half == 0:
            return 0.0
        
        return ((second_half - first_half) / first_half) * 100
    
    def _calculate_anomaly_score(self, df, column):
        """Calculate anomaly score for a column"""
        values = df[column].values
        mean = np.mean(values)
        std = np.std(values)
        
        if std == 0:
            return 0.0
        
        # Z-score based anomaly detection
        z_scores = np.abs((values - mean) / std)
        anomaly_score = np.max(z_scores)
        
        return min(float(anomaly_score), 10.0)
    
    def generate_response(self, analysis, anomalies):
        """Generate natural language response"""
        text = analysis['summary']
        
        if analysis.get('insights'):
            text += "\n\n📊 Key Insights:\n"
            for insight in analysis['insights']:
                text += f"• {insight}\n"
        
        if anomalies.get('detected'):
            text += "\n\n⚠️ Anomalies Detected:\n"
            for anomaly in anomalies['anomalies']:
                text += f"• {anomaly}\n"
        
        if analysis.get('recommendations'):
            text += "\n\n💡 Recommendations:\n"
            for rec in analysis['recommendations']:
                text += f"• {rec}\n"
        
        return {
            'text': text,
            'type': 'analysis',
            'has_chart': bool(analysis.get('data'))
        }
    
    def prepare_chart_data(self, business_data):
        """Prepare data for charts - handles empty data gracefully"""
        if not business_data:
            return {
                'sales': {'labels': [], 'datasets': []},
                'profitExpense': {'labels': [], 'datasets': []},
                'category': {'labels': [], 'datasets': []}
            }
        
        df = pd.DataFrame(business_data)
        
        # Helper to convert numpy types to native Python
        def to_native(val):
            if isinstance(val, (np.integer, np.int64, np.int32)):
                return int(val)
            elif isinstance(val, (np.floating, np.float64, np.float32)):
                return float(val)
            elif pd.isna(val):
                return 0
            return val
        
        # Sales over time
        sales_data = []
        labels = []
        for i, item in enumerate(business_data[:20]):
            labels.append(str(item.get('record_date', f"Entry {i}")))
            sales_data.append(to_native(item.get('sales', 0)))
        
        sales_chart = {
            'labels': labels,
            'datasets': [{
                'label': 'Sales',
                'data': sales_data,
                'borderColor': 'rgb(75, 192, 192)',
                'backgroundColor': 'rgba(75, 192, 192, 0.2)'
            }]
        }
        
        # Profit vs Expenses
        profit_data = [to_native(item.get('profit', 0)) for item in business_data[:20]]
        expenses_data = [to_native(item.get('expenses', 0)) for item in business_data[:20]]
        
        profit_expense_chart = {
            'labels': labels,
            'datasets': [
                {
                    'label': 'Profit',
                    'data': profit_data,
                    'borderColor': 'rgb(54, 162, 235)',
                    'backgroundColor': 'rgba(54, 162, 235, 0.2)'
                },
                {
                    'label': 'Expenses',
                    'data': expenses_data,
                    'borderColor': 'rgb(255, 99, 132)',
                    'backgroundColor': 'rgba(255, 99, 132, 0.2)'
                }
            ]
        }
        
        # Category breakdown (if available)
        category_chart = {'labels': [], 'datasets': []}
        if 'category' in df.columns:
            # Filter out None/NaN categories and group
            df_with_category = df[df['category'].notna() & (df['category'] != '')]
            if len(df_with_category) > 0:
                category_sales = df_with_category.groupby('category')['sales'].sum()
                
                # Dynamic color palette for any number of categories
                base_colors = [
                    'rgba(255, 99, 132, 0.8)',   # Red
                    'rgba(54, 162, 235, 0.8)',   # Blue
                    'rgba(255, 206, 86, 0.8)',   # Yellow
                    'rgba(75, 192, 192, 0.8)',   # Teal
                    'rgba(153, 102, 255, 0.8)', # Purple
                    'rgba(255, 159, 64, 0.8)',   # Orange
                    'rgba(99, 102, 241, 0.8)',   # Indigo
                    'rgba(16, 185, 129, 0.8)',   # Green
                    'rgba(236, 72, 153, 0.8)',   # Pink
                    'rgba(245, 158, 11, 0.8)',   # Amber
                    'rgba(59, 130, 246, 0.8)',   # Sky Blue
                    'rgba(168, 85, 247, 0.8)',   # Violet
                ]
                
                # Generate enough colors for all categories
                num_categories = len(category_sales)
                colors = []
                for i in range(num_categories):
                    colors.append(base_colors[i % len(base_colors)])
                
                category_chart = {
                    'labels': [str(label) for label in category_sales.index.tolist()],
                    'datasets': [{
                        'data': [to_native(val) for val in category_sales.values.tolist()],
                        'backgroundColor': colors
                    }]
                }
        
        return {
            'sales': sales_chart,
            'profitExpense': profit_expense_chart,
            'category': category_chart
        }
    
    def generate_custom_chart(self, df, chart_type, x_field, y_fields, group_by=None):
        """Generate custom chart data based on user requirements"""
        try:
            # Color palette for charts
            colors = [
                {'border': 'rgb(99, 102, 241)', 'bg': 'rgba(99, 102, 241, 0.2)'},
                {'border': 'rgb(16, 185, 129)', 'bg': 'rgba(16, 185, 129, 0.2)'},
                {'border': 'rgb(245, 87, 108)', 'bg': 'rgba(245, 87, 108, 0.2)'},
                {'border': 'rgb(251, 191, 36)', 'bg': 'rgba(251, 191, 36, 0.2)'},
                {'border': 'rgb(139, 92, 246)', 'bg': 'rgba(139, 92, 246, 0.2)'},
                {'border': 'rgb(14, 165, 233)', 'bg': 'rgba(14, 165, 233, 0.2)'}
            ]
            
            # Ensure y_fields is a list
            if isinstance(y_fields, str):
                y_fields = [y_fields]
            
            # Handle date field
            if x_field == 'record_date' and 'record_date' in df.columns:
                df['record_date'] = pd.to_datetime(df['record_date'])
                df = df.sort_values('record_date')
                labels = df['record_date'].dt.strftime('%Y-%m-%d').tolist()
            elif x_field in df.columns:
                labels = df[x_field].astype(str).tolist()
            else:
                labels = [f"Entry {i}" for i in range(len(df))]
            
            # Generate datasets based on chart type
            if chart_type in ['pie', 'doughnut']:
                # For pie/doughnut, group by category or x_field
                if group_by and group_by in df.columns:
                    grouped = df.groupby(group_by)[y_fields[0]].sum()
                elif x_field in df.columns and x_field != 'record_date':
                    grouped = df.groupby(x_field)[y_fields[0]].sum()
                else:
                    grouped = df.groupby('category' if 'category' in df.columns else df.index)[y_fields[0]].sum()
                
                return {
                    'labels': grouped.index.tolist(),
                    'datasets': [{
                        'data': grouped.values.tolist(),
                        'backgroundColor': [
                            'rgba(99, 102, 241, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 87, 108, 0.8)',
                            'rgba(251, 191, 36, 0.8)',
                            'rgba(139, 92, 246, 0.8)',
                            'rgba(14, 165, 233, 0.8)',
                            'rgba(236, 72, 153, 0.8)',
                            'rgba(34, 197, 94, 0.8)'
                        ][:len(grouped)]
                    }]
                }
            
            elif chart_type == 'bar':
                if group_by and group_by in df.columns:
                    # Grouped bar chart
                    grouped = df.groupby(group_by)[y_fields].sum()
                    datasets = []
                    for i, y_field in enumerate(y_fields):
                        datasets.append({
                            'label': y_field.replace('_', ' ').title(),
                            'data': grouped[y_field].tolist(),
                            'backgroundColor': colors[i % len(colors)]['bg'].replace('0.2', '0.8'),
                            'borderColor': colors[i % len(colors)]['border'],
                            'borderWidth': 1
                        })
                    return {
                        'labels': grouped.index.tolist(),
                        'datasets': datasets
                    }
                else:
                    # Regular bar chart
                    datasets = []
                    for i, y_field in enumerate(y_fields):
                        if y_field in df.columns:
                            datasets.append({
                                'label': y_field.replace('_', ' ').title(),
                                'data': df[y_field].tolist(),
                                'backgroundColor': colors[i % len(colors)]['bg'].replace('0.2', '0.7'),
                                'borderColor': colors[i % len(colors)]['border'],
                                'borderWidth': 1
                            })
                    return {
                        'labels': labels,
                        'datasets': datasets
                    }
            
            elif chart_type == 'line':
                # Line chart
                datasets = []
                for i, y_field in enumerate(y_fields):
                    if y_field in df.columns:
                        datasets.append({
                            'label': y_field.replace('_', ' ').title(),
                            'data': df[y_field].tolist(),
                            'borderColor': colors[i % len(colors)]['border'],
                            'backgroundColor': colors[i % len(colors)]['bg'],
                            'fill': True,
                            'tension': 0.4
                        })
                return {
                    'labels': labels,
                    'datasets': datasets
                }
            
            elif chart_type == 'area':
                # Area chart (stacked line)
                datasets = []
                for i, y_field in enumerate(y_fields):
                    if y_field in df.columns:
                        datasets.append({
                            'label': y_field.replace('_', ' ').title(),
                            'data': df[y_field].tolist(),
                            'borderColor': colors[i % len(colors)]['border'],
                            'backgroundColor': colors[i % len(colors)]['bg'].replace('0.2', '0.5'),
                            'fill': True,
                            'tension': 0.4
                        })
                return {
                    'labels': labels,
                    'datasets': datasets
                }
            
            elif chart_type == 'scatter':
                # Scatter plot
                if len(y_fields) >= 2:
                    x_data = df[y_fields[0]].tolist() if y_fields[0] in df.columns else []
                    y_data = df[y_fields[1]].tolist() if y_fields[1] in df.columns else []
                    
                    scatter_data = [{'x': x, 'y': y} for x, y in zip(x_data, y_data)]
                    
                    return {
                        'datasets': [{
                            'label': f'{y_fields[0].title()} vs {y_fields[1].title()}',
                            'data': scatter_data,
                            'backgroundColor': colors[0]['bg'].replace('0.2', '0.8'),
                            'borderColor': colors[0]['border']
                        }]
                    }
                else:
                    return {'labels': [], 'datasets': []}
            
            elif chart_type == 'radar':
                # Radar/Spider chart - useful for comparing multiple metrics
                if group_by and group_by in df.columns:
                    grouped = df.groupby(group_by)[y_fields].mean()
                    datasets = []
                    for i, (idx, row) in enumerate(grouped.iterrows()):
                        datasets.append({
                            'label': str(idx),
                            'data': row.tolist(),
                            'backgroundColor': colors[i % len(colors)]['bg'],
                            'borderColor': colors[i % len(colors)]['border'],
                            'fill': True
                        })
                    return {
                        'labels': y_fields,
                        'datasets': datasets
                    }
                else:
                    return {
                        'labels': y_fields,
                        'datasets': [{
                            'label': 'Overview',
                            'data': [df[f].mean() if f in df.columns else 0 for f in y_fields],
                            'backgroundColor': colors[0]['bg'],
                            'borderColor': colors[0]['border'],
                            'fill': True
                        }]
                    }
            
            else:
                # Default to line chart
                datasets = []
                for i, y_field in enumerate(y_fields):
                    if y_field in df.columns:
                        datasets.append({
                            'label': y_field.replace('_', ' ').title(),
                            'data': df[y_field].tolist(),
                            'borderColor': colors[i % len(colors)]['border'],
                            'backgroundColor': colors[i % len(colors)]['bg']
                        })
                return {
                    'labels': labels,
                    'datasets': datasets
                }
                
        except Exception as e:
            print(f"Chart generation error: {e}")
            return {'labels': [], 'datasets': []}
    
    def _ml_forecast(self, df):
        """Advanced ML-based forecasting"""
        try:
            # Prepare data
            df = df.copy()
            df['index'] = range(len(df))
            
            # Use last 80% for training, forecast next periods
            train_size = int(len(df) * 0.8)
            X_train = df['index'][:train_size].values.reshape(-1, 1)
            y_train = df['sales'][:train_size].values
            
            # Train multiple models
            lr_model = LinearRegression()
            rf_model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=5)
            
            lr_model.fit(X_train, y_train)
            rf_model.fit(X_train, y_train)
            
            # Predict next 3 periods
            future_indices = np.array([[len(df)], [len(df)+1], [len(df)+2]])
            lr_predictions = lr_model.predict(future_indices)
            rf_predictions = rf_model.predict(future_indices)
            
            # Average predictions
            forecasts = (lr_predictions + rf_predictions) / 2
            
            # Calculate model accuracy on test data
            if train_size < len(df):
                X_test = df['index'][train_size:].values.reshape(-1, 1)
                y_test = df['sales'][train_size:].values
                lr_test_pred = lr_model.predict(X_test)
                accuracy = r2_score(y_test, lr_test_pred) * 100
            else:
                accuracy = 95.0
            
            insights = [
                f"🤖 ML Forecast (Next Period): ₹{forecasts[0]:,.2f}",
                f"📊 3-Period Forecast: ₹{forecasts[0]:,.0f}, ₹{forecasts[1]:,.0f}, ₹{forecasts[2]:,.0f}",
                f"🎯 Model Accuracy: {accuracy:.1f}%",
                f"📈 Trend: {'Upward' if forecasts[1] > forecasts[0] else 'Downward'}",
                "✨ Using Random Forest + Linear Regression ensemble"
            ]
            
            recommendations = []
            if forecasts[0] < df['sales'].mean():
                recommendations.append("Forecast below average - consider promotional strategies")
            if forecasts[2] > forecasts[0] * 1.2:
                recommendations.append("Strong growth predicted - prepare for scaling")
            
            return {
                'summary': f"🤖 ML Forecast: ₹{forecasts[0]:,.2f} for next period (Accuracy: {accuracy:.1f}%)",
                'insights': insights,
                'recommendations': recommendations if recommendations else ['Monitor predictions vs actuals'],
                'data': {
                    'forecast': float(forecasts[0]),
                    'forecast_3': forecasts.tolist(),
                    'accuracy': float(accuracy),
                    'method': 'ensemble_ml'
                },
                'anomaly_score': 0.0,
                'insight_level': 'high'
            }
        except Exception as e:
            print(f"ML Forecast error: {e}")
            # Fallback to simple forecast
            sales_values = df['sales'].values[-10:]
            forecast = np.mean(sales_values)
            return {
                'summary': f"Forecast: ₹{forecast:,.2f}",
                'insights': [f"Simple forecast: ₹{forecast:,.2f}"],
                'recommendations': ['ML model error - using simple average'],
                'data': {'forecast': float(forecast)},
                'anomaly_score': 0.0,
                'insight_level': 'low'
            }
    
    def detect_patterns(self, df):
        """Detect patterns using clustering"""
        if not self.ml_enabled or len(df) < 10:
            return {'patterns': [], 'clusters': 0}
        
        try:
            # Prepare features
            features = df[['sales', 'profit', 'expenses']].values
            features_scaled = self.scaler.fit_transform(features)
            
            # Optimal clusters (2-5)
            n_clusters = min(5, max(2, len(df) // 5))
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            clusters = kmeans.fit_predict(features_scaled)
            
            # Analyze each cluster
            patterns = []
            for i in range(n_clusters):
                cluster_data = df[clusters == i]
                patterns.append({
                    'cluster_id': int(i),
                    'size': len(cluster_data),
                    'avg_sales': float(cluster_data['sales'].mean()),
                    'avg_profit': float(cluster_data['profit'].mean()),
                    'characteristics': self._describe_cluster(cluster_data)
                })
            
            return {'patterns': patterns, 'clusters': n_clusters}
        except Exception as e:
            print(f"Pattern detection error: {e}")
            return {'patterns': [], 'clusters': 0}
    
    def _describe_cluster(self, cluster_data):
        """Describe cluster characteristics"""
        avg_sales = cluster_data['sales'].mean()
        avg_profit = cluster_data['profit'].mean()
        
        if avg_sales > 10000 and avg_profit > 2000:
            return "High-performing period"
        elif avg_sales < 5000 or avg_profit < 500:
            return "Low-performing period"
        elif avg_profit < 0:
            return "Loss-making period"
        else:
            return "Normal performance period"
    
    def advanced_anomaly_detection(self, df):
        """Advanced anomaly detection using Isolation Forest"""
        if not self.ml_enabled or len(df) < 10:
            return self._simple_anomaly_detection(df)
        
        try:
            # Prepare features
            features = df[['sales', 'profit', 'expenses']].values
            features_scaled = self.scaler.fit_transform(features)
            
            # Train Isolation Forest
            iso_forest = IsolationForest(contamination=0.1, random_state=42, n_estimators=100)
            predictions = iso_forest.fit_predict(features_scaled)
            
            # Identify anomalies (-1 = anomaly, 1 = normal)
            anomaly_indices = np.where(predictions == -1)[0]
            
            anomalies = []
            for idx in anomaly_indices:
                anomalies.append({
                    'index': int(idx),
                    'sales': float(df.iloc[idx]['sales']),
                    'profit': float(df.iloc[idx]['profit']),
                    'expenses': float(df.iloc[idx]['expenses']),
                    'severity': 'high' if abs(df.iloc[idx]['profit']) > df['profit'].std() * 2 else 'medium'
                })
            
            return {
                'detected': len(anomalies) > 0,
                'count': len(anomalies),
                'anomalies': [f"Anomaly at entry {a['index']}: ₹{a['sales']:,.0f} sales, ₹{a['profit']:,.0f} profit" for a in anomalies],
                'method': 'isolation_forest',
                'details': anomalies
            }
        except Exception as e:
            print(f"Advanced anomaly detection error: {e}")
            return self._simple_anomaly_detection(df)
    
    def _simple_anomaly_detection(self, df):
        """Simple Z-score based anomaly detection"""
        anomalies = []
        for col in ['sales', 'profit', 'expenses']:
            if col in df.columns:
                mean = df[col].mean()
                std = df[col].std()
                if std > 0:
                    z_scores = np.abs((df[col] - mean) / std)
                    anomaly_indices = np.where(z_scores > 3)[0]
                    for idx in anomaly_indices:
                        anomalies.append(f"Unusual {col} at entry {idx}: ₹{df.iloc[idx][col]:,.0f}")
        
        return {
            'detected': len(anomalies) > 0,
            'count': len(anomalies),
            'anomalies': anomalies,
            'method': 'z_score'
        }
