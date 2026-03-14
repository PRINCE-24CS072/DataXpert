import os
from supabase import create_client, Client
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class SupabaseClient:
    def __init__(self):
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')
        
        if not url or not key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")
        
        self.supabase: Client = create_client(url, key)
    
    # ==================== USER OPERATIONS ====================
    
    def create_user(self, user_data):
        """Create a new user"""
        try:
            user_data['created_at'] = datetime.utcnow().isoformat()
            response = self.supabase.table('users').insert(user_data).execute()
            return {'success': True, 'data': response.data[0]} if response.data else {'success': False, 'error': 'No data returned from database'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        try:
            response = self.supabase.table('users').select('*').eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def get_user_by_email(self, email):
        """Get user by email"""
        try:
            response = self.supabase.table('users').select('*').eq('email', email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def get_user_by_google_id(self, google_id):
        """Get user by Google ID"""
        try:
            response = self.supabase.table('users').select('*').eq('google_id', google_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def update_user_google_id(self, user_id, google_id):
        """Update user's Google ID"""
        try:
            response = self.supabase.table('users').update({
                'google_id': google_id
            }).eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def update_user_fields(self, user_id, fields):
        """Update user fields (generic update method)"""
        try:
            response = self.supabase.table('users').update(fields).eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def update_user_profile(self, user_id, data):
        """Update user profile"""
        try:
            allowed_fields = ['name', 'email', 'business_name', 'password', 'profile_completed', 'profile_image']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            if not update_data:
                return None
            
            response = self.supabase.table('users').update(update_data).eq('id', user_id).execute()
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            return None
    
    # ==================== BUSINESS DATA OPERATIONS ====================
    
    def add_business_data(self, data):
        """Add new business data"""
        try:
            data['record_date'] = data.get('record_date', datetime.utcnow().isoformat())
            
            response = self.supabase.table('business_data').insert(data).execute()
            
            if response.data:
                return {'success': True, 'data': response.data[0]}
            return {'success': False, 'message': 'Failed to add data'}
        except Exception as e:
            return {'success': False, 'message': f'Error adding data: {str(e)}'}
    
    def get_user_business_data(self, user_id):
        """Get all business data for a user"""
        try:
            response = self.supabase.table('business_data')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('record_date', desc=True)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            return []
    
    def get_recent_business_data(self, user_id, limit=10):
        """Get recent business data"""
        try:
            response = self.supabase.table('business_data')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('record_date', desc=True)\
                .limit(limit)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            return []
    
    def clear_user_business_data(self, user_id):
        """Clear all business data for a user"""
        try:
            # First count existing records
            count_response = self.supabase.table('business_data')\
                .select('id', count='exact')\
                .eq('user_id', user_id)\
                .execute()
            
            deleted_count = count_response.count if hasattr(count_response, 'count') else len(count_response.data)
            
            # Delete all records
            response = self.supabase.table('business_data')\
                .delete()\
                .eq('user_id', user_id)\
                .execute()
            
            return {
                'success': True,
                'deleted_count': deleted_count
            }
        except Exception as e:
            return {'success': False, 'message': f'Error clearing data: {str(e)}'}
    
    def get_business_summary(self, user_id):
        """Get business summary statistics"""
        try:
            data = self.get_user_business_data(user_id)
            
            total_sales = sum(item.get('sales', 0) for item in data)
            total_expenses = sum(item.get('expenses', 0) for item in data)
            total_profit = sum(item.get('profit', 0) for item in data)
            
            return {
                'total_sales': total_sales,
                'total_expenses': total_expenses,
                'total_profit': total_profit,
                'average_profit': total_profit / len(data) if data else 0,
                'data_count': len(data)
            }
        except Exception as e:
            return {}
    
    def get_dashboard_summary(self, user_id):
        """Get dashboard summary - optimized to fetch data once (no N+1 queries)"""
        try:
            data = self.get_user_business_data(user_id)
            
            total_sales = sum(item.get('sales', 0) for item in data)
            total_expenses = sum(item.get('expenses', 0) for item in data)
            total_profit = sum(item.get('profit', 0) for item in data)
            
            # Calculate changes (simplified - can be enhanced with date ranges)
            changes = {
                'sales': 0.0,
                'profit': 0.0,
                'expenses': 0.0,
                'count': 0.0
            }
            
            return {
                'total_sales': total_sales,
                'total_expenses': total_expenses,
                'total_profit': total_profit,
                'data_count': len(data),
                'recent_data': data[:10] if data else []
            }
        except Exception as e:
            return {
                'total_sales': 0,
                'total_expenses': 0,
                'total_profit': 0,
                'data_count': 0,
                'recent_data': []
            }
    
    def get_total_sales(self, user_id):
        """Get total sales"""
        try:
            data = self.get_user_business_data(user_id)
            return sum(item.get('sales', 0) for item in data)
        except Exception:
            return 0
    
    def get_total_profit(self, user_id):
        """Get total profit"""
        try:
            data = self.get_user_business_data(user_id)
            return sum(item.get('profit', 0) for item in data)
        except Exception:
            return 0
    
    def get_total_expenses(self, user_id):
        """Get total expenses"""
        try:
            data = self.get_user_business_data(user_id)
            return sum(item.get('expenses', 0) for item in data)
        except Exception:
            return 0
    
    def get_data_count(self, user_id):
        """Get count of business data entries"""
        try:
            data = self.get_user_business_data(user_id)
            return len(data)
        except Exception:
            return 0
    
    def update_business_data(self, user_id, data_id, data):
        """Update a business data entry"""
        try:
            response = self.supabase.table('business_data')\
                .update(data)\
                .eq('id', data_id)\
                .eq('user_id', user_id)\
                .execute()
            
            if response.data and len(response.data) > 0:
                return {'success': True, 'data': response.data[0]}
            return {'success': False, 'message': 'Failed to update entry'}
        except Exception as e:
            return {'success': False, 'message': f'Error updating data: {str(e)}'}
    
    def delete_business_data(self, user_id, data_id):
        """Delete a business data entry"""
        try:
            # First verify ownership
            response = self.supabase.table('business_data')\
                .select('id')\
                .eq('id', data_id)\
                .eq('user_id', user_id)\
                .execute()
            
            if not response.data:
                return {'success': False, 'message': 'Entry not found or permission denied'}
            
            # Delete the entry
            delete_response = self.supabase.table('business_data')\
                .delete()\
                .eq('id', data_id)\
                .eq('user_id', user_id)\
                .execute()
            
            return {'success': True, 'message': 'Entry deleted'}
        except Exception as e:
            return {'success': False, 'message': f'Error deleting data: {str(e)}'}
    
    # ==================== CHAT OPERATIONS ====================
    
    def save_chat_message(self, user_id, message, role='user'):
        """Save a chat message"""
        try:
            chat_data = {
                'user_id': user_id,
                'message': message,
                'response': '' if role == 'user' else message,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            if role == 'assistant':
                # Update last chat with response
                last_chat = self.get_last_user_chat(user_id)
                if last_chat and not last_chat.get('response'):
                    response = self.supabase.table('chats')\
                        .update({'response': message})\
                        .eq('id', last_chat['id'])\
                        .execute()
                    return response.data[0] if response.data else None
            
            response = self.supabase.table('chats').insert(chat_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def get_last_user_chat(self, user_id):
        """Get last chat message from user"""
        try:
            response = self.supabase.table('chats')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('timestamp', desc=True)\
                .limit(1)\
                .execute()
            
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def get_user_chats(self, user_id):
        """Get all chats for a user"""
        try:
            response = self.supabase.table('chats')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('timestamp', desc=True)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            return []
    
    # ==================== ANALYSIS RESULTS OPERATIONS ====================
    
    def save_analysis_results(self, chat_id, analysis):
        """Save analysis results"""
        try:
            result_data = {
                'chat_id': chat_id,
                'summary': analysis.get('summary', ''),
                'anomaly_score': analysis.get('anomaly_score', 0.0),
                'insight_level': analysis.get('insight_level', 'medium'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table('analysis_results').insert(result_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def get_analysis_results(self, chat_id):
        """Get analysis results for a chat"""
        try:
            response = self.supabase.table('analysis_results')\
                .select('*')\
                .eq('chat_id', chat_id)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            return []

    # ==================== ACTIVITY LOG OPERATIONS ====================
    
    def log_activity(self, user_id, action_type, description, entity_type=None, entity_id=None, metadata=None):
        """Log user activity for audit trail"""
        try:
            log_data = {
                'user_id': user_id,
                'action_type': action_type,
                'action_description': description,
                'entity_type': entity_type,
                'entity_id': entity_id,
                'metadata': metadata or {},
                'created_at': datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table('activity_log').insert(log_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def get_activity_log(self, user_id, limit=50, action_type=None):
        """Get activity log for a user"""
        try:
            query = self.supabase.table('activity_log')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)
            
            if action_type:
                query = query.eq('action_type', action_type)
            
            response = query.execute()
            return response.data if response.data else []
        except Exception as e:
            return []
    
    # ==================== UPLOAD HISTORY OPERATIONS ====================
    
    def save_upload_history(self, user_id, upload_data):
        """Save file upload history"""
        try:
            history_data = {
                'user_id': user_id,
                'filename': upload_data.get('filename', 'unknown'),
                'file_type': upload_data.get('file_type', ''),
                'file_size': upload_data.get('file_size', 0),
                'original_rows': upload_data.get('original_rows', 0),
                'processed_rows': upload_data.get('processed_rows', 0),
                'records_added': upload_data.get('records_added', 0),
                'outliers_removed': upload_data.get('outliers_removed', 0),
                'missing_filled': upload_data.get('missing_filled', 0),
                'processing_options': upload_data.get('processing_options', {}),
                'status': upload_data.get('status', 'completed'),
                'error_message': upload_data.get('error_message'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table('upload_history').insert(history_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            return None
    
    def get_upload_history(self, user_id, limit=20):
        """Get upload history for a user"""
        try:
            response = self.supabase.table('upload_history')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting upload history: {e}")
            return []
    
    # ==================== DATA BACKUP OPERATIONS ====================
    
    def create_data_backup(self, user_id, backup_type='pre_clear', expires_days=30):
        """Create a backup of user's business data before clearing"""
        try:
            # Get all current business data
            current_data = self.get_user_business_data(user_id)
            
            if not current_data:
                return {'success': False, 'message': 'No data to backup'}
            
            from datetime import timedelta
            expires_at = (datetime.utcnow() + timedelta(days=expires_days)).isoformat()
            
            backup_data = {
                'user_id': user_id,
                'backup_type': backup_type,
                'data_snapshot': current_data,
                'record_count': len(current_data),
                'expires_at': expires_at,
                'created_at': datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table('data_backups').insert(backup_data).execute()
            
            if response.data:
                return {'success': True, 'backup': response.data[0], 'record_count': len(current_data)}
            return {'success': False, 'message': 'Failed to create backup'}
        except Exception as e:
            print(f"Error creating backup: {e}")
            return {'success': False, 'message': str(e)}
    
    def get_data_backups(self, user_id):
        """Get all backups for a user"""
        try:
            response = self.supabase.table('data_backups')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting backups: {e}")
            return []
    
    def restore_data_backup(self, user_id, backup_id):
        """Restore data from a backup"""
        try:
            # Get the backup
            response = self.supabase.table('data_backups')\
                .select('*')\
                .eq('id', backup_id)\
                .eq('user_id', user_id)\
                .execute()
            
            if not response.data:
                return {'success': False, 'message': 'Backup not found'}
            
            backup = response.data[0]
            data_snapshot = backup.get('data_snapshot', [])
            
            if not data_snapshot:
                return {'success': False, 'message': 'Backup is empty'}
            
            # Restore each record
            restored_count = 0
            for record in data_snapshot:
                # Remove id to insert as new record
                record.pop('id', None)
                record['user_id'] = user_id
                result = self.add_business_data(record)
                if result.get('success'):
                    restored_count += 1
            
            # Mark backup as restored
            self.supabase.table('data_backups')\
                .update({'restored': True})\
                .eq('id', backup_id)\
                .execute()
            
            return {'success': True, 'restored_count': restored_count}
        except Exception as e:
            print(f"Error restoring backup: {e}")
            return {'success': False, 'message': str(e)}
    
    # ==================== ANALYSIS HISTORY OPERATIONS ====================
    
    def save_analysis_history(self, user_id, analysis_data):
        """Save analysis to history"""
        try:
            history_data = {
                'user_id': user_id,
                'chat_id': analysis_data.get('chat_id'),
                'query_text': analysis_data.get('query_text', ''),
                'analysis_type': analysis_data.get('analysis_type', 'general'),
                'result_summary': analysis_data.get('summary', ''),
                'insights': analysis_data.get('insights', []),
                'recommendations': analysis_data.get('recommendations', []),
                'chart_data': analysis_data.get('chart_data'),
                'data_snapshot': analysis_data.get('data_snapshot'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table('analysis_history').insert(history_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error saving analysis history: {e}")
            return None
    
    def get_analysis_history(self, user_id, limit=20):
        """Get analysis history for a user"""
        try:
            response = self.supabase.table('analysis_history')\
                .select('*')\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting analysis history: {e}")
            return []
