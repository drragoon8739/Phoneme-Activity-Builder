'use client';

import { useId, useMemo, useState } from 'react';

import { formatDayLabel } from '@/lib/format';
import styles from './GenerationTrend.module.css';

/**
 * Daily generation attempts, stacked by outcome.
 *
 * A stacked bar rather than two lines: the total height is "attempts that
 * day", which is the figure a teacher actually scans for, and the split
 * answers "how many of those worked" without needing a second axis.
 *
 * Identity is never carried by colour alone — there is a legend, the tooltip
 * names each series, and a table view holds the same numbers for anyone using
 * a screen reader or printing in greyscale.
 */

const VIEW_W = 720;
const VIEW_H = 240;
const PAD = { top: 16, right: 12, bottom: 34, left: 38 };
const SEGMENT_GAP = 2; // surface showing between stacked segments
const CORNER = 4;

/** Rect path with only the top two corners rounded. */
function topRoundedPath(x, y, width, height, radius) {
  if (height <= 0) return '';
  const r = Math.min(radius, width / 2, height);
  return [
    `M ${x} ${y + height}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height}`,
    'Z',
  ].join(' ');
}

/** Gridline values that land on whole numbers — counts are never fractional. */
function niceTicks(max) {
  if (max <= 0) return [0, 1];
  const target = 4;
  const rawStep = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? magnitude * 10;

  const ticks = [];
  for (let value = 0; value <= max + step / 2; value += step) ticks.push(Math.round(value));
  return ticks;
}

