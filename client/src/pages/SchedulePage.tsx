import { useFranchise } from '@/context/FranchiseContext';

// Phase-specific content components
import { AllStarContent } from '@/components/season-hub/AllStarContent';
import { AwardsContent } from '@/components/season-hub/AwardsContent';
import { PlayoffsContent } from '@/components/season-hub/PlayoffsContent';
import { OffseasonContent } from '@/components/season-hub/OffseasonContent';
import { HomeContent } from '@/components/season-hub/HomeContent';

export default function SchedulePage() {
  const { franchise } = useFranchise();

  // Render phase-specific content
  const renderPhaseContent = () => {
    switch (franchise?.phase) {
      case 'preseason':
      case 'regular_season':
        return <HomeContent />;
      case 'all_star':
        return <AllStarContent />;
      case 'awards':
        return <AwardsContent />;
      case 'playoffs':
        return <PlayoffsContent />;
      case 'offseason':
        return <OffseasonContent offseasonPhase={franchise.offseason_phase ?? undefined} />;
      default:
        return <HomeContent />;
    }
  };

  // No PageTemplate wrapper - content fills the main area directly
  return (
    <div className="p-4 md:p-6">
      {renderPhaseContent()}
    </div>
  );
}
