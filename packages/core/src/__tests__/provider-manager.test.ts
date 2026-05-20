import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderManager } from '../llm/manager.js';
import type { AppSettings } from '@quick-cowork/shared';

vi.mock('../llm/anthropic.js', () => {
  return {
    AnthropicProvider: class {
      id = 'anthropic';
      name = 'Anthropic';
      _key: string;
      constructor(key: string) { this._key = key; }
      isAvailable = vi.fn().mockResolvedValue(true);
      chat = vi.fn();
    },
  };
});

vi.mock('../llm/openai.js', () => {
  return {
    OpenAIProvider: class {
      id = 'openai';
      name = 'OpenAI';
      _key: string;
      constructor(key: string) { this._key = key; }
      isAvailable = vi.fn().mockResolvedValue(true);
      chat = vi.fn();
    },
  };
});

vi.mock('../llm/bedrock.js', () => {
  return {
    BedrockProvider: class {
      id = 'bedrock';
      name = 'AWS Bedrock';
      constructor() {}
      isAvailable = vi.fn().mockResolvedValue(false);
      chat = vi.fn();
    },
  };
});

vi.mock('../llm/ollama.js', () => {
  return {
    OllamaProvider: class {
      id = 'ollama';
      name = 'Ollama';
      constructor() {}
      isAvailable = vi.fn().mockResolvedValue(true);
      chat = vi.fn();
    },
  };
});

vi.mock('../llm/litellm.js', () => {
  return {
    LiteLLMProvider: class {
      id = 'litellm';
      name = 'LiteLLM';
      _baseUrl: string;
      _apiKey: string | undefined;
      constructor(baseUrl: string, apiKey?: string) {
        this._baseUrl = baseUrl;
        this._apiKey = apiKey;
      }
      isAvailable = vi.fn().mockResolvedValue(true);
      chat = vi.fn();
    },
  };
});

describe('ProviderManager', () => {
  let manager: ProviderManager;
  const baseSettings: AppSettings = {
    provider: 'ollama',
    model: 'llama3.2',
    apiKeys: {},
    ollamaHost: 'http://localhost:11434',
    theme: 'dark',
    allowedFolders: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ProviderManager();
  });

  describe('configure', () => {
    it('registers ollama and bedrock by default', () => {
      manager.configure(baseSettings);
      expect(manager.get('ollama')).toBeDefined();
      expect(manager.get('bedrock')).toBeDefined();
    });

    it('registers anthropic when API key is provided', () => {
      manager.configure({ ...baseSettings, apiKeys: { anthropic: 'sk-ant-test' } });
      expect(manager.get('anthropic')).toBeDefined();
    });

    it('does not register anthropic without API key', () => {
      manager.configure(baseSettings);
      expect(manager.get('anthropic')).toBeUndefined();
    });

    it('registers openai when API key is provided', () => {
      manager.configure({ ...baseSettings, apiKeys: { openai: 'sk-test' } });
      expect(manager.get('openai')).toBeDefined();
    });

    it('does not register openai without API key', () => {
      manager.configure(baseSettings);
      expect(manager.get('openai')).toBeUndefined();
    });

    it('registers litellm when baseUrl is provided', () => {
      manager.configure({ ...baseSettings, litellmBaseUrl: 'http://localhost:4000' });
      expect(manager.get('litellm')).toBeDefined();
    });

    it('passes apiKey to litellm provider', () => {
      manager.configure({
        ...baseSettings,
        litellmBaseUrl: 'http://localhost:4000',
        apiKeys: { litellm: 'my-key' },
      });
      const p = manager.get('litellm') as any;
      expect(p._baseUrl).toBe('http://localhost:4000');
      expect(p._apiKey).toBe('my-key');
    });

    it('does not register litellm without baseUrl', () => {
      manager.configure(baseSettings);
      expect(manager.get('litellm')).toBeUndefined();
    });

    it('clears previous providers on reconfigure', () => {
      manager.configure({ ...baseSettings, apiKeys: { anthropic: 'key1' } });
      expect(manager.get('anthropic')).toBeDefined();

      manager.configure(baseSettings);
      expect(manager.get('anthropic')).toBeUndefined();
    });

    it('registers all providers when all keys are given', () => {
      manager.configure({
        ...baseSettings,
        apiKeys: { anthropic: 'a', openai: 'o', litellm: 'l' },
        litellmBaseUrl: 'http://proxy:4000',
      });
      expect(manager.get('anthropic')).toBeDefined();
      expect(manager.get('openai')).toBeDefined();
      expect(manager.get('litellm')).toBeDefined();
      expect(manager.get('bedrock')).toBeDefined();
      expect(manager.get('ollama')).toBeDefined();
    });
  });

  describe('get', () => {
    it('returns undefined for non-existent provider', () => {
      manager.configure(baseSettings);
      expect(manager.get('nonexistent')).toBeUndefined();
    });

    it('returns provider by id', () => {
      manager.configure(baseSettings);
      const ollama = manager.get('ollama');
      expect(ollama).toBeDefined();
      expect(ollama!.id).toBe('ollama');
    });
  });

  describe('getAvailable', () => {
    it('returns only providers that report available', async () => {
      manager.configure({ ...baseSettings, apiKeys: { anthropic: 'key' } });
      const available = await manager.getAvailable();
      const ids = available.map((p) => p.id);
      expect(ids).toContain('anthropic');
      expect(ids).toContain('ollama');
      expect(ids).not.toContain('bedrock');
    });

    it('returns empty array when no providers are available', async () => {
      manager.configure(baseSettings);
      const ollama = manager.get('ollama') as any;
      ollama.isAvailable.mockResolvedValue(false);
      const bedrock = manager.get('bedrock') as any;
      bedrock.isAvailable.mockResolvedValue(false);

      const available = await manager.getAvailable();
      expect(available).toEqual([]);
    });
  });

  describe('chat', () => {
    it('yields error for unconfigured provider', async () => {
      manager.configure(baseSettings);
      const chunks = [];
      for await (const chunk of manager.chat('nonexistent', [{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual([
        { type: 'error', content: 'Provider "nonexistent" not configured' },
      ]);
    });

    it('delegates to correct provider', async () => {
      manager.configure(baseSettings);
      const ollama = manager.get('ollama') as any;
      ollama.chat = async function* () {
        yield { type: 'text', content: 'hello' };
        yield { type: 'done', content: '' };
      };

      const chunks = [];
      for await (const chunk of manager.chat('ollama', [{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk);
      }
      expect(chunks).toEqual([
        { type: 'text', content: 'hello' },
        { type: 'done', content: '' },
      ]);
    });

    it('passes options to provider chat', async () => {
      manager.configure({ ...baseSettings, litellmBaseUrl: 'http://localhost:4000' });
      const litellm = manager.get('litellm') as any;
      const chatSpy = vi.fn(async function* () {
        yield { type: 'done', content: '' };
      });
      litellm.chat = chatSpy;

      const opts = { model: 'gpt-4o', temperature: 0.7 };
      const chunks = [];
      for await (const chunk of manager.chat('litellm', [{ role: 'user', content: 'hi' }], opts)) {
        chunks.push(chunk);
      }

      expect(chatSpy).toHaveBeenCalledWith(
        [{ role: 'user', content: 'hi' }],
        opts,
      );
    });
  });
});
