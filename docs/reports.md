# Reports and insights

Reports are computed locally from completed `shopping_sessions`, `shopping_items`, and `price_history` rows. The reports repository uses parameterized aggregate queries and accepts an ISO-8601 inclusive date range; no report data leaves the device.

## Financial semantics

- Estimated spending is the session's cart snapshot (`estimated_total_cents`).
- Actual spending is included only when a shopper recorded `actual_total_cents` at checkout. Missing actual totals are reported as unknown rather than treated as verified spending.
- Budget usage uses the session budget and compares it with the actual total when present, otherwise the estimate.
- All calculations use integer cents. Formatting to PHP happens only in the screen.

The screen offers last-7-day and last-30-day filters, empty-period messaging, and simple accessible bar charts built from Expo-compatible React Native primitives. This avoids adding a native chart dependency to the offline app while keeping the visualisation portable across Android, iOS, and web.

Price changes are derived from locally recorded history and are labelled as saved history; they are not a claim that a price is current. Product names in session aggregates prefer the shopping-item snapshot so catalog edits do not rewrite historical insights.
