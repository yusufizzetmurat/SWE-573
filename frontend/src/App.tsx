import React, { useState, Suspense, lazy, startTransition } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ToastProvider, useToast } from './components/Toast';
import { getErrorMessage, POLLING_INTERVALS, type NavigateData, type RegisterFormData, type ApiError } from './lib/types';
import type { Service } from './lib/api';
import { Button } from './components/ui/button';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logger } from './lib/logger';

// Eager load critical components
import { HomePage } from './components/HomePage';
import { RegistrationPage } from './components/RegistrationPage';
import { LoginPage } from './components/LoginPage';

// Lazy load heavy components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const ServiceDetail = lazy(() => import('./components/ServiceDetail').then(m => ({ default: m.ServiceDetail })));
const PostOfferForm = lazy(() => import('./components/PostOfferForm').then(m => ({ default: m.PostOfferForm })));
const PostNeedForm = lazy(() => import('./components/PostNeedForm').then(m => ({ default: m.PostNeedForm })));
const ChatPage = lazy(() => import('./components/ChatPage').then(m => ({ default: m.ChatPage })));
const UserProfile = lazy(() => import('./components/UserProfile').then(m => ({ default: m.UserProfile })));
const TransactionHistoryPage = lazy(() => import('./components/TransactionHistoryPage').then(m => ({ default: m.TransactionHistoryPage })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ReportDetail = lazy(() => import('./components/ReportDetail').then(m => ({ default: m.ReportDetail })));
const ForumCategories = lazy(() => import('./components/ForumCategories').then(m => ({ default: m.ForumCategories })));
const ForumTopicList = lazy(() => import('./components/ForumTopicList').then(m => ({ default: m.ForumTopicList })));
const ForumTopicDetail = lazy(() => import('./components/ForumTopicDetail').then(m => ({ default: m.ForumTopicDetail })));
const ForumCreateTopic = lazy(() => import('./components/ForumCreateTopic').then(m => ({ default: m.ForumCreateTopic })));
const PublicProfile = lazy(() => import('./components/PublicProfile').then(m => ({ default: m.PublicProfile })));
const AchievementView = lazy(() => import('./components/AchievementView').then(m => ({ default: m.AchievementView })));
const WelcomeModal = lazy(() => import('./components/WelcomeModal').then(m => ({ default: m.WelcomeModal })));
const ServiceConfirmationModal = lazy(() => import('./components/ServiceConfirmationModal').then(m => ({ default: m.ServiceConfirmationModal })));
const PositiveRepModal = lazy(() => import('./components/PositiveRepModal').then(m => ({ default: m.PositiveRepModal })));

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

type Page = 
  | 'home' 
  | 'register' 
  | 'login' 
  | 'dashboard' 
  | 'service-detail' 
  | 'post-offer' 
  | 'post-need'
  | 'messages'
  | 'profile'
  | 'public-profile'
  | 'transaction-history'
  | 'admin'
  | 'report-detail'
  | 'forum'
  | 'forum-category'
  | 'forum-topic'
  | 'forum-create-topic'
  | 'achievements';

const pageToPath: Record<Page, string> = {
  home: '/',
  register: '/register',
  login: '/login',
  dashboard: '/dashboard',
  'service-detail': '/service-detail',
  'post-offer': '/post-offer',
  'post-need': '/post-need',
  messages: '/messages',
  profile: '/profile',
  'public-profile': '/public-profile',
  'transaction-history': '/transaction-history',
  admin: '/admin',
  'report-detail': '/report-detail',
  forum: '/forum',
  'forum-category': '/forum/category',
  'forum-topic': '/forum/topic',
  'forum-create-topic': '/forum/new',
  achievements: '/achievements',
};

const resolvePageFromPath = (path: string): Page => {
  // Handle paths with parameters (e.g., /service-detail/123)
  if (path.startsWith('/service-detail/') || path === '/service-detail') {
    return 'service-detail';
  }
  if (path.startsWith('/report-detail/') || path === '/report-detail') {
    return 'report-detail';
  }
  if (path.startsWith('/public-profile/') || path === '/public-profile') {
    return 'public-profile';
  }
  // Forum routes
  if (path === '/forum/new') {
    return 'forum-create-topic';
  }
  if (path.startsWith('/forum/topic/')) {
    return 'forum-topic';
  }
  if (path.startsWith('/forum/category/')) {
    return 'forum-category';
  }
    if (path === '/forum') {
      return 'forum';
    }
    if (path === '/achievements') {
      return 'achievements';
    }
  
  const entry = Object.entries(pageToPath).find(([, mappedPath]) => mappedPath === path);
  return (entry ? entry[0] : 'home') as Page;
};

function AppContent() {
  const { user, isAuthenticated, isLoading, register, login, logout, refreshUser, updateUserOptimistically } = useAuth();
  const { showToast } = useToast();
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    if (typeof window === 'undefined') {
      return 'home';
    }
    return resolvePageFromPath(window.location.pathname);
  });
  const [pageData, setPageData] = useState<NavigateData | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showServiceConfirmation, setShowServiceConfirmation] = useState(false);
  const [showPositiveRep, setShowPositiveRep] = useState(false);
  const [currentHandshakeId, setCurrentHandshakeId] = useState<string | null>(null);
  const [positiveRepPartnerName, setPositiveRepPartnerName] = useState<string>('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [chatPageRefreshKey, setChatPageRefreshKey] = useState(0);
  
  // Fetch notifications count
  React.useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotifications(0);
      return;
    }
    
    let isMounted = true;
    let timeoutId: number | null = null;
    let intervalId: number | null = null;
    
    const fetchNotifications = async () => {
      if (!isMounted) return;
      
      // Check if we have tokens before making the request
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        return;
      }
      
      try {
        const { notificationAPI } = await import('./lib/api');
        const notifications = await notificationAPI.list();
        if (isMounted) {
          const unread = notifications.filter(n => !n.is_read).length;
          setUnreadNotifications(unread);
        }
      } catch (error: any) {
        // Silently handle auth errors - they're expected if tokens aren't ready yet
        if (error?.response?.status === 401 || error?.message?.includes('refresh token')) {
          return;
        }
        if (isMounted && error?.response?.status !== 401) {
          logger.error('Failed to fetch notifications', error instanceof Error ? error : new Error(String(error)));
        }
        if (isMounted) {
          setUnreadNotifications(0);
        }
      }
    };
    
    // Wait a bit after authentication to ensure tokens are set
    timeoutId = setTimeout(() => {
      fetchNotifications();
      // Refresh notifications periodically
      intervalId = setInterval(fetchNotifications, POLLING_INTERVALS.NOTIFICATIONS);
    }, 500);
    
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isAuthenticated]);

  const handleNavigate = (page: Page | string, data?: NavigateData) => {
    const resolvedPage = page as Page;
    let targetPath = pageToPath[resolvedPage] ?? '/';
    
    // Append ID to path for detail pages
    if (resolvedPage === 'service-detail' && data && 'id' in data) {
      targetPath = `/service-detail/${data.id}`;
    } else if (resolvedPage === 'report-detail' && data && 'id' in data) {
      targetPath = `/report-detail/${data.id}`;
    } else if (resolvedPage === 'public-profile' && data && 'userId' in data) {
      targetPath = `/public-profile/${data.userId}`;
    } else if (resolvedPage === 'forum-category' && data && 'categorySlug' in data) {
      targetPath = `/forum/category/${data.categorySlug}`;
    } else if (resolvedPage === 'forum-topic' && data && 'topicId' in data) {
      targetPath = `/forum/topic/${data.topicId}`;
    }
    
    startTransition(() => {
      if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        window.history.pushState({ page: resolvedPage, data }, '', targetPath);
      }
      setCurrentPage(resolvedPage);
      setPageData(data || null);
      window.scrollTo(0, 0);
    });
  };

  const handleRegister = async (data: RegisterFormData) => {
    try {
      await register({
        email: data.email,
        password: data.password,
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
      });

      handleNavigate('dashboard');
      
      // Show the welcome modal
      setTimeout(() => {
        setShowWelcomeModal(true);
      }, 500);
    } catch (error: unknown) {
      logger.error('Registration failed', error instanceof Error ? error : new Error(String(error)));
      const errorMessage = getErrorMessage(error, 'Registration failed. Please check your information and try again.');
      // Don't show toast here - let RegistrationPage handle it
      throw error; // Re-throw so RegistrationPage can handle it
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      await login(email, password);
      handleNavigate('dashboard');
    } catch (error: unknown) {
      logger.error('Login failed', error instanceof Error ? error : new Error(String(error)));
      const errorMessage = getErrorMessage(error, 'Login failed');
      showToast(`Login failed: ${errorMessage}`, 'error');
    }
  };

  const handleLogout = () => {
    logout();
    handleNavigate('home');
  };


  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Ensure the initial URL matches the current app state
    let initialPath = pageToPath[currentPage] ?? '/';
    if (currentPage === 'service-detail' && pageData && 'id' in pageData) {
      initialPath = `/service-detail/${pageData.id}`;
    }
    if (window.location.pathname !== initialPath && !window.location.pathname.startsWith(initialPath)) {
      window.history.replaceState({ page: currentPage, data: pageData }, '', initialPath);
    }

    const handlePopState = (event: PopStateEvent) => {
      const nextPage = resolvePageFromPath(window.location.pathname);
      setCurrentPage(nextPage);
      // Restore data from history state if available
      setPageData(event.state?.data || null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPage, pageData]);


  const handleServiceComplete = async (handshakeId: string, hours?: number) => {
    // Store original balance for rollback
    const originalBalance = user?.timebank_balance ?? 0;
    
    try {
      const { handshakeAPI } = await import('./lib/api');
      
      // Optimistically update balance (assuming hours will be transferred)
      if (hours && user) {
        // Provider loses hours, requester gains hours
        // We'll update after getting the actual handshake data
        updateUserOptimistically({ timebank_balance: originalBalance });
      }
      
      const handshake = await handshakeAPI.confirm(handshakeId, hours);
      
      // Check if both parties have confirmed (REQ-TB-008)
      const bothConfirmed = handshake.provider_confirmed_complete && handshake.receiver_confirmed_complete;
      
      if (bothConfirmed) {
        // Service completed - reputation modal is now only accessible through ChatPage for receivers
        showToast('Service completed! Both parties confirmed.', 'success');
      } else {
        showToast('Your confirmation received! Waiting for your partner to confirm.', 'info');
      }
      
      // Sync with server to get actual balance
      await refreshUser();
      setShowServiceConfirmation(false);
      // Force ChatPage to refresh its conversations
      setChatPageRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      // Rollback optimistic update on error
      if (user) {
        updateUserOptimistically({ timebank_balance: originalBalance });
      }
      const errorMessage = getErrorMessage(error, 'Failed to confirm service');
      showToast(errorMessage, 'error');
    }
  };

  const handleReportNoShow = async (handshakeId: string) => {
    try {
      const { handshakeAPI } = await import('./lib/api');
      await handshakeAPI.report(handshakeId, 'no_show', 'My partner did not show up');
      showToast('No-show reported. An admin will review this.', 'info');
      refreshUser();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Failed to report no-show');
      showToast(errorMessage, 'error');
    }
  };

  const handleSubmitReps = async (handshakeId: string, reps: { punctual: boolean; helpful: boolean; kind: boolean }) => {
    try {
      const { reputationAPI } = await import('./lib/api');
      // Map 'kind' to 'kindness' as expected by API
      await reputationAPI.submit(handshakeId, { punctual: reps.punctual, helpful: reps.helpful, kindness: reps.kind });
      refreshUser();
      setShowPositiveRep(false);
      showToast('Reputation submitted successfully!', 'success');
      // Force ChatPage to refresh conversations to update user_has_reviewed flag
      setChatPageRefreshKey(prev => prev + 1);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, 'Failed to submit reputation');
      showToast(errorMessage, 'error');
    }
  };

  // Refresh user data when authenticated (but not on every render)
  // MUST be before any conditional returns to follow Rules of Hooks
  React.useEffect(() => {
    let isMounted = true;
    
    if (isAuthenticated && !user) {
      refreshUser().catch(() => {
        // Silently handle errors - auth context will handle it
        if (!isMounted) return;
      });
    }
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
  
  const handleOpenReputationModal = (handshakeId: string, partnerName: string) => {
    setCurrentHandshakeId(handshakeId);
    setPositiveRepPartnerName(partnerName);
    setTimeout(() => {
      setShowPositiveRep(true);
    }, 100);
  };


  const userBalance = user?.timebank_balance || 0;
  const userName = user ? `${user.first_name} ${user.last_name}`.trim() || user.email : 'Guest';
  const userKarma = user?.karma_score || 0;
  const positiveReps = { 
    punctual: user?.punctual_count || 0, 
    helpful: user?.helpful_count || 0, 
    kind: user?.kind_count || 0 
  };

  return (
    <div className="min-h-screen">
      <ErrorBoundary>
        {currentPage === 'home' && (
          <HomePage onNavigate={handleNavigate} />
        )}

        {currentPage === 'register' && (
          <RegistrationPage 
            onNavigate={handleNavigate}
            onRegister={handleRegister}
          />
        )}

        {currentPage === 'login' && (
          <LoginPage 
            onNavigate={handleNavigate}
          />
        )}
      </ErrorBoundary>

      <ErrorBoundary>
        {currentPage === 'dashboard' && isAuthenticated && (
          <Suspense fallback={<LoadingFallback />}>
            <Dashboard 
              onNavigate={handleNavigate}
              userBalance={userBalance}
              unreadNotifications={unreadNotifications}
              onLogout={handleLogout}
            />
          </Suspense>
        )}

        {currentPage === 'dashboard' && !isAuthenticated && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Please log in to view your dashboard</p>
              <Button onClick={() => handleNavigate('login')} className="bg-orange-500 hover:bg-orange-600 mr-2">
                Log In
              </Button>
              <Button onClick={() => handleNavigate('register')} variant="outline">
                Sign Up
              </Button>
            </div>
          </div>
        )}
      </ErrorBoundary>

      <ErrorBoundary>
        {currentPage === 'service-detail' && (
          <Suspense fallback={<LoadingFallback />}>
            <ServiceDetail 
              onNavigate={handleNavigate}
              serviceData={pageData}
              userBalance={userBalance}
              unreadNotifications={unreadNotifications}
            />
          </Suspense>
        )}
      </ErrorBoundary>

      <ErrorBoundary>
        {currentPage === 'post-offer' && isAuthenticated && (
          <Suspense fallback={<LoadingFallback />}>
            <PostOfferForm 
              onNavigate={handleNavigate}
              userBalance={userBalance}
              unreadNotifications={unreadNotifications}
              onLogout={handleLogout}
              serviceData={pageData}
            />
          </Suspense>
        )}

        {currentPage === 'post-need' && isAuthenticated && (
          <Suspense fallback={<LoadingFallback />}>
            <PostNeedForm 
              onNavigate={handleNavigate}
              userBalance={userBalance}
              unreadNotifications={unreadNotifications}
              onLogout={handleLogout}
              serviceData={pageData}
            />
          </Suspense>
        )}

        {!isAuthenticated && (currentPage === 'post-offer' || currentPage === 'post-need') && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Please log in to post a service</p>
              <Button onClick={() => handleNavigate('login')} className="bg-orange-500 hover:bg-orange-600">
                Log In
              </Button>
            </div>
          </div>
        )}
      </ErrorBoundary>

      <ErrorBoundary>
        {currentPage === 'messages' && isAuthenticated && (
          <Suspense fallback={<LoadingFallback />}>
            <ChatPage 
              key={`messages-page-${chatPageRefreshKey}`}
              onNavigate={handleNavigate}
              userBalance={userBalance}
              unreadNotifications={unreadNotifications}
              onLogout={handleLogout}
              onConfirmService={(handshakeId) => {
                setCurrentHandshakeId(handshakeId);
                setShowServiceConfirmation(true);
              }}
              onOpenReputationModal={handleOpenReputationModal}
            />
          </Suspense>
        )}

        {currentPage === 'messages' && !isAuthenticated && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Please log in to view messages</p>
              <Button onClick={() => handleNavigate('login')} className="bg-orange-500 hover:bg-orange-600">
                Log In
              </Button>
            </div>
          </div>
        )}
      </ErrorBoundary>

      <ErrorBoundary>
        {currentPage === 'profile' && isAuthenticated && user && (
          <Suspense fallback={<LoadingFallback />}>
            <UserProfile 
              onNavigate={handleNavigate}
              userBalance={userBalance}
              karma={userKarma}
              positiveReps={positiveReps}
              badges={user?.badges || []}
              isOwnProfile={true}
              userName={userName}
              userBio={user?.bio || ''}
              memberSince={user?.date_joined ? new Date(user.date_joined).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              onLogout={handleLogout}
            />
          </Suspense>
        )}

        {currentPage === 'profile' && !isAuthenticated && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Please log in to view your profile</p>
              <Button onClick={() => handleNavigate('login')} className="bg-orange-500 hover:bg-orange-600">
                Log In
              </Button>
            </div>
          </div>
        )}

        {currentPage === 'achievements' && isAuthenticated && (
          <Suspense fallback={<LoadingFallback />}>
            <AchievementView 
              onNavigate={handleNavigate}
              userBalance={userBalance}
              unreadNotifications={unreadNotifications}
              onLogout={handleLogout}
            />
          </Suspense>
        )}

        {currentPage === 'achievements' && !isAuthenticated && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Please log in to view achievements</p>
              <Button onClick={() => handleNavigate('login')} className="bg-orange-500 hover:bg-orange-600">
                Log In
              </Button>
            </div>
          </div>
        )}
      </ErrorBoundary>

      <ErrorBoundary>
        {currentPage === 'public-profile' && (() => {
          // Get userId from pageData or fallback to URL path for direct navigation
          const userId = pageData && 'userId' in pageData 
            ? pageData.userId as string 
            : window.location.pathname.split('/').pop();
          
          return userId ? (
            <Suspense fallback={<LoadingFallback />}>
              <PublicProfile 
                onNavigate={handleNavigate}
                userId={userId}
                userBalance={userBalance}
                unreadNotifications={unreadNotifications}
                onLogout={handleLogout}
              />
            </Suspense>
          ) : null;
        })()}
      </ErrorBoundary>

      <ErrorBoundary>
        {currentPage === 'transaction-history' && isAuthenticated && (
          <Suspense fallback={<LoadingFallback />}>
            <TransactionHistoryPage 
              onNavigate={handleNavigate}
              userBalance={userBalance}
              unreadNotifications={unreadNotifications}
              onLogout={handleLogout}
            />
          </Suspense>
        )}

        {currentPage === 'transaction-history' && !isAuthenticated && (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600 mb-4">Please log in to view your transaction history</p>
              <Button onClick={() => handleNavigate('login')} className="bg-orange-500 hover:bg-orange-600">
                Log In
              </Button>
            </div>
          </div>
        )}
      </ErrorBoundary>

      <ErrorBoundary>
        {currentPage === 'admin' && isAuthenticated && user?.role === 'admin' && (
          <Suspense fallback={<LoadingFallback />}>
            <AdminDashboard 
              onNavigate={handleNavigate}
            />
          </Suspense>
        )}

        {/* Redirect non-admin users trying to access admin page */}
        {currentPage === 'admin' && isAuthenticated && user?.role !== 'admin' && (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
              <p className="text-gray-600 mb-6">You do not have permission to access the moderator dashboard.</p>
              <Button onClick={() => handleNavigate('dashboard')} className="bg-amber-500 hover:bg-amber-600">
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Prompt unauthenticated users to log in */}
        {currentPage === 'admin' && !isAuthenticated && (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h1>
              <p className="text-gray-600 mb-6">Please log in to access the moderator dashboard.</p>
              <Button onClick={() => handleNavigate('login')} className="bg-amber-500 hover:bg-amber-600">
                Log In
              </Button>
            </div>
          </div>
        )}

        {currentPage === 'report-detail' && isAuthenticated && user?.role === 'admin' && (
          <Suspense fallback={<LoadingFallback />}>
            <ReportDetail 
              onNavigate={handleNavigate}
              reportData={pageData}
            />
          </Suspense>
        )}

        {/* Redirect non-admin users trying to access report detail */}
        {currentPage === 'report-detail' && isAuthenticated && user?.role !== 'admin' && (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
              <p className="text-gray-600 mb-6">You do not have permission to view report details.</p>
              <Button onClick={() => handleNavigate('dashboard')} className="bg-amber-500 hover:bg-amber-600">
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Prompt unauthenticated users to log in for report detail */}
        {currentPage === 'report-detail' && !isAuthenticated && (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Login Required</h1>
              <p className="text-gray-600 mb-6">Please log in to view report details.</p>
              <Button onClick={() => handleNavigate('login')} className="bg-amber-500 hover:bg-amber-600">
                Log In
              </Button>
            </div>
          </div>
        )}
      </ErrorBoundary>

      <ErrorBoundary>
        {currentPage === 'forum' && (
          <Suspense fallback={<LoadingFallback />}>
            <ForumCategories 
              onNavigate={handleNavigate}
              userBalance={userBalance}
              unreadNotifications={unreadNotifications}
              onLogout={handleLogout}
              isAuthenticated={isAuthenticated}
            />
          </Suspense>
        )}

        {currentPage === 'forum-category' && (() => {
          const categorySlug = pageData && 'categorySlug' in pageData 
            ? pageData.categorySlug as string 
            : window.location.pathname.split('/').pop();
          const categoryName = pageData && 'categoryName' in pageData 
            ? pageData.categoryName as string 
            : undefined;
          
          return categorySlug ? (
            <Suspense fallback={<LoadingFallback />}>
              <ForumTopicList 
                onNavigate={handleNavigate}
                categorySlug={categorySlug}
                categoryName={categoryName}
                userBalance={userBalance}
                unreadNotifications={unreadNotifications}
                onLogout={handleLogout}
              />
            </Suspense>
          ) : null;
        })()}

        {currentPage === 'forum-topic' && (() => {
          const topicId = pageData && 'topicId' in pageData 
            ? pageData.topicId as string 
            : window.location.pathname.split('/').pop();
          const topicTitle = pageData && 'topicTitle' in pageData 
            ? pageData.topicTitle as string 
            : undefined;
          
          return topicId ? (
            <Suspense fallback={<LoadingFallback />}>
              <ForumTopicDetail 
                onNavigate={handleNavigate}
                topicId={topicId}
                topicTitle={topicTitle}
                userBalance={userBalance}
                unreadNotifications={unreadNotifications}
                onLogout={handleLogout}
              />
            </Suspense>
          ) : null;
        })()}

        {currentPage === 'forum-create-topic' && (
          <Suspense fallback={<LoadingFallback />}>
            <ForumCreateTopic 
              onNavigate={handleNavigate}
              categorySlug={pageData && 'categorySlug' in pageData ? pageData.categorySlug as string : undefined}
              categoryName={pageData && 'categoryName' in pageData ? pageData.categoryName as string : undefined}
              userBalance={userBalance}
              unreadNotifications={unreadNotifications}
              onLogout={handleLogout}
            />
          </Suspense>
        )}
      </ErrorBoundary>

      {/* Welcome Modal */}
      <Suspense fallback={null}>
        <WelcomeModal
          open={showWelcomeModal}
          onClose={() => setShowWelcomeModal(false)}
          userName={userName}
          onNavigate={handleNavigate}
        />
      </Suspense>

      {/* Service Confirmation Modal */}
      <Suspense fallback={null}>
        <ServiceConfirmationModal
          open={showServiceConfirmation}
          onClose={() => {
            setShowServiceConfirmation(false);
            setCurrentHandshakeId(null);
          }}
          onComplete={(hours) => {
            if (currentHandshakeId) {
              handleServiceComplete(currentHandshakeId, hours);
            }
          }}
          handshakeId={currentHandshakeId}
          onReportNoShow={() => {
            if (currentHandshakeId) {
              handleReportNoShow(currentHandshakeId);
            }
          }}
          serviceTitle="Service Completion"
          providerName="Provider"
          receiverName="Receiver"
          duration={0}
        />
      </Suspense>

      {/* Positive Rep Modal */}
      <Suspense fallback={null}>
        <PositiveRepModal
          open={showPositiveRep}
          onClose={() => {
            setShowPositiveRep(false);
            setCurrentHandshakeId(null);
            setPositiveRepPartnerName('');
          }}
          onSubmit={(reps) => {
            if (currentHandshakeId) {
              handleSubmitReps(currentHandshakeId, reps);
            }
          }}
          userName={positiveRepPartnerName || 'Your Partner'}
        />
      </Suspense>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
