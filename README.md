# Local Home Helper - Offline LLM Chatbot

A fully offline Large Language Model chatbot that runs locally on your machine using Ollama and a modern web interface.

## Features

- 🚀 **Fully Offline**: No internet connection required after setup
- 🤖 **Modern LLM Support**: Compatible with various models via Ollama
- 💬 **Chat Interface**: Clean, responsive web-based chat UI
- 🔧 **Extensible**: Easy to add RAG, fine-tuning, and other features
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

- Windows 10/11 (you're all set!)
- At least 8GB RAM (16GB+ recommended for larger models)
- At least 10GB free disk space
- PowerShell (already available)

## Quick Start

1. **Install Ollama**:
   ```powershell
   # Download and install Ollama from https://ollama.ai
   # Or use winget:
   winget install Ollama.Ollama
   ```

2. **Start Ollama**:
   ```powershell
   ollama serve
   ```

3. **Download a Model** (in a new PowerShell window):
   ```powershell
   # Download a lightweight model (recommended for first run)
   ollama pull llama2:7b
   
   # Or try a more capable model
   ollama pull llama2:13b
   ```

4. **Install Python Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

5. **Run the Application**:
   ```powershell
   python app.py
   ```

6. **Open your browser** and go to `http://localhost:5000`

## Project Structure

```
local-home-helper/
├── app.py                 # Main Flask application
├── static/               # CSS, JS, and other static files
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── chat.js
├── templates/            # HTML templates
│   ├── base.html
│   └── chat.html
├── requirements.txt      # Python dependencies
├── config.py            # Configuration settings
└── README.md            # This file
```

## Available Models

The following models work well with this setup:

- **llama2:7b** - Fast, lightweight, good for basic tasks
- **llama2:13b** - Better quality, moderate resource usage
- **llama2:70b** - Best quality, requires more resources
- **mistral:7b** - Excellent performance/size ratio
- **codellama:7b** - Specialized for coding tasks

## Configuration

Edit `config.py` to customize:
- Model selection
- Response parameters
- UI settings
- API endpoints

## Future Enhancements

- [ ] **RAG Integration**: Connect to local documents and databases
- [ ] **Fine-tuning**: Customize models for specific use cases
- [ ] **Multi-modal**: Support for images, audio, and documents
- [ ] **Plugin System**: Extensible architecture for new features
- [ ] **Model Management**: Easy switching between different models

## Troubleshooting

### Common Issues

1. **"Ollama not found"**: Make sure Ollama is installed and running
2. **"Model not found"**: Download the model first with `ollama pull <model_name>`
3. **Slow responses**: Try a smaller model or increase your system's RAM
4. **Port already in use**: Change the port in `config.py`

### Performance Tips

- Use smaller models (7b) for faster responses
- Close other applications to free up RAM
- Consider using a dedicated GPU if available
- Use SSD storage for better model loading times

## Contributing

Feel free to contribute improvements, bug fixes, or new features!

## License

MIT License - feel free to use this project for any purpose.
