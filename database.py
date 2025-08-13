"""
Local Home Helper - Database Module
Handles local SQLite database for storing chats and messages
"""

import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class ChatDatabase:
    def __init__(self, db_path: str = "chats.db"):
        """Initialize database connection"""
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database tables if they don't exist"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Create chats table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS chats (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        model TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Create messages table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        chat_id INTEGER NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE
                    )
                ''')
                
                # Create index for faster queries
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats (updated_at)')
                
                conn.commit()
                logger.info("Database initialized successfully")
                
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise
    
    def create_chat(self, title: str, model: str) -> int:
        """Create a new chat and return its ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO chats (title, model, created_at, updated_at)
                    VALUES (?, ?, ?, ?)
                ''', (title, model, datetime.now(), datetime.now()))
                
                chat_id = cursor.lastrowid
                conn.commit()
                logger.info(f"Created new chat: {title} (ID: {chat_id})")
                return chat_id
                
        except Exception as e:
            logger.error(f"Error creating chat: {e}")
            raise
    
    def add_message(self, chat_id: int, role: str, content: str) -> int:
        """Add a message to a chat and return message ID"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Add message
                cursor.execute('''
                    INSERT INTO messages (chat_id, role, content, timestamp)
                    VALUES (?, ?, ?, ?)
                ''', (chat_id, role, content, datetime.now()))
                
                # Update chat's updated_at timestamp
                cursor.execute('''
                    UPDATE chats SET updated_at = ? WHERE id = ?
                ''', (datetime.now(), chat_id))
                
                message_id = cursor.lastrowid
                conn.commit()
                logger.info(f"Added message to chat {chat_id}")
                return message_id
                
        except Exception as e:
            logger.error(f"Error adding message: {e}")
            raise
    
    def get_chats(self) -> List[Dict]:
        """Get all chats with basic info"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT c.id, c.title, c.model, c.created_at, c.updated_at,
                           COUNT(m.id) as message_count
                    FROM chats c
                    LEFT JOIN messages m ON c.id = m.chat_id
                    GROUP BY c.id
                    ORDER BY c.updated_at DESC
                ''')
                
                chats = []
                for row in cursor.fetchall():
                    chats.append({
                        'id': row[0],
                        'title': row[1],
                        'model': row[2],
                        'created_at': row[3],
                        'updated_at': row[4],
                        'message_count': row[5]
                    })
                
                return chats
                
        except Exception as e:
            logger.error(f"Error getting chats: {e}")
            return []
    
    def get_chat(self, chat_id: int) -> Optional[Dict]:
        """Get a specific chat with all its messages"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Get chat info
                cursor.execute('SELECT * FROM chats WHERE id = ?', (chat_id,))
                chat_row = cursor.fetchone()
                
                if not chat_row:
                    return None
                
                # Get messages
                cursor.execute('''
                    SELECT role, content, timestamp 
                    FROM messages 
                    WHERE chat_id = ? 
                    ORDER BY timestamp ASC
                ''', (chat_id,))
                
                messages = []
                for row in cursor.fetchall():
                    messages.append({
                        'role': row[0],
                        'content': row[1],
                        'timestamp': row[2]
                    })
                
                return {
                    'id': chat_row[0],
                    'title': chat_row[1],
                    'model': chat_row[2],
                    'created_at': chat_row[3],
                    'updated_at': chat_row[4],
                    'messages': messages
                }
                
        except Exception as e:
            logger.error(f"Error getting chat {chat_id}: {e}")
            return None
    
    def update_chat_title(self, chat_id: int, new_title: str) -> bool:
        """Update chat title"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE chats 
                    SET title = ?, updated_at = ? 
                    WHERE id = ?
                ''', (new_title, datetime.now(), chat_id))
                
                conn.commit()
                logger.info(f"Updated chat {chat_id} title to: {new_title}")
                return True
                
        except Exception as e:
            logger.error(f"Error updating chat title: {e}")
            return False
    
    def delete_chat(self, chat_id: int) -> bool:
        """Delete a chat and all its messages"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Delete messages first (due to foreign key constraint)
                cursor.execute('DELETE FROM messages WHERE chat_id = ?', (chat_id,))
                
                # Delete chat
                cursor.execute('DELETE FROM chats WHERE id = ?', (chat_id,))
                
                conn.commit()
                logger.info(f"Deleted chat {chat_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error deleting chat {chat_id}: {e}")
            return False
    
    def get_chat_summary(self, chat_id: int) -> Optional[str]:
        """Get a summary of the chat (first few messages) for display"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT content FROM messages 
                    WHERE chat_id = ? 
                    ORDER BY timestamp ASC 
                    LIMIT 3
                ''', (chat_id,))
                
                messages = cursor.fetchall()
                if messages:
                    # Combine first few messages for summary
                    summary = ' '.join([msg[0][:100] for msg in messages])
                    return summary[:150] + "..." if len(summary) > 150 else summary
                return "No messages"
                
        except Exception as e:
            logger.error(f"Error getting chat summary: {e}")
            return "Error loading summary"
    
    def close(self):
        """Close database connection"""
        pass  # SQLite connections are automatically closed

# Global database instance
db = ChatDatabase()
