import { PoolClient } from 'pg';
import { saveGameResult, savePlayoffGame } from './gamePersistence/gameStorage';
import { updateStandingsAfterGame } from './gamePersistence/standings';
import { updateTeamSeasonStats } from './gamePersistence/teamStats';
import { updatePlayerSeasonStats } from './gamePersistence/playerStats';

// Re-export types
export {
  GameResult,
  TeamStats,
  PlayerGameStats,
  SimulatedTeam,
  PlayoffGameResult
} from './gamePersistence/types';

// Re-export functions for external use
export { saveGameResult, savePlayoffGame } from './gamePersistence/gameStorage';
export { updateStandingsAfterGame } from './gamePersistence/standings';
export { updateTeamSeasonStats } from './gamePersistence/teamStats';
export { updatePlayerSeasonStats } from './gamePersistence/playerStats';

// Import types for local use
import type { GameResult, SimulatedTeam } from './gamePersistence/types';

export async function saveCompleteGameResult(
  result: GameResult,
  seasonId: string,
  homeTeam: SimulatedTeam,
  awayTeam: SimulatedTeam,
  updateStandings: boolean = true,
  client?: PoolClient,
  isPreseason: boolean = false
): Promise<void> {
  await saveGameResult(result, seasonId, homeTeam, awayTeam, client);

  if (updateStandings) {
    await updateStandingsAfterGame(result, seasonId, client);
  }

  // Skip season stats for preseason games - they're not meaningful
  if (!isPreseason) {
    await updateTeamSeasonStats(result, seasonId, client);
    await updatePlayerSeasonStats(result, seasonId, homeTeam, awayTeam, client);
  }
}
