import React, { useState, useEffect } from 'react';
import { Shield, Users, FileText, TrendingUp, Flag, AlertTriangle, Clock, Eye, EyeOff, Ban, AlertCircle, CheckCircle, XCircle, Loader2, Pause } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { adminAPI, type Report } from '../lib/api';
import { DisputeResolutionModal } from './DisputeResolutionModal';

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
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeReportTab, setActiveReportTab] = useState<ReportTab>('content');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

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

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminAPI.getReports('pending');
      setReports(data);
    } catch (err) {
      setError('Failed to load reports. Please try again.');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

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
      alert('Warning sent successfully');
    } catch (err) {
      alert('Failed to send warning');
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
      alert('User has been banned');
      fetchReports();
    } catch (err) {
      alert('Failed to ban user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleHideService = async (report: Report) => {
    if (!report.reported_service) return;
    setActionLoading(report.id);
    try {
      await adminAPI.toggleServiceVisibility(report.reported_service);
      alert('Service visibility toggled');
    } catch (err) {
      alert('Failed to toggle service visibility');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseHandshake = async (report: Report) => {
    setActionLoading(report.id);
    try {
      await adminAPI.pauseHandshake(report.id);
      alert('Handshake has been paused for investigation');
      fetchReports();
    } catch (err) {
      alert('Failed to pause handshake');
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
      setShowDisputeModal(false);
      setSelectedReport(null);
      fetchReports();
    } catch (err) {
      alert('Failed to resolve dispute');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = reports.length;

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
                  <div className="text-3xl font-bold text-gray-900 mb-1">-</div>
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
                  <Button onClick={fetchReports} variant="outline" size="sm" className="ml-4">
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
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
              <p className="text-gray-600">
                User management tools and search functionality would appear here
              </p>
            </div>
          )}

          {activeSection === 'guidelines' && (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Guidelines</h3>
              <p className="text-gray-600">
                Edit and manage community guidelines and policies
              </p>
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
    </div>
  );
}
