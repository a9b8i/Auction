export interface Listing {
	id: string;
	title: string;
	description: string;
	category: "tractor" | "combine" | "implement" | "attachment";
	startingPrice: number;
	currentBid: number;
	currentBidder: string | null;
	status: "active" | "closed" | "pending";
	endsAt: string;
	imageUrl: string;
}

// Mirrors the BidRecord returned by GET /api/listings/:id/bids.
export interface Bid {
	id: string;
	listingId: string;
	bidder: string;
	amount: number;
	timestamp: string;
}
