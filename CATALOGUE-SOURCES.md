# Catalogue source notes

## User-supplied archive

`/home/ubuntu/upload/VirtualMachines.rar` contains:

- `Brochure-final-booklet-V1-compressed.pdf` — Hercules/BSA bicycle brochure used for the original 47 catalogue crops.
- `91 Escooter Catalogue - 4th August 2025.pdf` — Ninety One electric scooter pages: NX1, NX2, RX1, Meraki, FX1, VX.
- `91_Master_Catalog.pdf` — Ninety One catalogue pages 90–96 include E-bike models Z5, Wolverine X, ZX New Edition, Samurai X, Samurai X (NSI), Meraki S1 (Alloy).
- `Z3,COP BIKE SERISE PDF.pdf` — supplied EV ride-on vehicle brochure, separate from Ninety One.
- `EV UPDATED.pdf` — supplied EV ride-on toy vehicle brochure.

## External discovery sources

- Ninety One official store/catalogue: https://www.outdoors91.com/
- Geekay Bikes official: https://geekaybikes.com/
- OMO Bikes official: https://omobikes.com/
- Trek India official: https://www.trekbikes.com/in/en_IN/
- Current Indian cycle guide used only for discovery, not as a product-image source: https://choosemybicycle.com/blogs/news/best-bicycles-in-india-top-cycle-brands-types-prices-2026-guide

Exact catalogue images in the current local build come from the user-supplied brochures. Any added model without an exact supplied image must be labelled representative and should not be treated as proof of current stock or exact colour.

## Added catalogue coverage

The local catalogue now contains 88 entries: the original 47 Hercules/BSA rows, 12 Ninety One e-bike/EV entries from the user-supplied Ninety One brochures, and 29 additional current/popular India-market models from Hero, Firefox, Montra, Ninety One, Tata Stryder, Cradiac, Leader, and EMotorad. The additional model metadata and original official image URLs are recorded in `external-models.json`; the UI uses locally downloaded JPEG copies so the catalogue does not depend on third-party hotlink availability.

## Google OAuth callback

For the current full preview, the Google Cloud OAuth client must include:

`https://3001-ikijt4jod5qytgzdcajrj-d147e99b.sg2.manus.computer/api/shop/google/callback`

Owner Google access is allowlisted by the protected `ANAND_OWNER_GOOGLE_EMAIL` runtime variable. Customer Google sign-in accepts any verified Google account, while owner access requires the exact allowlisted email.
