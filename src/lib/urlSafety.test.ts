import test from "node:test";
import assert from "node:assert/strict";
import { checkUrl, isSafeIpAddress } from "./urlSafety";

test("unsafe IPv4 addresses are refused", () => {
  for (const ip of [
    "0.0.0.0", "0.1.2.3", "10.0.0.1", "100.64.0.1", "100.127.255.255",
    "127.0.0.1", "127.255.0.1", "169.254.169.254", "172.16.0.1",
    "172.31.255.255", "192.0.0.5", "192.168.1.1", "198.18.0.1",
    "198.19.255.255", "224.0.0.1", "240.0.0.1", "255.255.255.255",
  ]) {
    assert.equal(isSafeIpAddress(ip), false, ip);
  }
});

test("public IPv4 addresses are allowed, including range edges", () => {
  for (const ip of [
    "8.8.8.8", "1.1.1.1", "100.63.255.255", "100.128.0.1", "172.15.0.1",
    "172.32.0.1", "192.0.2.1", "192.169.0.1", "198.17.0.1", "198.20.0.1",
    "223.255.255.255",
  ]) {
    assert.equal(isSafeIpAddress(ip), true, ip);
  }
});

test("unsafe IPv6 addresses are refused", () => {
  for (const ip of [
    "::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "febf::1",
    "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:169.254.169.254",
    "::ffff:a9fe:a9fe", "::ffff:10.0.0.1", "64:ff9b::7f00:1",
    "64:ff9b::169.254.169.254", "::127.0.0.1", "[::1]", "2002:7f00:1::1",
    "not-an-ip", "::ffff:zzzz:1", "1:2:3:4:5:6:7:8:9",
  ]) {
    assert.equal(isSafeIpAddress(ip), false, ip);
  }
});

test("public IPv6 addresses are allowed", () => {
  for (const ip of [
    "2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8",
    "64:ff9b::808:808", "[2606:4700:4700::1111]",
  ]) {
    assert.equal(isSafeIpAddress(ip), true, ip);
  }
});

test("checkUrl refuses unsafe destinations", () => {
  for (const u of [
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost",
    "http://localhost./",
    "http://foo.localhost/",
    "http://LOCALHOST:80/",
    "http://127.0.0.1:3000",
    "http://[::1]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:7f00:1]/",
    "http://[fe80::1]/",
    "http://[fd00::1]/",
    "http://2130706433/",
    "http://0x7f.1/",
    "http://0177.0.0.1/",
    "http://127.1/",
    "http://0/",
    "http://10.1.2.3/",
    "http://user:pw@example.com/",
    "http://user@example.com/",
    "ftp://example.com/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://example.com:8080/",
    "https://example.com:22/",
    "not a url",
  ]) {
    assert.equal(checkUrl(u).ok, false, u);
  }
});

test("checkUrl allows ordinary public links", () => {
  for (const u of [
    "https://example.com/recipe",
    "http://example.com/",
    "https://example.com:443/x",
    "http://example.com:80/x",
    "https://www.tiktok.com/oembed?url=abc",
    "http://8.8.8.8/",
    "http://[2606:4700:4700::1111]/",
  ]) {
    const result = checkUrl(u);
    assert.equal(result.ok, true, u);
  }
});

test("checkUrl accepts a URL object and returns it", () => {
  const url = new URL("https://example.com/a");
  const result = checkUrl(url);
  assert.equal(result.ok && result.url.href, "https://example.com/a");
});
