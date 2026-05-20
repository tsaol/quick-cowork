import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteLLMProvider } from '../llm/litellm.js';

const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class {
      chat = { completions: { create: mockCreate } };
    },
  };
});

describe('LiteLLMProvider', () => {
  let provider: LiteLLMProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new LiteLLMProvider('http://localhost:4000', 'sk-test');
  });

  describe('constructor', () => {
    it('sets default baseUrl when empty string passed', () => {
      const p = new LiteLLMProvider('');
      expect(p.id).toBe('litellm');
      expect(p.name).toBe('LiteLLM');
    });

    it('sets default apiKey when none provided', () => {
      const p = new LiteLLMProvider('http://localhost:4000');
      expect(p.id).toBe('litellm');
    });

    it('uses custom baseUrl and apiKey', () => {
      const p = new LiteLLMProvider('http://myproxy:8080', 'my-key');
      expect(p.id).toBe('litellm');
    });
  });

  describe('isAvailable', () => {
    it('returns true when health endpoint responds ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      const result = await provider.isAvailable();
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4000/health',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('returns false when health endpoint returns non-ok', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false });
      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it('returns false when fetch throws (network error)', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it('returns false when fetch times out', async () => {
      global.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError'));
      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });

  describe('chat', () => {
    it('streams text chunks from provider', async () => {
      const mockStream = {
        controller: { abort: vi.fn() },
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'Hello' } }] };
          yield { choices: [{ delta: { content: ' world' } }] };
        },
      };
      mockCreate.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of provider.chat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'text', content: 'Hello' },
        { type: 'text', content: ' world' },
        { type: 'done', content: '' },
      ]);
    });

    it('uses default model gpt-4o when none specified', async () => {
      const mockStream = {
        controller: { abort: vi.fn() },
        [Symbol.asyncIterator]: async function* () {},
      };
      mockCreate.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of provider.chat([{ role: 'user', content: 'test' }])) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'gpt-4o', stream: true }),
      );
    });

    it('uses specified model from options', async () => {
      const mockStream = {
        controller: { abort: vi.fn() },
        [Symbol.asyncIterator]: async function* () {},
      };
      mockCreate.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of provider.chat(
        [{ role: 'user', content: 'test' }],
        { model: 'claude-sonnet-4-6-20250514' },
      )) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-sonnet-4-6-20250514' }),
      );
    });

    it('passes temperature and maxTokens options', async () => {
      const mockStream = {
        controller: { abort: vi.fn() },
        [Symbol.asyncIterator]: async function* () {},
      };
      mockCreate.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of provider.chat(
        [{ role: 'user', content: 'test' }],
        { temperature: 0.5, maxTokens: 2048 },
      )) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.5, max_tokens: 2048 }),
      );
    });

    it('uses default maxTokens 4096 when not specified', async () => {
      const mockStream = {
        controller: { abort: vi.fn() },
        [Symbol.asyncIterator]: async function* () {},
      };
      mockCreate.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of provider.chat([{ role: 'user', content: 'test' }])) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ max_tokens: 4096 }),
      );
    });

    it('maps multiple message roles correctly', async () => {
      const mockStream = {
        controller: { abort: vi.fn() },
        [Symbol.asyncIterator]: async function* () {},
      };
      mockCreate.mockResolvedValue(mockStream);

      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hi' },
        { role: 'assistant' as const, content: 'Hello!' },
        { role: 'user' as const, content: 'How are you?' },
      ];

      const chunks = [];
      for await (const chunk of provider.chat(messages)) {
        chunks.push(chunk);
      }

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'You are helpful' },
            { role: 'user', content: 'Hi' },
            { role: 'assistant', content: 'Hello!' },
            { role: 'user', content: 'How are you?' },
          ],
        }),
      );
    });

    it('skips chunks with no content', async () => {
      const mockStream = {
        controller: { abort: vi.fn() },
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'Hi' } }] };
          yield { choices: [{ delta: {} }] };
          yield { choices: [{ delta: { content: null } }] };
          yield { choices: [{ delta: { content: '' } }] };
          yield { choices: [{ delta: { content: '!' } }] };
        },
      };
      mockCreate.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of provider.chat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'text', content: 'Hi' },
        { type: 'text', content: '!' },
        { type: 'done', content: '' },
      ]);
    });

    it('skips chunks with empty choices array', async () => {
      const mockStream = {
        controller: { abort: vi.fn() },
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [] };
          yield { choices: [{ delta: { content: 'ok' } }] };
        },
      };
      mockCreate.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of provider.chat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'text', content: 'ok' },
        { type: 'done', content: '' },
      ]);
    });

    it('yields error chunk on API error', async () => {
      mockCreate.mockRejectedValue(new Error('Rate limit exceeded'));

      const chunks = [];
      for await (const chunk of provider.chat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'error', content: 'Rate limit exceeded' },
      ]);
    });

    it('yields error with "Unknown error" for non-Error throws', async () => {
      mockCreate.mockRejectedValue('something weird');

      const chunks = [];
      for await (const chunk of provider.chat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'error', content: 'Unknown error' },
      ]);
    });

    it('handles AbortError gracefully (yields done)', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockCreate.mockRejectedValue(abortError);

      const chunks = [];
      for await (const chunk of provider.chat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'done', content: '' },
      ]);
    });

    it('connects abort signal to stream controller', async () => {
      const abortFn = vi.fn();
      const mockStream = {
        controller: { abort: abortFn },
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'data' } }] };
        },
      };
      mockCreate.mockResolvedValue(mockStream);

      const ac = new AbortController();
      const chunks = [];
      for await (const chunk of provider.chat(
        [{ role: 'user', content: 'hi' }],
        { signal: ac.signal },
      )) {
        chunks.push(chunk);
      }

      ac.abort();
      expect(abortFn).toHaveBeenCalled();
    });

    it('handles stream interruption mid-stream', async () => {
      const mockStream = {
        controller: { abort: vi.fn() },
        [Symbol.asyncIterator]: async function* () {
          yield { choices: [{ delta: { content: 'partial' } }] };
          throw new Error('Connection reset');
        },
      };
      mockCreate.mockResolvedValue(mockStream);

      const chunks = [];
      for await (const chunk of provider.chat([{ role: 'user', content: 'hi' }])) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([
        { type: 'text', content: 'partial' },
        { type: 'error', content: 'Connection reset' },
      ]);
    });
  });
});
