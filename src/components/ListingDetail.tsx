import { useState } from "react";
import { getBidHistory } from "../api/listings";
import BidForm from "./BidForm";
import type { Bid, Listing } from "../types";

interface Props {
	listing: Listing;
	onBidSuccess: (updated: Listing) => void;
}

function formatDate(iso: string): string {
	return new Date(iso).toLocaleString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function ListingDetail({ listing, onBidSuccess }: Props) {
	const [bids, setBids] = useState<Bid[]>([]);
	const [showHistory, setShowHistory] = useState(false);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyError, setHistoryError] = useState<string | null>(null);

	const toggleHistory = async () => {
		if (showHistory) {
			setShowHistory(false);
			return;
		}
		setHistoryLoading(true);
		setHistoryError(null);
		try {
			const data = await getBidHistory(listing.id);
			console.log(data)
			setBids(data);
			setShowHistory(true);
		} catch (err) {
			setHistoryError(
				err instanceof Error ? err.message : "Failed to load bid history",
			);
		} finally {
			setHistoryLoading(false);
		}
	};

	return (
		<div className="listing-detail">
			<img
				src={listing.imageUrl}
				alt={listing.title}
				className="listing-detail__image"
			/>
			<div className="listing-detail__header">
				<span className={`badge badge--${listing.category}`}>
					{listing.category}
				</span>
				<span className={`status-badge status-badge--${listing.status}`}>
					{listing.status}
				</span>
			</div>
			<h2 className="listing-detail__title">{listing.title}</h2>
			<p className="listing-detail__description">{listing.description}</p>

			<div className="listing-detail__meta">
				<div className="meta-row">
					<span className="meta-label">Starting Price</span>
					<span className="meta-value">
						${listing.startingPrice.toLocaleString()}
					</span>
				</div>
				<div className="meta-row">
					<span className="meta-label">Current Bid</span>
					<span className="meta-value meta-value--highlight">
						${listing.currentBid.toLocaleString()}
					</span>
				</div>
				<div className="meta-row">
					<span className="meta-label">Current Bidder</span>
					<span className="meta-value">
						{listing.currentBidder ?? "No bids yet"}
					</span>
				</div>
				<div className="meta-row">
					<span className="meta-label">Auction Ends</span>
					<span className="meta-value">{formatDate(listing.endsAt)}</span>
				</div>
			</div>

			{listing.status === "active" && (
				<BidForm listing={listing} onBidSuccess={onBidSuccess} />
			)}

			<button
				type="button"
				className="bid-history__toggle"
				onClick={toggleHistory}
				disabled={historyLoading}
			>
				{historyLoading
					? "Loading…"
					: showHistory
						? "Hide Bid History"
						: "Show Bid History"}
			</button>

			{historyError && (
				<div className="state-message state-message--error">
					{historyError}
				</div>
			)}

			{showHistory && (
				<div className="bid-history">
					{bids.length === 0 ? (
						<p className="bid-history__empty">No bids have been placed yet.</p>
					) : (
						<table className="bid-history__table">
							<thead>
								<tr>
									<th>Bidder</th>
									<th>Amount</th>
									<th>Time</th>
								</tr>
							</thead>
							<tbody>
								{bids.map((bid) => (
									<tr key={bid.id}>
										<td>{bid.bidder}</td>
										<td>${bid.amount.toLocaleString()}</td>
										<td>{formatDate(bid.timestamp)}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
			)}
		</div>
	);
}
