import re
from collections import defaultdict

class NLPProcessor:
    def __init__(self):
        self.intent_keywords = {
            'sales_analysis': ['sales', 'revenue', 'income', 'earnings'],
            'profit_analysis': ['profit', 'margin', 'earnings', 'net income'],
            'expense_analysis': ['expense', 'expenses', 'cost', 'costs', 'spending'],
            'loss_analysis': ['loss', 'losses', 'negative', 'deficit'],
            'trend_analysis': ['trend', 'pattern', 'over time', 'historical', 'changes'],
            'forecast': ['forecast', 'predict', 'future', 'projection', 'estimate'],
            'comparison': ['compare', 'comparison', 'versus', 'vs', 'difference'],
            'summary': ['summary', 'overview', 'overall', 'total', 'aggregate']
        }
        
        self.entity_patterns = {
            'date': r'\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4}',
            'amount': r'\$?\d+(?:,\d{3})*(?:\.\d{2})?',
            'percentage': r'\d+(?:\.\d+)?%',
            'time_period': r'last\s+(?:week|month|year|quarter)|this\s+(?:week|month|year|quarter)|yesterday|today'
        }
    
    def extract_intent(self, text):
        """Extract user intent from text"""
        text_lower = text.lower()
        
        # Score each intent
        intent_scores = defaultdict(int)
        
        for intent, keywords in self.intent_keywords.items():
            for keyword in keywords:
                if keyword in text_lower:
                    intent_scores[intent] += 1
        
        # Return highest scoring intent or default
        if intent_scores:
            return max(intent_scores.items(), key=lambda x: x[1])[0]
        
        return 'general_query'
    
    def extract_entities(self, text):
        """Extract entities from text"""
        entities = {}
        
        for entity_type, pattern in self.entity_patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                entities[entity_type] = matches
        
        # Extract question type
        if '?' in text:
            text_lower = text.lower()
            if text_lower.startswith('what'):
                entities['question_type'] = 'what'
            elif text_lower.startswith('how'):
                entities['question_type'] = 'how'
            elif text_lower.startswith('when'):
                entities['question_type'] = 'when'
            elif text_lower.startswith('why'):
                entities['question_type'] = 'why'
            elif text_lower.startswith('where'):
                entities['question_type'] = 'where'
        
        return entities
    
    def tokenize(self, text):
        """Simple tokenization"""
        # Remove punctuation and convert to lowercase
        text = re.sub(r'[^\w\s]', '', text.lower())
        return text.split()
    
    def extract_keywords(self, text):
        """Extract important keywords"""
        tokens = self.tokenize(text)
        
        # Remove common stop words
        stop_words = {'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'my', 'me', 'i', 'you'}
        keywords = [token for token in tokens if token not in stop_words and len(token) > 2]
        
        return keywords
    
    def analyze_sentiment(self, text):
        """Basic sentiment analysis"""
        positive_words = ['good', 'great', 'excellent', 'high', 'increase', 'growth', 'profit', 'success', 'best']
        negative_words = ['bad', 'poor', 'low', 'decrease', 'decline', 'loss', 'worst', 'problem', 'issue']
        
        text_lower = text.lower()
        
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        else:
            return 'neutral'
