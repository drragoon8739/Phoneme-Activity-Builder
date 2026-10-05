import Link from 'next/link';

import { activityTypeLabel } from '@/lib/metrics';
import {
  formatCount,
  formatDateTime,
  formatDuration,
  formatRelative,
  NO_DATA,
} from '@/lib/format';
import styles from './ReportViews.module.css';

/**
 * The dashboard's reporting views.
 *
 * They share one idiom — a titled panel wrapping a table — so they live
 * together and share a stylesheet rather than repeating the same markup and
 * CSS four times.
 *
 * Every table has a caption (hidden visually, read by screen readers), row
 * headers where a row has a natural name, and no information carried by colour
 * alone.
 */

function Panel({ id, title, subtitle, action, children }) {
  const headingId = `${id}-heading`;
  return (
    <section className={styles.panel} aria-labelledby={headingId} id={id}>
      <header className={styles.head}>
        <div>
          <h3 className={styles.title} id={headingId}>
            {title}
          </h3>
          {subtitle ? <p className={styles.sub}>{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** Status word plus a shape, so outcome never depends on colour alone. */
function StatusTag({ status }) {
  const success = status === 'SUCCESS';
  return (
    <span className={`${styles.tag} ${success ? styles.tagSuccess : styles.tagFailure}`}>
      <span aria-hidden="true">{success ? '✓' : '✕'}</span>
      {success ? 'Generated' : 'Failed'}
    </span>
  );
}

/**
 * The generated outputs themselves — what was produced, from which activity,
 * and for a random Wordle, which word it landed on.
 *
 * Failures sit in the same list rather than a separate one, because "what came
 * out of this builder today" includes the attempts that produced nothing. A
 * list of successes only would be the Assessment 2 view again.
 */
export function RecentGenerations({ generations }) {
  return (
    <Panel
      id="generations"
      title="Generated outputs"
      subtitle="The most recent attempts, newest first"
      action={
        <Link href="/activities" className={styles.action}>
          Generate another <span aria-hidden="true">→</span>
        </Link>
      }
    >
      {generations.length === 0 ? (
        <p className={styles.empty}>
          Nothing generated yet. Saved activities produce files from{' '}
          <Link href="/activities">the activities page</Link>.
        </p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className="sr-only">
              Recent generation attempts, with the activity used and the outcome
            </caption>
            <thead>
              <tr>
                <th scope="col">Activity</th>
                <th scope="col">Type</th>
                <th scope="col">Outcome</th>
                <th scope="col">Output</th>
                <th scope="col" className={styles.numeric}>
                  Took
                </th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {generations.map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    {row.activityName}
                    {row.activityId === null ? (
                      <span className={styles.note}>activity since deleted</span>
                    ) : null}
                  </th>
                  <td>{activityTypeLabel(row.activityType)}</td>
                  <td>
                    <StatusTag status={row.status} />
                  </td>
                  <td className={styles.output}>
                    {row.status === 'SUCCESS' ? (
                      <>
                        <span className={styles.filename}>{row.filename}</span>
                        <span className={styles.note}>
                          {row.selectedWord
                            ? `answer: ${row.selectedWord}`
                            : `${formatCount(row.wordCount)} words placed`}
                        </span>
                      </>
                    ) : (
                      <span className={styles.failureReason}>{row.errorMessage}</span>
                    )}
                  </td>
                  <td className={styles.numeric}>{formatDuration(row.durationMs)}</td>
                  <td>
                    <time dateTime={new Date(row.createdAt).toISOString()}>
                      {formatDateTime(row.createdAt)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/** Why generations failed, most common first. */
export function FailureBreakdown({ failures, totalFailed }) {
  return (
    <Panel
      id="failures"
      title="Why generations failed"
      subtitle={
        totalFailed === 0
          ? 'No failures recorded'
          : `${formatCount(totalFailed)} failed attempt${totalFailed === 1 ? '' : 's'} in total`
      }
    >
      {failures.length === 0 ? (
        <p className={styles.empty}>
          Every generation attempt so far has produced a file.
        </p>
      ) : (
        <ul className={styles.reasons}>
          {failures.map((failure) => (
            <li key={failure.code}>
              <span className={styles.reasonCount}>{formatCount(failure.count)}</span>
              <span className={styles.reasonBody}>
                <span className={styles.reasonLabel}>{failure.label}</span>
                <code className={styles.reasonCode}>{failure.code}</code>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Where readers spend their time.
 *
 * Bar lengths are a share of the longest average, so the comparison is between
 * pages rather than against an arbitrary scale. The number is printed beside
 * each bar, so the bar is a visual aid rather than the only way to read it.
 */
export function EngagementReport({ engagement }) {
  const longest = engagement.byPath.reduce(
    (max, row) => Math.max(max, row.avgMs ?? 0),
    0,
  );

  return (
    <Panel
      id="engagement"
      title="Time on page"
      subtitle={`${formatCount(engagement.totalViews)} views from ${formatCount(
        engagement.uniqueSessions,
      )} session${engagement.uniqueSessions === 1 ? '' : 's'}`}
    >
      {engagement.byPath.length === 0 ? (
        <p className={styles.empty}>
          No page views recorded yet. Visiting any page in this app records one.
        </p>
      ) : (
        <ul className={styles.bars}>
          {engagement.byPath.map((row) => (
            <li key={row.path}>
              <span className={styles.barLabel}>
                <code>{row.path}</code>
                <span className={styles.note}>
                  {formatCount(row.views)} view{row.views === 1 ? '' : 's'}
                </span>
              </span>
              <span className={styles.barTrack}>
                <span
                  className={styles.barFill}
                  style={{
                    width: longest > 0 ? `${Math.max(2, ((row.avgMs ?? 0) / longest) * 100)}%` : '2%',
                  }}
                />
              </span>
              <span className={styles.barValue}>{formatDuration(row.avgMs)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Stored word lists, with how much each one holds. */
export function WordListReport({ wordLists }) {
  return (
    <Panel
      id="word-lists"
      title="Stored word lists"
      subtitle="What the builder draws on"
      action={
        <Link href="/manage" className={styles.action}>
          Manage <span aria-hidden="true">→</span>
        </Link>
      }
    >
      {wordLists.length === 0 ? (
        <p className={styles.empty}>
          No word lists yet. <Link href="/manage">Create one</Link> to start.
        </p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <caption className="sr-only">
              Word lists with their word and activity counts
            </caption>
            <thead>
              <tr>
                <th scope="col">List</th>
                <th scope="col" className={styles.numeric}>
                  Words
                </th>
                <th scope="col" className={styles.numeric}>
                  Activities
                </th>
                <th scope="col">Last changed</th>
              </tr>
            </thead>
            <tbody>
              {wordLists.map((list) => (
                <tr key={list.id}>
                  <th scope="row">
                    {list.name}
                    {list.wordCount === 0 ? (
                      <span className={`${styles.note} ${styles.noteWarn}`}>
                        empty — generation will fail
                      </span>
                    ) : null}
                  </th>
                  <td className={styles.numeric}>{formatCount(list.wordCount)}</td>
                  <td className={styles.numeric}>{formatCount(list.activityCount)}</td>
                  <td>{formatRelative(list.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

/** Rejected input and other server-side events. */
export function EventLog({ events }) {
  return (
    <Panel
      id="events"
      title="Server event log"
      subtitle="Input the API rejected, and other notable states"
    >
      {events.length === 0 ? (
        <p className={styles.empty}>
          Nothing logged. Rejected input — a duplicate word, an incomplete form —
          appears here as it happens.
        </p>
      ) : (
        <ul className={styles.events}>
          {events.map((event) => (
            <li key={event.id} className={styles[`event_${event.level}`]}>
              <span className={styles.eventLevel}>{event.level}</span>
              <span className={styles.eventBody}>
                <span className={styles.eventMessage}>{event.message}</span>
                <span className={styles.note}>
                  <code>{event.code}</code>
                  {event.source ? ` · ${event.source}` : ''}
                  {event.context?.fields
                    ? ` · ${Object.entries(event.context.fields)
                        .map(([field, message]) => `${field}: ${message}`)
                        .join('; ')}`
                    : ''}
                </span>
              </span>
              <span className={styles.eventTime}>
                {formatRelative(event.createdAt) ?? NO_DATA}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
