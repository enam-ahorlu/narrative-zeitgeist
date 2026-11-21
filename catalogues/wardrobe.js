/* Named products for Discovery. The full list also supports manual entry. */
const WARD_PRODUCTS = [
  ["Adrian Smooth Leather Tassel Loafers","Shoes","Dr. Martens","heritage, chunky, leather","smart casual, everyday","Year-round","A kiltie and tassels give this lug-soled slip-on more texture than a plain penny loafer."],
  ["Larson Weejuns Penny Loafers","Shoes","G.H.Bass","preppy, heritage, classic","smart casual, workwear","Year-round","A low-profile penny strap pairs with chinos, denim or a casual suit."],
  ["Jordaan Horsebit Loafers","Shoes","Gucci","tailored, classic, quiet luxury","formal, smart casual","Year-round","A slim leather loafer with metal horsebit hardware."],
  ["Classic Dan Penny Loafers","Shoes","Sebago","preppy, heritage, classic","everyday, smart casual","Year-round","An apron toe and penny saddle for a traditional collegiate look."],
  ["Wallabee Suede","Shoes","Clarks Originals","relaxed, heritage, textured","casual, weekend","Year-round","A moccasin toe and crepe sole soften tailored trousers or denim."],
  ["1461 Made in England Oxblood Shoes","Shoes","Dr. Martens","heritage, leather, workwear","everyday, smart casual","Year-round","A three-eye derby in oxblood leather."],
  ["1460 Smooth Leather Boots","Shoes","Dr. Martens","heritage, leather, workwear","everyday, weekend","Fall/Winter","The eight-eye lace-up boot with a sturdy silhouette."],
  ["Samba OG","Shoes","adidas","retro, sporty, streetwear","everyday, casual","Year-round","A low-profile football-derived sneaker with a contrasting toe overlay."],
  ["Arizona Two-Strap Sandals","Shoes","Birkenstock","minimalist, relaxed, summer","everyday, weekend","Spring/Summer","Two adjustable straps and a contoured footbed suit warm-weather outfits."],
  ["Chuck Taylor All Star High Top","Shoes","Converse","retro, casual, streetwear","everyday, weekend","Year-round","Canvas uppers and a rubber toe cap work with straight or wide hems."],
  ["Air Force 1 Low","Shoes","Nike","streetwear, classic, sporty","everyday, casual","Year-round","A fuller basketball silhouette balances wide trousers or shorts."],
  ["990v6 Made in USA","Shoes","New Balance","sporty, retro, streetwear","everyday, casual","Year-round","Layered running uppers and a substantial midsole."],
  ["501 Original Fit Jeans – Light Wash","Bottoms","Levi's","casual, classic, heritage","everyday, weekend","Year-round","A straight leg and button fly in light-wash denim."],
  ["501 Original Fit Jeans – Black","Bottoms","Levi's","minimalist, classic, heritage","everyday, smart casual","Year-round","The straight-leg 501 in black denim."],
  ["874 Original Work Pants","Bottoms","Dickies","workwear, tailored, streetwear","everyday, workwear","Year-round","A flat-front, straight-leg twill trouser."],
  ["Pleated Wide Pants","Bottoms","Uniqlo","tailored, minimalist, relaxed","workwear, smart casual","Year-round","A clean waistband and relaxed leg for an easy office silhouette."],
  ["Double Knee Pant","Bottoms","Carhartt WIP","workwear, streetwear, practical","everyday, weekend","Year-round","Reinforced panels and utility pockets add structure."],
  ["Uniqlo U Crew Neck T-Shirt","Tops","Uniqlo","minimalist, elevated basics, casual","everyday, weekend","Year-round","A substantial cotton jersey tee with a close crew neckline."],
  ["L.12.12 Original Polo","Tops","Lacoste","preppy, classic, sporty","everyday, smart casual","Spring/Summer","The piqué polo with a two-button placket."],
  ["Classic Fit Oxford Shirt","Tops","Polo Ralph Lauren","preppy, workwear, classic","workwear, smart casual","Year-round","A button-down Oxford that also works open over a tee."],
  ["Minquiers Moderne Breton Shirt","Tops","Saint James","nautical, classic, casual","everyday, weekend","Spring/Summer","A lightweight striped Breton with long sleeves."],
  ["Aran Fisherman Cable Crewneck","Knitwear","Aran Sweater Market","heritage, textured, warm","weekend, everyday","Fall/Winter","Cable patterns bring depth to a plain winter outfit."],
  ["Merino Crew Neck Sweater","Knitwear","Uniqlo","minimalist, layering, classic","workwear, everyday","Fall/Winter","Fine-gauge merino for layering over a collared shirt."],
  ["Lambswool Crew Neck Jumper","Knitwear","Johnstons of Elgin","classic, heritage, quiet luxury","smart casual, workwear","Fall/Winter","A soft knit that sits neatly beneath a jacket."],
  ["Vintage Burberrys Trench Coat","Outerwear","Burberry","classic, tailored, heritage","workwear, smart casual","Fall/Winter","A belted, double-breasted vintage raincoat."],
  ["Bedale Wax Jacket","Outerwear","Barbour","heritage, workwear, textured","weekend, smart casual","Fall/Winter","A shorter waxed cotton jacket with corduroy collar."],
  ["Detroit Jacket","Outerwear","Carhartt WIP","workwear, heritage, streetwear","everyday, weekend","Fall/Winter","A cropped work jacket with a contrasting collar."],
  ["1996 Retro Nuptse Jacket","Outerwear","The North Face","streetwear, sporty, warm","everyday, weekend","Fall/Winter","Boxy insulation with broad horizontal baffles."],
  ["Classic Retro-X Fleece Jacket","Outerwear","Patagonia","sporty, heritage, textured","everyday, weekend","Fall/Winter","Pile fleece with a contrast chest pocket."],
  ["Long Sleeve Mesh Midi Dress","Dresses","GANNI","statement piece, layering, feminine","date night, eveningwear","Year-round","A printed mesh layer that works with simple accessories."],
  ["Havana Suit","Tailoring","Suitsupply","tailored, classic, workwear","formal, workwear","Year-round","A softer-shouldered suit with a contemporary profile."],
  ["Ludlow Slim-Fit Suit Jacket","Tailoring","J.Crew","tailored, preppy, classic","workwear, formal","Year-round","A slim jacket that can also be worn as a separate."],
  ["F-91W Digital Watch","Accessories","Casio","retro, practical, minimalist","everyday, casual","Year-round","A compact digital watch on a black resin strap."],
  ["Original Wayfarer Sunglasses","Accessories","Ray-Ban","retro, classic, summer","everyday, weekend","Spring/Summer","Angular acetate frames with a strong brow."],
  ["9FORTY New York Yankees Cap","Accessories","New Era","sporty, streetwear, casual","everyday, weekend","Year-round","A structured baseball cap with an adjustable back."],
  ["GG Marmont Double G Belt","Accessories","Gucci","statement piece, classic, leather","smart casual, eveningwear","Year-round","A leather belt with a distinctive double-G buckle."],
  ["Carré 90 Silk Scarf","Accessories","Hermès","classic, statement piece, luxe","smart casual, formal","Year-round","A square silk scarf to tie at the neck, hair or bag handle."],
  ["Birkin Bag","Bags","Hermès","classic, tailored, quiet luxury","workwear, smart casual","Year-round","A structured leather top-handle bag."],
  ["Kånken Classic Backpack","Bags","Fjällräven","practical, heritage, travel-friendly","everyday, weekend","Year-round","A rectangular backpack with a wide-opening main zip."],
  ["Le Pliage Original Tote","Bags","Longchamp","minimalist, practical, travel-friendly","everyday, workwear","Year-round","A lightweight foldable bag with leather trim."],
  ["Brooklyn Shoulder Bag 28","Bags","Coach","minimalist, relaxed, leather","everyday, smart casual","Year-round","A soft-structured shoulder bag for daily use."],
  ["Puzzle Bag","Bags","Loewe","sculptural, leather, statement piece","smart casual, weekend","Year-round","Geometric leather panels create a distinctive shape."],
  ["Tutti Frutti Bracelet","Jewelry","Cartier","heritage, sculptural, statement piece","formal, eveningwear","Year-round","Carved coloured stones define this archival Cartier design."],
  ["Trinity Ring","Jewelry","Cartier","classic, sculptural, quiet luxury","formal, everyday","Year-round","Three interlocking bands in contrasting gold tones."],
  ["Return to Tiffany Heart Tag Bracelet","Jewelry","Tiffany & Co.","classic, polished, statement piece","everyday, smart casual","Year-round","A heart-shaped tag on a chain bracelet."],
  ["One Row Pearl Drop Choker","Jewelry","Vivienne Westwood","statement piece, heritage, sculptural","date night, eveningwear","Year-round","A short pearl strand with the house’s orb motif."],
  ["Dôme Hoops","Jewelry","Mejuri","minimalist, sculptural, elevated basics","everyday, smart casual","Year-round","Rounded hoops add volume with a clean outline."],
  ["Crossover Ring","Jewelry","David Yurman","sculptural, textured, classic","eveningwear, smart casual","Year-round","Interlaced bands pair polished and textured surfaces."],
  ["The Ellie Nap Dress","Dresses","Hill House Home","feminine, summer, relaxed","weekend, smart casual","Spring/Summer","A smocked bodice and tiered skirt suit warm-weather outfits."],
  ["Tabi Ballerinas","Shoes","Maison Margiela","minimalist, statement piece, sculptural","smart casual, eveningwear","Spring/Summer","A split toe changes the outline of a pared-back flat."],
  ["Bettina Dress","Dresses","The Reformation","feminine, classic, minimalist","date night, eveningwear","Spring/Summer","A defined waist and flared skirt give this dress a clean silhouette."],
  ["Aldwych Tuxedo Jacket","Tailoring","Charles Tyrwhitt","tailored, classic, eveningwear","formal, eveningwear","Year-round","A formal dinner jacket for black-tie separates."],
  ["2.55 Flap Bag","Bags","Chanel","classic, polished, heritage","formal, smart casual","Year-round","A quilted flap bag with a shoulder chain."],
  ["Vintage Brown Tassel Loafers","Shoes","Tod’s","classic, leather, heritage","smart casual, everyday","Year-round","A brown vintage pair with an apron toe and two tassels."],
  ["Stadium Short Sleeve Shirt","Tops","Polo Ralph Lauren","retro, sporty, streetwear","casual, weekend","Spring/Summer","A short-sleeved piece from the Stadium collection."],
  ["Archival Printed Wrap Dresses","Dresses","Diane von Furstenberg","heritage, feminine, statement piece","workwear, smart casual","Year-round","Printed wrap dresses from the 2014 LACMA retrospective."],
  ["Le Smoking Tuxedo (1988)","Tailoring","Yves Saint Laurent","tailored, heritage, statement piece","formal, eveningwear","Year-round","The 1988 tuxedo at right in the Musée d’Orsay exhibition photograph."],
  ["Hand-Batik Cotton T-Shirt","Tops","Studio One Eighty Nine","heritage, statement piece, summer","casual, weekend","Spring/Summer","Hand-batik cotton brings a printed detail to a crew-neck tee."],
  ["Hand-Batik Cotton Ruffle Cuff Shirt","Tops","Studio One Eighty Nine","heritage, feminine, statement piece","smart casual, weekend","Spring/Summer","A hand-batik shirt with ruffle cuffs for texture at the sleeve."],
  ["1970s Plaid Knit Sweater and Skirt Set","Knitwear","Missoni","heritage, statement piece, textured","smart casual, eveningwear","Fall/Winter","A multicoloured knit set in the RISD Museum collection."],
  ["Air Jordan 1 Low","Shoes","Jordan","streetwear, sporty, retro","everyday, weekend","Year-round","A low-cut basketball design with the Wings mark at the heel."],
  ["Air Jordan 1 Retro High OG CO.JP Silver","Shoes","Jordan","metallic, streetwear, statement piece","weekend, casual","Year-round","A high-top in neutral grey and silver from the CO.JP series."],
  ["Air Jordan 1 Mid SE Crimson Tint","Shoes","Jordan","streetwear, retro, statement piece","everyday, casual","Year-round","Pink suede overlays, black Swooshes and bright laces distinguish this mid-top."],
  ["Air Force 1 Low Flax (2019)","Shoes","Nike","streetwear, tonal, textured","everyday, weekend","Fall/Winter","Named Flax edition with a wheat-toned upper."],
  ["Chuck Taylor All Star Patent High – Black","Shoes","Converse","retro, glossy, streetwear","casual, weekend","Year-round","Patent black uppers give this high-top a glossy finish."],
  ["Old Skool","Shoes","Vans","skate, streetwear, retro","casual, everyday","Year-round","A low skate shoe with a side stripe and vulcanized sole."],
  ["Iron Ranger 8111","Shoes","Red Wing Heritage","heritage, workwear, leather","everyday, weekend","Fall/Winter","Amber Harness leather and a cap toe distinguish the 8111."],
  ["Boston Suede Clog","Shoes","Birkenstock","relaxed, minimal, textured","everyday, weekend","Year-round","A closed-toe clog with an adjustable strap and contoured footbed."],
  ["Gommino Driving Shoes","Shoes","Tod’s","quiet luxury, preppy, leather","smart casual, weekend","Spring/Summer","A driving moccasin with rubber pebbles underfoot."],
  ["Basic Stüssy Tee","Tops","Stüssy","streetwear, casual, graphic","everyday, weekend","Year-round","A printed crew-neck tee from the brand’s Basic Stüssy line."],
  ["K87 Loose Fit Heavyweight Pocket T-Shirt","Tops","Carhartt","workwear, casual, layering","everyday, weekend","Year-round","Heavyweight jersey with a chest pocket and a loose fit."],
  ["AIRism Cotton Oversized Crew Neck Half-Sleeve T-Shirt","Tops","Uniqlo","minimalist, relaxed, elevated basics","casual, everyday","Spring/Summer","Dropped shoulders and a roomy sleeve make for a boxier silhouette."],
  ["Cotton Mesh Classic Fit Polo Shirt","Tops","Polo Ralph Lauren","preppy, heritage, sporty","everyday, smart casual","Spring/Summer","A textured cotton-mesh polo with the embroidered pony."],
  ["Beefy-T Crewneck T-Shirt","Tops","Hanes","classic, casual, layering","everyday, weekend","Year-round","A substantial basic tee for wearing on its own or under an overshirt."],
  ["Our T-Shirt","Tops","Lady White Co.","minimalist, casual, elevated basics","everyday, weekend","Year-round","A clean crew-neck silhouette suitable for layered outfits."],
  ["505 Regular Fit Jeans","Bottoms","Levi’s","classic, heritage, casual","everyday, weekend","Year-round","A regular zip-fly jean with a straight leg."],
  ["568 Stay Loose Jeans","Bottoms","Levi’s","streetwear, relaxed, casual","everyday, weekend","Year-round","A looser cut suited to fuller footwear and oversized shirts."],
  ["13MWZ Cowboy Cut Original Fit Jeans","Bottoms","Wrangler","western, heritage, workwear","everyday, weekend","Year-round","A high-rise cowboy cut with room for boots at the hem."],
  ["Standard Fit 105 Jeans","Bottoms","orSlow","heritage, relaxed, denim","everyday, smart casual","Year-round","A Japanese denim interpretation of a regular straight-fitting jean."],
  ["Slim Fit 107 Jeans","Bottoms","orSlow","heritage, classic, denim","everyday, weekend","Year-round","A slimmer sibling to the 105 with a narrower leg."],
  ["Baggies Shorts 5-inch","Bottoms","Patagonia","sporty, practical, summer","weekend, activewear","Spring/Summer","Quick-drying shorts with a short inseam for travel and outdoor wear."],
  ["Stockman Wax Coat","Outerwear","Barbour","heritage, practical, workwear","weekend, everyday","Fall/Winter","A long waxed coat with a country outerwear silhouette."],
  ["Endurance Jacket","Outerwear","Barbour","heritage, practical, layered","weekend, smart casual","Fall/Winter","This green Barbour jacket comes from the Endurance range."],
  ["Torrentshell 3L Rain Jacket","Outerwear","Patagonia","sporty, practical, travel-friendly","weekend, activewear","Year-round","A packable three-layer rain shell with an adjustable hood."],
  ["MA-1 Flight Jacket","Outerwear","Alpha Industries","heritage, streetwear, sporty","everyday, weekend","Fall/Winter","A zip-front bomber with ribbed hems and a sleeve pocket."],
  ["Original Trucker Jacket","Outerwear","Levi’s","denim, western, heritage","everyday, weekend","Year-round","A short denim jacket with pointed chest pocket flaps."],
  ["Bedford Jacket","Outerwear","Engineered Garments","workwear, textured, relaxed","smart casual, weekend","Fall/Winter","A workwear jacket with patch pockets that can dress up denim."],
  ["Vintage Dale Patterned Sweater","Knitwear","Dale of Norway","heritage, textured, warm","weekend, everyday","Fall/Winter","A vintage patterned knit documented by Menswear Market."],
  ["Shaggy Dog Sweater","Knitwear","J. Press","preppy, heritage, textured","smart casual, workwear","Fall/Winter","A brushed knit that adds texture to an Oxford and chinos."],
  ["Brushed Shetland Crewneck","Knitwear","Jamieson’s of Shetland","heritage, textured, warm","everyday, weekend","Fall/Winter","A brushed wool crew-neck to layer under coats or overshirts."],
  ["Cotton Cable-Knit Crewneck Sweater","Knitwear","Polo Ralph Lauren","preppy, classic, textured","smart casual, workwear","Fall/Winter","Raised cables and a ribbed hem make this a classic layering piece."],
  ["V-Neck Wool Cardigan","Knitwear","Comme des Garçons PLAY","preppy, streetwear, minimal","everyday, smart casual","Fall/Winter","A button-front knit with the line’s heart emblem."],
  ["The Anjuli Nap Dress","Dresses","Hill House Home","feminine, relaxed, summer","everyday, weekend","Spring/Summer","A smocked Nap Dress with a longer flowing skirt."],
  ["Poppy Blur Crushed Satin Dress","Dresses","Vince","minimalist, textured, quiet luxury","eveningwear, smart casual","Year-round","A floral print over a crinkled satin surface."],
  ["Stretch Jersey Long Sleeve Dress","Dresses","Norma Kamali","minimalist, draped, eveningwear","eveningwear, smart casual","Year-round","A stretch jersey dress for understated evening layering."],
  ["Kensington Suit","Tailoring","Paul Smith","tailored, classic, workwear","formal, workwear","Year-round","A slim suit silhouette from the Paul Smith tailoring range."],
  ["Crosby Classic-fit Suit Jacket","Tailoring","J.Crew","tailored, preppy, classic","formal, workwear","Year-round","A roomier tailored fit through the shoulder and chest."],
  ["Bakers Jacket","Tailoring","Universal Works","workwear, relaxed, heritage","workwear, smart casual","Year-round","A patch-pocket jacket with workwear roots for casual tailoring."],
  ["LOVE Bracelet","Jewelry","Cartier","classic, minimalist, polished","everyday, formal","Year-round","A rigid bracelet whose screw motifs run around the band."],
  ["Juste un Clou Bracelet","Jewelry","Cartier","sculptural, polished, statement piece","eveningwear, smart casual","Year-round","A bracelet shaped like a bent nail."],
  ["Vintage Alhambra Pendant","Jewelry","Van Cleef & Arpels","heritage, polished, quiet luxury","everyday, formal","Year-round","A single beaded-edge clover motif on a chain."],
  ["Elsa Peretti Bean Design Pendant","Jewelry","Tiffany & Co.","minimalist, sculptural, classic","everyday, smart casual","Year-round","A smooth organic bean-shaped pendant."],
  ["HardWear Small Link Bracelet","Jewelry","Tiffany & Co.","sculptural, statement piece, polished","everyday, eveningwear","Year-round","Rounded gauge links form a compact chain bracelet."],
  ["Siren Stacking Ring","Jewelry","Monica Vinader","textured, sculptural, relaxed","everyday, smart casual","Year-round","An irregular bezel gives a stacking ring an organic outline."],
  ["Lucy Williams Roman Arc Coin Necklace","Jewelry","Missoma","heritage, textured, layered","everyday, smart casual","Year-round","A coin pendant that can be worn alone or with shorter chains."],
  ["Baw Pot Natural","Bags","AAKS","heritage, textured, summer","weekend, smart casual","Spring/Summer","A woven raffia bucket bag from the Ghanaian brand."],
  ["Hana Pompom","Bags","AAKS","statement piece, textured, summer","weekend, smart casual","Spring/Summer","A woven bag finished with the line’s pompom detail."],
  ["Rugged Twill Original Briefcase","Bags","Filson","heritage, practical, workwear","workwear, travel","Year-round","Heavy twill and bridle leather on a zip-top briefcase."],
  ["Everyday Sling 6L","Bags","Peak Design","practical, travel-friendly, minimalist","everyday, travel","Year-round","A compact sling with configurable dividers."],
  ["Speedy 25","Bags","Louis Vuitton","heritage, classic, polished","everyday, smart casual","Year-round","A compact barrel-shaped handbag with rolled handles."],
  ["Black Hole Duffel 40L","Bags","Patagonia","sporty, practical, travel-friendly","travel, weekend","Year-round","A soft-sided duffel with removable backpack straps."],
  ["Lineage LIN-163 Titanium Watch","Accessories","Casio","minimalist, practical, polished","everyday, workwear","Year-round","An analogue watch from Casio’s titanium Lineage range."],
  ["G-Shock DW-5600E","Accessories","Casio","sporty, retro, practical","everyday, activewear","Year-round","A square digital watch in a rugged resin case."],
  ["A168 Digital Watch","Accessories","Casio","retro, classic, polished","everyday, casual","Year-round","A retro digital display on a metal bracelet."],
  ["Aviator Classic RB3025","Accessories","Ray-Ban","retro, classic, summer","everyday, weekend","Spring/Summer","Teardrop lenses sit within a thin metal frame."],
  ["Standard Belt","Accessories","Tanner Goods","minimalist, heritage, leather","workwear, smart casual","Year-round","A leather belt to wear with trousers or denim."],
  ["Tanker Wallet","Accessories","Porter-Yoshida & Co.","practical, minimalist, heritage","everyday, travel","Year-round","A compact wallet from the nylon Tanker line."],
  ["Cashmere Check Scarf","Accessories","Burberry","heritage, warm, classic","workwear, smart casual","Fall/Winter","A fringed cashmere scarf in the house check."],
  ["Gaspard Cardigan","Knitwear","Sézane","textured, relaxed, feminine","everyday, weekend","Fall/Winter","A button-through knit that can be styled with the buttons to the front or back."],
  ["Kourtney Dress","Dresses","Reformation","feminine, summer, classic","date night, weekend","Spring/Summer","A fitted bodice and midi skirt create a warm-weather occasion silhouette."],
  ["Madison Fit Two-Button Stripe 1818 Suit","Tailoring","Brooks Brothers","classic, tailored, preppy","formal, workwear","Year-round","Traditional suiting with a roomier fit in the 1818 range."],
  ["Kelly Bag – Red Crocodile","Bags","Hermès","classic, statement piece, textured","formal, smart casual","Year-round","A red crocodile top-handle Kelly with a central turnlock."],
  ["Archival Linked Bracelet","Jewelry","Cartier","heritage, sculptural, statement piece","formal, eveningwear","Year-round","An archival linked bracelet documented in an exhibition photograph."],
  ["Archival Brooch Clip","Jewelry","Van Cleef & Arpels","heritage, statement piece, polished","formal, eveningwear","Year-round","A white-gold clip brooch shown at the 2022 Gem exhibition in Tokyo."],
  ["Knu Skool Caldrone","Shoes","Vans","skate, streetwear, chunky","everyday, casual","Year-round","The photographed Knu Skool version with a padded side stripe."],
  ["A158W Digital Watch","Accessories","Casio","retro, classic, practical","everyday, workwear","Year-round","A compact digital watch on a metal bracelet."],
  ["Aviator Shooter RB3139","Accessories","Ray-Ban","heritage, retro, classic","everyday, weekend","Spring/Summer","The Shooter variant has a ring between the brow and bridge."],
  ["Delightful Monogram MM","Bags","Louis Vuitton","heritage, relaxed, classic","everyday, smart casual","Year-round","A relaxed monogram shoulder bag with a wide strap."],
  ["Bismarck Sapphire Necklace","Jewelry","Cartier","heritage, polished, statement piece","formal, eveningwear","Year-round","The Cartier platinum and diamond necklace in the Smithsonian’s National Gem Collection."],
  ["Archival Pendant Watch","Accessories","Van Cleef & Arpels","heritage, polished, statement piece","formal, eveningwear","Year-round","A pendant watch shown at the Cleveland Museum of Art’s Jazz Age exhibition."]
];

