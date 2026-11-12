import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTO_PULL_EVERY_MS,
  TABLET_TOUCH_WINDOW_MS,
  shouldTimerPull,
  shouldTouchPull,
} from "./autoPullRules";

const NOW = 1_000_000_000;

describe("autoPullRules", () => {
  it("pins the two limits Bryce approved", () => {
    assert.equal(AUTO_PULL_EVERY_MS, 5 * 60 * 1000);
    assert.equal(TABLET_TOUCH_WINDOW_MS, 10 * 60 * 1000);
  });

  it("the timer never pulls while the page is hidden, for any login", () => {
    assert.equal(shouldTimerPull({ hidden: true, isTablet: false, lastTouchAt: NOW, now: NOW }), false);
    assert.equal(shouldTimerPull({ hidden: true, isTablet: true, lastTouchAt: NOW, now: NOW }), false);
  });

  it("a visible non-Tablet page pulls however long since a touch", () => {
    assert.equal(shouldTimerPull({ hidden: false, isTablet: false, lastTouchAt: 0, now: NOW }), true);
  });

  it("a visible Tablet pulls when touched inside the window", () => {
    const lastTouchAt = NOW - TABLET_TOUCH_WINDOW_MS + 1;
    assert.equal(shouldTimerPull({ hidden: false, isTablet: true, lastTouchAt, now: NOW }), true);
  });

  it("a visible Tablet does not pull at or past the window", () => {
    assert.equal(
      shouldTimerPull({ hidden: false, isTablet: true, lastTouchAt: NOW - TABLET_TOUCH_WINDOW_MS, now: NOW }),
      false,
    );
    assert.equal(shouldTimerPull({ hidden: false, isTablet: true, lastTouchAt: 0, now: NOW }), false);
  });

  it("a Tablet touch after the window passed pulls at once", () => {
    const lastTouchAt = NOW - TABLET_TOUCH_WINDOW_MS;
    assert.equal(shouldTouchPull({ isTablet: true, lastTouchAt, now: NOW }), true);
  });

  it("a Tablet touch inside the window does not pull", () => {
    const lastTouchAt = NOW - TABLET_TOUCH_WINDOW_MS + 1;
    assert.equal(shouldTouchPull({ isTablet: true, lastTouchAt, now: NOW }), false);
  });

  it("a touch on any other login never pulls", () => {
    assert.equal(shouldTouchPull({ isTablet: false, lastTouchAt: 0, now: NOW }), false);
  });
});
