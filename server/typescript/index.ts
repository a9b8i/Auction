import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import express, { type Request, type Response } from "express";

const PORT = 3001;
const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================
// Types
// ============================================================

type Category = "tractor" | "combine" | "implement" | "attachment";
type Status = "active" | "closed" | "pending";

interface Listing {
	id: string;
	title: string;
	description: string;
	category: Category;
	startingPrice: number;
	currentBid: number;
	currentBidder: string | null;
	status: Status;
	endsAt: string;
	imageUrl: string;
}

interface BidRequest {
	bidder: string;
	amount: number;
}

interface CreateListingRequest {
	title: string;
}

// A record of a single bid placed on a listing. Stored in-memory and keyed
// by listing ID so we can return the full bid history for any auction.
interface BidRecord {
	id: string;
	listingId: string;
	bidder: string;
	amount: number;
	timestamp: string; // ISO-8601 UTC
}

// ============================================================
// In-memory store — seeded from data/listings.json
// ============================================================

const listings: Listing[] = JSON.parse(
	readFileSync(join(__dirname, "data", "listings.json"), "utf-8"),
);

// In-memory bid history, keyed by listing ID.
// Using a Map gives O(1) lookup per listing and keeps each listing's bids
// in insertion order (oldest → newest); the GET endpoint reverses before responding.
const bidHistory = new Map<string, BidRecord[]>();

// ============================================================
// App
// ============================================================

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// GET /api/listings
app.get("/api/listings", (_req: Request, res: Response) => {
	res.json(listings);
});

// POST /api/listings
app.post("/api/listings", (req: Request, res: Response) => {
	const { title } = req.body as CreateListingRequest;

	if (!title || typeof title !== "string" || title.trim() === "") {
		return res.status(400).json({ error: "Title is required" });
	}

	const listing: Listing = {
		id: randomUUID(),
		title: title.trim(),
		description: "",
		category: "implement",
		startingPrice: 0,
		currentBid: 0,
		currentBidder: null,
		status: "active",
		endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		imageUrl: "",
	};

	listings.push(listing);
	return res.status(201).json(listing);
});

// GET /api/listings/:id
app.get("/api/listings/:id", (req: Request, res: Response) => {
	const listing = listings.find((l) => l.id === req.params.id);
	if (!listing) {
		return res.status(404).json({ error: "Listing not found" });
	}
	return res.json(listing);
});

// POST /api/listings/:id/bids
app.post("/api/listings/:id/bids", (req: Request, res: Response) => {
	const listing = listings.find((l) => l.id === req.params.id);
	if (!listing) {
		return res.status(404).json({ error: "Listing not found" });
	}

	if (listing.status !== "active") {
		return res
			.status(400)
			.json({ error: "This listing is not currently active" });
	}

	const bid = req.body as BidRequest;

	if (
		!bid.bidder ||
		typeof bid.bidder !== "string" ||
		bid.bidder.trim() === ""
	) {
		return res.status(400).json({ error: "Bidder name is required" });
	}

	if (typeof bid.amount !== "number" || isNaN(bid.amount) || bid.amount <= 0) {
		return res
			.status(400)
			.json({ error: "Bid amount must be a positive number" });
	}

	// FIX: Was `>=` which rejected valid (higher) bids. Correct operator is `<=`
	if (bid.amount <= listing.currentBid) {
		return res.status(400).json({
			error: `Bid must be greater than the current bid of $${listing.currentBid.toLocaleString()}`,
		});
	}

	listing.currentBid = bid.amount;
	listing.currentBidder = bid.bidder.trim();

	// Record the bid in history so it can be retrieved via GET /api/listings/:id/bids.
	const record: BidRecord = {
		id: randomUUID(),
		listingId: listing.id,
		bidder: bid.bidder.trim(),
		amount: bid.amount,
		timestamp: new Date().toISOString(),
	};
	if (!bidHistory.has(listing.id)) {
		bidHistory.set(listing.id, []);
	}
	bidHistory.get(listing.id)!.push(record);

	return res.status(201).json(listing);
});

// GET /api/listings/:id/bids
// Returns the bid history for a single listing in reverse chronological order
// (newest bid first). Returns 404 if the listing doesn't exist, or an empty
// array (200) if the listing exists but has received no bids yet.
app.get("/api/listings/:id/bids", (req: Request, res: Response) => {
	const listing = listings.find((l) => l.id === req.params.id);
	if (!listing) {
		return res
			.status(404)
			.json({ error: `Listing with id "${req.params.id}" not found` });
	}

	// Return bids newest-first; default to an empty array for listings with no bids.
	const bids = bidHistory.get(listing.id) ?? [];
	return res.json([...bids].reverse());
});

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
