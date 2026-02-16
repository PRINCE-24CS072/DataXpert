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
            print(f"[DB] Attempting to create user with email: {user_data.get('email')}")
            user_data['created_at'] = datetime.utcnow().isoformat()
            response = self.supabase.table('users').insert(user_data).execute()
            print(f"[DB] Insert response: {response.data}")
            return {'success': True, 'data': response.data[0]} if response.data else {'success': False, 'error': 'No data returned from database'}
        except Exception as e:
            error_message = str(e)
            print(f"[DB ERROR] Error creating user: {error_message}")
            return {'success': False, 'error': error_message}
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        try:
            response = self.supabase.table('users').select('*').eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def get_user_by_email(self, email):
        """Get user by email"""
        try:
            response = self.supabase.table('users').select('*').eq('email', email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None
    
    def get_user_by_google_id(self, google_id):
        """Get user by Google ID"""
        try:
            response = self.supabase.table('users').select('*').eq('google_id', google_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error getting user by google_id: {e}")
            return None
    
    def update_user_google_id(self, user_id, google_id):
        """Update user's Google ID"""
        try:
            response = self.supabase.table('users').update({
                'google_id': google_id
            }).eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error updating google_id: {e}")
            return None
    
    def update_user_fields(self, user_id, fields):
        """Update user fields (generic update method)"""
        try:
            response = self.supabase.table('users').update(fields).eq('id', user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error updating user fields: {e}")
            return None
    
    def update_user_profile(self, user_id, data):
        """Update user profile"""
        try:
            allowed_fields = ['name', 'email', 'business_name', 'password', 'profile_completed', 'profile_image']
            update_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            response = self.supabase.table('users').update(update_data).eq('id', user_id).execute()
            
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            print(f'Error updating profile: {str(e)}')
            return None
    
    # ==================== TEAM OPERATIONS ====================
    
    def create_team(self, team_name, owner_id):
        """Create a new team"""
        try:
            team_data = {
                'team_name': team_name,
                'owner_id': owner_id,
                'created_at': datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table('teams').insert(team_data).execute()
            
            if response.data:
                team = response.data[0]
                # Add owner as team member
                self.add_team_member(team['id'], owner_id, 'owner')
                return {'success': True, 'team': team}
            return {'success': False, 'message': 'Failed to create team'}
        except Exception as e:
            return {'success': False, 'message': f'Error creating team: {str(e)}'}
    
    def get_user_teams(self, user_id):
        """Get all teams for a user"""
        try:
            # Get teams where user is a member
            response = self.supabase.table('team_members')\
                .select('*, teams(*)')\
                .eq('user_id', user_id)\
                .execute()
            
            teams = [item['teams'] for item in response.data if item.get('teams')]
            return teams
        except Exception as e:
            print(f"Error getting teams: {e}")
            return []
    
    def add_team_member(self, team_id, user_id, role='member'):
        """Add a member to a team"""
        try:
            member_data = {
                'team_id': team_id,
                'user_id': user_id,
                'role': role,
                'joined_at': datetime.utcnow().isoformat()
            }
            
            response = self.supabase.table('team_members').insert(member_data).execute()
            
            if response.data:
                return {'success': True, 'member': response.data[0]}
            return {'success': False, 'message': 'Failed to add member'}
        except Exception as e:
            return {'success': False, 'message': f'Error adding member: {str(e)}'}
    
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
            print(f"Error getting business data: {e}")
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
            print(f"Error getting recent data: {e}")
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
            print(f"Error clearing business data: {e}")
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
            print(f"Error getting summary: {e}")
            return {}
    
    def get_total_sales(self, user_id):
        """Get total sales"""
        data = self.get_user_business_data(user_id)
        return sum(item.get('sales', 0) for item in data)
    
    def get_total_profit(self, user_id):
        """Get total profit"""
        data = self.get_user_business_data(user_id)
        return sum(item.get('profit', 0) for item in data)
    
    def get_total_expenses(self, user_id):
        """Get total expenses"""
        data = self.get_user_business_data(user_id)
        return sum(item.get('expenses', 0) for item in data)
    
    def get_data_count(self, user_id):
        """Get count of business data entries"""
        data = self.get_user_business_data(user_id)
        return len(data)
    
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
            print(f"Error saving chat: {e}")
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
            print(f"Error getting last chat: {e}")
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
            print(f"Error getting chats: {e}")
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
            print(f"Error saving analysis results: {e}")
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
            print(f"Error getting analysis results: {e}")
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
            print(f"Error logging activity: {e}")
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
            print(f"Error getting activity log: {e}")
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
            print(f"Error saving upload history: {e}")
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