export default function GenerationTrend({ trend, windowDays }) {
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  const { bands, ticks, maxTick, totals } = useMemo(() => {
    const max = Math.max(1, ...trend.map((d) => d.successful + d.failed));
    const tickValues = niceTicks(max);
    const top = tickValues[tickValues.length - 1];

    const plotW = VIEW_W - PAD.left - PAD.right;
    const plotH = VIEW_H - PAD.top - PAD.bottom;
    const bandW = plotW / Math.max(trend.length, 1);
    const barW = Math.max(4, Math.min(28, bandW * 0.62));

    const scale = (value) => (value / top) * plotH;

    const computed = trend.map((day, index) => {
      const bandX = PAD.left + bandW * index;
      const x = bandX + (bandW - barW) / 2;

      const successH = scale(day.successful);
      const failedH = scale(day.failed);
      const baseline = PAD.top + plotH;

      // The failed segment sits on top of the successful one, separated by a
      // sliver of surface so adjoining fills never read as a single block.
      const successY = baseline - successH;
      const failedY = successY - failedH - (successH > 0 && failedH > 0 ? SEGMENT_GAP : 0);

      return {
        ...day,
        index,
        bandX,
        bandW,
        x,
        barW,
        successY,
        successH,
        failedY,
        failedH,
        baseline,
        total: day.successful + day.failed,
        centre: ((bandX + bandW / 2) / VIEW_W) * 100,
      };
    });

    return {
      bands: computed,
      ticks: tickValues,
      maxTick: top,
      totals: {
        successful: trend.reduce((sum, d) => sum + d.successful, 0),
        failed: trend.reduce((sum, d) => sum + d.failed, 0),
      },
    };
  }, [trend]);

  const plotH = VIEW_H - PAD.top - PAD.bottom;
  const hasData = totals.successful + totals.failed > 0;
  const activeBand = active === null ? null : bands[active];

  const summary = `Generation attempts over the last ${windowDays} days: ${totals.successful} successful and ${totals.failed} failed.`;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title} id={titleId}>
            Generation activity
          </h3>
          <p className={styles.sub}>Attempts per day, last {windowDays} days</p>
        </div>

        <div className={styles.controls}>
          <ul className={styles.legend}>
            <li>
              <span className={`${styles.swatch} ${styles.swatchSuccess}`} aria-hidden="true" />
              Successful
            </li>
            <li>
              <span className={`${styles.swatch} ${styles.swatchFailed}`} aria-hidden="true" />
              Failed
            </li>
          </ul>

          <button
            type="button"
            className={styles.toggle}
            onClick={() => setShowTable((value) => !value)}
            aria-expanded={showTable}
          >
            {showTable ? 'Show chart' : 'Show as table'}
          </button>
        </div>
      </div>

      {showTable ? (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <caption className="sr-only">{summary}</caption>
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Successful</th>
                <th scope="col">Failed</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {bands.map((day) => (
                <tr key={day.date}>
                  <th scope="row">{formatDayLabel(day.date)}</th>
                  <td>{day.successful}</td>
                  <td>{day.failed}</td>
                  <td>{day.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.plot}>
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className={styles.svg}
            role="img"
            aria-labelledby={titleId}
            aria-describedby={`${titleId}-desc`}
            onMouseLeave={() => setActive(null)}
          >
            <desc id={`${titleId}-desc`}>{summary}</desc>

            {ticks.map((tick) => {
              const y = PAD.top + plotH - (tick / maxTick) * plotH;
              return (
                <g key={tick}>
                  <line
                    x1={PAD.left}
                    x2={VIEW_W - PAD.right}
                    y1={y}
                    y2={y}
                    className={styles.grid}
                  />
                  <text x={PAD.left - 8} y={y + 4} className={styles.tickLabel}>
                    {tick}
                  </text>
                </g>
              );
            })}

            {bands.map((day) => (
              <g key={day.date}>
                {/* Full-height hit target: a 3px-tall bar would otherwise be
                    almost impossible to hover.

                    Pointer-only on purpose. Making each of fourteen bands a
                    tab stop would put fourteen stops between the reader and
                    the next control for information they can get in one press
                    of "Show as table" — which is the keyboard and screen
                    reader path to these numbers, and holds all of them. */}
                <rect
                  x={day.bandX}
                  y={PAD.top}
                  width={day.bandW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setActive(day.index)}
                />
                {active === day.index ? (
                  <rect
                    x={day.bandX}
                    y={PAD.top}
                    width={day.bandW}
                    height={plotH}
                    className={styles.bandHighlight}
                    pointerEvents="none"
                  />
                ) : null}

                {day.successH > 0 ? (
                  <path
                    d={topRoundedPath(
                      day.x,
                      day.successY,
                      day.barW,
                      day.successH,
                      day.failedH > 0 ? 0 : CORNER,
                    )}
                    className={styles.barSuccess}
                    pointerEvents="none"
                  />
                ) : null}

                {day.failedH > 0 ? (
                  <path
                    d={topRoundedPath(day.x, day.failedY, day.barW, day.failedH, CORNER)}
                    className={styles.barFailed}
                    pointerEvents="none"
                  />
                ) : null}
              </g>
            ))}

            <line
              x1={PAD.left}
              x2={VIEW_W - PAD.right}
              y1={PAD.top + plotH}
              y2={PAD.top + plotH}
              className={styles.axis}
            />

            {bands.map((day, index) => {
              // Label roughly six days to avoid a crowded axis, always
              // including the last so "today" is anchored.
              const every = Math.max(1, Math.ceil(bands.length / 6));
              const show = index % every === 0 || index === bands.length - 1;
              if (!show) return null;
              return (
                <text
                  key={day.date}
                  x={day.bandX + day.bandW / 2}
                  y={VIEW_H - 12}
                  className={styles.dayLabel}
                >
                  {formatDayLabel(day.date)}
                </text>
              );
            })}
          </svg>

          {activeBand ? (
            <div
              className={styles.tooltip}
              style={{ left: `${activeBand.centre}%` }}
              role="status"
            >
              <p className={styles.tooltipDate}>{formatDayLabel(activeBand.date)}</p>
              <p>
                <span className={`${styles.swatch} ${styles.swatchSuccess}`} aria-hidden="true" />
                {activeBand.successful} successful
              </p>
              <p>
                <span className={`${styles.swatch} ${styles.swatchFailed}`} aria-hidden="true" />
                {activeBand.failed} failed
              </p>
            </div>
          ) : null}

          {!hasData ? (
            <p className={styles.empty}>
              No generation attempts recorded in this window yet.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
