import { test, expect } from "@playwright/test";

function randSuffix() {
  return `${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
}

async function fillStable(locator: any, value: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await locator.fill(value);
    const v = await locator.inputValue().catch(() => "");
    if (v === value) return;
  }
  throw new Error(`Failed to fill input reliably: expected "${value}".`);
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
  await page.goto("/auth/login");

  const emailInput = page.getByLabel("Email");
  await emailInput.waitFor({ timeout: 30_000 });
  await fillStable(emailInput, email);

  const passwordInput = page.getByLabel("Password");
  await passwordInput.waitFor({ timeout: 30_000 });
  await fillStable(passwordInput, password);

  await page.getByRole("button", { name: "Log in" }).click();
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

test("register freelancer → browse by category → login works", async ({ page, baseURL }) => {
  if (!baseURL) throw new Error("Missing baseURL");
  await setLocaleEn(page, baseURL);

  const suffix = randSuffix();
  const email = `e2e_freelancer_${suffix}@example.com`;
  const password = "password123";
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

  await loginViaUi(page, baseURL, email, password);
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto("/projects");
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
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
      password: "password123",
      confirmPassword: "password123"
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
  const employerPassword = "password123";

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
    page.getByRole("button", { name: "Cancel project" }).first().click()
  ]);
  expect(cancelRes.status(), await cancelRes.text()).toBe(200);
  await page.reload();
  await expect(page.getByText("Canceled").first()).toBeVisible({ timeout: 30_000 });

  const [restoreRes] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === "PATCH" && r.url().includes(`/api/projects/${projectId}/status`)),
    page.getByRole("button", { name: "Restore project" }).first().click()
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
  const employerPassword = "password123";
  const freelancerEmail = `e2e_freelancer2_${suffix}@example.com`;
  const freelancerPassword = "password123";

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
  expect(reviewsJson?.stats?.count).toBe(1);
  expect(reviewsJson?.stats?.avgRating).toBe(5);

  await page.goto(`/dashboard/projects/${projectId}`);
  await expect(page.getByText("Completed").first()).toBeVisible();
  await expect(page.getByText("Review submitted").first()).toBeVisible();
});
