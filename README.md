# Claude Sidekick

A Model Context Protocol (MCP) server that connects Claude to your local Ollama models, allowing you to offload simpler tasks and save your Claude tokens for complex work.

## Quick Start

### 1. Install Ollama

First, install Ollama on your system:

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

Start Ollama:
```bash
ollama serve
```

### 2. Pull Some Models

Download useful models for different tasks:

```bash
# General purpose models
ollama pull gpt-oss           # OpenAI's open-weight model
ollama pull llama3.2          # Fast, capable model
ollama pull qwen2.5           # High-quality text generation

# Specialised models
ollama pull deepseek-coder    # Code generation
ollama pull nomic-embed-text  # Text embeddings
ollama pull llama3.2:1b       # Lightweight for simple tasks
```

### 3. Set Up the MCP Server

Create a new directory and install dependencies:

```bash
mkdir mcp-ollama-server
cd mcp-ollama-server

# Copy the files (index.ts, package.json, tsconfig.json)
# Then install dependencies:
npm install

# Create src directory and move index.ts there
mkdir src
mv index.ts src/

# Build the project
npm run build
```

### 4. Configure Claude Desktop

Add the server to your Claude Desktop configuration:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ollama": {
      "command": "node",
      "args": ["/absolute/path/to/your/mcp-ollama-server/dist/index.js"],
      "env": {}
    }
  }
}
```

### 5. Restart Claude Desktop

Restart Claude Desktop to load the new MCP server. You should see the Ollama tools available in Claude.

## Available Tools

### `ollama_generate_text`
Generate text for simple writing tasks, basic summaries, or straightforward content creation.

**Best for:** Simple writing, basic explanations, content generation

### `ollama_chat`
Have conversations with local models for Q&A, explanations, or dialogue-based tasks.

**Best for:** Q&A sessions, explanations, interactive tasks

### `ollama_embed_text`
Generate text embeddings for semantic similarity, clustering, or search.

**Best for:** Document similarity, semantic search, clustering

### `ollama_code_generation`
Generate code using specialised coding models.

**Best for:** Simple scripts, boilerplate code, basic programming tasks

### `ollama_summarise`
Summarise text content with different length options.

**Best for:** Document summaries, article condensation

### `ollama_list_models`
List all available models on your Ollama installation.

### `ollama_pull_model`
Download new models to Ollama.

## Usage Examples

Once configured, Claude can use these tools like this:

**Text Generation:**
> "Use Ollama to generate a simple email template for customer onboarding"

**Code Generation:**
> "Have DeepSeek Coder create a Python script to parse CSV files"

**Embeddings:**
> "Generate embeddings for these document titles using Nomic"

**Summarisation:**
> "Use Llama to create a brief summary of this article"

## Model Recommendations

### For Text Generation
- **gpt-oss** - Excellent balance of speed and quality
- **llama3.2** - Good balance of speed and quality
- **qwen2.5** - Higher quality but slower
- **llama3.2:1b** - Very fast for simple tasks

### For Coding
- **gpt-oss** - Excellent code generation
- **deepseek-coder** - Great code generation
- **qwen2.5-coder** - Alternative coding model

### For Embeddings
- **nomic-embed-text** - Fast, high-quality embeddings
- **mxbai-embed-large** - Larger embedding model

## Configuration

### Customising the Server

Edit `src/index.ts` to modify:

- **Base URL:** Change Ollama endpoint (default: `http://localhost:11434`)
- **Timeout:** Adjust request timeout (default: 5 minutes)
- **Default Models:** Modify which models are used by default
- **Temperature Settings:** Adjust creativity/randomness

### Environment Variables

You can override settings with environment variables:

```bash
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_TIMEOUT=300000
```

## Troubleshooting

### "Failed to connect to Ollama"
1. Ensure Ollama is running: `ollama serve`
2. Check if it's accessible: `curl http://localhost:11434/api/tags`
3. Verify no firewall blocking port 11434

### "Model not found"
1. List available models: `ollama list`
2. Pull the missing model: `ollama pull model-name`

### "MCP server not appearing in Claude"
1. Check the config file path is correct
2. Verify the absolute path to the built JavaScript file
3. Restart Claude Desktop completely
4. Check Claude Desktop logs for errors

### Performance Tips

1. **Use smaller models for simple tasks:**
   - `llama3.2:1b` for basic text generation
   - `qwen2.5:0.5b` for very simple tasks

2. **Keep frequently used models warm:**
   ```bash
   # Pre-load models to keep them in memory
   ollama run llama3.2 "hello"
   ollama run deepseek-coder "print hello"
   ```

3. **Adjust temperature based on task:**
   - Low (0.1-0.3) for factual/coding tasks
   - Medium (0.5-0.8) for creative writing
   - High (0.9-1.2) for very creative tasks

## Development

### Running in Development

```bash
npm run dev        # Run with hot reload
npm run watch      # Watch mode
npm run type-check # Check TypeScript types
npm run lint       # Lint code
```

### Adding New Tools

To add new capabilities:

1. Define the tool in `setupHandlers()`
2. Add the handler method
3. Update the Ollama client if needed
4. Rebuild and restart

### Extending Model Support

To support new model types:

1. Add model configuration in the constructor
2. Create specific handler methods
3. Add appropriate prompting strategies

## Example Workflow

Here's how you might use this in practice:

1. **Initial analysis with Claude:** "I need to analyse this dataset and create a comprehensive report"

2. **Delegate simple tasks:** "Use Ollama to generate basic descriptions for each data column"

3. **Complex analysis with Claude:** Claude does the sophisticated statistical analysis and insights

4. **Offload summarisation:** "Use Llama to summarise each section of findings"

5. **Final review with Claude:** Claude assembles everything into a polished report

This approach maximises your Claude token efficiency while still getting comprehensive results.

## Security Notes

- This server runs locally and doesn't send data externally
- All model inference happens on your machine
- No API keys or external services required
- Your data stays completely private

## Contributing

Feel free to extend this server with additional capabilities:
- Image generation support
- Model fine-tuning integration
- Performance monitoring
- Model switching strategies
- Custom prompt templates