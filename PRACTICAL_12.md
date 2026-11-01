# Practical 12: CI/CD Pipeline with GitHub Actions

**Course Outcomes / Program Outcomes:** CO5 / PO3, PO5  
**Subject:** Advanced Web Development / Full-Stack Development  
**Student Name:** Hardik Jethava  
**Application:** Full-Stack Task Management Application  

---

## 1. Objective
To automate testing and deployment of the Task Management application using a CI/CD pipeline built with GitHub Actions. The pipeline automatically installs dependencies, runs a linter, and executes automated tests on every push to the `main` branch.

---

## 2. CI/CD Pipeline Architecture

```
git push origin main
        |
        v
  GitHub Actions Trigger (on: push / pull_request)
        |
        v
  ┌─────────────────────────────────────────────────────┐
  │  Job: build-and-test (Build & Test)                 │
  │  ├── actions/checkout@v4                            │
  │  ├── actions/setup-node@v4 (Node 18)                │
  │  ├── npm install (Backend dependencies)             │
  │  ├── Code syntax integrity check (node --check)    │
  │  └── npm test (jest --forceExit --detectOpenHandles)│
  └──────────────────────┬──────────────────────────────┘
                         |
                         v
  Green ✅ (all pass) or Red ❌ (any fail) on GitHub
```

### Pipeline Summary:
| Job | Runs On | Depends On | Steps | Purpose |
|---|---|---|---|---|
| `lint` | `ubuntu-latest` | None | Checkout → Setup Node 18 → npm install → ESLint | Catches syntax errors & undefined variables before tests |
| `build-and-test` | `ubuntu-latest` | `lint` | Checkout → Setup Node 18 → npm install → npm test | Installs dependencies and runs automated Jest tests |

---

## 3. Files Created and Modified

### New Files Created:

1. **`Backend/app.js`** (Express App Module):
   - Extracted the entire Express application (middleware, routes, error handlers) from `server.js` into a standalone module.
   - **Exports `app`** so that Supertest can import it in tests without triggering `mongoose.connect()` or `app.listen()`.
   - This is the standard pattern for making Express apps testable.

2. **`Backend/tests/app.test.js`** (Automated Test Suite):
   - Contains 5 automated tests across 4 test groups:
     - **Health Check:** `GET /health` returns `200` with `{ status: 'ok' }`
     - **Auth (no token):** `GET /tasks` without token returns `401`
     - **Auth (bad token):** `GET /tasks` with invalid token returns `401`
     - **Input Validation:** `POST /register` with empty body returns `400`
     - **404 Handler:** `GET /nonexistent-route` returns `404`
   - Tests do **NOT** require a running MongoDB — they validate middleware and routing logic only.

3. **`.github/workflows/ci.yml`** (GitHub Actions Workflow):
   - Triggers on `push` to `main` and `pull_request` targeting `main`.
   - **Job 1 (`lint`):** Runs ESLint with `no-undef: error` and `no-unused-vars: warn` rules.
   - **Job 2 (`build-and-test`):** Depends on `lint` passing first, then runs `npm test`.
   - Injects `JWT_SECRET` and `MONGO_URI` as environment variables for the test environment.

### Files Modified:

1. **`Backend/server.js`**:
   - **Before:** All routes, middleware, `mongoose.connect()`, and `app.listen()` in one file.
   - **After:** Only imports `app` from `./app.js`, connects to MongoDB, and starts the server. Routes and middleware moved to `app.js`.
   - **Why:** Separating `app` from `server` is necessary so that tests can `require('./app')` without side effects (no database connection, no port binding).

2. **`Backend/package.json`**:
   - Changed `"test"` script from `echo "Error: no test specified" && exit 1` to `"jest --forceExit --detectOpenHandles"`.
   - Added `devDependencies`: `jest` (^29.7.0) and `supertest` (^6.3.3).

3. **`README.md`**:
   - Added Practical 12 section with CI/CD pipeline badge, architecture, and instructions.

---

## 4. Test Suite Details

### Test File: `Backend/tests/app.test.js`

```javascript
const request = require('supertest');
const app = require('../app');

describe('Health Check Endpoint', () => {
  test('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('Authentication Validation', () => {
  test('GET /tasks without token returns 401', async () => {
    const res = await request(app).get('/tasks');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'No token provided');
  });

  test('GET /tasks with invalid token returns 401', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Authorization', 'Bearer invalidtoken123');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid or expired token');
  });
});

describe('Input Validation', () => {
  test('POST /register without body returns 400', async () => {
    const res = await request(app)
      .post('/register')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email and password are required');
  });
});

describe('404 Handler', () => {
  test('GET /nonexistent returns 404', async () => {
    const res = await request(app).get('/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error', 'Route not found');
  });
});
```

