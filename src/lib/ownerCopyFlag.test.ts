// Pins which MARSHEE_OWNER_COPY values count as "this is the owner's copy".

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOwnerCopyFlag } from "./ownerCopyFlag";

test("parseOwnerCopyFlag: exactly 1 is on", () => {
  assert.equal(parseOwnerCopyFlag("1"), true);
});

test("parseOwnerCopyFlag: a pasted newline or spaces around the 1 still count", () => {
  assert.equal(parseOwnerCopyFlag("1\n"), true);
  assert.equal(parseOwnerCopyFlag(" 1 "), true);
});

test("parseOwnerCopyFlag: anything else is off", () => {
  for (const value of ["true", "yes", "0", "", " ", "11", "on", undefined]) {
    assert.equal(parseOwnerCopyFlag(value), false, String(value));
  }
});
