# OwnerRez API — Tool Coverage & Roadmap

Every endpoint in the OwnerRez API v2 (79 operations), what it exposes, and the MCP tool(s) that
could be built around it.

**Status:** ✅ built · 🆕 candidate · ⛔ skip (not usable / out of scope)
**Coverage:** 17 endpoints wrapped today → 21 tools (some are composed, e.g. `get_schedule`).

> Auth note: everything works with a Personal Access Token except **Messages** (needs an OAuth app).
> Some resources (**Listings**, **Reviews**) may require the Integrated Websites premium add-on.

| Resource | Endpoint | What it does / exposes | Potential tool(s) | Status |
|---|---|---|---|---|
| Properties | `GET /v2/properties` | All properties (name, beds/baths, capacity, address, owner_id) | `list_properties` | ✅ |
| Properties | `GET /v2/properties/{id}` | One property, full detail | `get_property` | ✅ |
| PropertySearch | `GET /v2/propertysearch` | Search properties by availability, dates, guests | `search_available_properties` — "what's open Aug 20–25 for 6?" | 🆕 |
| Bookings | `GET /v2/bookings` | Bookings/reservations, filterable; charges optional | `list_bookings`, `get_schedule` (composed) | ✅ |
| Bookings | `GET /v2/bookings/{id}` | One booking, full detail | `get_booking` | ✅ |
| Bookings | `PATCH /v2/bookings/{id}` | Update a booking (dates, notes, status) | `update_booking` *(write, confirm)* | 🆕 |
| Bookings | `POST /v2/bookings` | Create a booking | — requires the Channel API + card capture; not available here | ⛔ |
| Availability | *(derived from bookings)* | Booked/blocked dates for a property | `get_availability` | ✅ |
| Owners | `GET /v2/owners` | All property owners (name, contact, last_owner_statement_id) | `list_owners` | ✅ |
| Owners | `GET /v2/owners/{id}` | One owner, full detail | `get_owner` | ✅ |
| Owner statements | *(legacy `app.ownerrez.com/api/ownerstatements`)* | Official owner statements: payout, expenses, paid/unpaid | `list_owner_statements`, `get_owner_statement` (official + synthesized fallback) | ✅ |
| Guests | `GET /v2/guests` | Guests, searchable by name/email (`q`) | `search_guests` | ✅ |
| Guests | `GET /v2/guests/{id}` | One guest, full contact record | `get_guest` | ✅ |
| Guests | `POST /v2/guests` | Create a guest | `create_guest` *(write, confirm)* | 🆕 |
| Guests | `PATCH /v2/guests/{id}` | Update a guest | `update_guest` *(write, confirm)* | 🆕 |
| Guests | `DELETE /v2/guests/{id}` | Delete a guest | `delete_guest` *(write, destructive)* | 🆕 |
| Guests | `DELETE /v2/guests/{id}/emailaddresses\|phones\|addresses/{id}` | Remove one contact detail | `remove_guest_contact` *(write, niche)* | ⛔ |
| Inquiries | `GET /v2/inquiries` | Pre-booking leads: dates, party, channel, `thread_ids` | `list_inquiries` | ✅ |
| Inquiries | `GET /v2/inquiries/{id}` | One inquiry, full detail | `get_inquiry` | ✅ |
| Messages | `GET /v2/messages` | All messages on a thread (`threadId`) | `list_thread_messages` | ✅ |
| Messages | `GET /v2/messages/{id}` | One message | `get_message` | ✅ |
| Messages | `POST /v2/messages` | Send a message to a thread | `send_message` *(write, confirm)* | ✅ |
| Quotes | `GET /v2/quotes` | Price quotes sent to potential guests | `list_quotes` | 🆕 |
| Quotes | `GET /v2/quotes/{id}` | One quote, full detail | `get_quote` | 🆕 |
| Quotes | `POST /v2/quotes` | Create a quote | `create_quote` *(write, confirm)* | 🆕 |
| Quotes | `PATCH /v2/quotes/{id}` | Update a quote | `update_quote` *(write, confirm)* | 🆕 |
| Quotes | `DELETE /v2/quotes/{id}` | Remove a quote | `delete_quote` *(write)* | 🆕 |
| Payments | `GET /v2/payments` | Payments (guest → you): amount, date, method | `list_payments` | ✅ |
| Payments | `GET /v2/payments/{id}` | One payment, full detail | `get_payment` | 🆕 |
| Deposits | `GET /v2/deposits` | Deposits / payout groupings | `list_deposits` | ✅ |
| Deposits | `GET /v2/deposits/{id}` | One deposit, full detail | `get_deposit` | 🆕 |
| Refunds | `GET /v2/refunds` | Refunds issued | `list_refunds` | ✅ |
| Refunds | `GET /v2/refunds/{id}` | One refund, full detail | `get_refund` | 🆕 |
| SpotRates | `PATCH /v2/spotrates` | Set nightly rates for specific dates | `update_rate` *(write, confirm)* | ✅ |
| Reviews | `GET /v2/reviews` | Guest reviews & ratings | `list_reviews` — reputation *(may need premium)* | 🆕 |
| Reviews | `GET /v2/reviews/{id}` | One review | `get_review` | 🆕 |
| Listings | `GET /v2/listings` | Channel listings (Airbnb/Vrbo mappings) | `list_listings` *(premium)* | 🆕 |
| Listings | `GET /v2/listings/{id}` | One listing | `get_listing` *(premium)* | 🆕 |
| ListingSites | `GET /v2/listingsites` | Channels/sites available to the account | `list_listing_sites` | 🆕 |
| ListingSites | `GET /v2/listingsites/{id}` | One listing site | `get_listing_site` | 🆕 |
| Surcharges | `GET /v2/surcharges` | Surcharges (cleaning, extra fees) config | `list_surcharges` | 🆕 |
| Surcharges | `GET /v2/surcharges/{id}` | One surcharge | `get_surcharge` | 🆕 |
| Surcharges | `POST\|PATCH\|DELETE /v2/surcharges` | Create/update/remove a surcharge | `manage_surcharge` *(write)* | 🆕 |
| Discounts | `GET /v2/discounts` | Discount rules | `list_discounts` | 🆕 |
| Discounts | `GET /v2/discounts/{id}` | One discount | `get_discount` | 🆕 |
| Discounts | `POST\|PATCH\|DELETE /v2/discounts` | Create/update/remove a discount | `manage_discount` *(write)* | 🆕 |
| Fees | `GET /v2/fees` | Fee schedule | `list_fees` | 🆕 |
| Fees | `GET /v2/fees/{id}` | One fee | `get_fee` | 🆕 |
| Tags | `GET /v2/tags` | Tags applied to an entity (booking/guest/…) | `list_entity_tags` | 🆕 |
| Tags | `GET /v2/tags/{id}` | One tag | `get_tag` | 🆕 |
| Tags | `POST /v2/tags` | Add a tag to an entity | `tag_entity` *(write, confirm)* | 🆕 |
| Tags | `DELETE /v2/tags/{id}` & `/byname` | Remove a tag from an entity | `untag_entity` *(write)* | 🆕 |
| TagDefinitions | `GET /v2/tagdefinitions` | All possible tags | `list_tag_definitions` | 🆕 |
| TagDefinitions | `GET /v2/tagdefinitions/{id}` | One tag definition | `get_tag_definition` | 🆕 |
| TagDefinitions | `POST\|PATCH\|DELETE /v2/tagdefinitions` | Manage tag definitions | `manage_tag_definition` *(write)* | 🆕 |
| Fields | `GET /v2/fields` | Custom field values on an entity | `list_fields` *(niche)* | 🆕 |
| Fields | `GET /v2/fields/{id}` | One field value | `get_field` *(niche)* | 🆕 |
| Fields | `POST\|PATCH\|DELETE /v2/fields` (+ `/bydefinition`) | Manage custom field values | `manage_field` *(write, niche)* | 🆕 |
| FieldDefinitions | `GET /v2/fielddefinitions` | Custom field types | `list_field_definitions` *(niche)* | 🆕 |
| FieldDefinitions | `GET /v2/fielddefinitions/{id}` | One field definition | `get_field_definition` *(niche)* | 🆕 |
| FieldDefinitions | `POST\|PATCH\|DELETE /v2/fielddefinitions` | Manage field definitions | `manage_field_definition` *(write, niche)* | 🆕 |
| Users | `GET /v2/users/me` | The authenticated user/account | `whoami` | 🆕 |
| WebhookSubscriptions | `GET /v2/webhooksubscriptions` | Webhook subscriptions | — integration plumbing, not interactive | ⛔ |
| WebhookSubscriptions | `GET /v2/webhooksubscriptions/categories` | Available webhook categories | — | ⛔ |
| WebhookSubscriptions | `GET /v2/webhooksubscriptions/{id}` | One webhook subscription | — | ⛔ |
| WebhookSubscriptions | `POST /v2/webhooksubscriptions` | Create a webhook subscription | — | ⛔ |
| WebhookSubscriptions | `DELETE /v2/webhooksubscriptions/{id}` | Remove a webhook subscription | — | ⛔ |

## Recommended build order

1. **Tier 1 — high-value reads (no write risk):** `search_available_properties`, `list_reviews` /
   `get_review`, `list_quotes` / `get_quote`, `get_payment` / `get_deposit` / `get_refund`.
2. **Tier 2 — config/organizational reads:** tags, surcharges/discounts/fees, listings/listing-sites, `whoami`.
3. **Tier 3 — writes (confirm-gated):** `update_booking`, quote create/update, `tag_entity` / `untag_entity`, guest create/update.
4. **Skip:** booking creation (not available via this API), custom fields (niche), webhook management (plumbing).
