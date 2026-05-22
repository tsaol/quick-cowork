import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../components/Sidebar';

const defaultProps = {
  conversations: [],
  activeId: null,
  onSelect: vi.fn(),
  onCreate: vi.fn(),
  onDelete: vi.fn(),
  onSettingsClick: vi.fn(),
  onResearchClick: vi.fn(),
  onDocumentsClick: vi.fn(),
  onMemoryClick: vi.fn(),
  onIntegrationsClick: vi.fn(),
  onAgentsClick: vi.fn(),
  onSpacesClick: vi.fn(),
  onWorkflowsClick: vi.fn(),
  onBriefingClick: vi.fn(),
};

describe('Sidebar', () => {
  it('renders sidebar container', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders app title', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText('Quick Cowork')).toBeInTheDocument();
  });

  it('renders New Chat button', () => {
    render(<Sidebar {...defaultProps} />);
    const btn = screen.getByTestId('new-chat-button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent('New Chat');
  });

  it('calls onCreate when New Chat is clicked', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<Sidebar {...defaultProps} onCreate={onCreate} />);

    await user.click(screen.getByTestId('new-chat-button'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('shows "No conversations yet" when list is empty', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTestId('no-conversations')).toBeInTheDocument();
    expect(screen.getByText('No conversations yet')).toBeInTheDocument();
  });

  it('renders conversation items', () => {
    const conversations = [
      { id: 'c1', title: 'First Chat', createdAt: Date.now(), updatedAt: Date.now() },
      { id: 'c2', title: 'Second Chat', createdAt: Date.now(), updatedAt: Date.now() },
    ];
    render(<Sidebar {...defaultProps} conversations={conversations} />);

    expect(screen.getByText('First Chat')).toBeInTheDocument();
    expect(screen.getByText('Second Chat')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-item-c1')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-item-c2')).toBeInTheDocument();
  });

  it('highlights active conversation', () => {
    const conversations = [
      { id: 'c1', title: 'Active Chat', createdAt: Date.now(), updatedAt: Date.now() },
    ];
    render(<Sidebar {...defaultProps} conversations={conversations} activeId="c1" />);

    const item = screen.getByTestId('conversation-item-c1');
    expect(item.className).toContain('bg-zinc-800');
  });

  it('calls onSelect when conversation is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const conversations = [
      { id: 'c1', title: 'Click Me', createdAt: Date.now(), updatedAt: Date.now() },
    ];
    render(<Sidebar {...defaultProps} conversations={conversations} onSelect={onSelect} />);

    await user.click(screen.getByText('Click Me'));
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const conversations = [
      { id: 'c1', title: 'Del Me', createdAt: Date.now(), updatedAt: Date.now() },
    ];
    render(<Sidebar {...defaultProps} conversations={conversations} onDelete={onDelete} />);

    await user.click(screen.getByTestId('delete-conversation-c1'));
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('renders all navigation buttons', () => {
    render(<Sidebar {...defaultProps} />);

    expect(screen.getByTestId('research-button')).toHaveTextContent('Research');
    expect(screen.getByTestId('documents-button')).toHaveTextContent('Documents');
    expect(screen.getByTestId('memory-button')).toHaveTextContent('Memory');
    expect(screen.getByTestId('integrations-button')).toHaveTextContent('Integrations');
    expect(screen.getByTestId('agents-button')).toHaveTextContent('Agents');
    expect(screen.getByTestId('spaces-button')).toHaveTextContent('Spaces');
    expect(screen.getByTestId('workflows-button')).toHaveTextContent('Workflows');
    expect(screen.getByTestId('briefing-button')).toHaveTextContent('Briefing');
    expect(screen.getByTestId('settings-button')).toHaveTextContent('Settings');
  });

  it('calls correct callbacks for navigation buttons', async () => {
    const user = userEvent.setup();
    const callbacks = {
      onResearchClick: vi.fn(),
      onDocumentsClick: vi.fn(),
      onMemoryClick: vi.fn(),
      onIntegrationsClick: vi.fn(),
      onAgentsClick: vi.fn(),
      onSpacesClick: vi.fn(),
      onWorkflowsClick: vi.fn(),
      onBriefingClick: vi.fn(),
      onSettingsClick: vi.fn(),
    };
    render(<Sidebar {...defaultProps} {...callbacks} />);

    await user.click(screen.getByTestId('research-button'));
    expect(callbacks.onResearchClick).toHaveBeenCalled();

    await user.click(screen.getByTestId('documents-button'));
    expect(callbacks.onDocumentsClick).toHaveBeenCalled();

    await user.click(screen.getByTestId('memory-button'));
    expect(callbacks.onMemoryClick).toHaveBeenCalled();

    await user.click(screen.getByTestId('integrations-button'));
    expect(callbacks.onIntegrationsClick).toHaveBeenCalled();

    await user.click(screen.getByTestId('agents-button'));
    expect(callbacks.onAgentsClick).toHaveBeenCalled();

    await user.click(screen.getByTestId('spaces-button'));
    expect(callbacks.onSpacesClick).toHaveBeenCalled();

    await user.click(screen.getByTestId('workflows-button'));
    expect(callbacks.onWorkflowsClick).toHaveBeenCalled();

    await user.click(screen.getByTestId('briefing-button'));
    expect(callbacks.onBriefingClick).toHaveBeenCalled();

    await user.click(screen.getByTestId('settings-button'));
    expect(callbacks.onSettingsClick).toHaveBeenCalled();
  });
});
