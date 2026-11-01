# Practical 13: AI API Integration into a Web Application

**Course Outcomes / Program Outcomes:** CO6 / PO3, PO5, PO12  
**Subject:** Advanced Web Development / Full-Stack Development  
**Student Name:** Hardik Jethava  
**Application:** Full-Stack Task Management Application  

---

## 1. Objective
To securely integrate an external AI service (OpenAI API / Google Gemini API) into the existing full-stack Task Management application, implement graceful degradation when external services fail, and understand the core principles of responsible AI, user privacy, and rate limiting.

---

## 2. Architecture & Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                          React Frontend                                │
│  1. User enters task title (e.g., "Prepare client demo")               │
│  2. User clicks "✨ Auto-fill with AI" button                          │
│  3. UI shows loading state ("Thinking... ⏳") & 15s cooldown timer      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ POST /api/ai/generate-description
                                   │ Header: Authorization: Bearer <JWT>
                                   │ Body: { "title": "Prepare client demo" }
                                   v
┌────────────────────────────────────────────────────────────────────────┐
│                     Express Backend (Port 5000)                        │
│  1. JWT Auth Middleware verifies user identity                         │
│  2. In-memory Rate Limiter checks cooldown (1 call / 15s per user)     │
│  3. Reads OPENAI_API_KEY / GEMINI_API_KEY server-side only (.env)      │
│  4. Dispatches request to external AI API with timeout guard           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  │ External AI Call                │
                  v                                 v
        ┌───────────────────┐             ┌───────────────────┐
        │    OpenAI API     │     OR      │ Google Gemini API │
        │   (gpt-4o-mini)   │             │ (gemini-1.5-flash)│
        └─────────┬─────────┘             └─────────┬─────────┘
                  │                                 │
                  └────────────────┬────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
     [HTTP 200 Success]                       [API Failure / Timeout / No Key]
              │                                         │
              v                                         v
   Parse AI JSON response                     Catch error (try/catch)
   Extract description & priority             Generate smart rule-based fallback
   aiGenerated: true, fallback: false         aiGenerated: false, fallback: true
              │                                         │
              └────────────────────┬────────────────────┘
                                   │
                                   v
┌────────────────────────────────────────────────────────────────────────┐
│                        React UI Display                                │
│  • Description auto-filled in editable textarea                        │
│  • Priority selector auto-set (🟢 Low / 🟡 Medium / 🔴 High)           │
│  • Notice displayed with Responsible AI disclaimer:                    │
│    "🤖 Suggestions are AI-generated. Review before saving."            │
│  • User reviews, edits, and clicks "+ Add Task"                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Files Created and Modified

### New Files Created:

1. **`Backend/aiService.js`** (AI Integration & Fallback Service Module):
   - Implements `generateTaskDescription(title)` supporting both **OpenAI** (`gpt-4o-mini`) and **Google Gemini** (`gemini-1.5-flash`).
   - Stores API keys securely on the server; never exposed to the client.
   - Includes timeout guards (`AbortSignal.timeout(8000)`) preventing hanging requests.
   - Implements **graceful degradation**: if the API key is invalid, missing, rate-limited, or network fails, catches the error and generates a contextual, rule-based fallback suggestion without throwing unhandled exceptions.
   - Implements **in-memory rate limiting** (`checkRateLimit`) preventing abuse (max 1 request per 15s per user).

2. **`PRACTICAL_13.md`** (This File):
   - Comprehensive documentation covering architecture, security, responsible AI considerations, viva questions, and step-by-step verification.

### Files Modified:

1. **`Backend/app.js`**:
   - Added `POST /api/ai/generate-description` route protected by `authMiddleware`.
   - Integrated rate-limiting check returning `HTTP 429 Too Many Requests` with a `retryAfter` value when users exceed the quota.
   - Returns structured JSON containing `{ description, priority, fallback, source, aiGenerated }`.

2. **`Backend/tests/app.test.js`**:
   - Added automated test suite for the AI endpoint:
     - Verified `401 Unauthorized` when called without token.
     - Verified `400 Bad Request` when called without a title.
     - Verified `200 OK` with valid token returning `{ description, priority }` via graceful fallback.

3. **`Frontend/src/api.js`**:
   - Added `generateAiDescription(title)` helper sending authenticated POST requests to `/api/ai/generate-description`.
   - Handled HTTP 429 rate limit responses with descriptive error messages.

