"""
Configuration settings for Local Home Helper
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    # Ollama settings
    OLLAMA_BASE_URL = os.environ.get('OLLAMA_BASE_URL', 'http://localhost:11434')
    DEFAULT_MODEL = os.environ.get('DEFAULT_MODEL', 'llama2:7b')
    
    # Chat settings
    MAX_TOKENS = int(os.environ.get('MAX_TOKENS', '2048'))
    TEMPERATURE = float(os.environ.get('TEMPERATURE', '0.3')) #0.7
    TOP_P = float(os.environ.get('TOP_P', '0.9')) #0.9
    
    # UI settings
    CHAT_HISTORY_LIMIT = int(os.environ.get('CHAT_HISTORY_LIMIT', '50'))
    AUTO_SCROLL = os.environ.get('AUTO_SCROLL', 'True').lower() == 'true'
    
    # Available models for selection
    AVAILABLE_MODELS = [
        'llama2:7b',
        'llama2:13b', 
        'llama2:70b',
        'mistral:7b',
        'codellama:7b',
        'llama2:7b-chat',
        'llama2:13b-chat'
    ]
    
    # Model descriptions for UI
    MODEL_DESCRIPTIONS = {
        'llama2:7b': 'Fast, lightweight model (4GB RAM)',
        'llama2:13b': 'Balanced performance (8GB RAM)',
        'llama2:70b': 'Best quality, requires more resources (16GB+ RAM)',
        'mistral:7b': 'Excellent performance/size ratio (4GB RAM)',
        'codellama:7b': 'Specialized for coding tasks (4GB RAM)',
        'llama2:7b-chat': 'Chat-optimized 7B model (4GB RAM)',
        'llama2:13b-chat': 'Chat-optimized 13B model (8GB RAM)'
    }
    
    # System prompt for the AI
    DEFAULT_SYSTEM_PROMPT = """You are a helpful AI assistant running locally on this machine. 
    You can help with various tasks including:
    - Answering questions
    - Writing and editing text
    - Solving problems
    - Providing explanations
    - Helping with coding tasks
    
    Be helpful, accurate, and concise in your responses."""
