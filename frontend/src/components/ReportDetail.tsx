import React from 'react';
import { ArrowLeft, AlertCircle, User, FileText, Shield, Clock, XCircle, CheckCircle } from 'lucide-react';
import { formatTimebank } from '../lib/utils';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

import { type NavigateData } from '../lib/types';

interface ReportDetailProps {
  onNavigate: (page: string) => void;
  reportData?: NavigateData;
}

export function ReportDetail({ onNavigate, reportData }: ReportDetailProps) {
  const report = reportData || {
    id: 5,
    type: 'no-show',
    reportedItem: 'No-Show Dispute',
    serviceName: 'Manti Cooking Lesson',
    reportedUser: 'Marcus Weber',
    reportedUserId: '#3421',
    reportingUser: 'Sarah Chen',
    reportingUserId: '#2341',
    claimDetails: 'Marcus did not show up for our scheduled cooking lesson on Nov 1 at 19:00. I waited for 30 minutes and sent several messages but received no response. This was our agreed upon time and he confirmed the day before.',
    partnerClaim: 'I had an emergency and tried to contact Sarah but had connectivity issues. I sincerely apologize for missing the session.',
    serviceDetails: {
      duration: 3,
      scheduledTime: 'Nov 1, 2025, 19:00',
      location: 'North London',
    },
    date: 'Nov 1, 2025',
    status: 'pending',
    severity: 'medium',
  };

  const [adminNotes, setAdminNotes] = React.useState('');
  const [selectedAction, setSelectedAction] = React.useState<string | null>(null);

  const handleAction = (action: string) => {
    setSelectedAction(action);
    // In a real app, this would make an API call
    setTimeout(() => {
      onNavigate('admin');
    }, 1500);
  };

  const isNoShow = report.type === 'no-show';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white">The Hive Admin Panel</h1>
              <p className="text-sm text-gray-400">
                {isNoShow ? 'No-Show Dispute Review' : 'Report Review'}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('admin')}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports Queue
          </Button>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-8 py-8">
        <div className="grid grid-cols-[1fr_380px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Report Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  report.severity === 'high' ? 'bg-red-100' : 'bg-orange-100'
                }`}>
                  <AlertCircle className={`w-6 h-6 ${
                    report.severity === 'high' ? 'text-red-600' : 'text-orange-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-gray-900">
                      {isNoShow ? 'Review No-Show Dispute' : report.reportedItem}
                    </h2>
                    <Badge className={
                      report.severity === 'high'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                    }>
                      {report.severity} priority
                    </Badge>
                    <Badge className="bg-gray-100 text-gray-700">
                      {isNoShow ? 'No-Show Dispute' : report.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Report ID: #{report.id} • Submitted {report.date}
                  </p>
                </div>
              </div>

              {isNoShow ? (
                <>
                  {/* Service Details for No-Show */}
                  <div className="bg-amber-50 rounded-lg p-6 mb-6 border border-amber-200">
                    <h3 className="text-gray-900 mb-4">Service Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Service</div>
                        <div className="text-gray-900">{report.serviceName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Duration</div>
                        <div className="text-gray-900">{formatTimebank(report.serviceDetails.duration)} TimeBank {formatTimebank(report.serviceDetails.duration) === '1' ? 'Hour' : 'Hours'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Scheduled Time</div>
                        <div className="text-gray-900">{report.serviceDetails.scheduledTime}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Location</div>
                        <div className="text-gray-900">{report.serviceDetails.location}</div>
                      </div>
                    </div>
                  </div>

                  {/* Users Involved */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-blue-600" />
                        <div className="text-sm text-blue-700">Reporting User (Provider)</div>
                      </div>
                      <div className="text-gray-900">{report.reportingUser}</div>
                      <div className="text-xs text-gray-600 mt-1">{report.reportingUserId}</div>
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="text-xs text-blue-700 mb-1">Claim</div>
                        <div className="text-sm text-gray-700">{report.claimDetails}</div>
                      </div>
                    </div>

                    <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-red-600" />
                        <div className="text-sm text-red-700">Reported User (Receiver)</div>
                      </div>
                      <div className="text-gray-900">{report.reportedUser}</div>
                      <div className="text-xs text-gray-600 mt-1">{report.reportedUserId}</div>
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <div className="text-xs text-red-700 mb-1">Response</div>
                        <div className="text-sm text-gray-700">{report.partnerClaim}</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Reported By</div>
                    <div className="text-gray-900">{report.reportedByName || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{report.reportedBy || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Report Reason</div>
                    <div className="text-gray-900">{report.reason || 'N/A'}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Evidence/Context */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-gray-900 mb-4">Context & Evidence</h3>
              <div className="space-y-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Conversation Timeline</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    • Service agreement: Oct 30, 2025<br />
                    • Final confirmation: Oct 31, 2025, 18:30<br />
                    • Scheduled time: Nov 1, 2025, 19:00<br />
                    • No-show report filed: Nov 1, 2025, 19:35
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Message History</span>
                  </div>
                  <p className="text-sm text-gray-500 italic">
                    Chat logs show confirmation message sent Oct 31, and follow-up messages 
                    sent by {report.reportingUser} at 19:05, 19:15, and 19:25 with no response.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">User History: {report.reportedUser}</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    • Account created: Aug 20, 2024<br />
                    • Services completed: 12<br />
                    • Current Karma: 95<br />
                    • Previous no-shows: 0
                  </p>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <Label htmlFor="notes" className="mb-3 block">
                Admin Notes (Internal)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add notes about your decision and reasoning..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Take Action</h3>
              
              {selectedAction ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-green-900 mb-2">Action Taken</div>
                  <div className="text-sm text-green-700">{selectedAction}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {isNoShow ? (
                    <>
                      <Button 
                        onClick={() => handleAction('No-show confirmed. Karma penalized & transfer cancelled.')}
                        className="w-full justify-start bg-red-500 hover:bg-red-600 text-white"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Confirm No-Show
                        <span className="text-xs ml-auto opacity-80">(Penalize Karma)</span>
                      </Button>
                      
                      <div className="text-xs text-gray-600 px-2 py-2 bg-red-50 rounded border border-red-100">
                        This will reduce {report.reportedUser}'s Karma score by 20 points and cancel the TimeBank transfer. The provider will not lose hours.
                      </div>

                      <div className="pt-3 border-t border-gray-200">
                        <Button 
                          onClick={() => handleAction('Report dismissed. TimeBank transfer completed.')}
                          variant="outline"
                          className="w-full justify-start border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Dismiss Report
                          <span className="text-xs ml-auto opacity-80">(Complete Transfer)</span>
                        </Button>
                      </div>

                      <div className="text-xs text-gray-600 px-2 py-2 bg-green-50 rounded border border-green-100">
                        This will complete the TimeBank hour transfer as originally agreed and close the dispute.
                      </div>
                    </>
                  ) : (
                    <>
                      {report.type === 'post' && (
                        <Button 
                          onClick={() => handleAction('Post hidden from public view')}
                          variant="outline"
                          className="w-full justify-start border-orange-200 text-orange-700 hover:bg-orange-50"
                        >
                          Hide Post
                        </Button>
                      )}
                      
                      <Button 
                        onClick={() => handleAction('Warning issued to user')}
                        variant="outline"
                        className="w-full justify-start border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                      >
                        Issue Warning
                      </Button>
                      
                      <Button 
                        onClick={() => handleAction('User suspended for 7 days')}
                        variant="outline"
                        className="w-full justify-start border-orange-300 text-orange-800 hover:bg-orange-50"
                      >
                        Suspend User (7 days)
                      </Button>
                      
                      <Button 
                        onClick={() => handleAction('User permanently banned')}
                        variant="outline"
                        className="w-full justify-start border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Ban User (Permanent)
                      </Button>
                      
                      <div className="pt-3 border-t border-gray-200">
                        <Button 
                          onClick={() => handleAction('Report dismissed - no action taken')}
                          variant="outline"
                          className="w-full justify-start"
                        >
                          Dismiss Report
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Guidelines Reference */}
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
              <h4 className="text-amber-900 mb-3">
                {isNoShow ? 'No-Show Policy' : 'Community Guidelines'}
              </h4>
              <div className="space-y-2 text-sm text-amber-800">
                {isNoShow ? (
                  <>
                    <p><strong>First No-Show:</strong> -20 Karma points, warning issued</p>
                    <p><strong>Second No-Show:</strong> -40 Karma points, 7-day suspension</p>
                    <p><strong>Third No-Show:</strong> Account review for permanent ban</p>
                    <p className="text-xs mt-2 text-amber-700">
                      TimeBank transfers are cancelled for confirmed no-shows. The provider does not lose hours.
                    </p>
                  </>
                ) : (
                  <>
                    <p><strong>Respectful Communication:</strong> All members must treat each other with respect and courtesy.</p>
                    <p><strong>Progressive Actions:</strong> 1st offense: Warning, 2nd: Suspension, 3rd: Ban</p>
                  </>
                )}
              </div>
              <Button 
                variant="link" 
                className="text-amber-700 p-0 h-auto mt-3"
              >
                View Full Guidelines →
              </Button>
            </div>

            {/* Report History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h4 className="text-gray-900 mb-3">User History</h4>
              <p className="text-sm text-gray-600">
                {isNoShow 
                  ? `${report.reportedUser} has no previous no-show reports. This is their first incident.`
                  : 'This user has 1 previous warning from October 2024 for similar behavior.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