var WARD_STYLE_DB = [
  ...WARD_PRODUCTS,
  ["Breton Stripe Tee", "Tops", "Saint James", "casual, minimalist, French, classic, nautical", "everyday, weekend", "Spring/Summer", "The original nautical staple — effortlessly chic"],
  ["Camel Trench Coat", "Outerwear", "", "classic, tailored, investment piece, neutral, capsule staple", "workwear, smart casual, formal", "Fall/Winter", "The definitive transitional layer — works over everything"],
  ["White Linen Shirt", "Tops", "", "minimalist, relaxed, summer, breathable, capsule staple", "everyday, weekend, smart casual", "Spring/Summer", "Effortless warm-weather essential"],
  ["Navy Wool Blazer", "Outerwear", "", "tailored, workwear, versatile, classic, smart casual, investment piece", "workwear, formal, smart casual", "Fall/Winter", "The most versatile jacket you can own"],
  ["Black Slim Trousers", "Bottoms", "", "minimalist, tailored, versatile, classic, workwear", "workwear, formal, smart casual", "Year-round", "Perennial wardrobe anchor"],
  ["Straight-leg Jeans", "Bottoms", "Levi's", "casual, classic, relaxed, versatile, everyday", "everyday, weekend", "Year-round", "The perfect everyday jean silhouette"],
  ["White Poplin Shirt", "Tops", "", "minimalist, classic, tailored, clean, workwear", "workwear, smart casual, formal", "Year-round", "The foundational wardrobe shirt"],
  ["Cashmere Crew Neck", "Knitwear", "N.Peal", "luxe, minimalist, quiet luxury, investment piece, warm", "smart casual, weekend, workwear", "Fall/Winter", "Investment knitwear that lasts decades"],
  ["Merino Turtleneck", "Knitwear", "", "minimalist, classic, clean lines, tailored", "smart casual, weekend", "Fall/Winter", "Sleek cold-weather layering piece"],
  ["Silk Slip Dress", "Dresses", "", "feminine, luxe, sensual, minimalist, elegant", "eveningwear, date night, formal", "Spring/Summer", "Effortlessly elegant at any hour"],
  ["Little Black Dress", "Dresses", "", "classic, feminine, tailored, versatile, investment piece", "eveningwear, formal, date night", "Year-round", "The original Chanel invention — still unbeatable"],
  ["Oversized Blazer", "Outerwear", "", "oversized, streetwear, statement piece, androgynous", "smart casual, eveningwear, weekend", "Year-round", "The borrowed-from-the-boys power move"],
  ["Relaxed Linen Trousers", "Bottoms", "", "relaxed fit, minimalist, summer, breathable", "weekend, everyday, smart casual", "Spring/Summer", "Easy warm-weather bottoms with quiet elegance"],
  ["Chelsea Boots", "Shoes", "", "classic, versatile, tailored, heritage, capsule staple", "workwear, smart casual, everyday", "Fall/Winter", "The most versatile boot in any wardrobe"],
  ["White Sneakers", "Shoes", "Common Projects", "minimalist, clean, versatile, streetwear, elevated basics", "everyday, weekend, casual", "Year-round", "The elevated casual shoe — luxury in simplicity"],
  ["Silk Scarf", "Accessories", "Hermès", "luxe, feminine, classic, iconic, investment piece", "smart casual, formal, weekend", "Year-round", "The one accessory that transforms any look"],
  ["Maxi Coat", "Outerwear", "", "statement piece, dramatic, minimalist, luxe, hero piece", "formal, eveningwear, smart casual", "Fall/Winter", "The coat that commands a room"],
  ["Pleated Trousers", "Bottoms", "", "tailored, classic, Italian, relaxed fit, elegant", "workwear, smart casual, formal", "Year-round", "Continental elegance in trouser form"],
  ["Leather Jacket", "Outerwear", "", "streetwear, classic, statement piece, signature item", "casual, weekend, evening", "Fall/Winter", "The eternal rebel piece"],
  ["Wrap Dress", "Dresses", "Diane von Furstenberg", "feminine, flattering, classic, versatile", "smart casual, workwear, date night", "Year-round", "The DVF original — works on every body"],
  ["Ballet Flats", "Shoes", "Repetto", "feminine, French, minimalist, classic", "everyday, smart casual, weekend", "Year-round", "Quiet elegance for every occasion"],
  ["Loafers", "Shoes", "Gucci", "tailored, Italian, preppy, smart, luxe", "smart casual, workwear, everyday", "Year-round", "The shoe that straddles formal and casual perfectly"],
  ["Polo Shirt", "Tops", "Lacoste", "preppy, classic, sporty, clean, smart casual", "smart casual, weekend, everyday", "Spring/Summer", "The Lacoste original remains the reference"],
  ["Chinos", "Bottoms", "", "smart casual, preppy, versatile, relaxed", "everyday, smart casual, workwear", "Year-round", "The gap-bridger between jeans and tailoring"],
  ["Knit Cardigan", "Knitwear", "", "relaxed, layering, classic, cosy", "weekend, everyday, smart casual", "Fall/Winter", "Versatile layering knit for every season"],
  ["Satin Blouse", "Tops", "", "feminine, luxe, polished, evening, elegant", "workwear, eveningwear, smart casual", "Year-round", "Elevates any bottom from casual to polished"],
  ["Wide-leg Trousers", "Bottoms", "", "relaxed fit, statement, editorial, flowing", "smart casual, weekend, eveningwear", "Year-round", "The relaxed silhouette with maximum impact"],
  ["Linen Suit", "Tailoring", "", "tailored, summer formal, Mediterranean, lightweight", "formal, workwear, smart casual", "Spring/Summer", "The hot-climate power suit"],
  ["Tote Bag", "Bags", "", "minimalist, everyday, practical, clean", "everyday, workwear, weekend", "Year-round", "The functional style staple"],
  ["Structured Handbag", "Bags", "", "luxe, classic, investment piece, statement piece", "workwear, formal, smart casual", "Year-round", "The bag that announces itself"],
  ["Midi Skirt", "Bottoms", "", "feminine, elegant, flowing, classic", "smart casual, workwear, eveningwear", "Year-round", "The most flattering skirt length"],
  ["Crew Neck Sweatshirt", "Tops", "Champion", "casual, relaxed, streetwear, comfortable, everyday", "weekend, everyday, casual", "Fall/Winter", "The elevated casual layer"],
  ["Leather Tote", "Bags", "", "investment piece, professional, classic, capsule staple", "workwear, everyday", "Year-round", "The career bag that improves with age"],
  ["Mock Neck Top", "Tops", "", "minimalist, clean, modern, versatile, tailored", "smart casual, workwear, everyday", "Fall/Winter", "Low-profile sophistication"],
  ["Puffer Coat", "Outerwear", "Moncler", "practical, warm, statement piece, modern, luxe", "everyday, casual, winter", "Fall/Winter", "High-function meets high-fashion"],
  ["Suede Chelsea Boots", "Shoes", "", "luxe, heritage, versatile, classic", "smart casual, workwear, casual", "Fall/Winter", "Suede elevates the classic silhouette"],
  ["Peacoat", "Outerwear", "", "classic, tailored, nautical, heritage", "workwear, smart casual, formal", "Fall/Winter", "Naval heritage, city-ready"],
  ["Ribbed Tank", "Tops", "", "minimalist, basics, layering, everyday", "everyday, casual, activewear", "Year-round", "The hardest-working basic in your wardrobe"],
  ["Espadrilles", "Shoes", "", "casual, Mediterranean, summer, relaxed", "casual, weekend, travel-friendly", "Spring/Summer", "The quintessential summer casual shoe"],
  ["Denim Jacket", "Outerwear", "Levi's", "casual, relaxed, layering, classic", "everyday, weekend, casual", "Spring/Fall", "The ultimate American casual layer"],
  ["Quilted Jacket", "Outerwear", "Barbour", "heritage, country, casual, relaxed", "weekend, everyday", "Fall/Winter", "The British country classic"],
  ["Ankled Boots", "Shoes", "", "versatile, feminine, classic, wearable", "everyday, smart casual, eveningwear", "Fall/Winter", "The most wearable heeled boot"],
  ["Statement Belt", "Accessories", "", "luxe, tailored, statement piece, finishing touch", "workwear, smart casual, formal", "Year-round", "A quality belt elevates every outfit"],
  ["Crossbody Bag", "Bags", "", "practical, casual, travel-friendly, versatile", "everyday, weekend, travel-friendly", "Year-round", "Low-effort, high-style carry"],
  ["Trench Dress", "Dresses", "", "tailored, classic, structured, minimal", "workwear, smart casual", "Spring/Fall", "A dress that borrows from tailoring"],
  ["Knit Co-ord Set", "Knitwear", "", "matching set, relaxed fit, editorial, street style", "weekend, smart casual, eveningwear", "Fall/Winter", "The matching knit set — minimal effort, maximum effect"],
  ["High-waist Straight Jeans", "Bottoms", "", "casual, elevated basics, versatile, relaxed", "everyday, weekend", "Year-round", "The contemporary denim silhouette"],
  ["Blazer Dress", "Dresses", "", "tailored, power dressing, workwear, statement", "workwear, formal, smart casual", "Year-round", "One piece, complete authority"],
  ["Slip-on Loafers", "Shoes", "", "minimal, relaxed, Italian, luxury casual", "everyday, smart casual, weekend", "Year-round", "The relaxed loafer for every moment"],
  ["Shawl-collar Cardigan", "Knitwear", "", "relaxed, luxe, heritage, cosy, vintage find", "weekend, smart casual", "Fall/Winter", "Effortless at-home luxury that works outside too"],
  ["Cotton Camp-Collar Shirt", "Tops", "", "relaxed fit, tropical, breathable", "weekend, everyday, travel-friendly", "Spring/Summer", "Wear open over a tank or buttoned with high-waisted trousers."],
  ["Seersucker Popover", "Tops", "", "preppy, breathable, relaxed fit", "weekend, everyday, travel-friendly", "Spring/Summer", "The puckered weave helps the fabric sit away from the skin."],
  ["Linen Kaftan", "Tops", "", "relaxed fit, breathable, minimalist", "weekend, everyday, travel-friendly", "Spring/Summer", "Pair a long linen kaftan with flat sandals and a woven bag."],
  ["Kente-Panel Shirt", "Tops", "", "heritage, statement piece, tailored", "formal, smart casual, eveningwear", "Year-round", "Keep the rest of the outfit simple to give the woven panel space."],
  ["Oxford Button-Down", "Tops", "", "preppy, classic, capsule staple", "workwear, smart casual, weekend", "Year-round", "Untucked with denim or tucked into pleated trousers."],
  ["Longline Tunic", "Tops", "", "modest, relaxed fit, clean lines", "workwear, everyday, smart casual", "Year-round", "Works with straight trousers or a long skirt."],
  ["Bias-Cut Maxi Skirt", "Bottoms", "", "minimalist, flowing, eveningwear", "date night, eveningwear, smart casual", "Year-round", "Balance the drape with a close-fitting top or boxy jacket."],
  ["Denim Midi Skirt", "Bottoms", "", "heritage, casual, versatile", "everyday, casual, weekend", "Year-round", "A front slit gives a straight denim skirt room to move."],
  ["Bermuda Shorts", "Bottoms", "", "tailored, summer, relaxed fit", "weekend, smart casual, travel-friendly", "Spring/Summer", "Choose a tailored pair for loafers or a relaxed cut for sandals."],
  ["Parachute Trousers", "Bottoms", "", "streetwear, oversized, practical", "casual, weekend, everyday", "Year-round", "Pair the volume with a fitted top and low-profile sneakers."],
  ["Wide-Leg Drawstring Linen Pants", "Bottoms", "", "breathable, relaxed fit, minimalist", "everyday, weekend, travel-friendly", "Spring/Summer", "An easy alternative to denim in humid weather."],
  ["Linen Chore Jacket", "Outerwear", "", "workwear, breathable, heritage", "weekend, everyday, smart casual", "Spring/Summer", "Patch pockets add utility without the weight of canvas."],
  ["Unstructured Cotton Jacket", "Outerwear", "", "tailored, relaxed fit, minimalist", "workwear, smart casual, travel-friendly", "Spring/Summer", "Soft shoulders make this an easy layer over a tee or knit polo."],
  ["Waxed Field Jacket", "Outerwear", "", "heritage, practical, workwear", "casual, weekend, travel-friendly", "Fall/Winter", "Useful over a midweight knit on cool, wet days."],
  ["Packable Rain Shell", "Outerwear", "", "practical, travel-friendly, minimalist", "everyday, weekend, travel-friendly", "Year-round", "A compact outer layer for tropical showers or cool commutes."],
  ["Harrington Jacket", "Outerwear", "", "preppy, heritage, casual", "everyday, weekend, smart casual", "Spring/Fall", "The short hem works especially well with high-rise trousers."],
  ["Cable-Knit Vest", "Knitwear", "", "preppy, classic, layering", "workwear, weekend, smart casual", "Fall/Winter", "Layer it over a dress shirt or wear it alone in mild weather."],
  ["Cotton Crochet Polo", "Knitwear", "", "relaxed fit, breathable, vintage find", "weekend, casual, date night", "Spring/Summer", "An open stitch gives a simple summer outfit more texture."],
  ["Fine-Gauge Knit Polo", "Knitwear", "", "tailored, minimalist, elevated basics", "smart casual, workwear, date night", "Year-round", "Wear under softly structured tailoring."],
  ["Merino Zip Cardigan", "Knitwear", "", "layering, practical, minimalist", "travel-friendly, everyday, workwear", "Fall/Winter", "An easy midlayer that can replace a light jacket indoors."],
  ["Cotton Gauze Shirt Dress", "Dresses", "", "relaxed fit, breathable, minimalist", "everyday, weekend, travel-friendly", "Spring/Summer", "Belt it for shape or wear it loose in the heat."],
  ["Linen Column Dress", "Dresses", "", "clean lines, minimalist, breathable", "smart casual, date night, formal", "Spring/Summer", "This simple cut leaves room for a bold cuff or scarf."],
  ["Wax-Print Wrap Dress", "Dresses", "", "heritage, statement piece, bold print", "formal, weekend, smart casual", "Year-round", "A wrap shape lets the print lead while keeping the fit adjustable."],
  ["Tiered Cotton Maxi Dress", "Dresses", "", "modest, relaxed fit, breathable", "weekend, everyday, travel-friendly", "Spring/Summer", "Lightweight cotton makes the longer hem easier to wear in the heat."],
  ["Tropical Wool Suit", "Tailoring", "", "tailored, breathable, classic", "formal, workwear, eveningwear", "Spring/Summer", "Look for an open weave and a half lining for warm conditions."],
  ["Double-Breasted Suit", "Tailoring", "", "tailored, classic, statement piece", "formal, eveningwear, workwear", "Year-round", "Softer shoulders make the silhouette easier to dress down."],
  ["Silk-Wool Dinner Jacket", "Tailoring", "", "tailored, luxe, eveningwear", "formal, eveningwear, date night", "Year-round", "Pair with plain trousers and let the jacket carry the texture."],
  ["Linen Waistcoat Set", "Tailoring", "", "matching set, breathable, tailored", "workwear, smart casual, formal", "Spring/Summer", "Wear together for an event or split the pieces for everyday use."],
  ["Woven Leather Sandals", "Shoes", "", "breathable, heritage, summer", "everyday, weekend, smart casual", "Spring/Summer", "A closed weave offers more coverage than a plain slide."],
  ["Retro Running Sneakers", "Shoes", "", "streetwear, casual, vintage find", "everyday, weekend, travel-friendly", "Year-round", "A versatile shoe for long walks and straight-cut denim."],
  ["Leather Derby Shoes", "Shoes", "", "tailored, workwear, classic", "workwear, smart casual, formal", "Year-round", "Open lacing makes derbies easy to pair with informal tailoring."],
  ["Pointed Slingbacks", "Shoes", "", "tailored, minimalist, eveningwear", "workwear, smart casual, date night", "Year-round", "The open heel keeps a polished shoe from feeling heavy."],
  ["Rubber-Soled Boat Shoes", "Shoes", "", "preppy, nautical, relaxed fit", "weekend, casual, travel-friendly", "Spring/Summer", "Wear with chinos, linen shorts or an unstructured jacket."],
  ["Woven Raffia Tote", "Bags", "", "breathable, relaxed fit, summer", "weekend, everyday, travel-friendly", "Spring/Summer", "Use a small pouch inside to keep loose items easy to find."],
  ["Canvas Market Bag", "Bags", "", "practical, everyday, minimalist", "everyday, weekend, casual", "Year-round", "A washable tote for errands and an extra layer."],
  ["Nylon Sling Bag", "Bags", "", "practical, streetwear, travel-friendly", "travel-friendly, everyday, weekend", "Year-round", "Keeps keys and a phone close when you want both hands free."],
  ["Top-Handle Evening Bag", "Bags", "", "statement piece, tailored, eveningwear", "eveningwear, date night, formal", "Year-round", "A compact shape works with larger proportions in the outfit."],
  ["Cotton Bandana", "Accessories", "", "heritage, practical, casual", "weekend, everyday, travel-friendly", "Year-round", "Wear around the neck, in the hair or tied to a bag."],
  ["Woven Smock Belt", "Accessories", "", "heritage, statement piece, textured", "formal, smart casual, weekend", "Year-round", "A woven belt adds texture to a plain dress or linen layers."],
  ["Raffia Sun Hat", "Accessories", "", "breathable, summer, travel-friendly", "weekend, everyday, travel-friendly", "Spring/Summer", "A broad brim complements linen and light cotton."],
  ["Hammered Brass Cuff", "Accessories", "", "statement piece, heritage, sculptural", "eveningwear, formal, date night", "Year-round", "One cuff can carry a simple look with bare wrists."],
  ["Leather Cardholder", "Accessories", "", "minimalist, practical, elevated basics", "everyday, workwear, travel-friendly", "Year-round", "A smaller carry option for pockets or compact bags."],
  ["Cotton Twill Cap", "Accessories", "", "casual, streetwear, practical", "casual, weekend, everyday", "Year-round", "An understated way to finish a casual outfit."]
];

