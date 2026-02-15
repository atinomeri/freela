import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL || "postgresql://freela:freela_password@localhost:5432/freela?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString: databaseUrl })) });

// Strong password that passes zxcvbn validation (score >= 2)
const TEST_PASSWORD = "E2E_TestPass#2026!";

function randSuffix() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

async function setLocaleEn(page: any, baseURL: string) {
  await page.context().addCookies([
    {
      name: "NEXT_LOCALE",
      value: "en",
      url: baseURL
    }
  ]);
}

async function loginViaUi(page: any, baseURL: string, email: string, password: string) {
  await setLocaleEn(page, baseURL);
  const csrfRes = await page.request.get(`${baseURL}/api/auth/csrf`);
  expect(csrfRes.ok()).toBeTruthy();
  const csrfJson = (await csrfRes.json().catch(() => null)) as { csrfToken?: string } | null;
  const csrfToken = csrfJson?.csrfToken ?? "";
  if (!csrfToken) throw new Error("Missing CSRF token for credentials sign-in");

  const signInRes = await page.request.post(`${baseURL}/api/auth/callback/credentials?json=true`, {
    form: { csrfToken, email, password, callbackUrl: `${baseURL}/dashboard`, json: "true" }
  });
  const signInText = await signInRes.text();
  expect(signInRes.ok(), signInText).toBeTruthy();
  if (signInText.includes("CredentialsSignin") || signInText.includes("/auth/login")) {
    throw new Error(`Credentials sign-in failed: ${signInText}`);
  }

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForURL((url: URL) => url.pathname.startsWith("/dashboard"), { timeout: 30_000, waitUntil: "domcontentloaded" });
}

function uniqueDigits(len: number) {
  const raw = `${Date.now()}${Math.floor(Math.random() * 1e9)}`.replace(/[^\d]/g, "");
  const trimmed = raw.slice(-len).padStart(len, "0");
  return trimmed;
}

async function registerFreelancer(baseURL: string, params: { email: string; password: string; category: string; name: string }) {
  const personalId = uniqueDigits(11);
  const phone = `+9955${uniqueDigits(8)}`;
  const res = await fetch(`${baseURL}/api/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      role: "freelancer",
      category: params.category,
      name: params.name,
      personalId,
      birthDate: "1995-01-01",
      phone,
      email: params.email,
      password: params.password,
      confirmPassword: params.password
    })
  });

  const json = (await res.json().catch(() => null)) as { debugVerifyUrl?: string } | null;
  if (res.ok && json?.debugVerifyUrl) {
    const verifyRes = await fetch(json.debugVerifyUrl);
    if (!verifyRes.ok) {
      throw new Error(`Failed to auto-verify email via debug URL (status=${verifyRes.status})`);
    }
  }
  return { status: res.status, json };
}

async function registerEmployer(baseURL: string, params: { email: string; password: string; name: string }) {
  const personalId = uniqueDigits(11);
  const phone = `+9955${uniqueDigits(8)}`;
  const res = await fetch(`${baseURL}/api/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      role: "employer",
      employerType: "individual",
      name: params.name,
      personalId,
      birthDate: "1990-01-01",
      phone,
      email: params.email,
      password: params.password,
      confirmPassword: params.password
    })
  });

  const json = (await res.json().catch(() => null)) as { debugVerifyUrl?: string } | null;
  if (res.ok && json?.debugVerifyUrl) {
    const verifyRes = await fetch(json.debugVerifyUrl);
    if (!verifyRes.ok) {
      throw new Error(`Failed to auto-verify email via debug URL (status=${verifyRes.status})`);
    }
  }
  return { status: res.status, json };
}

async function promoteUserToAdmin(email: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user?.id) throw new Error(`User not found for admin promotion: ${email}`);
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN", isDisabled: false } });
  return user.id;
}

async function getCookieHeader(page: { context: () => { cookies: (url: string) => Promise<Array<{ name: string; value: string }>> } }, baseURL: string) {
  return (await page.context().cookies(baseURL)).map((c) => `${c.name}=${c.value}`).join("; ");
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("register freelancer → browse by category and orders list", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("Missing baseURL");
  test.setTimeout(120_000);
  await setLocaleEn(page, baseURL);

  const suffix = randSuffix();
  const email = `e2e_freelancer_${suffix}@example.com`;
  const password = TEST_PASSWORD;
  const name = `E2E Freelancer ${suffix}`;

  const { status, json } = await registerFreelancer(baseURL, {
    email,
    password,
    category: "IT_DEVELOPMENT",
    name
  });
  expect(status, JSON.stringify(json)).toBe(200);

  await page.goto(`/freelancers?category=IT_DEVELOPMENT`);
  await expect(page.getByRole("heading", { name: "Freelancers" })).toBeVisible();
  await expect(page.getByText(name).first()).toBeVisible();

  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
});