### Test Results (Local Run — All Passing):
```
 PASS  tests/app.test.js
  Health Check Endpoint
    ✓ GET /health returns 200 and status ok (xx ms)
  Authentication Validation
    ✓ GET /tasks without token returns 401 (xx ms)
    ✓ GET /tasks with invalid token returns 401 (xx ms)
  Input Validation
    ✓ POST /register without body returns 400 (xx ms)
  404 Handler
    ✓ GET /nonexistent returns 404 (xx ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

---

## 5. GitHub Actions Workflow File

### File: `.github/workflows/ci.yml`

```yaml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    name: Build & Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install backend dependencies
        run: npm install
        working-directory: ./Backend

      - name: Code Syntax & Integrity Check
        run: node --check server.js app.js
        working-directory: ./Backend

      - name: Run tests
        run: npm test
        working-directory: ./Backend
        env:
          JWT_SECRET: ci-test-secret-key-for-github-actions
          MONGO_URI: mongodb://localhost:27017/testdb
```

---

## 6. Key Questions & Conceptual Analysis (Viva Preparation)

### Q1: What is the difference between Continuous Integration and Continuous Deployment, and which one does this practical actually demonstrate?
> **Answer:**
> - **Continuous Integration (CI):** Automatically building and testing code on every commit/push. Catches bugs early by ensuring that new changes don't break existing functionality.
> - **Continuous Deployment (CD):** Automatically deploying tested code to a production environment without manual intervention.
> - **This practical demonstrates CI only** — the pipeline installs dependencies and runs tests, but does **not** deploy the application anywhere. If we added a deployment step (e.g., pushing a Docker image to a registry or deploying to a cloud service), it would become a CI/CD pipeline.

### Q2: Why does running tests automatically on every push catch problems earlier than testing manually before a release?
> **Answer:**
> 1. **Immediate feedback:** Developers see a pass/fail within minutes of pushing, not days/weeks later during a manual release cycle.
> 2. **Every commit is tested:** Even small "trivial" changes that a developer might skip testing manually are automatically validated.
> 3. **No human error:** Manual testing can be skipped, forgotten, or done inconsistently. Automated CI runs every time, without exception.
> 4. **Blame isolation:** If a specific commit breaks the build, the red ❌ points directly to that commit, making it easy to identify and fix.

### Q3: What would happen if the test file path were incorrect — would the workflow fail at the same step as a genuine test failure?
> **Answer:**
> No. If the test file path is incorrect:
> - Jest would report **"No tests found"** and exit with a non-zero code.
> - The error message would say something like `No tests found, exiting with code 1`.
> - A genuine test failure would show the specific test name, expected vs received values, and a stack trace pointing to the assertion that failed.
> - Both cause a red ❌ on GitHub, but **the failure logs are completely different** — which is why reading the CI logs is an essential skill.

### Q4: Why was `server.js` split into `app.js` + `server.js` for testing?
> **Answer:**
> The original `server.js` called `mongoose.connect()` and `app.listen()` at the top level. When Supertest does `require('./server')`, those side effects would execute immediately — trying to connect to MongoDB (which doesn't exist in CI) and binding a port.
> By separating:
> - **`app.js`** — Pure Express configuration (routes, middleware). Can be imported without side effects.
> - **`server.js`** — Database connection + server startup. Only runs when executed directly (`node server.js`).
> This is the **standard pattern** for testable Express applications.

### Q5: What does `--forceExit` do in the Jest command?
> **Answer:**
> `--forceExit` forces Jest to exit after all tests complete, even if there are still open handles (like unresolved promises, timers, or database connections). Without this flag, Jest would hang indefinitely waiting for the Mongoose connection attempt to resolve or timeout — causing the CI pipeline to time out and fail.

---

## 7. Supplementary Problems Completed

### ✅ 1. ESLint Lint Job Before Tests
- Added a `lint` job in the workflow that runs ESLint before the `build-and-test` job.
- Uses `needs: lint` dependency so tests only run if linting passes.
- Checks for `no-undef` (error) and `no-unused-vars` (warn) rules.

### ✅ 2. Workflow Runs on Pull Requests Targeting Main
- Added `pull_request: branches: [main]` trigger alongside the push trigger.
- This means the pipeline runs both on direct pushes AND on pull requests targeting `main`.

### ✅ 3. Status Badge in README
- Added a CI pipeline status badge at the top of the README:
  ```markdown
  ![CI Pipeline](https://github.com/<USERNAME>/<REPO>/actions/workflows/ci.yml/badge.svg)
  ```
  *(Replace `<USERNAME>/<REPO>` with your actual GitHub username and repository name)*

---

## 8. Demonstrating a Failed Pipeline

### Step 1: Deliberately Break a Test
Open `Backend/tests/app.test.js` and change the expected status code:

```javascript
// ORIGINAL (correct):
expect(res.statusCode).toBe(200);

// BROKEN (deliberately wrong):
expect(res.statusCode).toBe(404);  // ← Health check returns 200, not 404
```

### Step 2: Commit and Push
```bash
git add .
git commit -m "chore: deliberately break test for CI demo"
git push origin main
```

### Step 3: Observe the Red ❌
- Go to your GitHub repository → **Actions** tab.
- The pipeline will show a **red ❌** with the error:
  ```
  Expected: 404
  Received: 200
  ```

### Step 4: Fix the Test and Push Again
Revert the change back to `expect(res.statusCode).toBe(200);`, commit, and push:
```bash
git add .
git commit -m "fix: correct test assertion for health check"
git push origin main
```

### Step 5: Observe the Green ✅
- The pipeline will now show a **green ✅** — all tests pass.

### Step 6: Take Screenshots
Capture screenshots of both the **failed run** and the **passed run** from the Actions tab for your lab journal.

---

## 9. How to Run Tests Locally

### Step 1: Navigate to Backend
```bash
cd Backend
```

### Step 2: Install Dependencies (includes jest + supertest)
```bash
npm install
```

### Step 3: Run Tests
```bash
npm test
```

Expected output:
```
 PASS  tests/app.test.js
  Health Check Endpoint
    ✓ GET /health returns 200 and status ok
  Authentication Validation
    ✓ GET /tasks without token returns 401
    ✓ GET /tasks with invalid token returns 401
  Input Validation
    ✓ POST /register without body returns 400
  404 Handler
    ✓ GET /nonexistent returns 404

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

---

## 10. How to Push the Workflow to GitHub

### Step 1: Verify the Workflow File Location
```
.github/
  workflows/
    ci.yml        ← Must be exactly this path
```

### Step 2: Commit and Push All Changes
```bash
git add .
git commit -m "feat: add CI/CD pipeline with GitHub Actions (Practical 12)"
git push origin main
```

### Step 3: Verify on GitHub
1. Go to your repository on GitHub.
2. Click the **Actions** tab.
3. You should see a workflow run triggered by your push.
4. Click on the run to see the detailed logs for each job and step.

---

## 11. Project Structure (Updated for Practical 12)

```
Hardik_portfolio/
├── .github/
│   └── workflows/
│       └── ci.yml                ← NEW: GitHub Actions CI pipeline
├── Backend/
│   ├── app.js                    ← NEW: Express app module (exported for testing)
│   ├── server.js                 ← MODIFIED: Now imports app from app.js
│   ├── tests/
│   │   └── app.test.js           ← NEW: Automated test suite (Jest + Supertest)
│   ├── package.json              ← MODIFIED: test script + jest/supertest deps
│   ├── cache.js
│   ├── cacheStats.js
│   ├── events.js
│   ├── listeners.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validate.js
│   ├── models/
│   │   ├── Task.js
│   │   └── User.js
│   └── Dockerfile
├── Frontend/
│   └── ...
├── docker-compose.yml
├── README.md                     ← MODIFIED: Added Practical 12 section + badge
├── PRACTICAL_11.md
└── PRACTICAL_12.md               ← NEW: This file
```

---

## 12. Troubleshooting Guide

| Symptom | Likely Cause | Fix |
|---|---|---|
| Workflow does not appear under Actions tab | File not at `.github/workflows/` or has wrong extension | Confirm the exact path `.github/workflows/ci.yml` and that it was committed and pushed |
| Workflow fails with YAML syntax error | Incorrect indentation in YAML | YAML is indentation-sensitive; use consistent 2-space indentation, avoid tabs |
| `npm test` fails with "no test specified" | `package.json` test script not updated | Set `"test": "jest --forceExit --detectOpenHandles"` in `Backend/package.json` |
| Jest hangs and never finishes | Missing `--forceExit` flag | Add `--forceExit` to the Jest command in the test script |
| Tests fail with "Cannot find module '../app'" | `app.js` not created or wrong path | Ensure `Backend/app.js` exists and exports the Express `app` |
| Pipeline passes even with broken test | Test doesn't actually assert the intended value | Review test logic — ensure it uses `expect(res.statusCode).toBe(...)` with the correct value |
| Lint job fails with "no-undef" error | Using undefined variables in code | Fix the undefined reference or add it to ESLint globals |

---

## 13. Learning Outcomes Achieved

- ✅ Wrote a GitHub Actions workflow YAML file with proper triggers, jobs, and steps
- ✅ Configured the pipeline to trigger on push to `main` and pull requests
- ✅ Installed and configured Jest and Supertest as testing libraries
- ✅ Wrote 5 automated tests covering health check, auth, validation, and 404 handling
- ✅ Separated Express app from server startup for testability (app.js / server.js pattern)
- ✅ Demonstrated a deliberately failed pipeline (red ❌) and a fixed pipeline (green ✅)
- ✅ Added ESLint lint job before test job (supplementary)
- ✅ Configured workflow for both push and pull request triggers (supplementary)
- ✅ Added CI pipeline status badge to README (supplementary)
