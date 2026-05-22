import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { mockQuickCowork } from './setup';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuickCowork.conversations.list.mockResolvedValue([]);
  });

  it('renders the app container', async () => {
    render(<App />);
    expect(screen.getByTestId('app')).toBeInTheDocument();
  });

  it('renders sidebar and main content', async () => {
    render(<App />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('main-content')).toBeInTheDocument();
  });

  it('shows empty state when no conversation is active', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
    expect(screen.getByText('Select or create a conversation to start')).toBeInTheDocument();
  });

  it('creates a conversation and shows chat view', async () => {
    const user = userEvent.setup();
    mockQuickCowork.conversations.create.mockResolvedValue({
      id: 'new-conv-1',
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    mockQuickCowork.conversations.list.mockResolvedValue([
      { id: 'new-conv-1', title: 'New Chat', createdAt: Date.now(), updatedAt: Date.now() },
    ]);

    render(<App />);

    const newChatBtn = screen.getByTestId('new-chat-button');
    await user.click(newChatBtn);

    await waitFor(() => {
      expect(screen.getByTestId('chat-view')).toBeInTheDocument();
    });
    expect(mockQuickCowork.conversations.create).toHaveBeenCalled();
  });

  it('navigates to settings view', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('settings-button'));

    await waitFor(() => {
      expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    });
  });

  it('navigates back from settings to main view', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByTestId('settings-button'));
    await waitFor(() => {
      expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('settings-back'));
    await waitFor(() => {
      expect(screen.queryByTestId('settings-view')).not.toBeInTheDocument();
    });
  });

  it('selects existing conversation to show chat view', async () => {
    const user = userEvent.setup();
    const convs = [
      { id: 'conv-a', title: 'Chat A', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'conv-b', title: 'Chat B', createdAt: Date.now(), updatedAt: Date.now() },
    ];
    mockQuickCowork.conversations.list.mockResolvedValue(convs);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Chat A')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Chat A'));

    await waitFor(() => {
      expect(screen.getByTestId('chat-view')).toBeInTheDocument();
    });
  });

  it('deletes a conversation', async () => {
    const user = userEvent.setup();
    const convs = [
      { id: 'conv-del', title: 'To Delete', createdAt: Date.now(), updatedAt: Date.now() },
    ];
    mockQuickCowork.conversations.list
      .mockResolvedValueOnce(convs)
      .mockResolvedValueOnce([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('To Delete')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByTestId('delete-conversation-conv-del');
    await user.click(deleteBtn);

    expect(mockQuickCowork.conversations.delete).toHaveBeenCalledWith('conv-del');
  });

  it('navigates to all view pages via sidebar buttons', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Research
    await user.click(screen.getByTestId('research-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });

    // Documents
    await user.click(screen.getByTestId('documents-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });

    // Memory
    await user.click(screen.getByTestId('memory-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });

    // Integrations
    await user.click(screen.getByTestId('integrations-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });

    // Agents
    await user.click(screen.getByTestId('agents-button'));
    await waitFor(() => {
      expect(screen.getByTestId('agents-view')).toBeInTheDocument();
    });

    // Spaces
    await user.click(screen.getByTestId('spaces-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('agents-view')).not.toBeInTheDocument();
    });

    // Workflows
    await user.click(screen.getByTestId('workflows-button'));
    await waitFor(() => {
      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
    });

    // Briefing
    await user.click(screen.getByTestId('briefing-button'));
    await waitFor(() => {
      expect(screen.getByTestId('briefing-view')).toBeInTheDocument();
    });
  });
});
