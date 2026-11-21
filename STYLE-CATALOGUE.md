# Style & Scent catalogue checklist

- [x] Inventory the existing catalogues and saved-item fields.
- [x] Add 60 named wardrobe products across clothing, footwear, jewelry, bags and other accessories. Keep generic choices available when logging personal items.
- [x] Include distinct loafer models, including Dr. Martens Adrian tassel loafers, G.H.Bass Larson penny loafers, Gucci Jordaan horsebit loafers, Sebago Classic Dan penny loafers and a photographed vintage Tod’s pair.
- [x] Add Jewelry as a category and a category filter in Discover Style. Make Discover and the entry pickers searchable by product and brand together.
- [x] Add eight fragrances and expand bottle artwork from three entries to 12. Add 18 wardrobe photographs, with at least one across each of the ten named-product categories.
- [x] Show available photos in Discovery, autocomplete, and saved collections. Preserve custom HTTPS photo links through saves and edits.
- [x] Verify catalogue identities and licenses, local image decoding, product and category search, and desktop and mobile workflows.
- [ ] Extend exact-product photo coverage as more reusable photographs become available, including for the Adrian loafers. A Product page link is available for selected items.

## Catalogue data and photos

The fragrance catalogue has 299 entries. Discover Style uses the 60 named
products. The Wardrobe entry picker also retains 93 generic pieces for logging
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
