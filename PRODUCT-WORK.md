# Product and refactor work

| Work | Decision |
| --- | --- |
| Media identity | Save provider, catalogue ID, release year and creator when known. Distinguish releases from the same provider, and use year and creator to compare records across providers. Keep legacy title-only matches conservative. |
| Repeat experiences | Log again creates a separate entry with its own date, rating and notes, and copies the work details and tags. Discovery samples a work once per set of anchors. |
| Music | Keep albums and individual tracks in the Music category. Search and verify tracks by track ID. A track can anchor track recommendations. |
| Up Next | Use a shared manual queue across formats. Recently moved items join the end once a manual order exists. |
| Low ratings | Give the broad recommender a small sample of low-rated examples. Use them to avoid repeating specific patterns while honoring an explicitly selected seed. |
| Refactor | Separate entry identity, forms, and data loading from the page script. Verify through the existing browser and database suites. |
| Scale | Measure paginated journal payload and Discovery latency before changing the database retrieval model. |

## Measurements and verification

Local benchmark with synthetic complete entry rows, full application
pagination, and a title sort over a three-tag filter (35 runs, five warmups):

| Journal size | Page requests | Uncompressed JSON | Median filter and sort |
| ---: | ---: | ---: | ---: |
| 500 | 2 | 283 KB | 0.3 ms |
| 2,000 | 5 | 1.13 MB | 0.8 ms |
| 5,000 | 11 | 2.84 MB | 2.0 ms |

The transfer and round trips are the likely scale concern. This is a local
CPU and payload benchmark. It does not measure hosted Supabase time or Claude
latency. Discovery now exposes timings for history, recommendation generation
and catalogue verification in the response so those phases can be measured
against real staging libraries before changing query architecture.

Legacy rows retain their original contents. Catalogue identity is captured
when a search result is picked, when a verified recommendation is saved, or
when a known work is logged again. No speculative matches are added to old
rows. Different editions with different IDs remain distinguishable within a
provider. Cross-provider identity depends on available year and creator.
Queue reorders validate current membership before writing. Existing Watchlist
items without a manual position follow explicitly ordered items.

Run migration 008 in the staging project before publishing the frontend and
Discovery API, then verify the hosted paths. Use **Discover → Compare picks → Test the low-rating signal** to check
whether the signal improves your picks. Eligibility requires a low rating at
4/10 or below and a favorite at 7/10 or above in the same format. Both runs
share the same account snapshot, favorite anchors, model and catalogue
verification. Shared picks are dropped and each format contributes the same
number of picks to both sets. Check which items you'd try, which you already
know and whether each reason fits. Choose a set before revealing the methods.
Treat each small batch as one observation. Repeated feedback is needed to
judge the effect. An ineligible library uses no provider requests.

For a live timing sample, open **Latest media request timing** on Discover
after a fresh media batch. This records the history, model, and catalogue
verification phases from the server response.
