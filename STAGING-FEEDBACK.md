# Staging feedback checklist

- [x] Make tag search understand formats and aliases, with format-specific, shared and universal tags. Keep the full list available and add mystery, cliffhanger, espionage and related tags.
- [x] Explain how tags affect Taste Fingerprint and each Discovery mode.
- [x] Allow More like this to return to an empty starting selection and leave For You independent.
- [x] Clear the notes and other new-entry fields between entries while preserving edit and prefill workflows.
- [x] Add a visible Discovery refresh and handle exhausted lists, browsing history and previously saved or dismissed picks.
- [x] Show a useful similarity signal without suggesting a calibrated probability of enjoyment.
- [x] Include fragrance and wardrobe picks in Discover All, with direct status actions.
- [x] Integrate fragrances and wardrobe into Taste Fingerprint and show fragrance artwork where available.
- [x] Make Design System controls reflect what they change, and verify that theme, accent and density apply and persist.
- [x] Make Watchlist priority editable so items can move between Maybe and Up Next.

## How recommendations use tags

Taste Fingerprint ranks media tags by their frequency and average rating.
Grounded media Discovery sends up to eight tags per sampled favorite to Claude
alongside its title, rating and completion date. It also sends a bounded list
of titles to avoid, drawn from saved entries, the watchlist, dismissals and
recently shown picks. Journal notes stay out of the prompt.

For You, Hidden Gems and New releases use up to three distinct works rated at
least 7/10 per relevant format. Refresh rotates the sample when a format has
more eligible works. More like this uses the one entry you choose and has a
clear action. The refresh history is scoped to the current signed-in session.
The server continues to exclude saved and dismissed titles across sessions.

Close match requires at least two suggested shared tags and an anchor rated
8/10 or higher. Shared taste indicates some suggested overlap, and Explore
indicates an editorial connection without a shared-tag signal. The title is
checked against its source catalogue. The editorial comparison and suggested
tag overlap are model judgments. There is no estimated enjoyment probability.

Fragrance and wardrobe picks use their local catalogues and separate saved
profiles. Scent features include notes, character, season, projection and
house. Wardrobe features include style tags, occasions, categories and season.

## Fragrance photos

The built-in catalogue previously held text metadata only. Bottle images
with attribution now cover CK One, Coco Mademoiselle and Eau Sauvage.
Remaining entries can use a personal HTTPS bottle photo URL and display
initials when a photo is unavailable. Source and licensing are linked from
each built-in photo.
