import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CALENDAR_SCOPES, GOOGLE_SCOPES, hasCalendarScopes } from "./scopes";

describe("scopes", () => {
  it("asks for sign-in plus the two calendar scopes", () => {
    assert.equal(CALENDAR_SCOPES.length, 2);
    assert.deepEqual(GOOGLE_SCOPES, ["openid", "email", ...CALENDAR_SCOPES]);
  });

  it("accepts a grant with both calendar scopes, with email expanded by Google", () => {
    const granted = `openid https://www.googleapis.com/auth/userinfo.email ${CALENDAR_SCOPES.join(" ")}`;
    assert.equal(hasCalendarScopes(granted), true);
  });

  it("accepts the calendar scopes in any order and with extra spaces", () => {
    assert.equal(hasCalendarScopes(`  ${CALENDAR_SCOPES[1]}   ${CALENDAR_SCOPES[0]} `), true);
  });

  it("refuses a grant missing one calendar scope", () => {
    assert.equal(hasCalendarScopes(`openid email ${CALENDAR_SCOPES[0]}`), false);
    assert.equal(hasCalendarScopes(`openid email ${CALENDAR_SCOPES[1]}`), false);
  });

  it("refuses a sign-in only grant and an empty one", () => {
    assert.equal(hasCalendarScopes("openid email profile"), false);
    assert.equal(hasCalendarScopes(""), false);
  });

  it("does not accept a longer scope that merely starts with a calendar scope", () => {
    assert.equal(hasCalendarScopes(`${CALENDAR_SCOPES[0]}.extra ${CALENDAR_SCOPES[1]}`), false);
  });
});
