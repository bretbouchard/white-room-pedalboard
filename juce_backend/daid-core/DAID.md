# DAID (Deterministic Asset ID) — Notes for developers

This document describes the DAID format, how and when to generate it, and the validation rules shared between the canonical TypeScript implementation and the Python binding used by the backend.

## Summary

- DAID: deterministic, human-readable identifier for assets (compositions, sections, patterns, etc.).

- Format (v1.0):

  daid:v1.0:&lt;timestamp&gt;:&lt;agent_id&gt;:&lt;entity_type&gt;:&lt;entity_id&gt;:&lt;provenance_hash&gt;

- Timestamp: ISO 8601 UTC with colons replaced by hyphens in the time component, e.g. `2025-08-26T06-34-53.262Z`.
- Provenance hash: first 16 hex characters of SHA-256 computed over a normalized JSON payload describing provenance metadata.

## Why DAID exists

- Provide stable, verifiable identifiers that encode: when an asset was created, who created it (agent), what it represents (entity type/id), and a short integrity hash over provenance metadata.

- Allow cross-language validation: a DAID generated in TypeScript should validate in the Python binding and vice-versa.

## Canonical implementations

- TypeScript: the authoritative generator/validator lives in `daid_core/daid_core/src/generator.ts`.

- Python: a binding lives in `daid_core/daid_core/python/daid_core.py` and mirrors the TS formatting and hashing logic.

## Generation contract (pseudo)

1. Build a provenance object with canonical keys (use `_normalize_metadata` logic in TS/Python).

2. Serialize to JSON with stable ordering (sorted keys) and no insignificant whitespace.

3. SHA-256 the UTF-8 bytes of the JSON string and take the first 16 hex characters.

4. Format the timestamp in UTC ISO with milliseconds and replace `:` in the time with `-`.

5. Construct: `daid:v1.0:{timestamp}:{agent_id}:{entity_type}:{entity_id}:{provenance_hash}`.

## Validation contract

- Parsing splits fields by `:` and validates expected count and prefix `daid:v1.0`.

- Timestamp string must parse as an ISO UTC timestamp (colons in time replaced by hyphens) and be RFC-compatible after reversing the hyphen replacement for parsing.

- Provenance hash must match the first 16 hex chars of computed SHA-256 over normalized provenance metadata.

## Edge cases and notes

- Back-compat: if other DAID versions are introduced, include a clear migration path and keep the version token in the DAID prefix.

- Collisions: using 16 hex chars (64 bits) from SHA-256 intentionally balances length and collision resistance for this use case; if higher security is required, extend the hash length in a new DAID version.

- Normalization: ensure both TS and Python implementations use the same canonical ordering and data transformations (e.g., drop nulls or sort dict keys). The TS file is the source of truth.

## Developer workflow

- When creating assets in the frontend or services, call into the canonical TS generator when available.

- For backend-only generation or validation, use the Python binding in `daid_core`.

- Add unit tests that round-trip a DAID: TS -> Python validation -> Python -> TS validation.

## Where to look in the repo

- TS canonical: `daid_core/daid_core/src/generator.ts`

- Python binding: `daid_core/daid_core/python/daid_core.py`

- Tests: add cross-language unit tests under `tests/` or `src/.../tests` depending on the suite.

## When to change DAID

- Only bump DAID version token (e.g., v1.1) for incompatible changes (timestamp format, hashing method, normalization changes, or hash length changes).

## Example

- Generated example:

  daid:v1.0:2025-08-26T06-34-53.262Z:schillinger-test:composition:seq-1:27e05b945ce122f9

## Questions and follow-ups

- If you want, I can add a small test harness that generates a DAID using both TS and Python and asserts mutual validation.
