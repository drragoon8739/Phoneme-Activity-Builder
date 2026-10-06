#!/usr/bin/env bash
#
# Runs the load test at each traffic level in turn and collects the results.
#
#   ./tests/load/run-levels.sh                 # 1, 10, 100, 1000
#   ./tests/load/run-levels.sh 1 10 100        # just those levels
#
# Each level writes a .jtl of raw samples and an HTML report, so the levels can
# be compared side by side afterwards — which is the point of the exercise.
# Comparing one level against nothing tells you nothing about how the system
# scales.
#
# On the 10000 level: that is far more concurrency than a laptop can generate
# honestly. JMeter needs roughly a megabyte of heap per thread, so ten thousand
# threads means around 10 GB before the application under test gets any memory
# at all, and the numbers you would collect would measure JMeter running out of
# room rather than the server struggling. If your machine cannot do it, run the
# levels it can, say so, and explain the bottleneck — that is a better answer
# than a graph built from a load generator that was itself the slowest part.

set -euo pipefail

cd "$(dirname "$0")/../.."

PLAN="tests/load/phoneme-builder-load.jmx"
OUT="tests/load/results"
HOST="${HOST:-localhost}"
PORT="${PORT:-3000}"
LOOPS="${LOOPS:-5}"

LEVELS=("$@")
if [ ${#LEVELS[@]} -eq 0 ]; then
  LEVELS=(1 10 100 1000)
fi

if ! command -v jmeter >/dev/null 2>&1; then
  echo "jmeter not found on PATH."
  echo "Install it (https://jmeter.apache.org/download_jmeter.cgi) and add its bin/ directory to PATH."
  exit 1
fi

# Fail fast if the application is not up, rather than producing a report full
# of connection refusals that looks like a performance result.
if ! curl -fsS "http://${HOST}:${PORT}/health" >/dev/null; then
  echo "The app is not responding at http://${HOST}:${PORT}/health"
  echo "Start it first:  npm run dev    (or  docker compose up)"
  exit 1
fi

mkdir -p "$OUT"

printf '%-8s %-10s %-10s %s\n' "LEVEL" "SAMPLES" "ERRORS" "RESULTS"

for USERS in "${LEVELS[@]}"; do
  # Writers are a tenth of readers, minimum one: every write stores a row, and
  # the dashboard has to stay readable afterwards.
  WRITE=$(( USERS / 10 ))
  [ "$WRITE" -lt 1 ] && WRITE=1

  # Ramp proportionally so a level does not open every connection at once;
  # a thundering herd measures the TCP accept queue, not the application.
  RAMP=$(( USERS / 20 ))
  [ "$RAMP" -lt 1 ] && RAMP=1

  JTL="${OUT}/level-${USERS}.jtl"
  REPORT="${OUT}/report-${USERS}"
  rm -rf "$JTL" "$REPORT"

  jmeter -n -t "$PLAN" \
    -Jhost="$HOST" -Jport="$PORT" \
    -Jusers="$USERS" -JwriteUsers="$WRITE" \
    -Jloops="$LOOPS" -JrampSeconds="$RAMP" \
    -l "$JTL" -e -o "$REPORT" \
    > "${OUT}/level-${USERS}.log" 2>&1 || {
      echo "level ${USERS} failed — see ${OUT}/level-${USERS}.log"
      continue
    }

  SAMPLES=$(( $(wc -l < "$JTL") - 1 ))
  ERRORS=$(awk -F, 'NR>1 && $8=="false"' "$JTL" | wc -l | tr -d ' ')
  printf '%-8s %-10s %-10s %s\n' "x${USERS}" "$SAMPLES" "$ERRORS" "$REPORT/index.html"
done

echo
echo "Open any report's index.html for response times, throughput and error rate."
echo "Compare the levels to see where latency starts to climb."
