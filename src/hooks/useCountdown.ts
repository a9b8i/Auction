import { useEffect, useState } from "react";


 // Calculates the milliseconds remaining until `endsAt`.
 // Returns 0 when the deadline has passed (never negative).
function msRemaining(endsAt: string): number {
	return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

/*
 * Format thresholds:
 * - >= 1 day   → "2d 5h"       (days + hours, coarse granularity for distant auctions)
 * - >= 1 hour  → "3h 12m"      (hours + minutes)
 * - >= 1 min   → "7m 30s"      (minutes + seconds for the final stretch)
 * - < 1 min    → "45s"         (seconds only — creates urgency)
 * - 0          → "Ended"       (auction has closed)
 */
function formatRemaining(ms: number): string {
	if (ms <= 0) return "Ended";

	const seconds = Math.floor(ms / 1_000) % 60;
	const minutes = Math.floor(ms / 60_000) % 60;
	const hours = Math.floor(ms / 3_600_000) % 24;
	const days = Math.floor(ms / 86_400_000);

	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

interface CountdownResult {
	// Human-readable time remaining string */
	label: string;
	// true once the deadline has passed */
	expired: boolean;
	// true when less than 5 minutes remain (useful for urgency styling) */
	urgent: boolean;
}

/*
 * Custom hook that ticks a live countdown to `endsAt`.
 *
 * Tick interval adapts to the remaining time to avoid unnecessary re-renders:
 * - > 1 hour  → tick every 60 s  (only minutes matter at this scale)
 * - > 10 s    → tick every 1 s   (seconds are now visible)
 * - <= 10 s   → tick every 1 s   (same, but kept explicit for clarity)
 * - expired   → no interval      (clears the timer to stop re-renders)
 *
 * The interval is cleaned up on unmount and whenever `endsAt` changes,
 * preventing memory leaks when cards are removed from the DOM.
 */
export function useCountdown(endsAt: string): CountdownResult {
	const [remaining, setRemaining] = useState(() => msRemaining(endsAt));

	useEffect(() => {
		// Immediately sync in case `endsAt` changed since initial render.
		const ms = msRemaining(endsAt);
		setRemaining(ms);

		// If already expired, no need to start an interval.
		if (ms <= 0) return;

		// Choose a tick rate proportional to the display granularity:
		// when showing days/hours, a per-minute tick is sufficient;
		// when showing seconds, tick every second.
		const tickMs = ms > 3_600_000 ? 60_000 : 1_000;

		const id = setInterval(() => {
			const now = msRemaining(endsAt);
			setRemaining(now);

			// Stop ticking once the auction ends to prevent useless updates.
			if (now <= 0) clearInterval(id);
		}, tickMs);

		// Cleanup: clear the interval when the component unmounts or `endsAt`
		// changes (e.g. the card is re-used for a different listing).
		return () => clearInterval(id);
	}, [endsAt]);

	return {
		label: formatRemaining(remaining),
		expired: remaining <= 0,
		// 5-minute threshold for the "urgent" visual cue.
		urgent: remaining > 0 && remaining <= 5 * 60_000,
	};
}
