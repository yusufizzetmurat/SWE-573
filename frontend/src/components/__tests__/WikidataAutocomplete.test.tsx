/**
 * Tests for WikidataAutocomplete component
 * 
 * To run these tests, install testing dependencies:
 * npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
 * 
 * Add to vite.config.ts:
 * export default defineConfig({
 *   test: {
 *     globals: true,
 *     environment: 'jsdom',
 *     setupFiles: './src/test/setup.ts',
 *   },
 * })
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WikidataAutocomplete } from '../WikidataAutocomplete';
import { wikidataAPI } from '../../lib/api';

// Mock the API
vi.mock('../../lib/api', () => ({
  wikidataAPI: {
    search: vi.fn(),
  },
}));

const mockWikidataAPI = wikidataAPI as {
  search: ReturnType<typeof vi.fn>;
};

describe('WikidataAutocomplete', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders input field', () => {
    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search for tags/i)).toBeInTheDocument();
  });

  it('fetches results on input after debounce', async () => {
    const mockResults = [
      { id: 'Q28865', label: 'Python', description: 'programming language' },
    ];
    mockWikidataAPI.search.mockResolvedValue(mockResults);

    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'python' } });

    // Fast-forward debounce timer
    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockWikidataAPI.search).toHaveBeenCalledWith('python', 10, expect.any(AbortSignal));
    });
  });

  it('displays search results with label and description', async () => {
    const mockResults = [
      { id: 'Q28865', label: 'Python', description: 'high-level programming language' },
      { id: 'Q81', label: 'Cobra', description: 'genus of reptiles' },
    ];
    mockWikidataAPI.search.mockResolvedValue(mockResults);

    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'python' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('high-level programming language')).toBeInTheDocument();
      expect(screen.getByText('Q28865')).toBeInTheDocument();
    });
  });

  it('calls onSelect when item is clicked', async () => {
    const mockResults = [
      { id: 'Q28865', label: 'Python', description: 'programming language' },
    ];
    mockWikidataAPI.search.mockResolvedValue(mockResults);

    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'python' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Python')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('option'));

    expect(mockOnSelect).toHaveBeenCalledWith({
      id: 'Q28865',
      name: 'Python',
      description: 'programming language',
    });
  });

  it('shows loading state while fetching', async () => {
    // Create a promise that we control
    let resolvePromise: (value: unknown[]) => void;
    const pendingPromise = new Promise<unknown[]>((resolve) => {
      resolvePromise = resolve;
    });
    mockWikidataAPI.search.mockReturnValue(pendingPromise);

    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'python' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should show loading spinner
    await waitFor(() => {
      expect(screen.getByRole('textbox').parentElement?.querySelector('.animate-spin')).toBeInTheDocument();
    });

    // Resolve the promise
    act(() => {
      resolvePromise!([]);
    });
  });

  it('shows no results message when empty', async () => {
    mockWikidataAPI.search.mockResolvedValue([]);

    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'nonexistent12345' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Wait for the component to update but dropdown won't open for empty results
    await waitFor(() => {
      expect(mockWikidataAPI.search).toHaveBeenCalled();
    });
  });

  it('debounces API calls - only one call after rapid typing', async () => {
    mockWikidataAPI.search.mockResolvedValue([]);

    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    
    // Type rapidly
    fireEvent.change(input, { target: { value: 'p' } });
    act(() => { vi.advanceTimersByTime(100); });
    
    fireEvent.change(input, { target: { value: 'py' } });
    act(() => { vi.advanceTimersByTime(100); });
    
    fireEvent.change(input, { target: { value: 'pyt' } });
    act(() => { vi.advanceTimersByTime(100); });
    
    fireEvent.change(input, { target: { value: 'pyth' } });
    act(() => { vi.advanceTimersByTime(300); });

    await waitFor(() => {
      // Should only have one call with the final value
      expect(mockWikidataAPI.search).toHaveBeenCalledTimes(1);
      expect(mockWikidataAPI.search).toHaveBeenCalledWith('pyth', 10, expect.any(AbortSignal));
    });
  });

  it('handles API errors gracefully', async () => {
    mockWikidataAPI.search.mockRejectedValue(new Error('Network error'));

    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'python' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText(/failed to search/i)).toBeInTheDocument();
    });
  });

  it('clears input when clear button is clicked', async () => {
    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'python' } });

    expect(input).toHaveValue('python');

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
  });

  it('navigates results with keyboard', async () => {
    const mockResults = [
      { id: 'Q28865', label: 'Python', description: 'programming language' },
      { id: 'Q81', label: 'Python', description: 'genus of reptiles' },
    ];
    mockWikidataAPI.search.mockResolvedValue(mockResults);

    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'python' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    // Navigate down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveClass('bg-amber-50');

    // Navigate down again
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveClass('bg-amber-50');

    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnSelect).toHaveBeenCalledWith({
      id: 'Q81',
      name: 'Python',
      description: 'genus of reptiles',
    });
  });

  it('closes dropdown on Escape key', async () => {
    const mockResults = [
      { id: 'Q28865', label: 'Python', description: 'programming language' },
    ];
    mockWikidataAPI.search.mockResolvedValue(mockResults);

    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'python' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters out existing tags from results', async () => {
    const mockResults = [
      { id: 'Q28865', label: 'Python', description: 'programming language' },
      { id: 'Q81', label: 'Python', description: 'genus of reptiles' },
    ];
    mockWikidataAPI.search.mockResolvedValue(mockResults);

    const existingTags = [{ id: 'Q28865', name: 'Python' }];

    render(
      <WikidataAutocomplete 
        onSelect={mockOnSelect} 
        existingTags={existingTags}
      />
    );
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'python' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      // Should only show Q81, not Q28865
      expect(screen.getAllByRole('option')).toHaveLength(1);
      expect(screen.getByText('genus of reptiles')).toBeInTheDocument();
      expect(screen.queryByText('programming language')).not.toBeInTheDocument();
    });
  });

  it('does not search for queries shorter than 2 characters', async () => {
    render(<WikidataAutocomplete onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'p' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockWikidataAPI.search).not.toHaveBeenCalled();
    expect(screen.getByText(/type at least 2 characters/i)).toBeInTheDocument();
  });
});