test("registration rejects missing category for freelancers", async ({ baseURL }) => {
  if (!baseURL) throw new Error("Missing baseURL");

  const suffix = randSuffix();
  const email = `e2e_bad_${suffix}@example.com`;
  const personalId = uniqueDigits(11);
  const phone = `+9955${uniqueDigits(8)}`;

  const res = await fetch(`${baseURL}/api/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      role: "freelancer",
      name: "ტესტ",
      personalId,
      birthDate: "1995-01-01",
      phone,
      email,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD
    })
  });

  expect(res.status).toBe(400);
  const json = await res.json().catch(() => null);
  expect(json?.ok).toBe(false);
});

test("employer can cancel and restore a project", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("Missing baseURL");
  test.setTimeout(120_000);

  const suffix = randSuffix();
  const employerEmail = `e2e_employer_${suffix}@example.com`;
  const employerPassword = TEST_PASSWORD;

  expect((await registerEmployer(baseURL, { email: employerEmail, password: employerPassword, name: `E2E Employer ${suffix}` })).status).toBe(200);

  const projectTitle = `E2E Project ${suffix}`;

  await loginViaUi(page, baseURL, employerEmail, employerPassword);

  const employerCookieHeader = (await page.context().cookies(baseURL)).map((c: any) => `${c.name}=${c.value}`).join("; ");
  const createRes = await fetch(`${baseURL}/api/projects`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: employerCookieHeader },
    body: JSON.stringify({
      category: "IT_DEVELOPMENT",
      title: projectTitle,
      description: "This is an e2e project description with enough length.",
      budgetGEL: ""
    })
  });
  const createText = await createRes.text();
  expect(createRes.status, createText).toBe(200);
  const createJson = JSON.parse(createText) as { project?: { id?: string } };
  const projectId = createJson?.project?.id;
  expect(projectId).toBeTruthy();

  await page.goto("/dashboard/projects");
  await expect(page.getByText(projectTitle).first()).toBeVisible();

  const [cancelRes] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === "PATCH" && r.url().includes(`/api/projects/${projectId}/status`)),
    page.getByRole("button", { name: "Cancel order" }).first().click()
  ]);
  expect(cancelRes.status(), await cancelRes.text()).toBe(200);
  await page.reload();
  await expect(page.getByText("Canceled").first()).toBeVisible({ timeout: 30_000 });

  const [restoreRes] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === "PATCH" && r.url().includes(`/api/projects/${projectId}/status`)),
    page.getByRole("button", { name: "Restore order" }).first().click()
  ]);
  expect(restoreRes.status(), await restoreRes.text()).toBe(200);
  await page.reload();
  await expect(page.getByText("Active").first()).toBeVisible({ timeout: 30_000 });
});

test("completion enables employer review", async ({ page, baseURL, browser }) => {
  if (!baseURL) throw new Error("Missing baseURL");
  test.setTimeout(120_000);

  const suffix = randSuffix();
  const employerEmail = `e2e_employer2_${suffix}@example.com`;
  const employerPassword = TEST_PASSWORD;
  const freelancerEmail = `e2e_freelancer2_${suffix}@example.com`;
  const freelancerPassword = TEST_PASSWORD;

  expect((await registerEmployer(baseURL, { email: employerEmail, password: employerPassword, name: `E2E Employer2 ${suffix}` })).status).toBe(200);
  expect((await registerFreelancer(baseURL, { email: freelancerEmail, password: freelancerPassword, category: "IT_DEVELOPMENT", name: `E2E Freelancer2 ${suffix}` })).status).toBe(200);

  const projectTitle = `E2E Completed Project ${suffix}`;

  await loginViaUi(page, baseURL, employerEmail, employerPassword);

  const employerCookieHeader = (await page.context().cookies(baseURL)).map((c: any) => `${c.name}=${c.value}`).join("; ");
  const createRes = await fetch(`${baseURL}/api/projects`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: employerCookieHeader },
    body: JSON.stringify({
      category: "IT_DEVELOPMENT",
      title: projectTitle,
      description: "This is an e2e project that will be completed and reviewed.",
      budgetGEL: ""
    })
  });
  const createText = await createRes.text();
  expect(createRes.status, createText).toBe(200);
  const createJson = JSON.parse(createText) as { project?: { id?: string } };
  const projectId = createJson?.project?.id;
  expect(projectId).toBeTruthy();

  const freelancerPage = await browser.newPage();
  await loginViaUi(freelancerPage, baseURL, freelancerEmail, freelancerPassword);

  // Submit proposal via server API with the authenticated cookies (more reliable than waiting for hydration).
  const cookieHeader = (await freelancerPage.context().cookies(baseURL))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const applyRes = await fetch(`${baseURL}/api/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieHeader },
    body: JSON.stringify({ message: "I can deliver this project quickly. Here is my experience and plan.", priceGEL: "" })
  });
  const applyText = await applyRes.text();
  expect(applyRes.status, applyText).toBe(200);
  const applyJson = JSON.parse(applyText) as { proposal?: { id?: string; freelancerId?: string } };
  const proposalId = applyJson?.proposal?.id;
  const freelancerId = applyJson?.proposal?.freelancerId;
  expect(proposalId).toBeTruthy();
  expect(freelancerId).toBeTruthy();
  await freelancerPage.close();

  const acceptRes = await fetch(`${baseURL}/api/proposals/${proposalId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: employerCookieHeader },
    body: JSON.stringify({ status: "ACCEPTED" })
  });
  const acceptText = await acceptRes.text();
  expect(acceptRes.status, acceptText).toBe(200);

  const completeRes = await fetch(`${baseURL}/api/projects/${projectId}/complete`, { method: "PATCH", headers: { cookie: employerCookieHeader } });
  const completeText = await completeRes.text();
  expect(completeRes.status, completeText).toBe(200);

  const reviewRes = await fetch(`${baseURL}/api/reviews`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: employerCookieHeader },
    body: JSON.stringify({ projectId, freelancerId, rating: 5, comment: "Great work." })
  });
  const reviewText = await reviewRes.text();
  expect(reviewRes.status, reviewText).toBe(200);

  const reviewsRes = await fetch(`${baseURL}/api/reviews?freelancerId=${freelancerId}&take=5`);
  const reviewsJson = (await reviewsRes.json().catch(() => null)) as any;
  expect(reviewsRes.status).toBe(200);
  expect(reviewsJson?.ok).toBe(true);
  // Reviews are publicly visible only after admin approval.
  expect(reviewsJson?.stats?.count).toBe(0);
  expect(reviewsJson?.stats?.avgRating).toBeNull();

  await page.goto(`/dashboard/projects/${projectId}`);
  await expect(page.getByText("Completed").first()).toBeVisible();
  await expect(page.getByText("Review submitted").first()).toBeVisible();
});

test("admin can save content via admin API", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("Missing baseURL");
  test.setTimeout(120_000);

  const suffix = randSuffix();
  const adminEmail = `e2e_admin_content_${suffix}@example.com`;
  const adminPassword = TEST_PASSWORD;

  expect((await registerEmployer(baseURL, { email: adminEmail, password: adminPassword, name: `E2E Admin ${suffix}` })).status).toBe(200);
  await promoteUserToAdmin(adminEmail);
  await loginViaUi(page, baseURL, adminEmail, adminPassword);

  const key = `e2e.smoke.content.${suffix}`;
  const value = `E2E content value ${suffix}`;
  const cookie = await getCookieHeader(page, baseURL);

  const res = await fetch(`${baseURL}/api/admin/content`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ updates: [{ key, locale: "en", value }] })
  });
  const text = await res.text();
  expect(res.status, text).toBe(200);

  const saved = await prisma.siteContent.findUnique({ where: { key_locale: { key, locale: "en" } } });
  expect(saved?.value).toBe(value);
});

test("admin can reply to support thread", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("Missing baseURL");
  test.setTimeout(120_000);

  const suffix = randSuffix();
  const adminEmail = `e2e_admin_support_${suffix}@example.com`;
  const adminPassword = TEST_PASSWORD;

  expect((await registerEmployer(baseURL, { email: adminEmail, password: adminPassword, name: `E2E Support Admin ${suffix}` })).status).toBe(200);
  const adminUserId = await promoteUserToAdmin(adminEmail);

  const visitorToken = `e2e_support_token_${suffix}`;
  const visitorBody = `Visitor message ${suffix}`;
  const openThreadRes = await fetch(`${baseURL}/api/support/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: visitorToken, body: visitorBody })
  });
  const openThreadText = await openThreadRes.text();
  expect(openThreadRes.status, openThreadText).toBe(200);
  const openThreadJson = JSON.parse(openThreadText) as { threadId?: string };
  const threadId = openThreadJson.threadId;
  expect(threadId).toBeTruthy();

  await loginViaUi(page, baseURL, adminEmail, adminPassword);
  const cookie = await getCookieHeader(page, baseURL);
  const adminReplyBody = `Admin reply ${suffix}`;

  const replyRes = await fetch(`${baseURL}/api/admin/support/threads/${encodeURIComponent(String(threadId))}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ body: adminReplyBody })
  });
  const replyText = await replyRes.text();
  expect(replyRes.status, replyText).toBe(200);

  const savedReply = await prisma.supportMessage.findFirst({
    where: { threadId: String(threadId), senderUserId: adminUserId, senderRole: "ADMIN", body: adminReplyBody },
    select: { id: true }
  });
  expect(savedReply?.id).toBeTruthy();
});

test("message thread supports file attachments", async ({ page, baseURL, browser }) => {
  if (!baseURL) throw new Error("Missing baseURL");
  test.setTimeout(120_000);

  const suffix = randSuffix();
  const employerEmail = `e2e_employer_upload_${suffix}@example.com`;
  const employerPassword = TEST_PASSWORD;
  const freelancerEmail = `e2e_freelancer_upload_${suffix}@example.com`;
  const freelancerPassword = TEST_PASSWORD;

  expect((await registerEmployer(baseURL, { email: employerEmail, password: employerPassword, name: `E2E Employer Upload ${suffix}` })).status).toBe(200);
  expect(
    (await registerFreelancer(baseURL, {
      email: freelancerEmail,
      password: freelancerPassword,
      category: "IT_DEVELOPMENT",
      name: `E2E Freelancer Upload ${suffix}`
    })).status
  ).toBe(200);

  await loginViaUi(page, baseURL, employerEmail, employerPassword);

  const projectTitle = `E2E Upload Project ${suffix}`;
  const employerCookieHeader = (await page.context().cookies(baseURL)).map((c: any) => `${c.name}=${c.value}`).join("; ");
  const createRes = await fetch(`${baseURL}/api/projects`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: employerCookieHeader },
    body: JSON.stringify({
      category: "IT_DEVELOPMENT",
      title: projectTitle,
      description: "Attachment e2e project description with enough length for validation.",
      budgetGEL: ""
    })
  });
  const createText = await createRes.text();
  expect(createRes.status, createText).toBe(200);
  const createJson = JSON.parse(createText) as { project?: { id?: string } };
  const projectId = createJson?.project?.id;
  expect(projectId).toBeTruthy();

  const freelancerPage = await browser.newPage();
  await loginViaUi(freelancerPage, baseURL, freelancerEmail, freelancerPassword);
  const freelancerCookieHeader = (await freelancerPage.context().cookies(baseURL))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const applyRes = await fetch(`${baseURL}/api/projects/${projectId}/apply`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: freelancerCookieHeader },
    body: JSON.stringify({ message: "I can handle this attachment test and deliver quickly with clear communication.", priceGEL: "" })
  });
  const applyText = await applyRes.text();
  expect(applyRes.status, applyText).toBe(200);
  const applyJson = JSON.parse(applyText) as { proposal?: { freelancerId?: string } };
  const freelancerId = applyJson?.proposal?.freelancerId;
  expect(freelancerId).toBeTruthy();
  await freelancerPage.close();

  const bootstrapRes = await fetch(`${baseURL}/api/threads/bootstrap/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: employerCookieHeader },
    body: JSON.stringify({
      body: "Bootstrapping thread before attachment upload test.",
      projectId,
      freelancerId
    })
  });
  const bootstrapText = await bootstrapRes.text();
  expect(bootstrapRes.status, bootstrapText).toBe(200);
  const bootstrapJson = JSON.parse(bootstrapText) as { threadId?: string };
  const threadId = bootstrapJson?.threadId;
  expect(threadId).toBeTruthy();

  await page.goto(`/dashboard/messages/${threadId}`);
  await expect(page.getByRole("heading", { name: projectTitle })).toBeVisible();

  const fileName = `e2e-upload-${suffix}.txt`;
  await page.locator('input[type="file"]').setInputFiles({
    name: fileName,
    mimeType: "text/plain",
    buffer: Buffer.from(`Attachment upload check ${suffix}`, "utf8")
  });
  await expect(page.getByText(fileName)).toBeVisible();

  const [sendRes] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(`/api/threads/${threadId}/messages`)),
    page.getByRole("button", { name: "Send" }).click()
  ]);
  expect(sendRes.status(), await sendRes.text()).toBe(200);

  await expect(page.getByRole("link", { name: new RegExp(fileName) }).first()).toBeVisible({ timeout: 30_000 });
});
