import { useState } from 'react';
import { Button } from '@/components/ui';
import { api } from '@/api/client';
import { X, Check, CreditCard } from 'lucide-react';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName: string;
  price: number;
}

export default function PurchaseModal({ isOpen, onClose, gameName, price }: PurchaseModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePurchase = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { checkout_url } = await api.createCheckout();
      window.location.href = checkout_url;
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout. Please try again.');
      setIsLoading(false);
    }
  };

  const features = [
    'All 30 NBA-style teams',
    'Full 82-game seasons',
    'Complete playoff system',
    'Up to 50 seasons',
    'Detailed player stats',
    'Franchise mode',
    'Lifetime access',
    'Future updates included',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-8 text-white text-center">
          <div className="text-5xl mb-3">🏀</div>
          <h2 className="text-2xl font-bold">{gameName}</h2>
          <p className="text-orange-100 mt-1">Franchise Simulation</p>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Price */}
          <div className="text-center mb-6">
            <span className="text-4xl font-bold text-white">${price}</span>
            <span className="text-slate-400 ml-2">one-time</span>
          </div>

          {/* Features */}
          <ul className="space-y-3 mb-6">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-slate-300">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            {isLoading ? 'Redirecting to Stripe...' : `Purchase for $${price}`}
          </Button>

          <p className="text-center text-xs text-slate-500 mt-4">
            Secure payment powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
