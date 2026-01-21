import { PageTemplate } from '@/components/layout/PageTemplate';
import { AwardsContent } from '@/components/season-hub/AwardsContent';
import { useFranchise } from '@/context/FranchiseContext';

export default function AwardsPage(): JSX.Element {
  const { franchise } = useFranchise();

  return (
    <PageTemplate
      title="Season Awards"
      subtitle={`Season ${franchise?.season_number || 1}`}
    >
      <AwardsContent />
    </PageTemplate>
  );
}
