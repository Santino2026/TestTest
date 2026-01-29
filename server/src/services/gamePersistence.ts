import { PoolClient } from 'pg';
import { saveGameResult, savePlayoffGame, saveGameResultsBatch, BatchGameData } from './gamePersistence/gameStorage';
import { updateStandingsAfterGame } from './gamePersistence/standings';
import { updateTeamSeasonStats, updateTeamSeasonStatsBatch } from './gamePersistence/teamStats';
import { updatePlayerSeasonStats, updatePlayerSeasonStatsBatch } from './gamePersistence/playerStats';

// Re-export types
export {
  GameResult,
  TeamStats,
  PlayerGameStats,
  PlayRecord,
  SimulatedTeam,
  PlayoffGameResult
} from './gamePersistence/types';

export { BatchGameData } from './gamePersistence/gameStorage';

// Re-export functions for external use
export { saveGameResult, savePlayoffGame, saveGameResultsBatch } from './gamePersistence/gameStorage';
export { updateStandingsAfterGame } from './gamePersistence/standings';
export { updateTeamSeasonStats, updateTeamSeasonStatsBatch } from './gamePersistence/teamStats';
export { updatePlayerSeasonStats, updatePlayerSeasonStatsBatch } from './gamePersistence/playerStats';

// Import types for local use
import type { GameResult, SimulatedTeam } from './gamePersistence/types';

export async function saveCompleteGameResult(
  result: GameResult,
  seasonId: string,
  homeTeam: SimulatedTeam,
  awayTeam: SimulatedTeam,
  updateStandings: boolean = true,
  client?: PoolClient,
  isPreseason: boolean = false,
  gameDate?: string
): Promise<void> {
  await saveGameResult(result, seasonId, homeTeam, awayTeam, client, gameDate);

  if (updateStandings) {
    await updateStandingsAfterGame(result, seasonId, client);
  }

  if (!isPreseason) {
    await updateTeamSeasonStats(result, seasonId, client);
    await updatePlayerSeasonStats(result, seasonId, homeTeam, awayTeam, client);
  }
}
