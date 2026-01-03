import { useState } from 'react';
import { PageTemplate } from '@/components/layout/PageTemplate';
import { Card, CardContent, Button } from '@/components/ui';
import { PlayerCard } from '@/components/player/PlayerCard';
import { usePlayers } from '@/api/hooks';
import { cn } from '@/lib/utils';

const positions = ['All', 'PG', 'SG', 'SF', 'PF', 'C'];

export default function PlayersPage() {
  const [page, setPage] = useState(1);
  const [position, setPosition] = useState<string>('All');
  const [showFreeAgents, setShowFreeAgents] = useState(false);

  const { data, isLoading } = usePlayers({
    page,
    limit: 20,
    position: position === 'All' ? undefined : position,
    freeAgents: showFreeAgents,
  });

  return (
    <PageTemplate
      title="Players"
      subtitle={`${data?.pagination.total || 0} players in the league`}
    >
      {/* Filters */}
      <Card className="mb-4 md:mb-6">
        <CardContent className="py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Position Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs sm:text-sm text-slate-500">Position:</span>
              <div className="flex flex-wrap gap-1">
                {positions.map(pos => (
                  <button
                    key={pos}
                    onClick={() => {
                      setPosition(pos);
                      setPage(1);
                    }}
                    className={cn(
                      'px-3 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors min-h-[44px] active:scale-95',
                      position === pos
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
                    )}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Free Agents Toggle */}
            <button
              onClick={() => {
                setShowFreeAgents(!showFreeAgents);
                setPage(1);
              }}
              className={cn(
                'px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors min-h-[44px] w-full sm:w-auto active:scale-95',
                showFreeAgents
                  ? 'bg-green-600 text-white active:bg-green-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 active:bg-slate-300'
              )}
            >
              Free Agents Only
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Players List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading players...</div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {data?.players.map(player => (
                  <PlayerCard key={player.id} player={player} />
                ))}
              </div>

              {/* Pagination */}
              {data && data.pagination.pages > 1 && (
                <div className="px-3 md:px-4 py-3 md:py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                    {((page - 1) * 20) + 1}-{Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
                  </p>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                      disabled={page === data.pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
