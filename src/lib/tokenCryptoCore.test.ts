import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import {
  TokenCryptoError,
  decryptToken,
  encryptToken,
  parseKey,
} from "./tokenCryptoCore";

const key = randomBytes(32);

function reason(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof TokenCryptoError ? error.reason : "other";
  }
  return undefined;
}

describe("parseKey", () => {
  it("accepts standard base64 of 32 bytes", () => {
    assert.equal(parseKey(randomBytes(32).toString("base64")).length, 32);
  });

  it("refuses the 43-character passphrase that Node would half-decode", () => {
    assert.throws(() => parseKey("this-is-a-passphrase-not-a-real-key-123456"));
  });

  it("refuses base64url, wrong lengths and stray characters", () => {
    assert.throws(() => parseKey(Buffer.from([251, 255, 254, ...randomBytes(29)]).toString("base64url")));
    assert.throws(() => parseKey(randomBytes(31).toString("base64")));
    assert.throws(() => parseKey(randomBytes(33).toString("base64")));
    assert.throws(() => parseKey(` ${randomBytes(32).toString("base64")}`));
    assert.throws(() => parseKey(""));
  });
});

describe("tokenCryptoCore", () => {
  it("round trips a token", () => {
    const stored = encryptToken("1//refresh-token-value", key);
    assert.ok(stored.startsWith("v1."));
    assert.equal(stored.split(".").length, 4);
    assert.equal(decryptToken(stored, key), "1//refresh-token-value");
  });

  it("fails with auth on the wrong key", () => {
    const stored = encryptToken("secret", key);
    assert.equal(reason(() => decryptToken(stored, randomBytes(32))), "auth");
  });

  it("fails when a byte of the ciphertext is flipped", () => {
    const parts = encryptToken("secret", key).split(".");
    const ct = Buffer.from(parts[3], "base64url");
    ct[0] ^= 1;
    parts[3] = ct.toString("base64url");
    assert.equal(reason(() => decryptToken(parts.join("."), key)), "auth");
  });

  it("fails with format on a bad prefix or shape", () => {
    const stored = encryptToken("secret", key);
    assert.equal(reason(() => decryptToken("v2" + stored.slice(2), key)), "format");
    assert.equal(reason(() => decryptToken("nonsense", key)), "format");
  });

  it("makes two encryptions of the same text differ", () => {
    assert.notEqual(encryptToken("same", key), encryptToken("same", key));
  });

  it("parseKey accepts 32 bytes and rejects 31 and 33", () => {
    assert.equal(parseKey(randomBytes(32).toString("base64")).length, 32);
    assert.throws(() => parseKey(randomBytes(31).toString("base64")));
    assert.throws(() => parseKey(randomBytes(33).toString("base64")));
  });
});
