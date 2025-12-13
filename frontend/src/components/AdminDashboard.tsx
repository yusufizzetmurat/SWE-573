import React, { useState, useEffect } from 'react';
import { Shield, Users, FileText, TrendingUp, Flag, AlertTriangle, Clock, Eye, EyeOff, Ban, AlertCircle, CheckCircle, XCircle, Loader2, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { adminAPI, type Report, type AdminUser, type PaginatedResponse } from '../lib/api';
import { DisputeResolutionModal } from './DisputeResolutionModal';
import { useToast } from './Toast';
import { logger } from '../lib/logger';
import { type NavigateData } from '../lib/types';

interface AdminDashboardProps {
  onNavigate: (page: string, data?: NavigateData) => void;
}

type ReportTab = 'content' | 'disputes';

const getTypeLabel = (type: string): string => {
  switch (type) {
    case 'no_show': return 'No-Show Dispute';
    case 'inappropriate_content': return 'Inappropriate Content';
    case 'service_issue': return 'Service Issue';
    case 'spam': return 'Spam';
    default: return type;
  }
};

const getTypeBadgeClass = (type: string): string => {
  switch (type) {
    case 'no_show': return 'bg-red-100 text-red-700';
    case 'inappropriate_content': return 'bg-purple-100 text-purple-700';
    case 'service_issue': return 'bg-orange-100 text-orange-700';
    case 'spam': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('content');
  const [reports, setReports] = useState<Report[]>([]);
  const [resolvedReports, setResolvedReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  
  // User management state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [usersPagination, setUsersPagination] = useState<{ count: number; next: string | null; previous: string | null }>({ count: 0, next: null, previous: null });
  const [usersPage, setUsersPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showKarmaModal, setShowKarmaModal] = useState(false);
  const [karmaAdjustment, setKarmaAdjustment] = useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');

  // Fetch reports on mount and when reports section is active
  useEffect(() => {
    fetchReports();
  }, []);

  // Refresh reports when navigating to reports section
  useEffect(() => {
    if (activeSection === 'reports') {
      fetchReports();
    }
  }, [activeSection]);

  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearch(userSearch);
      setUsersPage(1); // Reset to first page on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Fetch users when navigating to users section
  useEffect(() => {
    if (activeSection === 'users') {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, debouncedUserSearch, userStatusFilter, usersPage]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const status = userStatusFilter === 'all' ? undefined : userStatusFilter;
      const data = await adminAPI.getUsers(debouncedUserSearch || undefined, status, usersPage, 20);
      setUsers(data.results);
      setUsersPagination({ count: data.count, next: data.next, previous: data.previous });
    } catch (err) {
      setUsersError('Failed to load users. Please try again.');
      logger.error('Error fetching users', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to load users. Please try again.', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchReports = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const [pendingData, resolvedData] = await Promise.all([
        adminAPI.getReports('pending', signal),
        adminAPI.getReports('resolved', signal)
      ]);
      setReports(pendingData);
      setResolvedReports(resolvedData);
    } catch (err) {
      if (signal?.aborted) {
        return;
      }
      setError('Failed to load reports. Please try again.');
      logger.error('Error fetching reports', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to load reports. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Keep reports fresh while moderator dashboard is open.
  useEffect(() => {
    let activeController: AbortController | null = new AbortController();
    // Initial fetch already happens on mount; this ensures ongoing updates.
    const intervalId = window.setInterval(() => {
      try {
        activeController?.abort();
      } catch {
        // ignore
      }
      activeController = new AbortController();
      fetchReports(activeController.signal);
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
      try {
        activeController?.abort();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter reports by tab
  // No-show reports without a handshake can't be processed as TimeBank disputes,
  // so show them in content reports where admins can still review them
  const contentReports = reports.filter(r => r.type !== 'no_show' || !r.related_handshake);
  const disputeReports = reports.filter(r => r.type === 'no_show' && r.related_handshake);

  const handleWarnUser = async (report: Report) => {
    if (!report.reported_user) return;
    setActionLoading(report.id);
    try {
      await adminAPI.warnUser(report.reported_user, 'You have received a warning for violating community guidelines.');
      showToast('Warning sent successfully', 'success');
      fetchReports();
    } catch (err) {
      logger.error('Error warning user', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to send warning', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUser = async (report: Report) => {
    if (!report.reported_user) return;
    if (!confirm(`Are you sure you want to ban ${report.reported_user_name || 'this user'}? This action will deactivate their account.`)) {
      return;
    }
    setActionLoading(report.id);
    try {
      await adminAPI.banUser(report.reported_user);
      showToast('User has been banned', 'success');
      fetchReports();
    } catch (err) {
      logger.error('Error banning user', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to ban user', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleHideService = async (report: Report) => {
    if (!report.reported_service) return;
    setActionLoading(report.id);
    try {
      const result = await adminAPI.toggleServiceVisibility(report.reported_service);
      const message = result.is_visible ? 'Service is now visible' : 'Service is now hidden';
      showToast(message, 'success');
      fetchReports();
    } catch (err) {
      logger.error('Error toggling service visibility', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to toggle service visibility', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseHandshake = async (report: Report) => {
    setActionLoading(report.id);
    try {
      await adminAPI.pauseHandshake(report.id);
      showToast('Handshake has been paused for investigation', 'success');
      fetchReports();
    } catch (err) {
      logger.error('Error pausing handshake', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to pause handshake', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenDisputeModal = (report: Report) => {
    setSelectedReport(report);
    setShowDisputeModal(true);
  };

  const handleResolveDispute = async (action: 'confirm_no_show' | 'dismiss', notes?: string, report?: Report) => {
    const targetReport = report || selectedReport;
    if (!targetReport) return;
    setActionLoading(targetReport.id);
    try {
      await adminAPI.resolveReport(targetReport.id, action, notes);
      const message = action === 'confirm_no_show' 
        ? 'No-show confirmed. TimeBank dispute resolved.' 
        : 'Report dismissed. Service completed normally.';
      showToast(message, 'success');
      setShowDisputeModal(false);
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      logger.error('Error resolving dispute', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to resolve dispute', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // User management handlers
  const handleWarnUserFromList = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      await adminAPI.warnUser(user.id, 'You have received a warning for violating community guidelines.');
      showToast(`Warning sent to ${user.first_name} ${user.last_name}`, 'success');
      fetchUsers();
    } catch (err) {
      logger.error('Error warning user', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to send warning', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanUserFromList = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to ${user.is_active ? 'ban' : 'unban'} ${user.first_name} ${user.last_name}?`)) {
      return;
    }
    setActionLoading(user.id);
    try {
      if (user.is_active) {
        await adminAPI.banUser(user.id);
        showToast(`User ${user.first_name} ${user.last_name} has been banned`, 'success');
      } else {
        await adminAPI.unbanUser(user.id);
        showToast(`User ${user.first_name} ${user.last_name} has been unbanned`, 'success');
      }
      fetchUsers();
    } catch (err) {
      logger.error('Error banning/unbanning user', err instanceof Error ? err : new Error(String(err)));
      showToast(`Failed to ${user.is_active ? 'ban' : 'unban'} user`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdjustKarma = async () => {
    if (!selectedUser || !karmaAdjustment) return;
    const adjustment = parseInt(karmaAdjustment);
    if (isNaN(adjustment)) {
      showToast('Please enter a valid number', 'error');
      return;
    }
    setActionLoading(selectedUser.id);
    try {
      const result = await adminAPI.adjustKarma(selectedUser.id, adjustment);
      showToast(`Karma adjusted. New karma: ${result.new_karma}`, 'success');
      setShowKarmaModal(false);
      setKarmaAdjustment('');
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      logger.error('Error adjusting karma', err instanceof Error ? err : new Error(String(err)));
      showToast('Failed to adjust karma', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = reports.length;

  // Calculate average resolution time from resolved reports
  const calculateAvgResolutionTime = (): string => {
    if (resolvedReports.length === 0) return '-';
    
    const reportsWithTimes = resolvedReports.filter(r => r.created_at && r.resolved_at);
    if (reportsWithTimes.length === 0) return '-';
    
    const totalMs = reportsWithTimes.reduce((sum, r) => {
      const created = new Date(r.created_at).getTime();
      const resolved = new Date(r.resolved_at!).getTime();
      return sum + (resolved - created);
    }, 0);
    
    const avgMs = totalMs / reportsWithTimes.length;
    const avgHours = avgMs / (1000 * 60 * 60);
    
    if (avgHours < 1) {
      const avgMinutes = avgMs / (1000 * 60);
      return `${Math.round(avgMinutes)}m`;
    } else if (avgHours < 24) {
      return `${Math.round(avgHours * 10) / 10}h`;
    } else {
      const avgDays = avgHours / 24;
      return `${Math.round(avgDays * 10) / 10}d`;
    }
  };

  const avgResolutionTime = calculateAvgResolutionTime();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Moderator Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">The Hive Moderator Dashboard</h1>
              <p className="text-sm text-gray-400">Community Management</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('dashboard')}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Exit Moderator Dashboard
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'dashboard'
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveSection('reports')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'reports'
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Flag className="w-5 h-5" />
              <span>Reports Queue</span>
              {pendingCount > 0 && (
                <Badge className="ml-auto bg-red-100 text-red-700">{pendingCount}</Badge>
              )}
            </button>
            <button
              onClick={() => setActiveSection('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'users'
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>User Management</span>
            </button>
            <button
              onClick={() => setActiveSection('guidelines')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'guidelines'
                  ? 'bg-amber-50 text-amber-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Community Guidelines</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {activeSection === 'dashboard' && (
            <>
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard Overview</h2>
                <p className="text-gray-600">
                  Monitor platform activity and health metrics
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-100 text-red-600">
                      <Flag className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{pendingCount}</div>
                  <div className="text-sm text-gray-600">Pending Reports</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-orange-100 text-orange-600">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{disputeReports.length}</div>
                  <div className="text-sm text-gray-600">TimeBank Disputes</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{contentReports.length}</div>
                  <div className="text-sm text-gray-600">Content Reports</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-amber-100 text-amber-600">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{avgResolutionTime}</div>
                  <div className="text-sm text-gray-600">Avg Resolution Time</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="flex gap-4">
                  <Button 
                    onClick={() => setActiveSection('reports')}
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Review Reports
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeSection === 'reports' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Reports Queue</h2>
                <p className="text-gray-600">
                  Review and take action on community reports
                </p>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveReportTab('content')}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeReportTab === 'content'
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Content Reports ({contentReports.length})
                </button>
                <button
                  onClick={() => setActiveReportTab('disputes')}
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeReportTab === 'disputes'
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  TimeBank Disputes ({disputeReports.length})
                </button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {error}
                  <Button onClick={() => fetchReports()} variant="outline" size="sm" className="ml-4">
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  {/* Content Reports Tab */}
                  {activeReportTab === 'content' && (
                    <div className="space-y-4">
                      {contentReports.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                          No content reports pending
                        </div>
                      ) : (
                        contentReports.map((report) => (
                          <div 
                            key={report.id}
                            className="bg-white rounded-xl border border-gray-200 p-6"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <Badge className={getTypeBadgeClass(report.type)}>
                                    {getTypeLabel(report.type)}
                                  </Badge>
                                  <span className="text-sm text-gray-500">
                                    {new Date(report.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <p><span className="font-medium text-gray-700">Reporter:</span> {report.reporter_name}</p>
                                  {report.reported_user_name && (
                                    <p><span className="font-medium text-gray-700">Reported User:</span> {report.reported_user_name}</p>
                                  )}
                                  {report.reported_service_title && (
                                    <p><span className="font-medium text-gray-700">Service:</span> {report.reported_service_title}</p>
                                  )}
                                  <p><span className="font-medium text-gray-700">Reason:</span> {report.description}</p>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                {report.reported_service && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onNavigate('service-detail', { id: report.reported_service })}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleHideService(report)}
                                      disabled={actionLoading === report.id}
                                    >
                                      <EyeOff className="w-4 h-4 mr-1" />
                                      Hide
                                    </Button>
                                  </>
                                )}
                                {report.reported_user && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                      onClick={() => handleWarnUser(report)}
                                      disabled={actionLoading === report.id}
                                    >
                                      <AlertCircle className="w-4 h-4 mr-1" />
                                      Warn
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-red-600 border-red-300 hover:bg-red-50"
                                      onClick={() => handleBanUser(report)}
                                      disabled={actionLoading === report.id}
                                    >
                                      <Ban className="w-4 h-4 mr-1" />
                                      Ban
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TimeBank Disputes Tab */}
                  {activeReportTab === 'disputes' && (
                    <div className="space-y-4">
                      {disputeReports.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
                          No TimeBank disputes pending
                        </div>
                      ) : (
                        disputeReports.map((report) => (
                          <div 
                            key={report.id}
                            className="bg-white rounded-xl border border-gray-200 p-6"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <Badge className="bg-red-100 text-red-700">
                                    No-Show Dispute
                                  </Badge>
                                  {report.handshake_status === 'paused' && (
                                    <Badge className="bg-yellow-100 text-yellow-700">
                                      <Pause className="w-3 h-3 mr-1" />
                                      Paused
                                    </Badge>
                                  )}
                                  <span className="text-sm text-gray-500">
                                    {new Date(report.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <p><span className="font-medium text-gray-700">Reporter:</span> {report.reporter_name}</p>
                                  <p><span className="font-medium text-gray-700">Reported User:</span> {report.reported_user_name || 'Unknown'}</p>
                                  {report.handshake_hours && (
                                    <p>
                                      <span className="font-medium text-gray-700">Hours at Stake:</span>{' '}
                                      <span className="text-lg font-bold text-amber-600">{report.handshake_hours} hrs</span>
                                    </p>
                                  )}
                                  {report.handshake_scheduled_time && (
                                    <p>
                                      <span className="font-medium text-gray-700">Scheduled:</span>{' '}
                                      {new Date(report.handshake_scheduled_time).toLocaleString()}
                                    </p>
                                  )}
                                  <p><span className="font-medium text-gray-700">Description:</span> {report.description}</p>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                {report.handshake_status !== 'paused' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                                    onClick={() => handlePauseHandshake(report)}
                                    disabled={actionLoading === report.id}
                                  >
                                    <Pause className="w-4 h-4 mr-1" />
                                    Pause
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                  onClick={() => handleOpenDisputeModal(report)}
                                  disabled={actionLoading === report.id}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Confirm No-Show
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300 hover:bg-green-50"
                                  onClick={() => handleResolveDispute('dismiss', undefined, report)}
                                  disabled={actionLoading === report.id}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeSection === 'users' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">User Management</h2>
                <p className="text-gray-600">
                  Search, view, and manage user accounts
                </p>
              </div>

              {/* Search and Filters */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label htmlFor="user-search" className="block text-sm font-medium text-gray-700 mb-2">
                      Search Users
                    </label>
                    <Input
                      id="user-search"
                      type="text"
                      placeholder="Search by email, first name, or last name..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="user-status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      id="user-status"
                      value={userStatusFilter}
                      onChange={(e) => {
                        setUserStatusFilter(e.target.value as 'all' | 'active' | 'banned');
                        setUsersPage(1);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                      <option value="all">All Users</option>
                      <option value="active">Active</option>
                      <option value="banned">Banned</option>
                    </select>
                  </div>
                </div>
              </div>

              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              ) : usersError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  {usersError}
                  <Button onClick={fetchUsers} variant="outline" size="sm" className="ml-4">
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Karma</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                No users found
                              </td>
                            </tr>
                          ) : (
                            users.map((user) => (
                              <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.first_name} {user.last_name}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-600">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{user.timebank_balance}h</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{user.karma_score}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge className={user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
                                    {user.role}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge className={user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                    {user.is_active ? 'Active' : 'Banned'}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">
                                    {new Date(user.date_joined).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => onNavigate('public-profile', { userId: user.id })}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                      onClick={() => handleWarnUserFromList(user)}
                                      disabled={actionLoading === user.id}
                                    >
                                      <AlertCircle className="w-4 h-4 mr-1" />
                                      Warn
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className={user.is_active ? "text-red-600 border-red-300 hover:bg-red-50" : "text-green-600 border-green-300 hover:bg-green-50"}
                                      onClick={() => handleBanUserFromList(user)}
                                      disabled={actionLoading === user.id}
                                    >
                                      <Ban className="w-4 h-4 mr-1" />
                                      {user.is_active ? 'Ban' : 'Unban'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                      onClick={() => {
                                        setSelectedUser(user);
                                        setShowKarmaModal(true);
                                      }}
                                    >
                                      Adjust Karma
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Pagination */}
                    {usersPagination.count > 0 && (
                      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {((usersPage - 1) * 20) + 1} to {Math.min(usersPage * 20, usersPagination.count)} of {usersPagination.count} users
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                            disabled={!usersPagination.previous || usersPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUsersPage(p => p + 1)}
                            disabled={!usersPagination.next}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {activeSection === 'guidelines' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Community Guidelines</h2>
                <p className="text-gray-600">
                  Reference guide for community standards and moderation policies
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">General Principles</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>Respect all community members and their time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>Communicate clearly and honestly about service expectations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>Show up on time for scheduled services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-500 mt-1">•</span>
                      <span>Provide quality services that match your descriptions</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Prohibited Content</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>Harassment, discrimination, or hate speech</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>Spam, scams, or fraudulent activities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>Inappropriate or offensive content</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>Services that violate local laws or regulations</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Moderation Actions</h3>
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-900 mb-2">Warning</h4>
                      <p className="text-sm text-amber-800">
                        First-time violations or minor infractions result in a formal warning notification to the user.
                      </p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-medium text-orange-900 mb-2">Service Visibility</h4>
                      <p className="text-sm text-orange-800">
                        Inappropriate services can be hidden from public view while maintaining the service record.
                      </p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">Account Ban</h4>
                      <p className="text-sm text-red-800">
                        Severe violations or repeated offenses result in account deactivation. Users can be unbanned if circumstances change.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">TimeBank Disputes</h3>
                  <p className="text-gray-700 mb-3">
                    When a no-show is reported, moderators can:
                  </p>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span><strong>Confirm No-Show:</strong> Refund the party who showed up, apply karma penalty (-5), and complete/cancel handshake appropriately</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span><strong>Dismiss Report:</strong> Complete the service normally and transfer TimeBank hours to the provider</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span><strong>Pause Handshake:</strong> Temporarily pause the handshake for investigation before making a final decision</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Dispute Resolution Modal */}
      {showDisputeModal && selectedReport && (
        <DisputeResolutionModal
          report={selectedReport}
          onConfirm={(action, notes) => handleResolveDispute(action, notes)}
          onCancel={() => {
            setShowDisputeModal(false);
            setSelectedReport(null);
          }}
          isLoading={actionLoading === selectedReport.id}
        />
      )}

      {/* Karma Adjustment Modal */}
      {showKarmaModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Adjust Karma</h3>
              <p className="text-sm text-gray-600 mt-1">
                Adjust karma for {selectedUser.first_name} {selectedUser.last_name}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Current karma: {selectedUser.karma_score}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="karma-adjustment" className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment (positive or negative number)
                </label>
                <Input
                  id="karma-adjustment"
                  type="number"
                  value={karmaAdjustment}
                  onChange={(e) => setKarmaAdjustment(e.target.value)}
                  placeholder="e.g., -10 or +5"
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a positive number to increase karma, negative to decrease
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowKarmaModal(false);
                  setKarmaAdjustment('');
                  setSelectedUser(null);
                }}
                disabled={actionLoading === selectedUser.id}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdjustKarma}
                disabled={!karmaAdjustment || actionLoading === selectedUser.id}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {actionLoading === selectedUser.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Apply Adjustment'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
