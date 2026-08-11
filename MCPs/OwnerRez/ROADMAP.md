# OwnerRez API — Tool Coverage & Roadmap

Every endpoint in the OwnerRez API v2 (79 operations), what it exposes, and the MCP tool(s) built
around it.

**Status:** ✅ built · 🆕 candidate · ⛔ skip (not usable / out of scope)
**Coverage:** 41 endpoints wrapped → 45 tools (some are composed, e.g. `get_schedule`).

> Auth note: everything works with a Personal Access Token except **Messages** (needs an OAuth app).
> Some resources (**Listings**, **Reviews**) may require the Integrated Websites premium add-on.
> All write tools change nothing unless called with `confirm: true`.

| Resource | Endpoint | What it does / exposes | Tool(s) | Status |
|---|---|---|---|---|
| Properties | `GET /v2/properties` | All properties (name, capacity, address, owner_id) | `list_properties` | ✅ |
| Properties | `GET /v2/properties/{id}` | One property, full detail | `get_property` | ✅ |
| PropertySearch | `GET /v2/propertysearch` | Properties available for dates/guests | `search_available_properties` | ✅ |
| Bookings | `GET /v2/bookings` | Bookings/reservations; charges optional | `list_bookings`, `get_schedule` | ✅ |
| Bookings | `GET /v2/bookings/{id}` | One booking, full detail | `get_booking` | ✅ |
| Bookings | `PATCH /v2/bookings/{id}` | Update a booking (dates, notes, status) | `update_booking` *(write)* | ✅ |
| Bookings | `POST /v2/bookings` | Create a booking | — Channel API + card capture only | ⛔ |
| Availability | *(derived from bookings)* | Booked/blocked dates for a property | `get_availability` | ✅ |
| Owners | `GET /v2/owners` | All property owners | `list_owners` | ✅ |
| Owners | `GET /v2/owners/{id}` | One owner, full detail | `get_owner` | ✅ |
| Owner statements | *(legacy `app.ownerrez.com/api/ownerstatements`)* | Official owner statements | `list_owner_statements`, `get_owner_statement` | ✅ |
| Guests | `GET /v2/guests` | Guests, searchable by name/email | `search_guests` | ✅ |
| Guests | `GET /v2/guests/{id}` | One guest, full contact record | `get_guest` | ✅ |
| Guests | `POST /v2/guests` | Create a guest | `create_guest` *(write)* | ✅ |
| Guests | `PATCH /v2/guests/{id}` | Update a guest | `update_guest` *(write)* | ✅ |
| Guests | `DELETE /v2/guests/{id}` | Delete a guest | `delete_guest` *(write, destructive)* | 🆕 |
| Guests | `DELETE /v2/guests/{id}/emailaddresses\|phones\|addresses/{id}` | Remove one contact detail | — niche | ⛔ |
| Inquiries | `GET /v2/inquiries` | Pre-booking leads + `thread_ids` | `list_inquiries` | ✅ |
| Inquiries | `GET /v2/inquiries/{id}` | One inquiry, full detail | `get_inquiry` | ✅ |
| Messages | `GET /v2/messages` | All messages on a thread | `list_thread_messages` | ✅ |
| Messages | `GET /v2/messages/{id}` | One message | `get_message` | ✅ |
| Messages | `POST /v2/messages` | Send a message | `send_message` *(write)* | ✅ |
| Quotes | `GET /v2/quotes` | Price quotes to potential guests | `list_quotes` | ✅ |
| Quotes | `GET /v2/quotes/{id}` | One quote, full detail | `get_quote` | ✅ |
| Quotes | `POST /v2/quotes` | Create a quote | `create_quote` *(write)* | ✅ |
| Quotes | `PATCH /v2/quotes/{id}` | Update a quote | `update_quote` *(write)* | ✅ |
| Quotes | `DELETE /v2/quotes/{id}` | Remove a quote | `delete_quote` *(write)* | ✅ |
| Payments | `GET /v2/payments` | Payments (guest → you) | `list_payments` | ✅ |
| Payments | `GET /v2/payments/{id}` | One payment, full detail | `get_payment` | ✅ |
| Deposits | `GET /v2/deposits` | Deposits / payout groupings | `list_deposits` | ✅ |
| Deposits | `GET /v2/deposits/{id}` | One deposit, full detail | `get_deposit` | ✅ |
| Refunds | `GET /v2/refunds` | Refunds issued | `list_refunds` | ✅ |
| Refunds | `GET /v2/refunds/{id}` | One refund, full detail | `get_refund` | ✅ |
| SpotRates | `PATCH /v2/spotrates` | Set nightly rates for dates | `update_rate` *(write)* | ✅ |
| Reviews | `GET /v2/reviews` | Guest reviews & ratings | `list_reviews` *(may need premium)* | ✅ |
| Reviews | `GET /v2/reviews/{id}` | One review | `get_review` | ✅ |
| Listings | `GET /v2/listings` | Channel listings (Airbnb/Vrbo) | `list_listings` *(premium)* | ✅ |
| Listings | `GET /v2/listings/{id}` | One listing | `get_listing` | 🆕 |
| ListingSites | `GET /v2/listingsites` | Channels available to the account | `list_listing_sites` | ✅ |
| ListingSites | `GET /v2/listingsites/{id}` | One listing site | `get_listing_site` | 🆕 |
| Surcharges | `GET /v2/surcharges` | Surcharges (cleaning, extra fees) | `list_surcharges` | ✅ |
| Surcharges | `GET /v2/surcharges/{id}` | One surcharge | `get_surcharge` | 🆕 |
| Surcharges | `POST\|PATCH\|DELETE /v2/surcharges` | Manage a surcharge | `manage_surcharge` *(write)* | 🆕 |
| Discounts | `GET /v2/discounts` | Discount rules | `list_discounts` | ✅ |
| Discounts | `GET /v2/discounts/{id}` | One discount | `get_discount` | 🆕 |
| Discounts | `POST\|PATCH\|DELETE /v2/discounts` | Manage a discount | `manage_discount` *(write)* | 🆕 |
| Fees | `GET /v2/fees` | Fee schedule | `list_fees` | ✅ |
| Fees | `GET /v2/fees/{id}` | One fee | `get_fee` | 🆕 |
| Tags | `GET /v2/tags` | Tags applied to an entity | `list_entity_tags` | ✅ |
| Tags | `GET /v2/tags/{id}` | One tag | `get_tag` | 🆕 |
| Tags | `POST /v2/tags` | Add a tag to an entity | `tag_entity` *(write)* | ✅ |
| Tags | `DELETE /v2/tags/{id}` & `/byname` | Remove a tag | `untag_entity` *(write)* | ✅ |
| TagDefinitions | `GET /v2/tagdefinitions` | All possible tags | `list_tag_definitions` | ✅ |
| TagDefinitions | `GET /v2/tagdefinitions/{id}` | One tag definition | `get_tag_definition` | 🆕 |
| TagDefinitions | `POST\|PATCH\|DELETE /v2/tagdefinitions` | Manage tag definitions | `manage_tag_definition` *(write)* | 🆕 |
| Fields | `GET\|POST\|PATCH\|DELETE /v2/fields` (+`/bydefinition`) | Custom field values on an entity | `*_field` *(niche)* | 🆕 |
| FieldDefinitions | `GET\|POST\|PATCH\|DELETE /v2/fielddefinitions` | Custom field types | `*_field_definition` *(niche)* | 🆕 |
| Users | `GET /v2/users/me` | The authenticated user/account | `whoami` | ✅ |
| WebhookSubscriptions | `GET\|POST\|DELETE /v2/webhooksubscriptions` (+ `/categories`) | Manage webhooks | — integration plumbing | ⛔ |

## What's left (all optional)

- **By-id detail** for config resources (`get_surcharge`, `get_discount`, `get_fee`, `get_listing`,
  `get_listing_site`, `get_tag`, `get_tag_definition`) — the list tools already cover these needs.
- **Config writes** (`manage_surcharge` / `manage_discount` / `manage_tag_definition`) and
  `delete_guest` — higher-risk, add only if needed.
- **Custom fields** and **webhook management** — niche / integration plumbing, out of scope for an
  interactive assistant.
