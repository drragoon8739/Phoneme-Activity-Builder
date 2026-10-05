import Link from 'next/link';

import { getDashboardMetrics, activityTypeLabel, DEFAULT_WINDOW_DAYS } from '@/lib/metrics';
import { formatCount, formatDuration, formatPercent, NO_DATA } from '@/lib/format';
import StatTile from '@/components/dashboard/StatTile';
import HealthPill from '@/components/dashboard/HealthPill';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import GenerationTrend from '@/components/dashboard/GenerationTrend';
import WindowPicker from '@/components/dashboard/WindowPicker';
import {
  RecentGenerations,
  FailureBreakdown,
  EngagementReport,
  WordListReport,
  EventLog,
} from '@/components/dashboard/ReportViews';
import styles from './dashboard.module.css';

export const metadata = {
  title: 'Dashboard — Phoneme Activity Builder',
  description:
    'Usage, health and reporting for the phoneme-based Wordle and Word Search builder.',
};

/**
 * Rendered per request rather than cached. A dashboard that can serve a
 * snapshot from five minutes ago is worse than useless for monitoring: the
 * reader cannot tell a stale figure from a current one.
 */
export const dynamic = 'force-dynamic';

const WINDOW_OPTIONS = [7, 14, 30];

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const requested = Number(params?.days);
  const days = WINDOW_OPTIONS.includes(requested) ? requested : DEFAULT_WINDOW_DAYS;

  const metrics = await getDashboardMetrics({ days });
  const { totals, generations, engagement, alerts, events, wordLists } = metrics;

  const mostUsed = generations.mostUsedType;

  return (
    <>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>System and usage overview</h1>
          <p className="lede">
            Every figure here is computed from stored records at the moment the
            page loads — nothing is a running total that could drift away from
            the data it claims to describe.
          </p>
        </div>
        <HealthPill />
      </header>

      <AlertsPanel alerts={alerts} />

      <section aria-labelledby="headline-heading">
        <div className={styles.sectionHead}>
          <div>
            <h2 className="eyebrow" id="headline-heading">
              Headline figures
            </h2>
            <p className={styles.scopeNote}>
              Usage figures cover the selected window. Activities saved and
              library size are current totals.
            </p>
          </div>
          <WindowPicker options={WINDOW_OPTIONS} current={days} />
        </div>

        <div className={styles.tiles}>
          <StatTile
            label="Activities saved"
            value={formatCount(totals.activities)}
            tone="brand"
            breakdown={[
              { label: 'Wordle', value: formatCount(totals.activitiesByType.WORDLE) },
              {
                label: 'Word Search',
                value: formatCount(totals.activitiesByType.WORD_SEARCH),
              },
            ]}
          />

          <StatTile
            label="Generated successfully"
            value={formatCount(generations.successful)}
            tone="success"
            hint={
              generations.attempts === 0
                ? `No attempts in the last ${days} days`
                : `${formatPercent(generations.successRate)} of ${formatCount(
                    generations.attempts,
                  )} attempts in ${days} days`
            }
          />

          <StatTile
            label="Failed to generate"
            value={formatCount(generations.failed)}
            tone="failure"
            hint={
              generations.failed === 0
                ? 'Every attempt produced a file'
                : generations.failuresByReason[0]?.label
            }
          />

          <StatTile
            label="Average time on page"
            value={formatDuration(engagement.avgTimeOnPageMs)}
            hint={
              engagement.totalViews === 0
                ? `No page views in the last ${days} days`
                : `across ${formatCount(engagement.totalViews)} views in ${days} days`
            }
          />

          <StatTile
            label="Most-used activity"
            value={mostUsed ? activityTypeLabel(mostUsed.type) : NO_DATA}
            tone="brand"
            hint={
              !mostUsed
                ? `Nothing generated in the last ${days} days`
                : mostUsed.tied
                  ? `Tied on ${formatCount(mostUsed.count)} generations each`
                  : `${formatCount(mostUsed.count)} generations`
            }
          />

          {/* Current state, not windowed: a library has a size now, not a
              size "over the last fortnight". */}
          <StatTile
            label="Library size"
            value={formatCount(totals.words)}
            unit="words"
            breakdown={[
              { label: 'Word lists', value: formatCount(totals.wordLists) },
              { label: 'Phonemes', value: formatCount(totals.phonemes) },
            ]}
          />
        </div>
      </section>

      <div className={styles.twoUp}>
        <GenerationTrend trend={generations.trend} windowDays={days} />
        <FailureBreakdown
          failures={generations.failuresByReason}
          totalFailed={generations.failed}
        />
      </div>

      <RecentGenerations generations={generations.recent} />

      <div className={styles.twoUp}>
        <WordListReport wordLists={wordLists} />
        <EngagementReport engagement={engagement} />
      </div>

      <EventLog events={events} />

      <p className={styles.footnote}>
        Computed in {metrics.computedInMs} ms. The same figures are available as
        JSON at <Link href="/api/metrics">/api/metrics</Link>, and the health
        check at <Link href="/health">/health</Link>.
      </p>
    </>
  );
}
