import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { test } from "node:test";
test(
  "Firebase Emulator: admin CRUD and exact schema rules",
  { skip: !process.env.FIREBASE_DATABASE_EMULATOR_HOST, timeout: 15000 },
  async () => {
    const sample = Object.values(
      JSON.parse(readFileSync("database/products.json")).products,
    )[0];
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
            aud: "demo-appgk",
            iss: "https://securetoken.google.com/demo-appgk",
            firebase: { sign_in_provider: "password" },
          }),
        ).toString("base64url"),
        "",
      ].join(".");
    async function request(path, method = "GET", body, uid) {
      const res = await fetch(
        `http://127.0.0.1:9000/${path}.json?ns=demo-appgk${uid ? "&auth=" + token(uid) : ""}`,
        {
          method,
          headers: { "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      const value = await res.json();
      return { status: res.status, value };
    }
    const rules = readFileSync(
      "database/database.rules.json",
      "utf8",
    ).replaceAll("REPLACE_ADMIN_UID", "admin-test");
    const uploaded = await fetch(
      "http://127.0.0.1:9000/.settings/rules.json?ns=demo-appgk",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer owner",
          "Content-Type": "application/json",
        },
        body: rules,
      },
    );
    assert.equal(uploaded.status, 200, await uploaded.text());
    assert.equal((await request("products")).status, 401);
    assert.equal((await request("products", "GET", null, "other")).status, 401);
    assert.equal(
      (await request("products/test", "PUT", sample, "other")).status,
      401,
    );
    let r = await request("products/test", "PUT", sample, "admin-test");
    assert.equal(r.status, 200, JSON.stringify(r));
    assert.equal(
      (await request("products", "GET", null, "admin-test")).status,
      200,
    );
    assert.equal(
      (
        await request(
          "products/test",
          "PUT",
          { ...sample, soluong: 3 },
          "admin-test",
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "products/test",
          "PUT",
          { ...sample, id: "extra" },
          "admin-test",
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await request(
          "products/test",
          "PUT",
          { ...sample, soluong: -1 },
          "admin-test",
        )
      ).status,
      401,
    );
    const missing = { ...sample };
    delete missing.image;
    assert.equal(
      (await request("products/test", "PUT", missing, "admin-test")).status,
      401,
    );
    assert.equal(
      (await request("products/test", "DELETE", null, "admin-test")).status,
      200,
    );
    console.log(
      "PASS: Firebase Emulator rules admin CRUD; guest and nonadmin denied; extra field, missing field and negative quantity denied.",
    );
  },
);
