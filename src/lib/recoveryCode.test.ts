// Unit tests (node:test) for recovery code making and reading. No database.
// Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateRecoveryCode,
  normalizeRecoveryCode,
  RECOVERY_ALPHABET,
} from "./recoveryCode";

test("generateRecoveryCode: matches the XXXX-XXXX-XXXX-XXXX format", () => {
  const code = generateRecoveryCode();
  assert.match(code, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);
});

test("generateRecoveryCode: only alphabet characters", () => {
  for (let i = 0; i < 200; i++) {
    for (const ch of generateRecoveryCode().replace(/-/g, "")) {
      assert.ok(RECOVERY_ALPHABET.includes(ch), `unexpected ${ch}`);
    }
  }
});

test("generateRecoveryCode: 1000 codes are all distinct", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 1000; i++) seen.add(generateRecoveryCode());
  assert.equal(seen.size, 1000);
});

test("normalizeRecoveryCode: accepts lower case, spaces and dashes", () => {
  assert.equal(
    normalizeRecoveryCode("abcd efgh-jkmn pqrs"),
    "ABCDEFGHJKMNPQRS",
  );
  assert.equal(normalizeRecoveryCode("  ABCD-EFGH-JKMN-PQRS "), "ABCDEFGHJKMNPQRS");
});

test("normalizeRecoveryCode: wrong length is null", () => {
  assert.equal(normalizeRecoveryCode("ABCD-EFGH"), null);
  assert.equal(normalizeRecoveryCode("ABCD-EFGH-JKMN-PQRS-T"), null);
  assert.equal(normalizeRecoveryCode(""), null);
});

test("normalizeRecoveryCode: excluded characters are null", () => {
  for (const bad of ["O", "0", "1", "I", "L"]) {
    assert.equal(
      normalizeRecoveryCode(`ABCD-EFGH-JKMN-PQR${bad}`),
      null,
      `should reject ${bad}`,
    );
  }
});

test("normalizeRecoveryCode: round-trips a generated code", () => {
  const code = generateRecoveryCode();
  assert.equal(normalizeRecoveryCode(code), code.replace(/-/g, ""));
});
