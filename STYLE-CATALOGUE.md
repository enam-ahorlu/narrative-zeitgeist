# Style & Scent catalogue checklist

- [x] Inventory the existing catalogues and saved-item fields.
- [x] Add 60 named wardrobe products across clothing, footwear, jewelry, bags and other accessories. Keep generic choices available when logging personal items.
- [x] Include distinct loafer models, including Dr. Martens Adrian tassel loafers, G.H.Bass Larson penny loafers, Gucci Jordaan horsebit loafers, Sebago Classic Dan penny loafers and a photographed vintage Tod’s pair.
- [x] Add Jewelry as a category and a category filter in Discover Style. Make Discover and the entry pickers searchable by product and brand together.
- [x] Add eight fragrances and expand bottle artwork from three entries to 12. Add 18 wardrobe photographs, with at least one across each of the ten named-product categories.
- [x] Show available photos in Discovery, autocomplete, and saved collections. Preserve custom HTTPS photo links through saves and edits.
- [x] Verify catalogue identities and licenses, local image decoding, product and category search, and desktop and mobile workflows.
- [x] Add 22 wardrobe images and 20 bottle images in the second pass.
- [x] Increase Discover Style to at least 120 named products, with additions across all ten categories.
- [x] Add 28 named fragrances, including distinct concentrations and archived bottles.
- [x] Add five images for existing products and add manufacturer page links.
- [ ] Continue sourcing reusable photos for the remaining products, including the Adrian loafers. A Product page link is available for selected items.

## Catalogue data and photos

| Catalogue | Entries | With photos |
| --- | ---: | ---: |
| Named wardrobe products | 130 | 43 |
| Fragrances | 327 | 34 |

The second pass increased Wardrobe from 60 to 130 named products and fragrance
from 299 to 327 entries. Discover Style uses the named products. The Wardrobe entry picker also retains 93 generic pieces for logging
custom items. Brand and model identify a photo, so separate editions and
colourways can have different images. Owned and Wishlisted items stay in
Wardrobe. Discovery suggests products the account has yet to save.

Most credited images are bundled as resized WebP files. The two existing
external bottle images for CK One and Coco Mademoiselle still use Wikimedia.
Each photo entry records its original source, photographer and reuse license
in `catalogues/fragrances.js` or `catalogues/wardrobe.js`. Product and bottle
photos come from [Wikimedia Commons](https://commons.wikimedia.org/) and
the [RISD Museum collection](https://risdmuseum.org/art-design/collection/sweater-and-skirt-set-200926).
Images retain their source licenses. For a new photo, verify the pictured
model, concentration or colourway, record the credit and license, and use a
local thumbnail where possible.

The [Adrian](https://www.drmartens.com/us/en/adrian-smooth-leather-tassel-loafers-black/p/14573001),
[Larson](https://www.ghbass.com/products/men-larson-weejuns-penny-loafer-black)
and [Jordaan](https://www.gucci.com/us/en/pr/men/shoes-for-men/loafers-moccasins-for-men/mens-gucci-jordaan-loafer-p-A00CY6BLM002819)
cards link to their official pages. Unphotographed Discovery products use
initials. Wardrobe and fragrance forms accept an optional personal image URL.
Photo URLs are stored with existing private saved-item details. This change
requires no database migration.


## Second-pass sources and gaps

New records include products from
[AAKS](https://www.aaksonline.com/shop/p/baw-pot-natural),
[Filson](https://www.filson.com/products/rugged-twill-original-briefcase-tan),
and the [Smithsonian’s Cartier collection](https://naturalhistory.si.edu/explore/collections/geogallery/10002691).
Fragrance additions include archival bottles, [Rabanne’s 1 Million Parfum](https://www.rabanne.com/ww/en/fragrance/p/1-million-parfum--000000000065156001_BASE),
[Nishane’s X collection](https://nishane.com/product/hacivat-x/),
and [Amouage’s Outlands](https://amouage.com/en-uk/products/new-outlands).
Bottles are matched by house and edition. For example, 1 Million Parfum and
the original 1 Million are separate entries.

The remaining gap is access to reusable exact-match photographs. Download
rate limits also blocked some verified sources, including the images found
for Mitsouko, Opium Pour Homme, Obsession for Men and Red Wing Iron Ranger
8111. The Adrian loafers still link to the manufacturer’s photo.


## Photo sourcing playbook

1. Start with an unphotographed product already in the catalogue. Record the
   house or brand, model, concentration, edition and colourway you can verify.
   For footwear, check logos, silhouette and SKU when available. A source filename
   can be less specific than the pictured model.
2. Search Wikimedia Commons categories by brand and model. Check the file page
   and the original photographer source. Open collections such as the
   [RISD Museum](https://risdmuseum.org/art-design/collection/sweater-and-skirt-set-200926)
   and [Smithsonian Open Access](https://www.si.edu/openaccess) are useful for
   archival garments, jewelry, and perfume bottles. Select the exact object and
   verify the image-specific rights statement. An open licence or permission
   determines whether an image can be bundled. Attribution records the source.
3. Use the photographer’s original copy or an approved standard thumbnail where
   it is available. Wikimedia rate limits again blocked some earlier leads.
   Keep the verified source on this checklist for a later pass. Skip images
   that have an uncertain edition or unclear photographer permission. For
   example, the available Terre d’Hermès photograph depicts the Parfum and the
   Lacoste polo photo does not verify the L.12.12 model.
4. Resize the exact image to a lightweight WebP under `catalogues/photos/`.
   Add the normalized product name and maker key in `WARDROBE_PHOTOS` or
   `FRAGRANCE_PHOTOS` with `url`, `source`, `credit` and `license`.
   Supply optional `alt` when an image shows packaging or a detail.
   Run the catalogue tests and verify the image after scrolling to the card.
5. If an official page shows the product but does not offer a reusable image,
   add its link to the relevant product link map. Discovery exposes it as
   **Product page**. The latest pass includes official links for Dior Sauvage EDT,
   Bleu de Chanel EDP, Mitsouko, Lacoste and Red Wing.
6. For a missing exact match, a person who owns the product can use their own
   HTTPS photo URL on their saved record. A contributor who wants a photo in the
   shared catalogue can submit the model, credit and written permission or an
   explicit open licence for their own image. Brand press images and licensed
   feeds are further options when the terms cover this app’s use.

The latest in-app additions are Acqua di Parma Colonia, Dior Sauvage EDT
packaging, Nike Air Force 1 Low, Ray-Ban RB3025 Aviator and the Wrangler 13MWZ
denim detail. Named product totals stayed at 130 and 327 during this pass.
