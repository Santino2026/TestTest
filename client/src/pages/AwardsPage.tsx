import { PageTemplate } from '@/components/layout/PageTemplate';
import { useSeason } from '@/api/hooks';
import { AwardsContent } from '@/components/season-hub/AwardsContent';

export default function AwardsPage(): JSX.Element {
  const { data: season } = useSeason();

  return (
    <PageTemplate
      title="Season Awards"
      subtitle={`Season ${season?.season_number || 1}`}
    >
      <AwardsContent />
    </PageTemplate>
  );
}