// Product photographs with source and license details. WebP copies are resized.
const WARDROBE_PHOTOS = {
  "1970s plaid knit sweater and skirt set|missoni": {
    "url": "/catalogues/photos/missoni-knit-set.webp",
    "source": "https://risdmuseum.org/art-design/collection/sweater-and-skirt-set-200926",
    "credit": "RISD Museum, CC0",
    "license": "https://creativecommons.org/publicdomain/zero/1.0/"
  },
  "f-91w digital watch|casio": {
    "url": "/catalogues/photos/casio-f91w.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Casio_F-91W.jpg",
    "credit": "NotFromUtrecht, CC BY-SA 3.0",
    "license": "https://creativecommons.org/licenses/by-sa/3.0"
  },
  "arizona two-strap sandals|birkenstock": {
    "url": "/catalogues/photos/birkenstock-arizona.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Birkenstock_Arizona.jpg",
    "credit": "Elmschrat, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "samba og|adidas": {
    "url": "/catalogues/photos/samba-og.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Adidas_Samba_OG.jpg",
    "credit": "LeDroider, CC0",
    "license": "https://creativecommons.org/publicdomain/zero/1.0/deed.en"
  },
  "501 original fit jeans – light wash|levis": {
    "url": "/catalogues/photos/levis-501-light.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Levi%27s_501.jpg",
    "credit": "Köttbulleledaren, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "501 original fit jeans – black|levis": {
    "url": "/catalogues/photos/levis-501-black.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Levi%27s_501_black.jpg",
    "credit": "Jeangagnon, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "original wayfarer sunglasses|ray-ban": {
    "url": "/catalogues/photos/wayfarer.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Ray_Ban_Original_Wayfarer.jpg",
    "credit": "Jaschke, CC BY-SA 3.0",
    "license": "https://creativecommons.org/licenses/by-sa/3.0"
  },
  "birkin bag|hermes": {
    "url": "/catalogues/photos/birkin.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Hermes_Birkin-2.jpg",
    "credit": "Theorb and Regi51, Public domain",
    "license": "https://creativecommons.org/publicdomain/mark/1.0/"
  },
  "vintage burberrys trench coat|burberry": {
    "url": "/catalogues/photos/burberry-trench.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Burberrys_Trenchcoat.jpg",
    "credit": "MB-one, CC BY-SA 2.0",
    "license": "https://creativecommons.org/licenses/by-sa/2.0"
  },
  "1461 made in england oxblood shoes|dr. martens": {
    "url": "/catalogues/photos/docs-1461.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Unlaced_Dr_Martens_Oxblood_Made_in_England_1461_shoes.jpg",
    "credit": "Nick-D, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "1460 smooth leather boots|dr. martens": {
    "url": "/catalogues/photos/docs-1460.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Dr._Martens_1460_01.jpg",
    "credit": "Pannet, CC BY 4.0",
    "license": "https://creativecommons.org/licenses/by/4.0"
  },
  "kanken classic backpack|fjallraven": {
    "url": "/catalogues/photos/kanken.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Kanken_Rucksack.jpg",
    "credit": "idhren, CC BY-SA 2.0",
    "license": "https://creativecommons.org/licenses/by-sa/2.0"
  },
  "tutti frutti bracelet|cartier": {
    "url": "/catalogues/photos/cartier-tutti-frutti.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Tutti_frutti_bracelet_-_Cartier_(25802475508).jpg",
    "credit": "Tim Evanson from Cleveland Heights, Ohio, USA, CC BY-SA 2.0",
    "license": "https://creativecommons.org/licenses/by-sa/2.0"
  },
  "2.55 flap bag|chanel": {
    "url": "/catalogues/photos/chanel-255.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Chanel_2.55.jpg",
    "credit": "Liu Wen Cheng 我希望成為, CC BY-SA 2.0",
    "license": "https://creativecommons.org/licenses/by-sa/2.0"
  },
  "vintage brown tassel loafers|tods": {
    "url": "/catalogues/photos/tods-loafer.webp",
    "source": "https://commons.wikimedia.org/wiki/File:A_brown_Loafer_Shoes_from_TODS.jpg",
    "credit": "Peachyeung316, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "stadium short sleeve shirt|polo ralph lauren": {
    "url": "/catalogues/photos/polo-stadium.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Polo_Ralph_Lauren_Stadium_shirt,_short_sleeves.jpg",
    "credit": "Menswear Market, CC BY 2.0",
    "license": "https://creativecommons.org/licenses/by/2.0"
  },
  "archival printed wrap dresses|diane von furstenberg": {
    "url": "/catalogues/photos/dvf-wrap.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Diane_von_F%C3%BCrstenberg_wrap_dress_display_at_LACMA_04.jpg",
    "credit": "Bruce Monroe, CC BY-SA 2.0",
    "license": "https://creativecommons.org/licenses/by-sa/2.0"
  },
  "le smoking tuxedo (1988)|yves saint laurent": {
    "url": "/catalogues/photos/ysl-le-smoking.webp",
    "source": "https://commons.wikimedia.org/wiki/File:1971_evening_dress_by_Yves_Saint_Laurent_for_Marie-H%C3%A9l%C3%A8ne_de_Rothschild_with_Le_Smoking_suit_from_1988_(mus%C3%A9e_d%27Orsay,_Paris).jpg",
    "credit": "dalbera, CC BY 2.0",
    "license": "https://creativecommons.org/licenses/by/2.0"
  },
  "vintage dale patterned sweater|dale of norway": {
    "url": "/catalogues/photos/dale-vintage.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Dale_of_Norway_sweater.jpg",
    "credit": "Menswear Market, CC BY 2.0",
    "license": "https://creativecommons.org/licenses/by/2.0"
  },
  "stockman wax coat|barbour": {
    "url": "/catalogues/photos/barbour-stockman.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Barbourstockman09.jpg",
    "credit": "A1octopus (talk) (Uploads), CC BY 3.0",
    "license": "https://creativecommons.org/licenses/by/3.0"
  },
  "endurance jacket|barbour": {
    "url": "/catalogues/photos/barbour-endurance.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Green_Barbour_Endurance_jacket.jpg",
    "credit": "Robert Sheie, Menswear Market, CC BY 2.0",
    "license": "https://creativecommons.org/licenses/by/2.0"
  },
  "air force 1 low flax (2019)|nike": {
    "url": "/catalogues/photos/af1-flax.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Nike_Air_Force_1_Low_Flax_2019.jpg",
    "credit": "Mfagoaguna1, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "chuck taylor all star patent high – black|converse": {
    "url": "/catalogues/photos/converse-patent.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Converse_All_Star_Black_Patent_High_(4649853842).jpg",
    "credit": "Magnus D from London, United Kingdom, CC BY 2.0",
    "license": "https://creativecommons.org/licenses/by/2.0"
  },
  "air jordan 1 low|jordan": {
    "url": "/catalogues/photos/air-jordan-1-low.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Air_Jordan_1_Low.jpg",
    "credit": "Pangalau, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "air jordan 1 retro high og co.jp silver|jordan": {
    "url": "/catalogues/photos/air-jordan-1-high.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Air_Jordan_1_Retro_High_OG_CO._Japan_silver.jpg",
    "credit": "HI 622, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "air jordan 1 mid se crimson tint|jordan": {
    "url": "/catalogues/photos/air-jordan-crimson.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Air_Jordan_1_-_Crimson_Tint_(49688016508).jpg",
    "credit": "Ajay Suresh from New York, NY, USA, CC BY 2.0",
    "license": "https://creativecommons.org/licenses/by/2.0"
  },
  "lineage lin-163 titanium watch|casio": {
    "url": "/catalogues/photos/casio-lineage.webp",
    "source": "https://commons.wikimedia.org/wiki/File:20250920_Casio_Lineage_Titanium_LIN-163.jpg",
    "credit": "Abraham, CC0",
    "license": "https://creativecommons.org/publicdomain/zero/1.0/deed.en"
  },
  "g-shock dw-5600e|casio": {
    "url": "/catalogues/photos/g-shock-dw5600e.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Casio_G-Shock_DW-5600E_wristwatch.jpg",
    "credit": "File:DW-5600E.png: Simon Le Bon derivative work: Pittigrilli, Public domain",
    "license": "https://creativecommons.org/publicdomain/zero/1.0/"
  },
  "archival linked bracelet|cartier": {
    "url": "/catalogues/photos/cartier-linked.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Linked_bracelet_-_Cartier_(25891095068).jpg",
    "credit": "Tim Evanson from Cleveland Heights, Ohio, USA, CC BY-SA 2.0",
    "license": "https://creativecommons.org/licenses/by-sa/2.0"
  },
  "archival brooch clip|van cleef & arpels": {
    "url": "/catalogues/photos/van-cleef-brooch.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Van_Cleef_%26_Arpels_Brooch_clip.jpg",
    "credit": "AmberLocket, CC0",
    "license": "https://creativecommons.org/publicdomain/zero/1.0/deed.en"
  },
  "kelly bag – red crocodile|hermes": {
    "url": "/catalogues/photos/kelly-red-crocodile.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Red_Crocodile_Kelly_Bag.jpg",
    "credit": "Herry Lawford, CC BY 2.0",
    "license": "https://creativecommons.org/licenses/by/2.0"
  },
  "wallabee suede|clarks originals": {
    "url": "/catalogues/photos/wallabee-cola.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Clarks_Wallabee_in_Cola_Suede.jpg",
    "credit": "C & J Clark archive, CC BY-SA 3.0",
    "license": "https://creativecommons.org/licenses/by-sa/3.0"
  },
  "old skool|vans": {
    "url": "/catalogues/photos/vans-old-skool.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Vans_Old_School.jpg",
    "credit": "Rindor, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "knu skool caldrone|vans": {
    "url": "/catalogues/photos/vans-knu-skool.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Paire_de_Vans_Knu_Skool_Caldrone.jpg",
    "credit": "IsaacGouillart, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "ma-1 flight jacket|alpha industries": {
    "url": "/catalogues/photos/alpha-ma1.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Alpha_Ind_MA1.JPG",
    "credit": "DirkF601, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "a158w digital watch|casio": {
    "url": "/catalogues/photos/casio-a158w.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Casio_A158W.jpg",
    "credit": "Casiolink, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "aviator shooter rb3139|ray-ban": {
    "url": "/catalogues/photos/ray-ban-shooter.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Ray-Ban_Aviator_Shooter_RB3139-001_3N_(G-15_lenses)_Size_62_09_160_Lens_base_6.jpg",
    "credit": "Francis Flinch, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0"
  },
  "delightful monogram mm|louis vuitton": {
    "url": "/catalogues/photos/lv-delightful-mm.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Delightful_Monogram_MM_-_Flickr_-_love.jsc.jpg",
    "credit": "Janine from South Korea, United States, CC BY 2.0",
    "license": "https://creativecommons.org/licenses/by/2.0"
  },
  "bismarck sapphire necklace|cartier": {
    "url": "/catalogues/photos/cartier-bismarck.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Bismarck_Necklace_(crop).jpg",
    "credit": "Jorfer (talk · contribs), Public domain",
    "license": "https://creativecommons.org/publicdomain/mark/1.0/"
  },
  "archival pendant watch|van cleef & arpels": {
    "url": "/catalogues/photos/van-cleef-pendant-watch.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Pendant_watch_-_Van_Cleef_and_Arpels_(38772069405).jpg",
    "credit": "Tim Evanson from Cleveland Heights, Ohio, USA, CC BY-SA 2.0",
    "license": "https://creativecommons.org/licenses/by-sa/2.0"
  },
  "13mwz cowboy cut original fit jeans|wrangler": {
    "url": "/catalogues/photos/wrangler-13mwz.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Wrangler-13MWZ_IMG_20260121_213130.jpg",
    "credit": "Nord794ub, CC BY-SA 4.0",
    "license": "https://creativecommons.org/licenses/by-sa/4.0",
    "alt": "Wrangler 13MWZ Original Fit Jeans, pocket and denim detail"
  },
  "aviator classic rb3025|ray-ban": {
    "url": "/catalogues/photos/ray-ban-rb3025.webp",
    "source": "https://commons.wikimedia.org/wiki/File:RayBanAviator.jpg",
    "credit": "Rich Niewiroski Jr., CC BY 2.5",
    "license": "https://creativecommons.org/licenses/by/2.5"
  },
  "air force 1 low|nike": {
    "url": "/catalogues/photos/nike-af1-low.webp",
    "source": "https://commons.wikimedia.org/wiki/File:Air_Force_1.JPG",
    "credit": "Xanor, CC0",
    "license": "https://creativecommons.org/publicdomain/zero/1.0/deed.en"
  }
};

