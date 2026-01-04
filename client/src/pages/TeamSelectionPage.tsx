import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, Team } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';

export default function TeamSelectionPage() {
  const navigate = useNavigate();
  const { selectTeam } = useFranchise();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
  });

  const handleConfirm = async () => {
    if (!selectedTeam) return;

    setIsSelecting(true);
    try {
      await selectTeam(selectedTeam.id);
      navigate('/basketball');
    } catch (error: any) {
      console.error('Failed to select team:', error);
      // Check if it's an auth error
      if (error.message?.includes('logged in') || error.message?.includes('401')) {
        alert('Session expired. Please log in again.');
        navigate('/login');
      } else {
        alert('Failed to select team. Please try again.');
      }
    } finally {
      setIsSelecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Group teams by division
  const teamsByDivision: Record<string, Team[]> = {};
  teams?.forEach(team => {
    const key = team.division;
    if (!teamsByDivision[key]) {
      teamsByDivision[key] = [];
    }
    teamsByDivision[key].push(team);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 pb-24 md:pb-0">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-white/10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Select Your Team</h1>
          <p className="mt-1 md:mt-2 text-sm md:text-base text-slate-300">
            Choose the franchise you want to manage.
          </p>
        </div>
      </div>

      {/* Team Grid */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Eastern Conference */}
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Eastern Conference</h2>
            {['Atlantic', 'Central', 'Southeast'].map(division => (
              <div key={division} className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">{division}</h3>
                <div className="space-y-2">
                  {teamsByDivision[division]?.map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      isSelected={selectedTeam?.id === team.id}
                      onSelect={() => setSelectedTeam(team)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Western Conference */}
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">Western Conference</h2>
            {['Northwest', 'Pacific', 'Southwest'].map(division => (
              <div key={division} className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">{division}</h3>
                <div className="space-y-2">
                  {teamsByDivision[division]?.map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      isSelected={selectedTeam?.id === team.id}
                      onSelect={() => setSelectedTeam(team)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selection Footer */}
      {selectedTeam && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800/95 border-t border-white/10 shadow-lg z-50 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div
                className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm md:text-base flex-shrink-0"
                style={{ backgroundColor: selectedTeam.primary_color }}
              >
                {selectedTeam.abbreviation}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">{selectedTeam.city} {selectedTeam.name}</p>
                <p className="text-xs md:text-sm text-slate-400">{selectedTeam.conference} - {selectedTeam.division}</p>
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={isSelecting}
              className="w-full sm:w-auto px-5 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm md:text-base"
            >
              {isSelecting ? 'Starting...' : 'Start Franchise'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({
  team,
  isSelected,
  onSelect,
}: {
  team: Team;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-2.5 md:gap-3 p-2.5 md:p-3 rounded-lg border transition-all min-h-[52px] ${
        isSelected
          ? 'border-blue-500 bg-blue-900/30 ring-2 ring-blue-500'
          : 'border-white/10 bg-slate-800/50 hover:border-white/20 hover:bg-white/5'
      }`}
    >
      <div
        className="w-9 h-9 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0"
        style={{ backgroundColor: team.primary_color }}
      >
        {team.abbreviation}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-medium text-white text-sm md:text-base truncate">{team.city} {team.name}</p>
        <p className="text-xs text-slate-400 truncate">{team.championships > 0 ? `${team.championships} Championships` : 'No championships yet'}</p>
      </div>
      {isSelected && (
        <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  );
}
