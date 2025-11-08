import React from 'react';
import { Shield, AlertCircle, Users, FileText, TrendingUp, Flag } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

import { type NavigateData } from '../lib/types';

interface AdminDashboardProps {
  onNavigate: (page: string, data?: NavigateData) => void;
}

const mockReports = [
  {
    id: 5,
    type: 'no-show',
    reportedItem: 'No-Show Dispute: Manti Cooking Lesson',
    reportedBy: 'Sarah Chen (#2341)',
    reason: 'Partner did not show up for service',
    date: 'Nov 1, 2025',
    status: 'pending',
    severity: 'high',
  },
  {
    id: 2,
    type: 'inappropriate',
    reportedItem: 'User: Marcus Weber',
    reportedBy: 'User #2341',
    reason: 'Inappropriate behavior in chat',
    date: 'Nov 1, 2025',
    status: 'pending',
    severity: 'high',
  },
  {
    id: 1,
    type: 'service',
    reportedItem: 'Unreliable Service Provider',
    reportedBy: 'User #4532',
    reason: 'Service not provided as described',
    date: 'Nov 1, 2025',
    status: 'pending',
    severity: 'medium',
  },
  {
    id: 3,
    type: 'spam',
    reportedItem: 'Spam Offering',
    reportedBy: 'User #8721',
    reason: 'Posting spam/advertising',
    date: 'Oct 31, 2025',
    status: 'pending',
    severity: 'low',
  },
];

const stats = [
  { label: 'Total Users', value: '1,247', icon: Users, color: 'blue' },
  { label: 'Active Services', value: '342', icon: FileText, color: 'green' },
  { label: 'Pending Reports', value: '8', icon: Flag, color: 'red' },
  { label: 'Hours Exchanged', value: '5,623', icon: TrendingUp, color: 'amber' },
];

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = React.useState('dashboard');

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
              <p className="text-sm text-gray-400">Community Management</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('dashboard')}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Exit Admin Panel
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
              <Badge className="ml-auto bg-red-100 text-red-700">8</Badge>
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
                <h2 className="text-gray-900 mb-2">Dashboard Overview</h2>
                <p className="text-gray-600">
                  Monitor platform activity and health metrics
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  const colorClasses = {
                    blue: 'bg-blue-100 text-blue-600',
                    green: 'bg-green-100 text-green-600',
                    red: 'bg-red-100 text-red-600',
                    amber: 'bg-amber-100 text-amber-600',
                  };
                  
                  return (
                    <div 
                      key={stat.label}
                      className="bg-white rounded-xl border border-gray-200 p-6"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>
                      <div className="text-3xl text-gray-900 mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-gray-900 mb-4">Recent Reports</h3>
                <div className="text-gray-600">
                  View all reports in the Reports Queue section
                </div>
              </div>
            </>
          )}

          {activeSection === 'reports' && (
            <>
              <div className="mb-8">
                <h2 className="text-gray-900 mb-2">Reports Queue</h2>
                <p className="text-gray-600">
                  Review and take action on community reports
                </p>
              </div>

              <div className="space-y-4">
                {mockReports.map((report) => (
                  <div 
                    key={report.id}
                    className="bg-white rounded-xl border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-gray-900">{report.reportedItem}</h3>
                          <Badge 
                            className={
                              report.severity === 'high'
                                ? 'bg-red-100 text-red-700'
                                : report.severity === 'medium'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }
                          >
                            {report.severity} priority
                          </Badge>
                          <Badge className={
                            report.type === 'no-show'
                              ? 'bg-red-100 text-red-700'
                              : report.type === 'inappropriate'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }>
                            {report.type === 'no-show' ? 'No-Show Dispute' : 
                             report.type === 'inappropriate' ? 'Inappropriate Content' : 
                             report.type === 'service' ? 'Service Issue' :
                             report.type === 'spam' ? 'Spam' : report.type}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Reason:</strong> {report.reason}</p>
                          <p><strong>Reported by:</strong> {report.reportedBy}</p>
                          <p><strong>Date:</strong> {report.date}</p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => onNavigate('report-detail', report)}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSection === 'users' && (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-gray-900 mb-4">User Management</h3>
              <p className="text-gray-600">
                User management tools and search functionality would appear here
              </p>
            </div>
          )}

          {activeSection === 'guidelines' && (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
              <h3 className="text-gray-900 mb-4">Community Guidelines</h3>
              <p className="text-gray-600">
                Edit and manage community guidelines and policies
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