const WARD_PRODUCT_LINKS = {
  "adrian smooth leather tassel loafers|dr. martens": "https://www.drmartens.com/us/en/adrian-smooth-leather-tassel-loafers-black/p/14573001",
  "larson weejuns penny loafers|g.h.bass": "https://www.ghbass.com/products/men-larson-weejuns-penny-loafer-black",
  "jordaan horsebit loafers|gucci": "https://www.gucci.com/us/en/pr/men/shoes-for-men/loafers-moccasins-for-men/mens-gucci-jordaan-loafer-p-A00CY6BLM002819",
  "hand-batik cotton t-shirt|studio one eighty nine": "https://studiooneeightynine.com/collections/unisex/products/hand-batik-cotton-t-shirt-1",
  "hand-batik cotton ruffle cuff shirt|studio one eighty nine": "https://studiooneeightynine.com/collections/all-products/products/hand-batik-cotton-ruffle-cuff-shirt",
  "baw pot natural|aaks": "https://www.aaksonline.com/shop/p/baw-pot-natural",
  "hana pompom|aaks": "https://www.aaksonline.com/shop/p/hana-pompom",
  "rugged twill original briefcase|filson": "https://www.filson.com/products/rugged-twill-original-briefcase-tan",
  "kourtney dress|reformation": "https://www.thereformation.com/products/kourtney-dress/1306182PPM.html",
  "our t-shirt|lady white co.": "https://ladywhiteco.com/collections/our-t-shirt",
  "crosby classic-fit suit jacket|j.crew": "https://www.jcrew.com/p/BZ636",
  "poppy blur crushed satin dress|vince": "https://www.vince.com/product/poppy-blur-crushed-satin-dress-309992.html",
  "lucy williams roman arc coin necklace|missoma": "https://us.missoma.com/products/lucy-williams-roman-arc-coin-necklace-silver-plated",
  "standard belt|tanner goods": "https://www.tannergoods.com/products/standard-belt-natural",
  "iron ranger 8111|red wing heritage": "https://eu.redwingshoes.com/p/8111_d",
  "l.12.12 original polo|lacoste": "https://www.lacoste.com/us/lacoste/men/clothing/polos/L1212-51-166.html",
  "airism cotton oversized crew neck half-sleeve t-shirt|uniqlo": "https://www.uniqlo.com/us/en/products/E465185-000/00"
};