4. **`Frontend/src/pages/Tasks.jsx`**:
   - Added **"✨ Auto-fill with AI"** button with a loading state (`Thinking... ⏳`).
   - Added an **editable description textarea** that auto-fills from AI response.
   - Added a **priority dropdown** (`Low`, `Medium`, `High`) that auto-updates based on AI suggestion.
   - Added a **15-second cooldown timer** on the button to prevent rapid-fire API spam.
   - Added a visible **Responsible AI disclaimer** banner informing the user that suggestions are AI-generated and must be reviewed.
   - Updated task list rendering to show priority badges and task descriptions.

5. **`Backend/package.json`**:
   - Added `"openai": "^4.86.1"` dependency.

6. **`Backend/.env.example` & `Backend/.env`**:
   - Added `OPENAI_API_KEY` and `GEMINI_API_KEY` environment variable placeholders.

7. **`README.md`**:
   - Added Practical 13 section documenting features, architecture, and verification instructions.

---

## 4. Responsible AI & Security Considerations

### 1. Server-Side Key Secrecy
- **Rule:** The API key (`OPENAI_API_KEY` or `GEMINI_API_KEY`) is stored **exclusively in `.env`** on the backend server.
- **Why:** If the key were called from the React frontend, it would be exposed in the browser's JavaScript bundle or visible in the browser's **Network tab**, allowing anyone to steal the key and exhaust the account quota.
- **Implementation:** The frontend only calls our backend route (`/api/ai/generate-description`), which proxies the call server-to-server.

### 2. Privacy & Data Governance (What Data Should Never Be Sent)
- **Safe Data to Send:** Generic task titles (e.g., `"Update documentation"`, `"Prepare presentation slides"`).
- **Sensitive Data that MUST NEVER be sent to external AI APIs:**
  - Passwords, JWT secrets, authentication tokens, or session IDs.
  - Personally Identifiable Information (PII) such as Aadhaar numbers, Social Security numbers, bank details, credit card numbers, or medical records.
  - Internal proprietary source code containing business secrets or API credentials.

### 3. Graceful Degradation
- A third-party AI service is an external dependency outside our control (subject to outages, 401 invalid keys, 429 rate limits, and network latency).
- Our implementation wraps all AI calls in a `try/catch` block with an 8-second timeout guard. If the call fails, the backend returns a smart fallback description instead of crashing or returning HTTP 500.

### 4. Human in the Loop (Editable Suggestions)
- AI output is **never treated as final or immutable**.
- The generated description is populated into an **editable textarea**, giving the user full autonomy to modify, accept, or discard the suggestion before saving.

---

## 5. API Endpoint Specifications

### `POST /api/ai/generate-description`

- **Headers:** `Authorization: Bearer <jwt_token>`, `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "title": "Fix critical authentication bug in production"
  }
  ```

- **Successful AI Response (`HTTP 200`):**
  ```json
  {
    "description": "Investigate root cause of authentication failure, patch JWT verification, and run regression tests.",
    "priority": "high",
    "fallback": false,
    "source": "openai",
    "aiGenerated": true
  }
  ```

- **Fallback Response on Failure / Missing Key (`HTTP 200`):**
  ```json
  {
    "description": "Investigate root cause, reproduce the issue, apply fix, and verify with automated regression tests for \"Fix critical authentication bug in production\".",
    "priority": "high",
    "fallback": true,
    "source": "fallback",
    "aiGenerated": false,
    "message": "AI API key not configured or service unreachable. Generated via smart fallback."
  }
  ```

- **Rate Limit Response (`HTTP 429`):**
  ```json
  {
    "error": "Rate limit: Please wait 12s before requesting another AI description.",
    "retryAfter": 12
  }
  ```

---

## 6. Key Questions & Conceptual Analysis (Viva Preparation)

### Q1: Why must the AI API key be called from the backend rather than directly from the React frontend?
> **Answer:**
> 1. **Client-Side Exposure:** Any code running in the user's browser (React) is completely public. Inspecting the browser's DevTools Network tab or JavaScript bundle would instantly expose the raw API key.
> 2. **Financial and Quota Abuse:** If an attacker extracts the key, they can make unauthorized requests, exhausting credits and running up bills.
> 3. **Governance and Control:** Calling the API through an Express backend allows us to authenticate the user first, enforce server-side rate limits, log usage, and sanitize input before sending it to the external model.

### Q2: What does 'graceful degradation' mean in this context, and why does it matter?
> **Answer:**
> - **Graceful degradation** is an architectural design principle where a system continues to operate in a reduced or fallback capacity when an external component fails, rather than crashing completely.
> - Because OpenAI and Gemini are third-party services, they may experience outages, rate limits, or billing expirations. By catching errors and returning a rule-based fallback description with `fallback: true`, the user can still create tasks normally without experiencing app crashes or broken forms.

