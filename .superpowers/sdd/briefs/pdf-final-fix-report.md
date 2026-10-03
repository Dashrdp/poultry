

## PDF final-review fixes

1. `backend/dashboard_api.py` `export_dashboard_pdf`: slug keeps only ASCII alnum (`ch.isascii() and ch.isalnum()`), else `-`; empty -> `farm`. Non-ASCII names no longer raise UnicodeEncodeError in header.
2. `backend/export_pdf.py`: `xml.sax.saxutils.escape` on farm name, location, alert messages (all Paragraph user text; table cells are plain strings, not Paragraphs).
3. `backend/export_pdf.py`: removed global `rl_config.pageCompression` mutation at import. Now `SimpleDocTemplate(..., pageCompression=0)` per document.

### Tests added (`backend/tests/test_dashboard_export.py`)
- `test_render_escapes_markup_in_user_strings`
- `test_owner_export_content_disposition_slug` (`farm-pdf-farm-current_month.pdf`)
- `test_owner_export_non_ascii_farm_name` (Devanagari -> 200, `%PDF`, `farm-farm-current_month.pdf`)
- `test_owner_export_markup_farm_name` (`Farm <b>` -> 200, `%PDF`)

### Test output
`pytest tests/test_dashboard_export.py -q` -> `9 passed, 22 warnings in 2.58s`

### Remaining concerns
- Helvetica has no Devanagari glyphs: non-ASCII names render as blank/boxes in PDF body (no crash). Needs a Unicode TTF font to display properly.
- Shed/farm names in matplotlib pie labels and table cells are not markup-parsed; same glyph limitation.
