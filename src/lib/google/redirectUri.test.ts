import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GOOGLE_CALLBACK_PATH, googleRedirectUri, requestOriginFrom } from "./redirectUri";

describe("redirectUri", () => {
  it("uses http for localhost and 127.0.0.1", () => {
    assert.equal(requestOriginFrom("localhost:3000", null), "http://localhost:3000");
    assert.equal(requestOriginFrom("127.0.0.1:3000", null), "http://127.0.0.1:3000");
    assert.equal(requestOriginFrom("localhost", null), "http://localhost");
  });

  it("uses https for a production host", () => {
    assert.equal(requestOriginFrom("marshee.example.com", null), "https://marshee.example.com");
  });

  it("does not mistake a look-alike host for localhost", () => {
    assert.equal(requestOriginFrom("localhost.evil.com", null), "https://localhost.evil.com");
  });

  it("trusts a good forwarded proto and uses the first of a comma list", () => {
    assert.equal(requestOriginFrom("localhost:3000", "https"), "https://localhost:3000");
    assert.equal(requestOriginFrom("marshee.example.com", "http"), "http://marshee.example.com");
    assert.equal(requestOriginFrom("marshee.example.com", "https, http"), "https://marshee.example.com");
  });

  it("falls back when the forwarded proto is junk", () => {
    assert.equal(requestOriginFrom("marshee.example.com", "ftp"), "https://marshee.example.com");
    assert.equal(requestOriginFrom("localhost:3000", "javascript"), "http://localhost:3000");
    assert.equal(requestOriginFrom("marshee.example.com", ""), "https://marshee.example.com");
  });

  it("returns null with no host", () => {
    assert.equal(requestOriginFrom(null, "https"), null);
    assert.equal(requestOriginFrom("", null), null);
  });

  it("joins the origin and the callback path", () => {
    assert.equal(GOOGLE_CALLBACK_PATH, "/api/google/callback");
    assert.equal(googleRedirectUri("https://marshee.example.com"), "https://marshee.example.com/api/google/callback");
  });
});
