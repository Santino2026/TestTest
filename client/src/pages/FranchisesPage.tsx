import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from '@/components/ui';
import { api } from '@/api/client';
import { useFranchise } from '@/context/FranchiseContext';
import { cn } from '@/lib/utils';
import { FolderOpen, Plus, Play, Trash2, Trophy, Calendar, Check } from 'lucide-react';

export default function FranchisesPage() {
  const { franchises, franchise: activeFranchise, createFranchise, switchFranchise, deleteFranchise, isLoading } = useFranchise();
  const [showNewFranchise, setShowNewFranchise] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [franchiseName, setFranchiseName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: api.getTeams,
    enabled: showNewFranchise,
  });

  // Teams already used by existing franchises
  const usedTeamIds = new Set(franchises.map(f => f.team_id));
  const availableTeams = teams?.filter(t => !usedTeamIds.has(t.id)) || [];

  const handleCreateFranchise = async () => {
    if (!selectedTeam) return;

    setIsCreating(true);
    try {
      await createFranchise(selectedTeam, franchiseName || undefined);
      setShowNewFranchise(false);
      setSelectedTeam(null);
      setFranchiseName('');
    } catch (error) {
      console.error('Failed to create franchise:', error);
      alert('Failed to create franchise');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchFranchise = async (franchiseId: string) => {
    if (franchiseId === activeFranchise?.id) return;

    setIsSwitching(franchiseId);
    try {
      await switchFranchise(franchiseId);
    } catch (error) {
      console.error('Failed to switch franchise:', error);
      alert('Failed to switch franchise');
    } finally {
      setIsSwitching(null);
    }
  };

  const handleDeleteFranchise = async (franchiseId: string) => {
    if (!confirm('Are you sure you want to delete this franchise? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(franchiseId);
    try {
      await deleteFranchise(franchiseId);
    } catch (error) {
      console.error('Failed to delete franchise:', error);
      alert('Failed to delete franchise');
    } finally {
      setIsDeleting(null);
    }
  };

  const phaseLabels: Record<string, string> = {
    preseason: 'Preseason',
    regular_season: 'Regular Season',
    playoffs: 'Playoffs',
    offseason: 'Offseason',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <PageTemplate title="My Franchises" subtitle="Manage your franchise save files">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">Loading...</p>
          </CardContent>
        </Card>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate title="My Franchises" subtitle="Manage your franchise save files">
      {/* Action Bar */}
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <p className="text-sm text-slate-400">
          {franchises.length} franchise{franchises.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => setShowNewFranchise(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Franchise
        </Button>
      </div>

      {/* Franchise List */}
      {franchises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-16 h-16 mx-auto text-slate-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Franchises Yet</h2>
            <p className="text-slate-400 mb-6">
              Create your first franchise to start playing.
            </p>
            <Button onClick={() => setShowNewFranchise(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Franchise
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {franchises.map((f) => (
            <Card
              key={f.id}
              className={cn(
                'relative overflow-hidden transition-shadow hover:shadow-md',
                f.id === activeFranchise?.id && 'ring-2 ring-blue-500'
              )}
            >
              {/* Team Color Bar */}
              <div
                className="h-2"
                style={{ backgroundColor: f.primary_color }}
              />

              <CardContent className="pt-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: f.primary_color }}
                    >
                      {f.abbreviation}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {f.name || `${f.city} ${f.team_name}`}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {f.city} {f.team_name}
                      </p>
                    </div>
                  </div>
                  {f.id === activeFranchise?.id && (
                    <Badge variant="success">
                      <Check className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-slate-800/50 rounded-lg py-2">
                    <p className="text-xs text-slate-400">Season</p>
                    <p className="font-semibold text-white">{f.season_number || 1}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg py-2">
                    <p className="text-xs text-slate-400">Record</p>
                    <p className="font-semibold text-white">{f.wins}-{f.losses}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg py-2">
                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Titles
                    </p>
                    <p className="font-semibold text-white">{f.championships}</p>
                  </div>
                </div>

                {/* Phase & Day */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">
                    {f.phase === 'preseason'
                      ? `Preseason - Game ${(f.current_day ?? -7) + 8}/8`
                      : `${phaseLabels[f.phase] || f.phase} - Day ${f.current_day}`}
                  </span>
                </div>

                {/* Last Played */}
                {f.last_played_at && (
                  <p className="text-xs text-slate-500 mb-4">
                    Last played: {formatDate(f.last_played_at)}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {f.id === activeFranchise?.id ? (
                    <Button className="flex-1" disabled>
                      <Play className="w-4 h-4 mr-2" />
                      Playing
                    </Button>
                  ) : (
                    <Button
                      className="flex-1"
                      onClick={() => handleSwitchFranchise(f.id)}
                      disabled={isSwitching === f.id}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {isSwitching === f.id ? 'Switching...' : 'Play'}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => handleDeleteFranchise(f.id)}
                    disabled={isDeleting === f.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Franchise Modal */}
      {showNewFranchise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader>
              <CardTitle>Create New Franchise</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Franchise Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Franchise Name (optional)
                </label>
                <input
                  type="text"
                  value={franchiseName}
                  onChange={(e) => setFranchiseName(e.target.value)}
                  placeholder="My Dynasty"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg min-h-[44px] text-white placeholder:text-slate-500"
                />
              </div>

              {/* Team Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Select Team
                </label>
                <div className="max-h-[300px] overflow-y-auto border border-white/10 rounded-lg bg-slate-800/50">
                  {availableTeams.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      {teams ? 'All teams already have franchises' : 'Loading teams...'}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {availableTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => setSelectedTeam(team.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors',
                            selectedTeam === team.id && 'bg-blue-900/30'
                          )}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: team.primary_color }}
                          >
                            {team.abbreviation}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-white">{team.city} {team.name}</p>
                            <p className="text-xs text-slate-400">{team.conference} - {team.division}</p>
                          </div>
                          {selectedTeam === team.id && (
                            <Check className="w-5 h-5 text-blue-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  onClick={handleCreateFranchise}
                  disabled={!selectedTeam || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Franchise'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowNewFranchise(false);
                    setSelectedTeam(null);
                    setFranchiseName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageTemplate>
  );
}