### Q3: What are the privacy and governance implications of sending task data to an external AI API?
> **Answer:**
> - When sending data to an external AI API, that data leaves the organization's boundary and is processed on third-party servers.
> - **Compliance & Regulations:** Sending confidential customer data or PII violates data protection laws (like GDPR, DPDP Act, HIPAA).
> - **Rule:** Only send non-sensitive task titles. Never send passwords, financial data, personal health information, or confidential system secrets to external models.

### Q4: Why is a cooldown or rate limit necessary for AI endpoints?
> **Answer:**
> - External AI APIs charge per token or have strict queries-per-minute (QPM) limits on free tiers.
> - Without rate limiting, a single user or bot could rapidly click the button, exhausting the entire laboratory's shared API quota or triggering 429 errors for all students.
> - The 15-second cooldown protects both client and server resources.

---

## 7. Supplementary Problems Completed

### ✅ 1. Frontend Loading State
- The "✨ Auto-fill with AI" button displays `"Thinking... ⏳"` with disabled state while the HTTP request is in-flight.

### ✅ 2. Client & Server Rate Limiting
- **Server:** `Backend/aiService.js` tracks timestamps per user ID and returns `HTTP 429` if called within 15 seconds.
- **Client:** The button shows a real-time countdown timer (`Wait (15s)`) preventing rapid re-triggering.

### ✅ 3. Visible Responsible AI Disclaimer
- When an AI suggestion is loaded, a styled disclaimer banner explicitly states:
  > *🤖 Responsible AI: Suggestions are AI-generated. Review before saving.*

### ✅ 4. Priority Auto-Suggestion
- The AI endpoint suggests a priority (`low`, `medium`, `high`) based on the task title and automatically sets the `<select>` dropdown.

---

## 8. Step-by-Step Testing & Verification Guide

### Step 1: Run Backend Tests
In your terminal:
```bash
cd Backend
npm test
```
**Expected Output:**
```
PASS tests/app.test.js
  ✓ GET /health returns 200 and status ok
  ✓ GET /tasks without token returns 401
  ✓ GET /tasks with invalid token returns 401
  ✓ POST /register without body returns 400
  ✓ GET /nonexistent returns 404
  ✓ POST /api/ai/generate-description without token returns 401
  ✓ POST /api/ai/generate-description without title returns 400
  ✓ POST /api/ai/generate-description returns 200 with description and priority (graceful fallback)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

### Step 2: Test in the Browser UI
1. Start the application:
   ```bash
   # From root:
   docker compose up --build
   # OR locally:
   # Terminal 1: cd Backend && npm start
   # Terminal 2: cd Frontend && npm run dev
   ```
2. Open **[http://localhost:5173](http://localhost:5173)**.
3. Log in or create a test account.
4. In the **"My Tasks"** section:
   - Enter a title: `Deploy Docker container to production`
   - Click **"✨ Auto-fill with AI"**.
   - Observe the loading state (`Thinking... ⏳`).
   - Notice the description textarea is auto-populated.
   - Notice the priority is auto-selected as `high`.
   - Notice the AI disclaimer banner and the 15-second countdown timer.
5. Click **"+ Add Task"** to save the task.

### Step 3: Test the Failure Path (Graceful Degradation Live Demo)
1. In `Backend/.env`, set an invalid key:
   ```env
   OPENAI_API_KEY=sk-invalid-broken-key-for-testing
   ```
2. Restart backend and click **"✨ Auto-fill with AI"** in the UI.
3. Observe that the app **does not crash** — it displays the fallback notification and fills in a smart fallback description.

---

## 9. Troubleshooting Guide

| Symptom | Likely Cause | Fix |
|---|---|---|
| 401 Unauthorized from AI API | Invalid or expired OpenAI/Gemini API key | Verify the API key in `Backend/.env` matches the provider format |
| 429 Too Many Requests | Rate limit cooldown active | Wait 15 seconds for the countdown timer to finish before trying again |
| API key visible in browser DevTools | AI called directly from React | Ensure the frontend only calls `/api/ai/generate-description`, never external endpoints |
| App crashes when AI call fails | Missing error handling | Ensure all calls in `aiService.js` are wrapped in `try/catch` returning fallback objects |
| Button stays disabled | Cooldown timer state | Wait for countdown to reach 0; refresh the page if state desynchronized |

---

## 10. Learning Outcomes Achieved

- ✅ Integrated an external AI service securely using server-side environment variables
- ✅ Designed and verified graceful degradation ensuring zero application downtime
- ✅ Built rate-limiting mechanisms on both frontend and backend
- ✅ Implemented human-in-the-loop editable suggestions with transparent AI disclaimers
- ✅ Added comprehensive automated test coverage for the AI endpoint
