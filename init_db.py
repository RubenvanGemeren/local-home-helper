#!/usr/bin/env python3
"""
Database Initialization Script
Run this script to manually initialize the database
"""

from database import ChatDatabase
import os

def main():
    print("🗄️  Initializing Local Home Helper Database...")
    
    try:
        # Initialize database
        db = ChatDatabase()
        print("✅ Database initialized successfully!")
        print(f"📁 Database file: {os.path.abspath(db.db_path)}")
        
        # Test database operations
        print("\n🧪 Testing database operations...")
        
        # Create a test chat
        chat_id = db.create_chat("Test Chat", "llama2:7b")
        print(f"✅ Created test chat with ID: {chat_id}")
        
        # Add test messages
        db.add_message(chat_id, "user", "Hello, this is a test message!")
        db.add_message(chat_id, "assistant", "Hi! I'm your AI assistant. This is a test response.")
        print("✅ Added test messages")
        
        # Get chats
        chats = db.get_chats()
        print(f"✅ Retrieved {len(chats)} chats")
        
        # Clean up test data
        db.delete_chat(chat_id)
        print("✅ Cleaned up test data")
        
        print("\n🎉 Database is ready to use!")
        print("💡 You can now start the application with: python app.py")
        
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
