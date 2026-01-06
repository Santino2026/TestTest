import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Trophy, Calendar, TrendingUp, Play, ChevronRight, FastForward, SkipForward, Loader2, Star, Award } from 'lucide-react';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { TeamLogo } from '@/components/team/TeamLogo';
import { useTeams, useStandings, useSeason, usePlayers, useAdvancePreseasonDay, useAdvancePreseasonAll, useAdvanceDay, useSimulatePlayoffRound, useSimulatePlayoffAll, useAdvanceOffseasonPhase, useStartNewSeason, useStartPlayoffsFromAwards } from '@/api/hooks';
import { useFranchise } from '@/context/FranchiseContext';
import { cn, getStatColor } from '@/lib/utils';

export default function Dashboard() {
  const { franchise, refreshFranchise } = useFranchise();
  const { data: teams } = useTeams();
  const { data: standings } = useStandings(
    franchise?.season_id ? { season_id: franchise.season_id } : undefined
  );
  const { data: season } = useSeason();
  const { data: playersData } = usePlayers({ limit: 5 });

  // Season advancement hooks
  const advancePreseasonDay = useAdvancePreseasonDay();
  const advancePreseasonAll = useAdvancePreseasonAll();
  const advanceDay = useAdvanceDay();
  const simulatePlayoffRound = useSimulatePlayoffRound();
  const simulatePlayoffAll = useSimulatePlayoffAll();
  const advanceOffseasonPhase = useAdvanceOffseasonPhase();
  const startNewSeason = useStartNewSeason();
  const startPlayoffsFromAwards = useStartPlayoffsFromAwards();

  const [simResult, setSimResult] = useState<string | null>(null);

  const handleAdvancePreseasonDay = async () => {
    try {
      const result = await advancePreseasonDay.mutateAsync();
      if (result.preseason_complete) {
        setSimResult('Preseason complete! Regular season begins.');
      } else {
        const userGame = result.results.find((r: any) => r.is_user_game);
        if (userGame) {
          setSimResult(`${userGame.home_team} ${userGame.home_score} - ${userGame.away_score} ${userGame.away_team}`);
        } else {
          setSimResult(`Day ${result.day}: ${result.games_played} games simulated`);
        }
      }
      refreshFranchise();
    } catch {
      setSimResult('Failed to advance day');
    }
  };

  const handleSimAllPreseason = async () => {
    try {
      const result = await advancePreseasonAll.mutateAsync();
      setSimResult(`${result.message} ${result.games_played} games played.`);
      refreshFranchise();
    } catch {
      setSimResult('Failed to simulate preseason');
    }
  };

  const handleAdvanceDay = async () => {
    try {
      const result = await advanceDay.mutateAsync();
      const userGame = result.results.find((r: any) => r.is_user_game);
      if (userGame) {
        setSimResult(`${userGame.home_team} ${userGame.home_score} - ${userGame.away_score} ${userGame.away_team}`);
      } else {
        setSimResult(`Day ${result.day}: ${result.games_played} games simulated`);
      }
      refreshFranchise();
    } catch {
      setSimResult('Failed to advance day');
    }
  };

  const handleSimulatePlayoffRound = async () => {
    try {
      const result = await simulatePlayoffRound.mutateAsync();
      setSimResult(`${result.round_name}: ${result.series_completed} series completed`);
      refreshFranchise();
    } catch {
      setSimResult('Failed to simulate round');
    }
  };

  const handleSimulatePlayoffAll = async () => {
    try {
      const result = await simulatePlayoffAll.mutateAsync();
      setSimResult(`Playoffs complete! Champion: ${result.champion_name || 'TBD'}`);
      refreshFranchise();
    } catch {
      setSimResult('Failed to simulate playoffs');
    }
  };

  const handleAdvanceOffseasonPhase = async () => {
    try {
      const result = await advanceOffseasonPhase.mutateAsync();
      setSimResult(`${result.message}`);
      refreshFranchise();
    } catch {
      setSimResult('Failed to advance offseason phase');
    }
  };

  const handleStartNewSeason = async () => {
    try {
      const result = await startNewSeason.mutateAsync();
      setSimResult(`Season ${result.season_number} started!`);
      refreshFranchise();
    } catch {
      setSimResult('Failed to start new season');
    }
  };

  const handleStartPlayoffs = async () => {
    try {
      const result = await startPlayoffsFromAwards.mutateAsync();
      setSimResult(result.message);
      refreshFranchise();
    } catch {
      setSimResult('Failed to start playoffs');
    }
  };

  const isSimulating = advancePreseasonDay.isPending || advancePreseasonAll.isPending ||
                       advanceDay.isPending || simulatePlayoffRound.isPending || simulatePlayoffAll.isPending ||
                       advanceOffseasonPhase.isPending || startNewSeason.isPending || startPlayoffsFromAwards.isPending;

  // Get top 5 from each conference
  const easternStandings = standings
    ?.filter(s => s.conference === 'Eastern')
    .slice(0, 5);
  const westernStandings = standings
    ?.filter(s => s.conference === 'Western')
    .slice(0, 5);

  // Find user's team conference rank
  const userConferenceRank = standings
    ?.filter(s => s.conference === franchise?.conference)
    .findIndex(s => s.team_id === franchise?.team_id);

  const phaseLabels: Record<string, string> = {
    preseason: 'Preseason',
    regular_season: 'Regular Season',
    all_star: 'All-Star Weekend',
    playoffs: 'Playoffs',
    offseason: 'Offseason',
  };

  const offseasonPhaseLabels: Record<string, string> = {
    review: 'Season Review',
    lottery: 'Draft Lottery',
    draft: 'NBA Draft',
    free_agency: 'Free Agency',
    training_camp: 'Training Camp',
  };

  const getCurrentPhaseLabel = () => {
    if (franchise?.phase === 'offseason' && franchise?.offseason_phase) {
      return offseasonPhaseLabels[franchise.offseason_phase] || 'Offseason';
    }
    return phaseLabels[franchise?.phase || 'preseason'] || 'Preseason';
  };

  return (
    <PageTemplate
      title={`${franchise?.city} ${franchise?.team_name}`}
      subtitle={`Season ${season?.season_number || 1} - ${getCurrentPhaseLabel()}`}
    >
      {/* Franchise Header Card */}
      <Card className="mb-4 md:mb-6">
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Team Logo */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg flex-shrink-0"
              style={{ backgroundColor: franchise?.primary_color || '#1a56db' }}
            >
              {franchise?.abbreviation || 'TM'}
            </div>

            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
                {franchise?.city} {franchise?.team_name}
              </h2>
              <p className="text-sm text-slate-400 truncate">{franchise?.conference} Conference - {franchise?.division} Division</p>
              <div className="flex items-center gap-4 sm:gap-6 mt-2">
                <div>
                  <span className="text-2xl sm:text-3xl font-bold text-white">{franchise?.wins || 0}</span>
                  <span className="text-lg sm:text-xl text-slate-500"> - </span>
                  <span className="text-2xl sm:text-3xl font-bold text-white">{franchise?.losses || 0}</span>
                </div>
                {userConferenceRank !== undefined && userConferenceRank >= 0 && (
                  <div className="text-sm text-slate-400">
                    #{userConferenceRank + 1} in {franchise?.conference}
                  </div>
                )}
              </div>
            </div>

            {/* Phase-aware Action Buttons */}
            <div className="flex flex-col sm:flex-col gap-2 w-full sm:w-auto">
              {/* Preseason Actions */}
              {franchise?.phase === 'preseason' && (
                <>
                  <button
                    onClick={handleAdvancePreseasonDay}
                    disabled={isSimulating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Play Preseason Game
                  </button>
                  <button
                    onClick={handleSimAllPreseason}
                    disabled={isSimulating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FastForward className="w-4 h-4" />}
                    Sim All Preseason
                  </button>
                </>
              )}

              {/* Regular Season Actions */}
              {franchise?.phase === 'regular_season' && (
                <>
                  <button
                    onClick={handleAdvanceDay}
                    disabled={isSimulating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Play Next Game
                  </button>
                  <Link
                    to="/basketball/schedule"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700/50 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-700 border border-white/10 active:bg-slate-600 transition-colors min-h-[44px]"
                  >
                    View Schedule
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </>
              )}

              {/* All-Star Weekend Actions */}
              {franchise?.phase === 'all_star' && (
                <>
                  <Link
                    to="/basketball/all-star"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors min-h-[44px]"
                  >
                    <Star className="w-4 h-4" />
                    All-Star Weekend
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </>
              )}

              {/* Awards Phase Actions */}
              {franchise?.phase === 'awards' && (
                <>
                  <Link
                    to="/basketball/awards"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors min-h-[44px]"
                  >
                    <Award className="w-4 h-4" />
                    View Awards
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={handleStartPlayoffs}
                    disabled={isSimulating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                    Start Playoffs
                  </button>
                </>
              )}

              {/* Playoffs Actions */}
              {franchise?.phase === 'playoffs' && (
                <>
                  <Link
                    to="/basketball/playoffs"
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors min-h-[44px]"
                  >
                    <Trophy className="w-4 h-4" />
                    View Playoffs
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={handleSimulatePlayoffRound}
                    disabled={isSimulating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FastForward className="w-4 h-4" />}
                    Sim Round
                  </button>
                  <button
                    onClick={handleSimulatePlayoffAll}
                    disabled={isSimulating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
                    Sim All
                  </button>
                </>
              )}

              {/* Offseason Actions */}
              {franchise?.phase === 'offseason' && (
                <>
                  {/* Season Review phase */}
                  {franchise?.offseason_phase === 'review' && (
                    <>
                      <Link
                        to="/basketball/awards"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors min-h-[44px]"
                      >
                        <Trophy className="w-4 h-4" />
                        View Awards
                      </Link>
                      <button
                        onClick={handleAdvanceOffseasonPhase}
                        disabled={isSimulating}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        Continue to Lottery
                      </button>
                    </>
                  )}

                  {/* Draft Lottery phase */}
                  {franchise?.offseason_phase === 'lottery' && (
                    <>
                      <Link
                        to="/basketball/draft"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors min-h-[44px]"
                      >
                        Run Lottery
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={handleAdvanceOffseasonPhase}
                        disabled={isSimulating}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        Continue to Draft
                      </button>
                    </>
                  )}

                  {/* NBA Draft phase */}
                  {franchise?.offseason_phase === 'draft' && (
                    <>
                      <Link
                        to="/basketball/draft"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors min-h-[44px]"
                      >
                        Enter Draft
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={handleAdvanceOffseasonPhase}
                        disabled={isSimulating}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        Continue to Free Agency
                      </button>
                    </>
                  )}

                  {/* Free Agency phase */}
                  {franchise?.offseason_phase === 'free_agency' && (
                    <>
                      <Link
                        to="/basketball/free-agency"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 active:bg-cyan-800 transition-colors min-h-[44px]"
                      >
                        Free Agency
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={handleAdvanceOffseasonPhase}
                        disabled={isSimulating}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        Continue to Training Camp
                      </button>
                    </>
                  )}

                  {/* Training Camp phase */}
                  {franchise?.offseason_phase === 'training_camp' && (
                    <>
                      <Link
                        to="/basketball/roster"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-colors min-h-[44px]"
                      >
                        Set Roster
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={handleStartNewSeason}
                        disabled={isSimulating}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Start New Season
                      </button>
                    </>
                  )}

                  {/* Fallback for null offseason_phase */}
                  {!franchise?.offseason_phase && (
                    <>
                      <Link
                        to="/basketball/awards"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors min-h-[44px]"
                      >
                        <Trophy className="w-4 h-4" />
                        View Awards
                      </Link>
                      <button
                        onClick={handleAdvanceOffseasonPhase}
                        disabled={isSimulating}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        Continue
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Always show roster link */}
              <Link
                to={`/basketball/roster`}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700/50 text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-700 border border-white/10 active:bg-slate-600 transition-colors min-h-[44px]"
              >
                View Roster
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Simulation Result */}
          {simResult && (
            <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-white/10">
              <p className="text-sm text-slate-300">{simResult}</p>
              <button
                onClick={() => setSimResult(null)}
                className="text-xs text-slate-500 hover:text-slate-400 mt-1"
              >
                Dismiss
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Season Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-white">{teams?.length || 0}</p>
              <p className="text-xs md:text-sm text-slate-400">Teams</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-white">{playersData?.pagination.total || 0}</p>
              <p className="text-xs md:text-sm text-slate-400">Players</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-white">
                {franchise?.phase === 'preseason'
                  ? `Game ${(franchise?.current_day ?? -7) + 8}/8`
                  : `Day ${franchise?.current_day || 0}`}
              </p>
              <p className="text-xs md:text-sm text-slate-400">
                {franchise?.phase === 'preseason' ? 'Preseason' : 'Current'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-white capitalize truncate">{getCurrentPhaseLabel()}</p>
              <p className="text-xs md:text-sm text-slate-400">Phase</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Conference Standings */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Eastern Conference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Eastern Conference</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-3 md:px-4 py-2 text-left text-xs font-semibold text-slate-400">#</th>
                    <th className="px-3 md:px-4 py-2 text-left text-xs font-semibold text-slate-400">Team</th>
                    <th className="px-3 md:px-4 py-2 text-right text-xs font-semibold text-slate-400">W-L</th>
                  </tr>
                </thead>
                <tbody>
                  {easternStandings?.map((team, idx) => (
                    <tr key={team.team_id} className="border-t border-white/5">
                      <td className="px-3 md:px-4 py-2 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-3 md:px-4 py-2">
                        <Link to={`/basketball/teams/${team.team_id}`} className="flex items-center gap-2 hover:text-blue-400 text-slate-200">
                          <TeamLogo abbreviation={team.abbreviation} primaryColor={team.primary_color} size="sm" />
                          <span className="text-sm font-medium truncate">{team.city}</span>
                        </Link>
                      </td>
                      <td className="px-3 md:px-4 py-2 text-sm text-right whitespace-nowrap text-slate-200">{team.wins}-{team.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 md:px-4 py-3 border-t border-white/5">
                <Link to="/basketball/standings" className="text-sm text-blue-400 hover:text-blue-300">
                  View full standings →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Western Conference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Western Conference</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-3 md:px-4 py-2 text-left text-xs font-semibold text-slate-400">#</th>
                    <th className="px-3 md:px-4 py-2 text-left text-xs font-semibold text-slate-400">Team</th>
                    <th className="px-3 md:px-4 py-2 text-right text-xs font-semibold text-slate-400">W-L</th>
                  </tr>
                </thead>
                <tbody>
                  {westernStandings?.map((team, idx) => (
                    <tr key={team.team_id} className="border-t border-white/5">
                      <td className="px-3 md:px-4 py-2 text-sm text-slate-400">{idx + 1}</td>
                      <td className="px-3 md:px-4 py-2">
                        <Link to={`/basketball/teams/${team.team_id}`} className="flex items-center gap-2 hover:text-blue-400 text-slate-200">
                          <TeamLogo abbreviation={team.abbreviation} primaryColor={team.primary_color} size="sm" />
                          <span className="text-sm font-medium truncate">{team.city}</span>
                        </Link>
                      </td>
                      <td className="px-3 md:px-4 py-2 text-sm text-right whitespace-nowrap text-slate-200">{team.wins}-{team.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 md:px-4 py-3 border-t border-white/5">
                <Link to="/basketball/standings" className="text-sm text-blue-400 hover:text-blue-300">
                  View full standings →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Players */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg">Top Players</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {playersData?.players.map((player, idx) => (
                <Link
                  key={player.id}
                  to={`/basketball/players/${player.id}`}
                  className="flex items-center gap-3 px-3 md:px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-500 w-4">{idx + 1}</span>
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
                    {player.jersey_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {player.first_name} {player.last_name}
                    </p>
                    <p className="text-xs text-slate-400">{player.team_abbrev} · {player.position}</p>
                  </div>
                  <span className={cn('text-lg font-bold', getStatColor(player.overall))}>
                    {player.overall}
                  </span>
                </Link>
              ))}
            </div>
            <div className="px-3 md:px-4 py-3 border-t border-white/5">
              <Link to="/basketball/players" className="text-sm text-blue-400 hover:text-blue-300">
                View all players →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}
