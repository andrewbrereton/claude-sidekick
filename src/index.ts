#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import type { AxiosInstance } from 'axios';

// Define Tool interface inline since it might not be exported
interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface OllamaModel {
  name: string;
  capabilities: string[];
  description: string;
}

interface OllamaConfig {
  baseUrl: string;
  timeout: number;
  models: OllamaModel[];
}

class OllamaClient {
  private client: AxiosInstance;
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  async generateText(model: string, prompt: string, options: any = {}): Promise<string> {
    try {
      const response = await this.client.post('/api/generate', {
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          top_k: options.top_k || 40,
          ...options,
        },
      });

      return response.data.response || '';
    } catch (error) {
      throw new Error(`Ollama generation failed: ${error}`);
    }
  }

  async chatCompletion(model: string, messages: any[], options: any = {}): Promise<string> {
    try {
      const response = await this.client.post('/api/chat', {
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          ...options,
        },
      });

      return response.data.message?.content || '';
    } catch (error) {
      throw new Error(`Ollama chat completion failed: ${error}`);
    }
  }

  async generateEmbedding(model: string, text: string): Promise<number[]> {
    try {
      const response = await this.client.post('/api/embeddings', {
        model,
        prompt: text,
      });

      return response.data.embedding || [];
    } catch (error) {
      throw new Error(`Ollama embedding generation failed: ${error}`);
    }
  }

  async pullModel(model: string): Promise<boolean> {
    try {
      await this.client.post('/api/pull', {
        name: model,
        stream: false,
      });
      return true;
    } catch (error) {
      console.error(`Failed to pull model ${model}:`, error);
      return false;
    }
  }
}

class MCPOllamaServer {
  private server: Server;
  private ollama: OllamaClient;
  private availableModels: string[] = [];

