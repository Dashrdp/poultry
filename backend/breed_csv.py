import csv
import io

STANDARD_COLUMNS = (
    "hdep_pct",
    "hhe_cum",
    "mort_cum_pct",
    "feed_g",
    "egg_wt_g",
    "body_wt_g",
)
MAX_AGE_WEEK = 120


class BreedCsvError(ValueError):
    pass


def parse_breed_csv(text: str) -> list[dict[str, float | int | None]]:
    """Rows: age_week + STANDARD_COLUMNS. Lines starting with '#' are comments."""
    lines = [line for line in text.splitlines() if not line.lstrip().startswith("#")]
    reader = csv.DictReader(io.StringIO("\n".join(lines)))
    if reader.fieldnames is None or "age_week" not in reader.fieldnames:
        raise BreedCsvError("CSV needs an age_week column")
    rows: list[dict[str, float | int | None]] = []
    seen: set[int] = set()
    for line_no, raw in enumerate(reader, start=2):
        try:
            week = int((raw.get("age_week") or "").strip())
        except ValueError as exc:
            raise BreedCsvError(f"Row {line_no}: age_week must be a whole number") from exc
        if not 0 <= week <= MAX_AGE_WEEK:
            raise BreedCsvError(f"Row {line_no}: age_week out of range")
        if week in seen:
            raise BreedCsvError(f"Row {line_no}: duplicate age_week {week}")
        seen.add(week)
        row: dict[str, float | int | None] = {"age_week": week}
        for column in STANDARD_COLUMNS:
            value = (raw.get(column) or "").strip()
            if not value:
                row[column] = None
                continue
            try:
                row[column] = float(value)
            except ValueError as exc:
                raise BreedCsvError(f"Row {line_no}: {column} must be a number") from exc
        rows.append(row)
    if not rows:
        raise BreedCsvError("CSV has no rows")
    return rows
