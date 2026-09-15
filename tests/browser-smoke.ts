import { chromium, request } from "@playwright/test";
import assert from "node:assert/strict";
const baseURL = process.env.TEST_URL || "http://localhost:3000";
async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1040 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(baseURL);
  await page.waitForSelector(".transaction-row", { timeout: 30000 });
  await page.screenshot({ path: "/tmp/youjile-desktop.png", fullPage: true });
  assert.equal(
    await page.locator(".error-banner").count(),
    0,
    "dashboard loads without data error",
  );
  await page.getByRole("button", { name: "☕ 18 瑞幸", exact: true }).click();
  assert.equal(await page.getByLabel("快速文字记账").inputValue(), "18 瑞幸");
  await page.getByLabel("快速文字记账").fill("35 午饭");
  await page.locator(".quick-submit").click();
  await page.getByText("又寄了 ¥35.00 🍜", { exact: true }).waitFor();
  await page.goto(baseURL + "/bills");
  await page.waitForSelector(".transaction-row");
  await page.getByLabel("搜索账单").fill("午饭");
  await page.locator(".transaction-row").first().click();
  await page.getByText("编辑这笔生活", { exact: true }).waitFor();
  await page
    .locator(".category-grid button")
    .filter({ hasText: "购物" })
    .click();
  await page.getByRole("button", { name: "保存账单", exact: true }).click();
  await page.waitForSelector(".modal", { state: "detached" });
  await page.locator(".transaction-row").first().click();
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await page.waitForSelector(".undo-toast");
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await page.getByText("账单已恢复", { exact: true }).waitFor();
  await page.goto(baseURL + "/insights");
  await page.waitForSelector(".ranking-row");
  await page.goto(baseURL + "/me");
  await page.waitForSelector(".rules-card");
  assert.ok((await page.locator(".rules-list").innerText()).includes("午饭"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await page.waitForSelector(".transaction-row");
  await page.screenshot({ path: "/tmp/youjile-mobile.png", fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "mobile has no horizontal overflow",
  );
  await page.locator(".bottom-add").click();
  await page.waitForSelector(".modal");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "modal has no overflow",
  );
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  assert.deepEqual(errors, [], "no uncaught browser errors");
  console.log(
    "PASS: desktop/mobile dashboard, quick entry, edit/learning, delete/undo, navigation, no overflow or console errors",
  );
  const anon = await request.newContext({ baseURL });
  assert.equal((await anon.get("/api/transactions")).status(), 401);
  const a = await request.newContext({ baseURL });
  const b = await request.newContext({ baseURL });
  const suffix = Date.now();
  const password = "SafeLocalPassword2026!";
  for (const [client, name] of [
    [a, "a"],
    [b, "b"],
  ] as const) {
    const r = await client.post("/api/auth", {
      data: {
        action: "register",
        email: `test-${name}-${suffix}@example.com`,
        password,
      },
    });
    assert.equal(r.status(), 200, await r.text());
    const data = await (await client.get("/api/transactions")).json();
    assert.equal(data.transactions.length, 0);
  }
  const draft = {
    type: "expense",
    amount: "18.00",
    category: "餐饮",
    subcategory: "咖啡饮品",
    title: "瑞幸",
    date: "2026-05-18",
    source: "text",
    account: "未指定",
  };
  const created = await a.post("/api/transactions", { data: draft });
  assert.equal(created.status(), 201, await created.text());
  const row = await created.json();
  assert.equal(
    (await (await b.get("/api/transactions")).json()).transactions.length,
    0,
  );
  assert.equal(
    (
      await b.put("/api/transactions", {
        data: { ...draft, id: row.id, amount: "999" },
      })
    ).status(),
    404,
  );
  assert.equal(
    (await b.delete(`/api/transactions?id=${row.id}`)).status(),
    404,
  );
  assert.equal(
    (
      await a.post("/api/transactions", { data: { ...draft, amount: "-1" } })
    ).status(),
    400,
  );
  assert.equal(
    (
      await a.put("/api/transactions", {
        data: { ...draft, id: row.id, category: "购物" },
      })
    ).status(),
    200,
  );
  const updated = await (await a.get("/api/transactions")).json();
  assert.equal(updated.rules[0].category, "购物");
  assert.equal(updated.transactions[0].emoji, "🛍️");
  const deleted = await (
    await a.delete(`/api/transactions?id=${row.id}`)
  ).json();
  assert.equal(
    (await (await a.get("/api/transactions")).json()).transactions.length,
    0,
  );
  const restored = await a.post("/api/transactions", { data: deleted });
  assert.equal(restored.status(), 201);
  assert.equal((await restored.json()).id, row.id);
  assert.equal(
    (await a.post("/api/transactions", { data: deleted })).status(),
    409,
  );
  await a.post("/api/auth", { data: { action: "logout" } });
  assert.equal((await a.get("/api/transactions")).status(), 401);
  assert.equal(
    (
      await a.post("/api/auth", {
        data: {
          action: "login",
          email: `test-a-${suffix}@example.com`,
          password: "wrong-password",
        },
      })
    ).status(),
    401,
  );
  assert.equal(
    (
      await a.post("/api/auth", {
        data: {
          action: "login",
          email: `test-a-${suffix}@example.com`,
          password,
        },
      })
    ).status(),
    200,
  );
  assert.equal(
    (await (await a.get("/api/transactions")).json()).transactions.length,
    1,
  );
  console.log(
    "PASS: registration, empty accounts, persistent login, logout, anonymous protection, two-account isolation, CRUD, validation, preference learning, original-id restore and duplicate prevention",
  );
  await a.dispose();
  await b.dispose();
  await anon.dispose();
  await context.close();
  await browser.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
