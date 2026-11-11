import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";

test(
  "Firestore Emulator: admin CRUD, images and exact four-field schema",
  { skip: !process.env.FIRESTORE_EMULATOR_HOST, timeout: 30000 },
  async () => {
    // Deliberately fixed local endpoint and demo project; never contact production.
    const host = "http://127.0.0.1:8080";
    const project = "demo-appgk";
    const base = `${host}/v1/projects/${project}/databases/(default)/documents`;
    const defaults = JSON.parse(
      readFileSync("src/firebase.config.json", "utf8"),
    );
    const rules = readFileSync("database/firestore.rules", "utf8").replaceAll(
      defaults.adminUid,
      "admin-test",
    );
    const uploaded = await fetch(
      `${host}/emulator/v1/projects/${project}:securityRules`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: { files: [{ name: "firestore.rules", content: rules }] },
        }),
      },
    );
    assert.equal(uploaded.status, 200, await uploaded.text());
    const token = (uid) =>
      [
        Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
          "base64url",
        ),
        Buffer.from(
          JSON.stringify({
            sub: uid,
            user_id: uid,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            aud: project,
            iss: `https://securetoken.google.com/${project}`,
            firebase: { sign_in_provider: "password" },
          }),
        ).toString("base64url"),
        "",
      ].join(".");
    const fields = (data) =>
      Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          typeof value === "number"
            ? Number.isInteger(value)
              ? { integerValue: String(value) }
              : { doubleValue: value }
            : { stringValue: value },
        ]),
      );
    async function request(path, method = "GET", data, uid) {
      const res = await fetch(`${base}/${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(uid ? { Authorization: `Bearer ${token(uid)}` } : {}),
        },
        ...(data ? { body: JSON.stringify({ fields: fields(data) }) } : {}),
      });
      const text = await res.text();
      return { status: res.status, data: text ? JSON.parse(text) : null };
    }
    const sample = Object.values(
      JSON.parse(readFileSync("database/products.json", "utf8")).products,
    )[0];
    assert.equal((await request("products")).status, 403);
    assert.equal((await request("products", "GET", null, "other")).status, 403);
    assert.equal(
      (await request("products/rule-test", "PATCH", sample, "other")).status,
      403,
    );
    const created = await request(
      "products/rule-test",
      "PATCH",
      sample,
      "admin-test",
    );
    assert.equal(created.status, 200, JSON.stringify(created));
    assert.equal(
      (await request("products", "GET", null, "admin-test")).status,
      200,
    );
    const read = await request("products/rule-test", "GET", null, "admin-test");
    assert.equal(read.data.fields.image.stringValue, sample.image);
    assert.equal(
      (
        await request(
          "products/rule-test",
          "PATCH",
          { ...sample, soluong: 3 },
          "admin-test",
        )
      ).status,
      200,
    );
    for (const invalid of [
      { ...sample, id: "extra" },
      { ...sample, soluong: -1 },
      { ...sample, soluong: 1.5 },
      { ...sample, price: -1 },
      { ...sample, image: "file:///local.png" },
    ]) {
      assert.equal(
        (await request("products/rule-test", "PATCH", invalid, "admin-test"))
          .status,
        403,
      );
    }
    const missing = { ...sample };
    delete missing.image;
    assert.equal(
      (await request("products/missing", "PATCH", missing, "admin-test"))
        .status,
      403,
    );
    assert.equal(
      (await request("products/rule-test", "DELETE", null, "other")).status,
      403,
    );
    assert.equal(
      (await request("products/rule-test", "DELETE", null, "admin-test"))
        .status,
      200,
    );
    assert.equal(
      (await request("unrelated/test", "PATCH", sample, "admin-test")).status,
      403,
    );
  },
);
