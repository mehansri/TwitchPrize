"use client";

import { useSession, signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : Promise.resolve(null);

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Handle payment success/cancel messages
  useEffect(() => {
    if (searchParams.get('payment_success')) {
      setMessage({ type: 'success', text: 'Payment successful!' });
      // Clear the URL parameter after showing the message
      router.replace('/dashboard');
    } else if (searchParams.get('payment_cancelled')) {
      setMessage({ type: 'error', text: 'Payment cancelled.' });
      // Clear the URL parameter after showing the message
      router.replace('/dashboard');
    }
  }, [searchParams, router]);

  // Fetch payment history
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await fetch('/api/payments');
        if (response.ok) {
          const { payments: userPayments } = await response.json();
          setPayments(userPayments || []); // Ensure it's always an array
        } else {
          console.error('Failed to fetch payments');
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
        setPayments([]); // Set to empty array on error
      }
    };

    if (status === 'authenticated') {
      fetchPayments();
    }
  }, [status]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const handlePayment = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // 1. Get Stripe.js instance
      const stripe = await stripePromise;

      if (!stripe) {
        setMessage({ type: 'error', text: 'Stripe is not initialized. Please check your configuration.' });
        setLoading(false);
        return;
      }

      // 2. Call your API to create a checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
      });

      const { sessionId, error } = await response.json();

      if (error) {
        setMessage({ type: 'error', text: error });
        setLoading(false);
        return;
      }

      // 3. Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        setMessage({ type: 'error', text: stripeError.message ?? 'An unknown Stripe error occurred.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="min-h-screen min-w-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <button
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
          
          {/* Message display */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
              <p className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                {message.text}
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Welcome!</h2>
              <p className="text-gray-300">
                You are successfully logged in as{' '}
                <span className="text-blue-400 font-medium">
                  {session?.user?.name || session?.user?.email}
                </span>
              </p>
            </div>
            
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">Account Information</h3>
              <div className="space-y-2 text-gray-300">
                <p><span className="font-medium">Name:</span> {session?.user?.name || 'Not provided'}</p>
                <p><span className="font-medium">Email:</span> {session?.user?.email}</p>
                <p><span className="font-medium">User ID:</span> {session?.user?.id}</p>
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">Unlock Your Prize </h3>
              <p className="text-gray-300 mb-4">
                 Unlock a prize with a one-time payment of $5.
              </p>
              <button
                onClick={handlePayment}
                disabled={loading}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  loading 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                {loading ? 'Processing...' : 'Unlock Prize for $5'}
              </button>
            </div>

            {/* Payment History */}
            <div className="bg-white/5 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-3">Payment History</h3>
              {payments && payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                            ${(payment.amount / 100).toFixed(2)} {payment.currency.toUpperCase()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              payment.status === 'paid' 
                                ? 'bg-green-500/20 text-green-300' 
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-300">No payment history found.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function DashboardPageWithSuspense() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
