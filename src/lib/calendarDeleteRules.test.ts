import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deleteBlockedMessage, type DeleteRulePerson } from "./calendarDeleteRules";

const person = (userId: string, displayName: string, role: string, deactivated = false): DeleteRulePerson => ({
  userId,
  displayName,
  role,
  deactivated,
});

const me = person("me", "Bryce", "parent");
const emily = person("emily", "Emily", "parent");
const sam = person("sam", "Sam", "admin");
const kid = person("kid", "Kai", "kid");

describe("deleteBlockedMessage", () => {
  it("allows deleting an item I am on", () => {
    assert.equal(deleteBlockedMessage("me", [me]), null);
  });
  it("blocks an item that is only another parent's", () => {
    assert.equal(deleteBlockedMessage("me", [emily]), "Only Emily can delete this.");
  });
  it("blocks an item that is only another admin's", () => {
    assert.equal(deleteBlockedMessage("me", [sam]), "Only Sam can delete this.");
  });
  it("allows a kid-only item", () => {
    assert.equal(deleteBlockedMessage("me", [kid]), null);
  });
  it("allows an item with nobody on it", () => {
    assert.equal(deleteBlockedMessage("me", []), null);
  });
  it("allows an item I share with another parent", () => {
    assert.equal(deleteBlockedMessage("me", [me, emily]), null);
  });
  it("blocks another parent plus a kid, naming only the parent", () => {
    assert.equal(deleteBlockedMessage("me", [emily, kid]), "Only Emily can delete this.");
  });
  it("lets a deactivated adult never block", () => {
    assert.equal(deleteBlockedMessage("me", [person("old", "Old", "parent", true)]), null);
  });
  it("skips a deactivated adult when naming who can delete", () => {
    assert.equal(
      deleteBlockedMessage("me", [person("old", "Old", "parent", true), emily]),
      "Only Emily can delete this.",
    );
  });
  it("joins two other adults as A and B", () => {
    assert.equal(deleteBlockedMessage("me", [emily, sam]), "Only Emily and Sam can delete this.");
  });
  it("joins three other adults as A, B and C", () => {
    assert.equal(
      deleteBlockedMessage("me", [emily, sam, person("jo", "Jo", "parent")]),
      "Only Emily, Sam and Jo can delete this.",
    );
  });
});
