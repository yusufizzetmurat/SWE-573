import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, RefreshCw } from 'lucide-react';
import { Navbar } from './Navbar';
import { Button } from './ui/button';
import { transactionAPI, Transaction } from '../lib/api';
import { formatTimebank } from '../lib/utils';
import { getErrorMessage } from '../lib/types';
import { useAbortController } from '../lib/hooks/useAbortController';
import { useAuth } from '../lib/auth-context';

interface TransactionHistoryPageProps {
  onNavigate: (page: string) => void;
  userBalance?: number;
  unreadNotifications?: number;
  onLogout?: () => void;
}

export function TransactionHistoryPage({ 
  onNavigate, 
  userBalance = 1, 
  unreadNotifications = 0, 
  onLogout 
}: TransactionHistoryPageProps) {
  const { refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const signal = useAbortController();

  useEffect(() => {
    let isMounted = true;
    
    const fetchTransactions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // Refresh user balance when viewing transaction history
        await refreshUser();
        const data = await transactionAPI.list(signal);
        if (isMounted) {
          setTransactions(data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        // Ignore cancellation errors (expected when component unmounts or new requests cancel old ones)
        if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') {
          setIsLoading(false);
          return;
        }
        
        console.error('Failed to fetch transactions:', err);
        const errorMessage = getErrorMessage(err, 'Failed to load transaction history. Please try again.');
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    fetchTransactions();
    
    return () => {
      isMounted = false;
    };
  }, [signal]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'transfer':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'refund':
        return <TrendingDown className="w-5 h-5 text-blue-600" />;
      case 'provision':
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) {
      return 'text-green-600';
    }
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        activeLink="profile" 
        userBalance={userBalance}
        unreadNotifications={unreadNotifications}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isAuthenticated={true}
      />

      <div className="max-w-[1440px] mx-auto px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => onNavigate('profile')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
          <h1 className="text-gray-900 mb-2">Transaction History</h1>
          <p className="text-gray-600">
            Complete record of all your TimeBank transactions
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading transaction history...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <p className="text-red-600">{error}</p>
            <Button 
              onClick={fetchTransactions}
              className="mt-4"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No transactions yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Your TimeBank transactions will appear here once you start exchanging services
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance After
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.transaction_type)}
                          <span className="text-sm font-medium text-gray-900">
                            {transaction.transaction_type_display}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {transaction.description}
                        </div>
                        {transaction.service_title && (
                          <div className="text-xs text-gray-500 mt-1">
                            Service: {transaction.service_title}
                          </div>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${getTransactionColor(transaction.transaction_type, transaction.amount)}`}>
                        {transaction.amount > 0 ? '+' : ''}{formatTimebank(transaction.amount)} {Math.abs(transaction.amount) === 1 ? 'hour' : 'hours'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatTimebank(transaction.balance_after)} {Math.abs(transaction.balance_after) === 1 ? 'hour' : 'hours'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

