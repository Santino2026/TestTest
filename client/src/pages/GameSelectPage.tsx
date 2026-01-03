import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Clock, LogOut } from 'lucide-react';
import PurchaseModal from '@/components/PurchaseModal';

export default function GameSelectPage() {
  const navigate = useNavigate();
  const { user, hasPurchased, logout } = useAuth();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const handleBasketballClick = () => {
    if (hasPurchased) {
      navigate('/basketball');
    } else {
      setShowPurchaseModal(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Sports League Office</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-sm">
              {user?.email}
            </span>
            <Button variant="ghost" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Game Selection */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-white text-center mb-4">
          Choose Your Game
        </h1>
        <p className="text-slate-400 text-center mb-12">
          Select a franchise simulation to play
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Basketball Card */}
          <div
            onClick={handleBasketballClick}
            className="group cursor-pointer bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-8 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            <div className="text-6xl mb-4">🏀</div>
            <h2 className="text-2xl font-bold mb-2">Basketball</h2>
            <p className="text-orange-100 mb-6">
              Manage an NBA-style franchise. 82-game seasons, playoffs, and championships.
            </p>
            <div className="flex items-center justify-between">
              {hasPurchased ? (
                <span className="bg-white/20 px-4 py-2 rounded-lg font-medium">
                  Play Now
                </span>
              ) : (
                <span className="bg-white/20 px-4 py-2 rounded-lg font-medium">
                  $10 - Buy Now
                </span>
              )}
              <span className="text-orange-200 text-sm">
                {hasPurchased ? 'Owned' : 'One-time purchase'}
              </span>
            </div>
          </div>

          {/* College Football Card (Coming Soon) */}
          <div className="relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl p-8 text-white shadow-xl opacity-75">
            <div className="absolute top-4 right-4 bg-slate-600 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Coming Soon
            </div>
            <div className="text-6xl mb-4">🏈</div>
            <h2 className="text-2xl font-bold mb-2">College Football</h2>
            <p className="text-slate-400 mb-6">
              Build a college football dynasty. Recruiting, bowl games, and national championships.
            </p>
            <div className="flex items-center justify-between">
              <span className="bg-slate-600 px-4 py-2 rounded-lg font-medium text-slate-400">
                Coming 2025
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Purchase Modal */}
      <PurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        gameName="Basketball"
        price={10}
      />
    </div>
  );
}