  constructor() {
    // Default configuration - modify as needed
    const config: OllamaConfig = {
      baseUrl: 'http://localhost:11434',
      timeout: 300000, // 5 minutes for large models
      models: [
        {
          name: 'llama3.2',
          capabilities: ['text-generation', 'chat', 'reasoning'],
          description: 'General purpose text generation and reasoning',
        },
        {
          name: 'qwen2.5',
          capabilities: ['text-generation', 'chat', 'coding'],
          description: 'High-quality text generation with strong coding abilities',
        },
        {
          name: 'deepseek-coder',
          capabilities: ['coding', 'text-generation'],
          description: 'Specialised code generation and programming assistance',
        },
        {
          name: 'nomic-embed-text',
          capabilities: ['embeddings'],
          description: 'Text embedding generation for semantic similarity',
        },
      ],
    };

    this.ollama = new OllamaClient(config);
    this.server = new Server(
      {
        name: 'ollama-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'ollama_generate_text',
          description: 'Generate text using a local Ollama model for simple tasks like basic writing, simple summaries, or straightforward content creation',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'Ollama model name (e.g., llama3.2, qwen2.5)',
                default: 'llama3.2',
              },
              prompt: {
                type: 'string',
                description: 'Text prompt for generation',
              },
              temperature: {
                type: 'number',
                description: 'Sampling temperature (0.0-2.0)',
                default: 0.7,
              },
              max_tokens: {
                type: 'number',
                description: 'Maximum tokens to generate',
                default: 2048,
              },
            },
            required: ['prompt'],
          },
        },
        {
          name: 'ollama_chat',
          description: 'Have a conversation with a local Ollama model, useful for Q&A, explanations, or dialogue-based tasks',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'Ollama model name',
                default: 'llama3.2',
              },
              messages: {
                type: 'array',
                description: 'Array of chat messages with role and content',
                items: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'string',
                      enum: ['system', 'user', 'assistant'],
                    },
                    content: {
                      type: 'string',
                    },
                  },
                  required: ['role', 'content'],
                },
              },
              temperature: {
                type: 'number',
                default: 0.7,
              },
            },
            required: ['messages'],
          },
        },
        {
          name: 'ollama_embed_text',
          description: 'Generate text embeddings using local embedding models like nomic-embed-text',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'Embedding model name',
                default: 'nomic-embed-text',
              },
              text: {
                type: 'string',
                description: 'Text to embed',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'ollama_code_generation',
          description: 'Generate code using specialised coding models like deepseek-coder',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'Coding model name',
                default: 'deepseek-coder',
              },
              task: {
                type: 'string',
                description: 'Coding task description',
              },
              language: {
                type: 'string',
                description: 'Programming language',
                default: 'python',
              },
              temperature: {
                type: 'number',
                default: 0.2,
              },
            },
            required: ['task'],
          },
        },
        {
          name: 'ollama_summarise',
          description: 'Summarise text content using local models for basic summarisation tasks',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                default: 'llama3.2',
              },
              text: {
                type: 'string',
                description: 'Text to summarise',
              },
              length: {
                type: 'string',
                enum: ['brief', 'medium', 'detailed'],
                default: 'medium',
                description: 'Summary length preference',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'ollama_list_models',
          description: 'List all available Ollama models on the local system',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'ollama_pull_model',
          description: 'Download and install a new model to Ollama',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'Model name to pull (e.g., llama3.2, qwen2.5:14b)',
              },
            },
            required: ['model'],
          },
        },
      ];

      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'ollama_generate_text':
            return await this.handleTextGeneration(args);

          case 'ollama_chat':
            return await this.handleChatCompletion(args);

          case 'ollama_embed_text':
            return await this.handleEmbedding(args);

          case 'ollama_code_generation':
            return await this.handleCodeGeneration(args);

          case 'ollama_summarise':
            return await this.handleSummarisation(args);

          case 'ollama_list_models':
            return await this.handleListModels();

          case 'ollama_pull_model':
            return await this.handlePullModel(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleTextGeneration(args: any) {
    const { model = 'llama3.2', prompt, temperature = 0.7, max_tokens = 2048 } = args;

    const enhancedPrompt = `${prompt}\n\nPlease provide a clear, concise response.`;
    const response = await this.ollama.generateText(model, enhancedPrompt, {
      temperature,
      num_predict: max_tokens,
    });

    return {
      content: [
        {
          type: 'text',
          text: `**Model:** ${model}\n**Generated Text:**\n\n${response}`,
        },
      ],
    };
  }

  private async handleChatCompletion(args: any) {
    const { model = 'llama3.2', messages, temperature = 0.7 } = args;

    const response = await this.ollama.chatCompletion(model, messages, {
      temperature,
    });

    return {
      content: [
        {
          type: 'text',
          text: `**Model:** ${model}\n**Response:**\n\n${response}`,
        },
      ],
    };
  }

  private async handleEmbedding(args: any) {
    const { model = 'nomic-embed-text', text } = args;

    const embedding = await this.ollama.generateEmbedding(model, text);

    return {
      content: [
        {
          type: 'text',
          text: `**Model:** ${model}\n**Text:** ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}\n**Embedding Vector:** [${embedding.length} dimensions]\n**Sample Values:** [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`,
        },
      ],
    };
  }

  private async handleCodeGeneration(args: any) {
    const { model = 'deepseek-coder', task, language = 'python', temperature = 0.2 } = args;

    const prompt = `Generate ${language} code for the following task:\n\n${task}\n\nProvide clean, well-commented code that follows best practices:`;

    const response = await this.ollama.generateText(model, prompt, {
      temperature,
      num_predict: 2048,
    });

    return {
      content: [
        {
          type: 'text',
          text: `**Model:** ${model}\n**Language:** ${language}\n**Task:** ${task}\n\n**Generated Code:**\n\n\`\`\`${language}\n${response}\n\`\`\``,
        },
      ],
    };
  }

  private async handleSummarisation(args: any) {
    const { model = 'llama3.2', text, length = 'medium' } = args;

    const lengthInstructions = {
      brief: 'Provide a very brief summary in 1-2 sentences.',
      medium: 'Provide a concise summary in 2-4 sentences.',
      detailed: 'Provide a detailed summary covering all key points.',
    };

    const prompt = `Please summarise the following text. ${lengthInstructions[length as keyof typeof lengthInstructions]}\n\nText to summarise:\n${text}\n\nSummary:`;

    const response = await this.ollama.generateText(model, prompt, {
      temperature: 0.3,
    });

    return {
      content: [
        {
          type: 'text',
          text: `**Model:** ${model}\n**Length:** ${length}\n**Original Length:** ${text.length} characters\n\n**Summary:**\n\n${response}`,
        },
      ],
    };
  }

  private async handleListModels() {
    try {
      const models = await this.ollama.listModels();
      this.availableModels = models;

      return {
        content: [
          {
            type: 'text',
            text: `**Available Ollama Models:**\n\n${models.length > 0 ? models.map(model => `• ${model}`).join('\n') : 'No models found. Try pulling a model first.'}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list models: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handlePullModel(args: any) {
    const { model } = args;

    try {
      const success = await this.ollama.pullModel(model);

      if (success) {
        return {
          content: [
            {
              type: 'text',
              text: `Successfully pulled model: ${model}`,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Failed to pull model: ${model}. Check if the model name is correct and Ollama is running.`,
            },
          ],
          isError: true,
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error pulling model ${model}: ${error}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run(): Promise<void> {
    // Test Ollama connection on startup
    try {
      await this.ollama.listModels();
      console.error('✅ Connected to Ollama successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Ollama. Make sure Ollama is running on localhost:11434');
      console.error('   You can start Ollama with: ollama serve');
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 MCP Ollama Server running');
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error('\n👋 Shutting down MCP Ollama Server');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\n👋 Shutting down MCP Ollama Server');
  process.exit(0);
});

// Start the server
const server = new MCPOllamaServer();
server.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});