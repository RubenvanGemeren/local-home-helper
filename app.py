"""
Local Home Helper - Main Flask Application
A fully offline LLM chatbot using Ollama
"""

from flask import Flask, render_template, request, jsonify, session
import requests
import json
import logging
from datetime import datetime
from config import Config
from database import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(Config)

# Initialize session
@app.before_request
def initialize_session():
    """Initialize session variables"""
    if 'chat_history' not in session:
        session['chat_history'] = []
    if 'current_model' not in session:
        session['current_model'] = Config.DEFAULT_MODEL
    if 'current_chat_id' not in session:
        session['current_chat_id'] = None

@app.route('/')
def index():
    """Main chat interface"""
    # Get all chats for the sidebar
    chats = db.get_chats()
    return render_template('chat.html', 
                         models=Config.AVAILABLE_MODELS,
                         model_descriptions=Config.MODEL_DESCRIPTIONS,
                         current_model=session.get('current_model', Config.DEFAULT_MODEL),
                         chats=chats)

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat requests"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        model = data.get('model', session.get('current_model', Config.DEFAULT_MODEL))
        
        if not user_message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # Update session model
        session['current_model'] = model
        
        # Check if Ollama is running
        try:
            response = requests.get(f"{Config.OLLAMA_BASE_URL}/api/tags", timeout=5)
            if response.status_code != 200:
                return jsonify({'error': 'Ollama is not running. Please start Ollama first.'}), 503
        except requests.exceptions.RequestException:
            return jsonify({'error': 'Cannot connect to Ollama. Please make sure it is running.'}), 503
        
        # Check if model is available
        try:
            models_response = requests.get(f"{Config.OLLAMA_BASE_URL}/api/tags")
            available_models = [model_info['name'] for model_info in models_response.json().get('models', [])]
            
            if model not in available_models:
                return jsonify({
                    'error': f'Model {model} is not available. Available models: {", ".join(available_models)}'
                }), 404
        except Exception as e:
            logger.error(f"Error checking available models: {e}")
            return jsonify({'error': 'Error checking available models'}), 500
        
        # Prepare the chat request
        chat_data = {
            'model': model,
            'messages': [
                {'role': 'system', 'content': Config.DEFAULT_SYSTEM_PROMPT}
            ] + session.get('chat_history', []) + [
                {'role': 'user', 'content': user_message}
            ],
            'stream': False,
            'options': {
            'temperature': Config.TEMPERATURE,
            'top_p': Config.TOP_P,
            'num_predict': Config.MAX_TOKENS,
            'num_ctx': 2048,        # Reduce context window
            'repeat_penalty': 1.1,  # Reduce repetition
            'top_k': 40,            # Limit token selection
            'tfs_z': 0.7,          # Tail free sampling
            'mirostat': 0,          # Disable mirostat for speed
            'mirostat_tau': 5.0,
            'mirostat_eta': 0.1
            }
        }
        
        # Send request to Ollama
        logger.info(f"Sending request to Ollama with model: {model}")
        ollama_response = requests.post(
            f"{Config.OLLAMA_BASE_URL}/api/chat",
            json=chat_data,
            timeout=120  # 2 minutes timeout for model responses
        )
        
        if ollama_response.status_code != 200:
            logger.error(f"Ollama API error: {ollama_response.status_code} - {ollama_response.text}")
            return jsonify({'error': 'Error communicating with Ollama'}), 500
        
        # Parse response
        response_data = ollama_response.json()
        ai_message = response_data.get('message', {}).get('content', 'No response from model')
        
        # Update chat history
        chat_history = session.get('chat_history', [])
        chat_history.extend([
            {'role': 'user', 'content': user_message},
            {'role': 'assistant', 'content': ai_message}
        ])
        
        # Limit chat history
        if len(chat_history) > Config.CHAT_HISTORY_LIMIT * 2:  # *2 because each exchange is 2 messages
            chat_history = chat_history[-Config.CHAT_HISTORY_LIMIT * 2:]
        
        session['chat_history'] = chat_history
        
        # Save messages to database if we have a current chat
        current_chat_id = session.get('current_chat_id')
        if current_chat_id:
            try:
                db.add_message(current_chat_id, 'user', user_message)
                db.add_message(current_chat_id, 'assistant', ai_message)
            except Exception as e:
                logger.error(f"Error saving messages to database: {e}")
        else:
            # Create a new chat if none exists
            try:
                # Generate title from first message
                title = user_message[:50] + "..." if len(user_message) > 50 else user_message
                chat_id = db.create_chat(title, model)
                session['current_chat_id'] = chat_id
                
                # Save both messages
                db.add_message(chat_id, 'user', user_message)
                db.add_message(chat_id, 'assistant', ai_message)
            except Exception as e:
                logger.error(f"Error creating new chat: {e}")
        
        # Return response
        return jsonify({
            'response': ai_message,
            'model': model,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    """Get available models from Ollama"""
    try:
        response = requests.get(f"{Config.OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            return jsonify({
                'models': [model['name'] for model in models],
                'current_model': session.get('current_model', Config.DEFAULT_MODEL)
            })
        else:
            return jsonify({'error': 'Failed to fetch models'}), 500
    except Exception as e:
        logger.error(f"Error fetching models: {e}")
        return jsonify({'error': 'Error fetching models'}), 500

@app.route('/api/clear-chat', methods=['POST'])
def clear_chat():
    """Clear chat history"""
    session['chat_history'] = []
    session['current_chat_id'] = None
    return jsonify({'message': 'Chat history cleared'})

@app.route('/api/chats', methods=['GET'])
def get_chats():
    """Get all chats"""
    try:
        chats = db.get_chats()
        return jsonify({'chats': chats})
    except Exception as e:
        logger.error(f"Error getting chats: {e}")
        return jsonify({'error': 'Failed to get chats'}), 500

@app.route('/api/chats', methods=['POST'])
def create_chat():
    """Create a new chat"""
    try:
        data = request.get_json()
        title = data.get('title', 'New Chat')
        model = data.get('model', session.get('current_model', Config.DEFAULT_MODEL))
        
        chat_id = db.create_chat(title, model)
        
        # Clear current session and set new chat
        session['chat_history'] = []
        session['current_chat_id'] = chat_id
        
        return jsonify({
            'message': 'Chat created successfully',
            'chat_id': chat_id,
            'title': title
        })
    except Exception as e:
        logger.error(f"Error creating chat: {e}")
        return jsonify({'error': 'Failed to create chat'}), 500

@app.route('/api/chats/<int:chat_id>', methods=['GET'])
def get_chat(chat_id):
    """Get a specific chat"""
    try:
        chat = db.get_chat(chat_id)
        if not chat:
            return jsonify({'error': 'Chat not found'}), 404
        
        # Update session
        session['current_chat_id'] = chat_id
        session['chat_history'] = []
        
        # Convert messages to session format
        for msg in chat['messages']:
            session['chat_history'].append({
                'role': msg['role'],
                'content': msg['content']
            })
        
        return jsonify({
            'chat': chat,
            'message': 'Chat loaded successfully'
        })
    except Exception as e:
        logger.error(f"Error getting chat {chat_id}: {e}")
        return jsonify({'error': 'Failed to get chat'}), 500

@app.route('/api/chats/<int:chat_id>', methods=['PUT'])
def update_chat(chat_id):
    """Update chat title"""
    try:
        data = request.get_json()
        new_title = data.get('title', '').strip()
        
        if not new_title:
            return jsonify({'error': 'Title cannot be empty'}), 400
        
        success = db.update_chat_title(chat_id, new_title)
        if success:
            return jsonify({'message': 'Chat title updated successfully'})
        else:
            return jsonify({'error': 'Failed to update chat title'}), 500
    except Exception as e:
        logger.error(f"Error updating chat {chat_id}: {e}")
        return jsonify({'error': 'Failed to update chat'}), 500

@app.route('/api/chats/<int:chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    """Delete a chat"""
    try:
        success = db.delete_chat(chat_id)
        if success:
            # If we're deleting the current chat, clear session
            if session.get('current_chat_id') == chat_id:
                session['chat_history'] = []
                session['current_chat_id'] = None
            
            return jsonify({'message': 'Chat deleted successfully'})
        else:
            return jsonify({'error': 'Failed to delete chat'}), 500
    except Exception as e:
        logger.error(f"Error deleting chat {chat_id}: {e}")
        return jsonify({'error': 'Failed to delete chat'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check if Ollama is running
        response = requests.get(f"{Config.OLLAMA_BASE_URL}/api/tags", timeout=5)
        if response.status_code == 200:
            return jsonify({
                'status': 'healthy',
                'ollama': 'running',
                'current_model': session.get('current_model', Config.DEFAULT_MODEL)
            })
        else:
            return jsonify({
                'status': 'unhealthy',
                'ollama': 'not responding',
                'current_model': session.get('current_model', Config.DEFAULT_MODEL)
            }), 503
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'ollama': 'not accessible',
            'error': str(e)
        }), 503

if __name__ == '__main__':
    print("🚀 Starting Local Home Helper...")
    print(f"📱 Web interface will be available at: http://localhost:5000")
    print(f"🤖 Default model: {Config.DEFAULT_MODEL}")
    print(f"🔧 Ollama URL: {Config.OLLAMA_BASE_URL}")
    print("\n💡 Make sure Ollama is running with: ollama serve")
    print("💡 Download a model with: ollama pull llama2:7b")
    print("\n" + "="*50)
    
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000)
