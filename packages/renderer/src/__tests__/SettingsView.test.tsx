import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsView } from '../components/SettingsView';
import { mockQuickCowork } from './setup';

describe('SettingsView', () => {
  const onBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuickCowork.settings.get.mockResolvedValue({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6-20250514',
      apiKeys: { anthropic: 'sk-ant-test' },
      theme: 'dark',
      allowedFolders: [],
    });
  });

  it('renders settings view', async () => {
    render(<SettingsView onBack={onBack} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    });
  });

  it('renders settings title', async () => {
    render(<SettingsView onBack={onBack} />);
    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('renders provider selector', async () => {
    render(<SettingsView onBack={onBack} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-provider')).toBeInTheDocument();
    });
  });

  it('renders model selector', async () => {
    render(<SettingsView onBack={onBack} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-model')).toBeInTheDocument();
    });
  });

  it('renders theme selector', async () => {
    render(<SettingsView onBack={onBack} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-theme')).toBeInTheDocument();
    });
  });

  it('renders save button', async () => {
    render(<SettingsView onBack={onBack} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-save')).toBeInTheDocument();
      expect(screen.getByTestId('settings-save')).toHaveTextContent('Save Settings');
    });
  });

  it('renders back button', async () => {
    render(<SettingsView onBack={onBack} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-back')).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsView onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-back')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('settings-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows Anthropic API key field for anthropic provider', async () => {
    render(<SettingsView onBack={onBack} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-anthropic-key')).toBeInTheDocument();
    });
  });

  it('shows OpenAI API key field when OpenAI is selected', async () => {
    const user = userEvent.setup();
    render(<SettingsView onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-provider')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('settings-provider'), 'openai');

    await waitFor(() => {
      expect(screen.getByTestId('settings-openai-key')).toBeInTheDocument();
    });
  });

  it('shows Ollama host field when Ollama is selected', async () => {
    const user = userEvent.setup();
    render(<SettingsView onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-provider')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('settings-provider'), 'ollama');

    await waitFor(() => {
      expect(screen.getByTestId('settings-ollama-host')).toBeInTheDocument();
    });
  });

  it('shows LiteLLM fields when LiteLLM is selected', async () => {
    const user = userEvent.setup();
    render(<SettingsView onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-provider')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('settings-provider'), 'litellm');

    await waitFor(() => {
      expect(screen.getByTestId('settings-litellm-url')).toBeInTheDocument();
      expect(screen.getByTestId('settings-litellm-key')).toBeInTheDocument();
    });
  });

  it('shows AWS region field when Bedrock is selected', async () => {
    const user = userEvent.setup();
    render(<SettingsView onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-provider')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('settings-provider'), 'bedrock');

    await waitFor(() => {
      expect(screen.getByTestId('settings-aws-region')).toBeInTheDocument();
    });
  });

  it('saves settings when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsView onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-save')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('settings-save'));

    expect(mockQuickCowork.settings.set).toHaveBeenCalled();
  });

  it('changes theme selection', async () => {
    const user = userEvent.setup();
    render(<SettingsView onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByTestId('settings-theme')).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByTestId('settings-theme'), 'light');
    expect(screen.getByTestId('settings-theme')).toHaveValue('light');
  });

  it('loads settings on mount', () => {
    render(<SettingsView onBack={onBack} />);
    expect(mockQuickCowork.settings.get).toHaveBeenCalled();
  });
});
