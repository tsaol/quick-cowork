import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatView } from '../components/ChatView';
import { mockQuickCowork } from './setup';

describe('ChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuickCowork.conversations.messages.mockResolvedValue([]);
    mockQuickCowork.chat.onStream.mockReturnValue(() => {});
  });

  it('renders chat view container', async () => {
    render(<ChatView conversationId="conv-1" />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });

  it('shows empty state when no messages', async () => {
    render(<ChatView conversationId="conv-1" />);
    await waitFor(() => {
      expect(screen.getByTestId('chat-empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('How can I help you?')).toBeInTheDocument();
    expect(screen.getByText('Ask me anything to get started')).toBeInTheDocument();
  });

  it('renders message input', () => {
    render(<ChatView conversationId="conv-1" />);
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message Quick Cowork...')).toBeInTheDocument();
  });

  it('renders send button (disabled when input is empty)', () => {
    render(<ChatView conversationId="conv-1" />);
    const sendBtn = screen.getByTestId('send-button');
    expect(sendBtn).toBeInTheDocument();
    expect(sendBtn).toBeDisabled();
  });

  it('enables send button when input has text', async () => {
    const user = userEvent.setup();
    render(<ChatView conversationId="conv-1" />);

    const input = screen.getByTestId('message-input');
    await user.type(input, 'Hello');

    expect(screen.getByTestId('send-button')).not.toBeDisabled();
  });

  it('sends message on button click', async () => {
    const user = userEvent.setup();
    render(<ChatView conversationId="conv-1" />);

    const input = screen.getByTestId('message-input');
    await user.type(input, 'Test message');
    await user.click(screen.getByTestId('send-button'));

    expect(mockQuickCowork.chat.send).toHaveBeenCalledWith('conv-1', 'Test message', undefined);
  });

  it('sends message on Enter key', async () => {
    const user = userEvent.setup();
    render(<ChatView conversationId="conv-1" />);

    const input = screen.getByTestId('message-input');
    await user.type(input, 'Enter test{Enter}');

    expect(mockQuickCowork.chat.send).toHaveBeenCalledWith('conv-1', 'Enter test', undefined);
  });

  it('does not send on Shift+Enter (new line)', async () => {
    const user = userEvent.setup();
    render(<ChatView conversationId="conv-1" />);

    const input = screen.getByTestId('message-input');
    await user.type(input, 'Line 1{Shift>}{Enter}{/Shift}Line 2');

    expect(mockQuickCowork.chat.send).not.toHaveBeenCalled();
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();
    render(<ChatView conversationId="conv-1" />);

    const input = screen.getByTestId('message-input');
    await user.type(input, 'Clear me{Enter}');

    expect(input).toHaveValue('');
  });

  it('displays user message after sending', async () => {
    const user = userEvent.setup();
    render(<ChatView conversationId="conv-1" />);

    const input = screen.getByTestId('message-input');
    await user.type(input, 'Visible message{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Visible message')).toBeInTheDocument();
    });
  });

  it('renders existing messages from conversation history', async () => {
    mockQuickCowork.conversations.messages.mockResolvedValue([
      { id: 'm1', role: 'user', content: 'Hello AI', timestamp: Date.now() },
      { id: 'm2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
    ]);

    render(<ChatView conversationId="conv-1" />);

    await waitFor(() => {
      expect(screen.getByText('Hello AI')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
  });

  it('loads messages for the given conversationId', () => {
    render(<ChatView conversationId="conv-xyz" />);
    expect(mockQuickCowork.conversations.messages).toHaveBeenCalledWith('conv-xyz');
  });

  it('subscribes to stream events', () => {
    render(<ChatView conversationId="conv-1" />);
    expect(mockQuickCowork.chat.onStream).toHaveBeenCalled();
  });

  it('renders messages container', () => {
    render(<ChatView conversationId="conv-1" />);
    expect(screen.getByTestId('messages-container')).toBeInTheDocument();
  });
});
