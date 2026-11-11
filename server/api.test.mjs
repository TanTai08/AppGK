import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "./index.mjs";
test("authentication, tenant isolation, CRUD, validation, persistence and logout", async () => {
  const directory = mkdtempSync(join(tmpdir(), "appgk-"));
  const path = join(directory, "test.db");
  let { app, db } = createApp(path);
  let server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  let base = `http://127.0.0.1:${server.address().port}/api`;
  async function api(route, method = "GET", body, token) {
    const res = await fetch(base + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: res.status,
      data: res.status === 204 ? null : await res.json(),
    };
  }
  try {
    assert.equal((await api("/products")).status, 401);
    const account = {
      name: "Tai",
      email: "tai@example.com",
      password: "password123",
    };
    const register = await api("/auth/register", "POST", account);
    assert.equal(register.status, 200);
    const token = register.data.token;
    assert.equal((await api("/auth/register", "POST", account)).status, 409);
    assert.equal(
      (await api("/auth/login", "POST", { ...account, password: "wrong" }))
        .status,
      401,
    );
    assert.equal((await api("/auth/login", "POST", account)).status, 200);
    assert.equal(
      (await api("/auth/me", "GET", undefined, token)).data.email,
      account.email,
    );
    const product = { name: "Cà phê", sku: "cf01", price: 45000, quantity: 10 };
    assert.equal(
      (await api("/products", "POST", { ...product, price: -1 }, token)).status,
      400,
    );
    const created = await api("/products", "POST", product, token);
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal(created.data.sku, "CF01");
    assert.equal((await api("/products", "POST", product, token)).status, 409);
    const other = (
      await api("/auth/register", "POST", {
        ...account,
        email: "other@example.com",
      })
    ).data.token;
    assert.deepEqual(
      (await api("/products", "GET", undefined, other)).data,
      [],
    );
    assert.equal(
      (await api(`/products/${id}`, "PUT", product, other)).status,
      404,
    );
    assert.equal(
      (await api(`/products/${id}`, "DELETE", undefined, other)).status,
      404,
    );
    assert.equal(
      (await api(`/products/${id}`, "PUT", { ...product, quantity: 3 }, token))
        .data.quantity,
      3,
    );
    await new Promise((resolve) => server.close(resolve));
    db.close();
    ({ app, db } = createApp(path));
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}/api`;
    assert.equal(
      (await api("/products", "GET", undefined, token)).data[0].quantity,
      3,
    );
    assert.equal(
      (await api(`/products/${id}`, "DELETE", undefined, token)).status,
      204,
    );
    assert.deepEqual(
      (await api("/products", "GET", undefined, token)).data,
      [],
    );
    assert.equal(
      (await api("/auth/logout", "POST", undefined, token)).status,
      204,
    );
    assert.equal((await api("/products", "GET", undefined, token)).status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
