"use client";

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isUserAuthorized } from '@/lib/config';

interface PrizeClaim {
  id: string;
  status: 'PENDING_ADMIN_OPEN' | 'OPENED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  openedAt?: string;
  notes?: string;
  user: {
    name: string;
    email: string;
  };
  payment?: {
    amount: number;
    currency: string;
  };
  prizeType?: {
    name: string;
    value: number;
    glow: string;
  };
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prizeClaims, setPrizeClaims] = useState<PrizeClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<PrizeClaim | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'opened' | 'delivered'>('all');

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const isAuthorized = isUserAuthorized(session.user.email, session.user.id);
      if (!isAuthorized) {
        alert('Access denied. You are not authorized to view this page.');
        router.push('/');
        return;
      }
    }
  }, [session, status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPrizeClaims();
    }
  }, [status, filter]);

  const fetchPrizeClaims = async () => {
    try {
      const response = await fetch(`/api/admin/prize-claims?filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setPrizeClaims(data.prizeClaims);
      } else {
        console.error('Failed to fetch prize claims');
      }
    } catch (error) {
      console.error('Error fetching prize claims:', error);
    } finally {
      setLoading(false);
    }
  };

  

  const markAsDelivered = async (claimId: string) => {
    try {
      const response = await fetch(`/api/admin/mark-delivered`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claimId }),
      });

      if (response.ok) {
        await fetchPrizeClaims(); // Refresh the list
        alert('Prize marked as delivered!');
      } else {
        const error = await response.json();
        alert(`Error marking as delivered: ${error.message}`);
      }
    } catch (error) {
      console.error('Error marking as delivered:', error);
      alert('Error marking as delivered');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_ADMIN_OPEN':
        return 'bg-yellow-500';
      case 'OPENED':
        return 'bg-blue-500';
      case 'DELIVERED':
        return 'bg-green-500';
      case 'CANCELLED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING_ADMIN_OPEN':
        return 'Pending';
      case 'OPENED':
        return 'Opened';
      case 'DELIVERED':
        return 'Delivered';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const filteredClaims = prizeClaims.filter(claim => {
    if (filter === 'all') return true;
    return claim.status.toLowerCase().includes(filter);
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen   bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated' ||
    (status === 'authenticated' && session?.user &&
      !isUserAuthorized(session.user.email, session.user.id))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-4">🔒 Access Restricted</h1>
          <p>You are not authorized to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-w-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">🎁 Admin Prize Dashboard</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Filter Controls */}
          <div className="mb-6">
            <div className="flex gap-2">
              {(['all', 'pending', 'opened', 'delivered'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2 rounded-lg transition-colors ${filter === filterOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white">Total Claims</h3>
              <p className="text-2xl font-bold text-blue-400">{prizeClaims.length}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white">Pending</h3>
              <p className="text-2xl font-bold text-yellow-400">
                {prizeClaims.filter(c => c.status === 'PENDING_ADMIN_OPEN').length}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white">Opened</h3>
              <p className="text-2xl font-bold text-blue-400">
                {prizeClaims.filter(c => c.status === 'OPENED').length}
              </p>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h3 className="text-lg font-semibold text-white">Delivered</h3>
              <p className="text-2xl font-bold text-green-400">
                {prizeClaims.filter(c => c.status === 'DELIVERED').length}
              </p>
            </div>
          </div>

          {/* Prize Claims Table */}
          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-white/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Prize
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {claim.user.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-300">
                            {claim.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {claim.payment ? `$${(claim.payment.amount / 100).toFixed(2)} ${claim.payment.currency.toUpperCase()}` : 'Manual Prize'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {claim.prizeType ? (
                            <div>
                              <div className="font-medium text-white">{claim.prizeType.name}</div>
                              {/*<div className="text-xs">${(claim.prizeType.value / 100).toFixed(2)}</div>*/}
                            </div>
                          ) : (
                            <span className="text-gray-500">Not opened yet</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                          {getStatusText(claim.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(claim.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          
                          {claim.status === 'OPENED' && (
                            <button
                              onClick={() => markAsDelivered(claim.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors"
                            >
                              Mark Delivered
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredClaims.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-300">No prize claims found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Prize Details Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-white mb-4">Prize Details</h2>
            <div className="space-y-3 text-gray-300">
              <div>
                <span className="font-medium">User:</span> {selectedClaim.user.name || 'Unknown'}
              </div>
              <div>
                <span className="font-medium">Email:</span> {selectedClaim.user.email}
              </div>
              <div>
                <span className="font-medium">Payment:</span> {selectedClaim.payment ? `$${(selectedClaim.payment.amount / 100).toFixed(2)} ${selectedClaim.payment.currency.toUpperCase()}` : 'Manual Prize (No Payment)'}
              </div>
              <div>
                <span className="font-medium">Status:</span> {getStatusText(selectedClaim.status)}
              </div>
              <div>
                <span className="font-medium">Created:</span> {new Date(selectedClaim.createdAt).toLocaleString()}
              </div>
              {selectedClaim.openedAt && (
                <div>
                  <span className="font-medium">Opened:</span> {new Date(selectedClaim.openedAt).toLocaleString()}
                </div>
              )}
              {selectedClaim.prizeType && (
                <div>
                  <span className="font-medium">Prize:</span> {selectedClaim.prizeType.name} (${(selectedClaim.prizeType.value / 100).toFixed(2)})
                </div>
              )}
              {selectedClaim.notes && (
                <div>
                  <span className="font-medium">Notes:</span> {selectedClaim.notes}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedClaim(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
