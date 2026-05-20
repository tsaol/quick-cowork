import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window.quickCowork IPC API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockQuickCowork: any = {
  ping: vi.fn().mockResolvedValue('pong'),
  chat: {
    send: vi.fn().mockResolvedValue(undefined),
    onStream: vi.fn().mockReturnValue(() => {}),
    abort: vi.fn().mockResolvedValue(undefined),
  },
  conversations: {
    list: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'conv-1', title: 'New Chat', createdAt: Date.now(), updatedAt: Date.now() }),
    delete: vi.fn().mockResolvedValue(undefined),
    messages: vi.fn().mockResolvedValue([]),
  },
  settings: {
    get: vi.fn().mockResolvedValue({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6-20250514',
      apiKeys: {},
      theme: 'dark',
      allowedFolders: [],
    }),
    set: vi.fn().mockResolvedValue({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6-20250514',
      apiKeys: {},
      theme: 'dark',
      allowedFolders: [],
    }),
  },
  files: {
    pick: vi.fn().mockResolvedValue([]),
    pickFolder: vi.fn().mockResolvedValue(null),
    read: vi.fn().mockResolvedValue(null),
    listAllowed: vi.fn().mockResolvedValue([]),
    addFolder: vi.fn().mockResolvedValue(null),
    removeFolder: vi.fn().mockResolvedValue(undefined),
  },
  documents: {
    generate: vi.fn().mockResolvedValue({ filePath: '/tmp/doc.docx', format: 'docx' }),
  },
  research: {
    webSearch: vi.fn().mockResolvedValue({ results: [] }),
    fetchUrl: vi.fn().mockResolvedValue({ content: '', title: '' }),
    localSearch: vi.fn().mockResolvedValue([]),
    fileContent: vi.fn().mockResolvedValue({ content: '', mimeType: 'text/plain' }),
  },
  memory: {
    store: vi.fn().mockResolvedValue({ id: '1', content: '', createdAt: Date.now() }),
    search: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(undefined),
    getGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    update: vi.fn().mockResolvedValue({ id: '1', content: '', createdAt: Date.now() }),
  },
  mcp: {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue([]),
    invoke: vi.fn().mockResolvedValue({ result: null }),
    listServers: vi.fn().mockResolvedValue([]),
  },
  integrations: {
    slackSend: vi.fn().mockResolvedValue({}),
    slackChannels: vi.fn().mockResolvedValue([]),
    gmailSend: vi.fn().mockResolvedValue({}),
    gmailList: vi.fn().mockResolvedValue([]),
    calendarList: vi.fn().mockResolvedValue([]),
    calendarCreate: vi.fn().mockResolvedValue({}),
    oauthStart: vi.fn().mockResolvedValue(undefined),
    oauthStatus: vi.fn().mockResolvedValue({}),
  },
  agents: {
    create: vi.fn().mockResolvedValue({ id: 'a1', name: 'Test', instructions: '', tools: [], model: '', temperature: 0.7, createdAt: Date.now(), updatedAt: Date.now() }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue({ output: '', toolCalls: [] }),
  },
  spaces: {
    create: vi.fn().mockResolvedValue({ id: 's1', name: 'Test', description: '' }),
    join: vi.fn().mockResolvedValue(null),
    leave: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    invite: vi.fn().mockResolvedValue(null),
    members: vi.fn().mockResolvedValue([]),
    messages: vi.fn().mockResolvedValue([]),
    send: vi.fn().mockResolvedValue({}),
    sync: vi.fn().mockResolvedValue({}),
  },
  briefing: {
    generate: vi.fn().mockResolvedValue({ summary: '', sections: [], generatedAt: Date.now() }),
    getLatest: vi.fn().mockResolvedValue(null),
    configure: vi.fn().mockResolvedValue({}),
    getConfig: vi.fn().mockResolvedValue({ enabled: false, time: '08:00', includeCalendar: true, includeGmail: true, includeMemories: true }),
  },
  workflows: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue({}),
    toggle: vi.fn().mockResolvedValue({}),
    history: vi.fn().mockResolvedValue([]),
  },
};

Object.defineProperty(window, 'quickCowork', {
  value: mockQuickCowork,
  writable: true,
});

// Export for use in tests
export { mockQuickCowork };
