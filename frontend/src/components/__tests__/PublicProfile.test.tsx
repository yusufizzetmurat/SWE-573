/**
 * Tests for PublicProfile component
 * 
 * Tests profile display, video intro, portfolio images, and transaction history
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PublicProfile } from '../PublicProfile';
import { userAPI, serviceAPI } from '../../lib/api';

// Mock the APIs
vi.mock('../../lib/api', () => ({
  userAPI: {
    getUser: vi.fn(),
    getHistory: vi.fn(),
  },
  serviceAPI: {
    list: vi.fn(),
  },
}));

// Mock the auth context
vi.mock('../../lib/auth-context', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
  }),
}));

const mockUserAPI = userAPI as {
  getUser: ReturnType<typeof vi.fn>;
  getHistory: ReturnType<typeof vi.fn>;
};

const mockServiceAPI = serviceAPI as {
  list: ReturnType<typeof vi.fn>;
};

describe('PublicProfile', () => {
  const mockOnNavigate = vi.fn();
  const mockOnLogout = vi.fn();
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    bio: 'Test bio text',
    avatar_url: 'https://example.com/avatar.jpg',
    banner_url: 'https://example.com/banner.jpg',
    karma_score: 42,
    timebank_balance: 10,
    role: 'member' as const,
    punctual_count: 5,
    helpful_count: 3,
    kind_count: 7,
    badges: ['first-service'],
    date_joined: '2024-01-01T00:00:00Z',
    video_intro_url: null,
    video_intro_file_url: null,
    portfolio_images: [],
    show_history: true,
    services: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    mockUserAPI.getUser.mockResolvedValue(mockUser);
    mockUserAPI.getHistory.mockResolvedValue([]);
    mockServiceAPI.list.mockResolvedValue([]);
  });

  it('renders loading state initially', () => {
    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders user info correctly', async () => {
    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Karma: 42/i)).toBeInTheDocument();
    expect(screen.getByText('Test bio text')).toBeInTheDocument();
  });

  it('displays reputation counts', async () => {
    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // punctual
      expect(screen.getByText('3')).toBeInTheDocument(); // helpful
      expect(screen.getByText('7')).toBeInTheDocument(); // kind
    });
  });

  it('displays YouTube video intro when URL is provided', async () => {
    const userWithVideo = {
      ...mockUser,
      video_intro_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };
    mockUserAPI.getUser.mockResolvedValue(userWithVideo);

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByTitle('Video Introduction')).toBeInTheDocument();
    });
    
    const iframe = screen.getByTitle('Video Introduction');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('youtube.com/embed'));
  });

  it('displays Vimeo video intro when URL is provided', async () => {
    const userWithVideo = {
      ...mockUser,
      video_intro_url: 'https://vimeo.com/123456789',
    };
    mockUserAPI.getUser.mockResolvedValue(userWithVideo);

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByTitle('Video Introduction')).toBeInTheDocument();
    });
    
    const iframe = screen.getByTitle('Video Introduction');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('player.vimeo.com'));
  });

  it('displays HTML5 video for uploaded file', async () => {
    const userWithVideo = {
      ...mockUser,
      video_intro_file_url: 'https://example.com/videos/intro.mp4',
    };
    mockUserAPI.getUser.mockResolvedValue(userWithVideo);

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Video Introduction')).toBeInTheDocument();
    });
    
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://example.com/videos/intro.mp4');
  });

  it('displays portfolio images gallery', async () => {
    const userWithImages = {
      ...mockUser,
      portfolio_images: [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg',
      ],
    };
    mockUserAPI.getUser.mockResolvedValue(userWithImages);

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
    });
    
    const images = screen.getAllByAltText(/Portfolio/i);
    expect(images).toHaveLength(3);
  });

  it('opens image modal when portfolio image is clicked', async () => {
    const userWithImages = {
      ...mockUser,
      portfolio_images: ['https://example.com/img1.jpg'],
    };
    mockUserAPI.getUser.mockResolvedValue(userWithImages);

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
    });
    
    const portfolioImage = screen.getByAltText('Portfolio 1');
    fireEvent.click(portfolioImage.closest('button')!);
    
    // Modal should open with full-size image
    const modalImage = document.querySelector('.fixed img');
    expect(modalImage).toBeInTheDocument();
  });

  it('shows transaction history when public', async () => {
    const historyItems = [
      {
        service_title: 'Test Service',
        service_type: 'Offer',
        duration: 2,
        partner_name: 'Jane Smith',
        partner_id: 'partner-123',
        partner_avatar_url: null,
        completed_date: '2024-01-15T00:00:00Z',
        was_provider: true,
      },
    ];
    mockUserAPI.getHistory.mockResolvedValue(historyItems);

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Completed Exchanges')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Test Service')).toBeInTheDocument();
    expect(screen.getByText(/Provided to Jane Smith/i)).toBeInTheDocument();
  });

  it('hides transaction history when private', async () => {
    const userWithPrivateHistory = {
      ...mockUser,
      show_history: false,
    };
    mockUserAPI.getUser.mockResolvedValue(userWithPrivateHistory);
    mockUserAPI.getHistory.mockResolvedValue([]);

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Completed Exchanges')).not.toBeInTheDocument();
  });

  it('displays active services', async () => {
    const userWithServices = {
      ...mockUser,
      services: [
        {
          id: 'service-123',
          title: 'My Active Service',
          type: 'Offer',
          duration: 1,
          location_type: 'Online',
          status: 'Active',
          max_participants: 1,
          schedule_type: 'One-Time',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    };
    mockUserAPI.getUser.mockResolvedValue(userWithServices);

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Active Services')).toBeInTheDocument();
    });
    
    expect(screen.getByText('My Active Service')).toBeInTheDocument();
  });

  it('navigates to service detail when service is clicked', async () => {
    const userWithServices = {
      ...mockUser,
      services: [
        {
          id: 'service-123',
          title: 'My Active Service',
          type: 'Offer',
          duration: 1,
          location_type: 'Online',
          status: 'Active',
          max_participants: 1,
          schedule_type: 'One-Time',
          created_at: '2024-01-01T00:00:00Z',
        },
      ],
    };
    mockUserAPI.getUser.mockResolvedValue(userWithServices);

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('My Active Service')).toBeInTheDocument();
    });
    
    const serviceCard = screen.getByText('My Active Service').closest('div[class*="cursor-pointer"]');
    fireEvent.click(serviceCard!);
    
    expect(mockOnNavigate).toHaveBeenCalledWith('service-detail', { id: 'service-123' });
  });

  it('shows error message when user not found', async () => {
    mockUserAPI.getUser.mockRejectedValue(new Error('User not found'));

    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
    });
  });

  it('navigates back when back button is clicked', async () => {
    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
    
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    
    expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('displays badges correctly', async () => {
    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('Badges')).toBeInTheDocument();
    });
  });

  it('shows member since date', async () => {
    render(
      <PublicProfile 
        onNavigate={mockOnNavigate}
        userId={mockUserId}
        onLogout={mockOnLogout}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Member since Jan 2024/i)).toBeInTheDocument();
    });
  });
});
