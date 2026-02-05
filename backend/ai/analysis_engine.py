import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from collections import defaultdict

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
            'forecast': self.forecast_data
        }
    
    def analyze(self, intent, entities, business_data):
        """Main analysis function"""
        try:
            if not business_data:
                return {
                    'summary': 'No business data available for analysis.',
                    'insights': [],
                    'recommendations': ['Start by adding your business data'],
                    'anomaly_score': 0.0,
                    'insight_level': 'low'
                }
            
            # Convert to DataFrame for easier analysis
            df = pd.DataFrame(business_data)
            
            # Determine analysis type
            analysis_type = self._determine_analysis_type(intent, entities)
            
            # Perform analysis
            if analysis_type in self.analysis_types:
                result = self.analysis_types[analysis_type](df, entities)
            else:
                result = self.general_analysis(df)
            
            return result
        except Exception as e:
            print(f"Analysis error: {e}")
            return {
                'summary': f'Analysis error: {str(e)}',
                'insights': [],
                'recommendations': [],
                'anomaly_score': 0.0,
                'insight_level': 'low'
            }
    
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
            f"Total sales: ${total_sales:,.2f}",
            f"Average sales per entry: ${avg_sales:,.2f}",
            f"Highest sales: ${max_sales:,.2f}",
            f"Lowest sales: ${min_sales:,.2f}"
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
            'summary': f"Sales Analysis: Total revenue of ${total_sales:,.2f} with {len(df)} data points.",
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
            f"Total profit: ${total_profit:,.2f}",
            f"Average profit: ${avg_profit:,.2f}",
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
            'summary': f"Profit Analysis: ${total_profit:,.2f} total profit with {profit_margin:.1f}% margin.",
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
            f"Total expenses: ${total_expenses:,.2f}",
            f"Average expenses: ${avg_expenses:,.2f}",
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
            'summary': f"Expense Analysis: ${total_expenses:,.2f} total expenses ({expense_ratio:.1f}% of sales).",
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
            f"Total losses: ${total_loss:,.2f}"
        ]
        
        if len(loss_periods) > 0:
            avg_loss = loss_periods['profit'].mean()
            insights.append(f"Average loss per period: ${abs(avg_loss):,.2f}")
            
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
            'summary': f"Loss Analysis: {len(loss_periods)} loss periods with ${total_loss:,.2f} total losses.",
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
        """Forecast future values"""
        # Simple linear forecast
        if len(df) < 3:
            return {
                'summary': 'Insufficient data for forecasting.',
                'insights': ['Need at least 3 data points'],
                'recommendations': ['Add more historical data'],
                'anomaly_score': 0.0,
                'insight_level': 'low'
            }
        
        sales_values = df['sales'].values[-10:]  # Last 10 entries
        forecast = np.mean(sales_values) + (sales_values[-1] - sales_values[0]) / len(sales_values)
        
        insights = [
            f"Forecast next period sales: ${forecast:,.2f}",
            f"Based on last {len(sales_values)} periods"
        ]
        
        return {
            'summary': f"Sales forecast for next period: ${forecast:,.2f}",
            'insights': insights,
            'recommendations': ['Monitor actual vs forecast regularly'],
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
            'summary': f"Business Overview: ${total_sales:,.2f} in sales, ${total_profit:,.2f} profit.",
            'insights': [
                f"Total entries: {len(df)}",
                f"Total sales: ${total_sales:,.2f}",
                f"Total profit: ${total_profit:,.2f}",
                f"Total expenses: ${total_expenses:,.2f}"
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
        """Prepare data for charts"""
        if not business_data:
            return {}
        
        df = pd.DataFrame(business_data)
        
        # Sales over time
        sales_chart = {
            'labels': [item.get('record_date', f"Entry {i}") for i, item in enumerate(business_data[:20])],
            'datasets': [{
                'label': 'Sales',
                'data': df.head(20)['sales'].tolist(),
                'borderColor': 'rgb(75, 192, 192)',
                'backgroundColor': 'rgba(75, 192, 192, 0.2)'
            }]
        }
        
        # Profit vs Expenses
        profit_expense_chart = {
            'labels': [item.get('record_date', f"Entry {i}") for i, item in enumerate(business_data[:20])],
            'datasets': [
                {
                    'label': 'Profit',
                    'data': df.head(20)['profit'].tolist(),
                    'borderColor': 'rgb(54, 162, 235)',
                    'backgroundColor': 'rgba(54, 162, 235, 0.2)'
                },
                {
                    'label': 'Expenses',
                    'data': df.head(20)['expenses'].tolist(),
                    'borderColor': 'rgb(255, 99, 132)',
                    'backgroundColor': 'rgba(255, 99, 132, 0.2)'
                }
            ]
        }
        
        # Category breakdown (if available)
        category_chart = {}
        if 'category' in df.columns:
            category_sales = df.groupby('category')['sales'].sum()
            category_chart = {
                'labels': category_sales.index.tolist(),
                'datasets': [{
                    'data': category_sales.values.tolist(),
                    'backgroundColor': [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ]
                }]
            }
        
        return {
            'sales': sales_chart,
            'profitExpense': profit_expense_chart,
            'category': category_chart
        }
