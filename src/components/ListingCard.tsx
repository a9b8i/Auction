import React from "react";
import { useCountdown } from "../hooks/useCountdown";
import type { Listing } from "../types";

interface Props {
	listing: Listing;
	isSelected: boolean;
	onClick: () => void;
	// Called once when the countdown reaches zero, letting the parent
	// update the listing's status without a page refresh.
	onExpired?: (id: string) => void;
}

export default function ListingCard({
	listing,
	isSelected,
	onClick,
	onExpired,
}: Props) {
	// The hook ticks a live countdown and reports when the auction has ended.
	const { label, expired, urgent } = useCountdown(listing.endsAt);

	// Derive the visual "closed" state from either the server-side status
	// or the client-side countdown reaching zero.
	const closed = listing.status === "closed" || expired;

	// Notify the parent exactly once when the countdown expires so it can
	// flip the listing to "closed" in its own state.
	const notifiedRef = React.useRef(false);
	React.useEffect(() => {
		if (expired && !notifiedRef.current && listing.status !== "closed") {
			notifiedRef.current = true;
			onExpired?.(listing.id);
		}
	}, [expired, listing.id, listing.status, onExpired]);

	return (
		<div
			className={`listing-card ${isSelected ? "listing-card--selected" : ""} ${closed ? "listing-card--closed" : ""}`}
			onClick={onClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => e.key === "Enter" && onClick()}
		>
			<img
				src={listing.imageUrl}
				alt={listing.title}
				className="listing-card__image"
			/>
			<div className="listing-card__body">
				<span className={`badge badge--${listing.category}`}>
					{listing.category}
				</span>
				<h3 className="listing-card__title">{listing.title}</h3>
				<div className="listing-card__bid">
					Current bid: <strong>${listing.currentBid.toLocaleString()}</strong>
				</div>
				<div
					className={[
						"listing-card__time",
						closed ? "listing-card__time--ended" : "",
						urgent ? "listing-card__time--urgent" : "",
					]
						.filter(Boolean)
						.join(" ")}
				>
					{closed ? "Ended" : label}
				</div>
			</div>
		</div>
	);
}
