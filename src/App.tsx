import { useEffect, useState, useCallback } from "react";
import { getListings } from "./api/listings";
import CreateListingForm from "./components/CreateListingForm";
import ListingCard from "./components/ListingCard";
import ListingDetail from "./components/ListingDetail";
import type { Listing } from "./types";

const PAGE_SIZE = 6;

export default function App() {
	const [listings, setListings] = useState<Listing[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Pagination state
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const [hasMore, setHasMore] = useState(false);

	const fetchPage = useCallback((p: number) => {
		setLoading(true);
		setError(null);
		getListings(p, PAGE_SIZE)
			.then((res) => {
				setListings(res.data);
				setPage(res.page);
				setTotalPages(res.totalPages);
				setTotal(res.total);
				setHasMore(res.hasMore);
			})
			.catch((err) =>
				setError(
					err instanceof Error ? err.message : "Failed to load listings",
				),
			)
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		fetchPage(1);
	}, [fetchPage]);

	const selectedListing = listings.find((l) => l.id === selectedId) ?? null;

	const handleBidSuccess = (updated: Listing) => {
		setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
	};

	const handleListingCreated = (listing: Listing) => {
		// New listings are appended to the store, navigate to the last page
		// to make the new listing visible.
		const newTotal = total + 1;
		const lastPage = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
		fetchPage(lastPage);
		setSelectedId(listing.id);
		setShowCreateForm(false);
	};

	return (
		<div className="app">
			<header className="app-header">
				<h1>Interview Auctions</h1>
				<p className="app-header__subtitle">Farm Equipment Marketplace</p>
			</header>
			<div className="app-body">
				<aside className="panel panel--left">
					<div className="panel__heading-row">
						<h2 className="panel__heading">Listings</h2>
						<button
							type="button"
							className="panel__heading-action"
							onClick={() => {
								setShowCreateForm(true);
								setSelectedId(null);
							}}
						>
							+ New
						</button>
					</div>
					{loading && <div className="state-message">Loading listings…</div>}
					{error && (
						<div className="state-message state-message--error">{error}</div>
					)}
					{!loading && !error && (
						<>
							<div className="listing-grid">
								{listings.map((listing) => (
									<ListingCard
										key={listing.id}
										listing={listing}
										isSelected={listing.id === selectedId}
										onClick={() => setSelectedId(listing.id)}
									/>
								))}
							</div>
							{totalPages > 1 && (
								<div className="pagination">
									<button
										type="button"
										className="pagination__btn"
										disabled={page <= 1}
										onClick={() => fetchPage(page - 1)}
									>
										Previous
									</button>
									<span className="pagination__info">
										Page {page} of {totalPages}
									</span>
									<button
										type="button"
										className="pagination__btn"
										disabled={!hasMore}
										onClick={() => fetchPage(page + 1)}
									>
										Next
									</button>
								</div>
							)}
						</>
					)}
				</aside>
				<main className="panel panel--right">
					{showCreateForm ? (
						<CreateListingForm onSuccess={handleListingCreated} />
					) : selectedListing ? (
						<ListingDetail
							listing={selectedListing}
							onBidSuccess={handleBidSuccess}
						/>
					) : (
						<div className="empty-state">
							<p>Select a listing to view details and place a bid.</p>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}
