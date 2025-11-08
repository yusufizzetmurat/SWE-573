import React, { useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ToastProvider, useToast } from './components/Toast';
import { getErrorMessage, POLLING_INTERVALS, type NavigateData, type RegisterFormData, type ApiError } from './lib/types';
import type { Service } from './lib/api';
import { HomePage } from './components/HomePage';
import { RegistrationPage } from './components/RegistrationPage';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { ServiceDetail } from './components/ServiceDetail';
import { PostOfferForm } from './components/PostOfferForm';
import { PostNeedForm } from './components/PostNeedForm';
import { ChatPage } from './components/ChatPage';
import { UserProfile } from './components/UserProfile';
import { AdminDashboard } from './components/AdminDashboard';
import { ReportDetail } from './components/ReportDetail';
import { ForumCategories } from './components/ForumCategories';
import { WelcomeModal } from './components/WelcomeModal';
import { ServiceConfirmationModal } from './components/ServiceConfirmationModal';
import { PositiveRepModal } from './components/PositiveRepModal';
import { Button } from './components/ui/button';

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
  | 'admin'
  | 'report-detail'
  | 'forum';

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
  admin: '/admin',
  'report-detail': '/report-detail',
  forum: '/forum',
};

const resolvePageFromPath = (path: string): Page => {
  const entry = Object.entries(pageToPath).find(([, mappedPath]) => mappedPath === path);
  return (entry ? entry[0] : 'home') as Page;
};

function AppContent() {
  const { user, isAuthenticated, isLoading, register, login, logout, refreshUser } = useAuth();
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
  
  // Fetch notifications count
  React.useEffect(() => {
    if (!isAuthenticated) {
      setUnreadNotifications(0);
      return;
    }
    
    let isMounted = true;
    
    const fetchNotifications = async () => {
      if (!isMounted) return;
      
      try {
        const { notificationAPI } = await import('./lib/api');
        const notifications = await notificationAPI.list();
        if (isMounted) {
          const unread = notifications.filter(n => !n.is_read).length;
          setUnreadNotifications(unread);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to fetch notifications:', error);
          setUnreadNotifications(0);
        }
      }
    };
    
    fetchNotifications();
    // Refresh notifications periodically
    const interval = setInterval(fetchNotifications, POLLING_INTERVALS.NOTIFICATIONS);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleNavigate = (page: Page | string, data?: NavigateData) => {
    const resolvedPage = page as Page;
    const targetPath = pageToPath[resolvedPage] ?? '/';
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({ page: resolvedPage }, '', targetPath);
    }
    setCurrentPage(resolvedPage);
    setPageData(data || null);
    window.scrollTo(0, 0);
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
      console.error("Registration failed:", error);
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
      console.error("Login failed:", error);
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
    const initialPath = pageToPath[currentPage] ?? '/';
    if (window.location.pathname !== initialPath) {
      window.history.replaceState({ page: currentPage }, '', initialPath);
    }

    const handlePopState = () => {
      const nextPage = resolvePageFromPath(window.location.pathname);
      setCurrentPage(nextPage);
      setPageData(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentPage]);


  const handleServiceComplete = async (handshakeId: string, hours?: number) => {
    try {
      const { handshakeAPI } = await import('./lib/api');
      const handshake = await handshakeAPI.confirm(handshakeId, hours);
      
      // Check if both parties have confirmed (REQ-TB-008)
      const bothConfirmed = handshake.provider_confirmed_complete && handshake.receiver_confirmed_complete;
      
      if (bothConfirmed) {
        // Both parties confirmed - service is completed (REQ-REP-001: reputation only after both confirm)
        // Get partner name for reputation modal
        const handshakeDetails = await handshakeAPI.get(handshakeId);
        // Determine partner name - if user is provider, show requester name, else show provider name
        const partnerName = handshakeDetails.requester_name || handshakeDetails.provider_name || 'Your Partner';
        setPositiveRepPartnerName(partnerName);
        
        setTimeout(() => {
          setShowPositiveRep(true);
          setCurrentHandshakeId(handshakeId);
        }, 500);
        showToast('Service completed! Both parties confirmed. You can now leave feedback.', 'success');
      } else {
        showToast('Your confirmation received! Waiting for your partner to confirm.', 'info');
      }
      
      refreshUser();
      setShowServiceConfirmation(false);
    } catch (error: unknown) {
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

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

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

      {currentPage === 'dashboard' && isAuthenticated && (
        <Dashboard 
          onNavigate={handleNavigate}
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
          onLogout={handleLogout}
        />
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

      {currentPage === 'service-detail' && (
        <ServiceDetail 
          onNavigate={handleNavigate}
          serviceData={pageData}
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
        />
      )}

      {currentPage === 'post-offer' && isAuthenticated && (
        <PostOfferForm 
          onNavigate={handleNavigate}
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
          onLogout={handleLogout}
          serviceData={pageData}
        />
      )}

      {currentPage === 'post-need' && isAuthenticated && (
        <PostNeedForm 
          onNavigate={handleNavigate}
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
          onLogout={handleLogout}
          serviceData={pageData}
        />
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

      {currentPage === 'messages' && isAuthenticated && (
        <ChatPage 
          onNavigate={handleNavigate}
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
          onLogout={handleLogout}
          onConfirmService={(handshakeId) => {
            setCurrentHandshakeId(handshakeId);
            setShowServiceConfirmation(true);
          }}
        />
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

      {currentPage === 'profile' && isAuthenticated && user && (
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

      {currentPage === 'admin' && (
        <AdminDashboard 
          onNavigate={handleNavigate}
        />
      )}

      {currentPage === 'report-detail' && (
        <ReportDetail 
          onNavigate={handleNavigate}
          reportData={pageData}
        />
      )}

      {currentPage === 'forum' && (
        <ForumCategories 
          onNavigate={handleNavigate}
          userBalance={userBalance}
          unreadNotifications={unreadNotifications}
          onLogout={handleLogout}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Welcome Modal */}
      <WelcomeModal
        open={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        userName={userName}
        onNavigate={handleNavigate}
      />

      {/* Service Confirmation Modal */}
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

      {/* Positive Rep Modal */}
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
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
