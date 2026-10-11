# Full-Stack Task Manager Application

## Practical 11: Containerization with Docker and Docker Compose
**CO/PO:** CO5 / PO3, PO5  
**Objective:** Containerize the full-stack Task Management application using Docker and orchestrate services (Frontend, Backend, and MongoDB) using Docker Compose.

---

### Quick Start: Run Everything with Docker Compose

Ensure Docker Desktop is running on your machine, then run:

```bash
docker compose up --build
```

- **Frontend App:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000](http://localhost:5000)
- **Backend Health Check:** [http://localhost:5000/health](http://localhost:5000/health)
- **MongoDB:** `localhost:27017` (with persistent named volume `mongo-data`)

To stop all services:
```bash
docker compose down
```

---

### Practical 11 Architecture & Multi-Container Topology

```
                  docker-compose.yml
 ┌────────────────────────────────────────────────────────┐
 │                      app-network                       │
 │                    (bridge driver)                     │
 │                                                        │
 │   ┌──────────────┐     ┌──────────────┐     ┌────────┐ │
 │   │   frontend   │────►│   backend    │────►│mongodb │ │
 │   │ (React Vite) │     │(Node/Express)│     │(mongo) │ │
 │   └──────┬───────┘     └──────┬───────┘     └───┬────┘ │
 └──────────┼────────────────────┼─────────────────┼──────┘
            │                    │                 │
      Port 5173:5173       Port 5000:5000    Port 27017:27017
            │                    │                 │
      [Host Browser]       [Host / Postman]   [Host / Compass]
                                                   │
                                            [Named Volume]
                                            mongo-data:/data/db
```

#### Services Summary:
| Service | Build Context / Image | Host Port : Container Port | Depends On | Purpose |
|---|---|---|---|---|
| `frontend` | `./Frontend` (`Dockerfile`) | `5173:5173` | `backend` | React client built & served via Vite preview |
| `backend` | `./Backend` (`Dockerfile`) | `5000:5000` | `mongodb` | Node/Express API connected via internal Docker DNS |
| `mongodb` | `mongo:latest` | `27017:27017` | - | MongoDB database with persistent volume `mongo-data` |

---

# Previous Practical References

## Practical 9: In-Memory Caching and Query Optimization
## CO/PO: CO2, CO4 / PO3, PO5
1. [Architecture Diagram](#architecture-diagram)
2. [Technologies Used](#technologies-used)
3. [Files Changed / Added](#files-changed--added)
4. [Implementation Details](#implementation-details)
5. [How Caching Works (Flow)](#how-caching-works-flow)
6. [Cache Keys & TTL](#cache-keys--ttl)
7. [API Endpoints (Caching Related)](#api-endpoints-caching-related)
8. [Response Time Comparison (Cached vs Uncached)](#response-time-comparison-cached-vs-uncached)
9. [Screenshots Guide](#screenshots-guide-for-practical-file)
10. [Supplementary Problems Completed](#supplementary-problems-completed)
11. [Key Questions & Answers (Viva)](#key-questions--answers-viva)
12. [Troubleshooting Guide](#troubleshooting-guide)
13. [How to Run](#how-to-run)

---

## Architecture Diagram

```
GET /tasks request
|
v
Auth Middleware (JWT verification)
|
v
Cache check (node-cache) — key: "tasks:<userId>"
├── HIT  → cacheStats.incrementHit() → return cached data immediately
└── MISS → cacheStats.incrementMiss() → query MongoDB (.lean()) → store in cache → return data

POST/PUT/DELETE /tasks
|
v
Auth Middleware (JWT verification)
|
v
Write to MongoDB → invalidateUserCache(userId) → return response
(deletes ALL cache keys for that user: "tasks:<userId>" and "task:<userId>:*")
```

---

## Technologies Used

| Technology | Purpose |
|---|---|
| Node.js (v18+) | Runtime environment |
| Express.js | Web framework |
| Mongoose | MongoDB ODM |
| `node-cache` | In-memory caching library |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | JWT authentication |
| Postman / Thunder Client | API testing & response time measurement |

---

## Files Changed / Added

### Files Added for Practical 9

| File | Purpose | What Was Added |
|---|---|---|
| `Backend/cache.js` | **Shared cache module** | Initializes `node-cache` with 60s TTL. Exports `cache` instance and `invalidateUserCache()` function that deletes all cache keys for a specific user. |
| `Backend/cacheStats.js` | **Cache hit/miss counter** | Tracks cache hits, misses, total requests, and hit rate percentage. Exports `incrementHit()`, `incrementMiss()`, `getStats()`, `resetStats()` functions. |

### Files Modified for Practical 9

| File | What Changed |
|---|---|
| `Backend/server.js` | Added: (1) `cache` and `cacheStats` imports, (2) Response-time tracking middleware (`X-Response-Time` header), (3) Cache-first logic in `GET /tasks` and `GET /tasks/:id`, (4) Cache invalidation in `POST`, `PUT`, `DELETE` handlers, (5) Debug endpoints: `GET /debug/cache`, `DELETE /debug/cache`, `GET /debug/cache/benchmark` |
| `Backend/package.json` | Added `node-cache` dependency (`"node-cache": "^5.1.2"`) |
| `README.md` | Complete Practical 9 documentation (this file) |

---

## Implementation Details

### 1. `Backend/cache.js` — Cache Module

```javascript
const NodeCache = require('node-cache');

// Standard TTL 60 seconds, check period 120 seconds
const cache = new NodeCache({
  stdTTL: 60,        // Cache entries expire after 60 seconds
  checkperiod: 120,  // Automatic expired-key cleanup every 120 seconds
  useClones: true    // Returns cloned data (prevents accidental mutation)
});

const invalidateUserCache = (userId) => {
  const keys = cache.keys();
  const keysToDel = keys.filter(k =>
    k.startsWith(`tasks:${userId}`) || k.startsWith(`task:${userId}:`)
  );
  cache.del(keysToDel);  // Deletes both all-tasks and single-task cache for this user
};

module.exports = { cache, invalidateUserCache };
```

**How it works:**
- Creates a single `NodeCache` instance shared across the entire application.
- `stdTTL: 60` means each cached item automatically expires after 60 seconds.
- `invalidateUserCache(userId)` finds and deletes ALL cache keys belonging to a specific user, ensuring no stale data is served after write operations.

---

### 2. `Backend/cacheStats.js` — Hit/Miss Counter

```javascript
const stats = { hits: 0, misses: 0, totalRequests: 0 };

const getStats = () => {
  const total = stats.hits + stats.misses;
  return {
    ...stats,
    totalRequests: total,
    hitRate: total === 0 ? '0.00%' : `${((stats.hits / total) * 100).toFixed(2)}%`,
  };
};

const incrementHit = () => { stats.hits++; };
const incrementMiss = () => { stats.misses++; };
const resetStats = () => { stats.hits = 0; stats.misses = 0; };

module.exports = { getStats, incrementHit, incrementMiss, resetStats };
```

**How it works:**
- Maintains in-memory counters for cache hits and misses.
- `hitRate` calculates percentage: `(hits / total) * 100`.
- Exposed via `GET /debug/cache` endpoint for monitoring.

---

### 3. `Backend/server.js` — Changes Made

#### a) Response-Time Tracking Middleware (NEW)
```javascript
app.use((req, res, next) => {
  const start = process.hrtime();
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);
    res.set('X-Response-Time', `${durationMs}ms`);
    console.log(`${req.method} ${req.url} completed in ${durationMs}ms [${res.statusCode}]`);
  });

  next();
});
```
- Uses `process.hrtime()` for high-resolution timing.
- Sets `X-Response-Time` header on every response (visible in Postman).
- Logs timing to console for each request.

#### b) GET /tasks — Cache-First Logic
```javascript
app.get('/tasks', authMiddleware, async (req, res, next) => {
  try {
    const cacheKey = `tasks:${req.user.id}`;
    const cachedTasks = cache.get(cacheKey);

    if (cachedTasks !== undefined) {    // CACHE HIT
      cacheStats.incrementHit();
      return res.status(200).json(cachedTasks);
    }

    cacheStats.incrementMiss();          // CACHE MISS
    const tasks = await Task.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    cache.set(cacheKey, tasks);          // Store in cache for next request
    res.status(200).json(tasks);
  } catch (err) {
    next(err);
  }
});
```

#### c) GET /tasks/:id — Single Task Caching (Supplementary)
```javascript
app.get('/tasks/:id', authMiddleware, async (req, res, next) => {
  try {
    const cacheKey = `task:${req.user.id}:${req.params.id}`;
    const cachedTask = cache.get(cacheKey);

    if (cachedTask !== undefined) {      // CACHE HIT
      cacheStats.incrementHit();
      return res.status(200).json(cachedTask);
    }

    cacheStats.incrementMiss();           // CACHE MISS
    const task = await Task.findOne({ _id: req.params.id, user: req.user.id }).lean();
    if (!task) return res.status(404).json({ error: 'Task not found' });
    cache.set(cacheKey, task);            // Store in cache
    res.status(200).json(task);
  } catch (err) { ... }
});
```

#### d) Cache Invalidation on Write Operations
```javascript
// POST /tasks
const newTask = await Task.create({ ...req.body, user: req.user.id });
invalidateUserCache(req.user.id);  // ← Invalidate cache after creating task

// PUT /tasks/:id
const updatedTask = await Task.findOneAndUpdate(...);
invalidateUserCache(req.user.id);  // ← Invalidate cache after updating task

// DELETE /tasks/:id
const deletedTask = await Task.findOneAndDelete(...);
invalidateUserCache(req.user.id);  // ← Invalidate cache after deleting task
```

#### e) Debug & Benchmark Endpoints (NEW)
```
GET    /debug/cache           → Returns cache stats (hits, misses, hitRate, keys, TTL)
DELETE /debug/cache           → Flushes entire cache and resets stats
GET    /debug/cache/benchmark → Measures and compares uncached vs cached response time
```

---

## How Caching Works (Flow)

### Read Operation (GET /tasks)
```
1. Client sends GET /tasks with JWT token
2. Auth middleware verifies token → extracts userId
3. Server checks cache for key "tasks:<userId>"
   ├── FOUND (HIT):  Return cached data directly (skip MongoDB)
   └── NOT FOUND (MISS): Query MongoDB → Store result in cache → Return data
4. Response sent with X-Response-Time header
```

### Write Operation (POST/PUT/DELETE /tasks)
```
1. Client sends POST/PUT/DELETE with JWT token
2. Auth middleware verifies token → extracts userId
3. Server performs the write operation on MongoDB
4. invalidateUserCache(userId) is called:
   - Finds all cache keys matching "tasks:<userId>" and "task:<userId>:*"
   - Deletes them all
5. Next GET request will be a cache MISS → fresh data from DB
```

---

## Cache Keys & TTL

| Cache Key Pattern | Description | Used In |
|---|---|---|
| `tasks:<userId>` | All tasks for a user | `GET /tasks` |
| `task:<userId>:<taskId>` | Single task for a user | `GET /tasks/:id` |

**TTL (Time-To-Live):** 60 seconds
- After 60 seconds, cached data automatically expires.
- Any write operation immediately invalidates the cache (no waiting for TTL).

---

## API Endpoints (Caching Related)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/tasks` | ✅ JWT | Get all tasks (cached) |
| GET | `/tasks/:id` | ✅ JWT | Get single task (cached) |
| POST | `/tasks` | ✅ JWT | Create task + invalidate cache |
| PUT | `/tasks/:id` | ✅ JWT | Update task + invalidate cache |
| DELETE | `/tasks/:id` | ✅ JWT | Delete task + invalidate cache |
| GET | `/debug/cache` | ✅ JWT | View cache stats (hits, misses, hitRate) |
| DELETE | `/debug/cache` | ✅ JWT | Flush cache and reset stats |
| GET | `/debug/cache/benchmark` | ✅ JWT | Run automated cached vs uncached benchmark |

---

## Response Time Comparison (Cached vs Uncached)

### Test Results Table

> **Instructions for students:** Fill in your own measured response times from Postman/Thunder Client. The values below are sample/expected ranges.

| Test # | Request | Cache Status | Response Time (ms) |
|---|---|---|---|
| 1 | GET /tasks | ❌ Uncached (1st request / cache cleared) | ~50-150 ms |
| 2 | GET /tasks | ❌ Uncached | ~40-120 ms |
| 3 | GET /tasks | ❌ Uncached | ~35-100 ms |
| 1 | GET /tasks | ✅ Cached (2nd+ request within 60s) | ~2-10 ms |
| 2 | GET /tasks | ✅ Cached | ~1-8 ms |
| 3 | GET /tasks | ✅ Cached | ~1-5 ms |

### How to Measure

1. **Uncached readings:** Call `DELETE /debug/cache` first, then send `GET /tasks` — check the "Time" field in Postman.
2. **Cached readings:** Send `GET /tasks` again immediately (within 60s) — the response time should be significantly faster.
3. **Automated benchmark:** Call `GET /debug/cache/benchmark` for an instant comparison.

### Expected Result
- **Cached responses are 5x–50x faster** than uncached responses.
- The improvement is more dramatic with larger datasets.

---

## Screenshots Guide (for Practical File)

Take these screenshots from **Postman / Thunder Client** and add them to your practical file:

| # | Screenshot Description | What to Capture |
|---|---|---|
| 1 | **GET /tasks — First request (Cache MISS)** | Show the response body (tasks array) and the response time in Postman. The console should show "MISS". |
| 2 | **GET /tasks — Second request (Cache HIT)** | Show the same response body but with a faster response time. |
| 3 | **GET /debug/cache — Cache Stats** | Show `{ hits: X, misses: Y, hitRate: "XX.XX%", keys: [...], ttl: 60 }` |
| 4 | **POST /tasks — Create a new task** | Show the newly created task in the response. |
| 5 | **GET /tasks — After POST (Cache MISS again)** | Show that the cache was invalidated — the response includes the new task. |
| 6 | **PUT /tasks/:id — Update a task** | Show the updated task in the response. |
| 7 | **GET /tasks — After PUT (Cache MISS again)** | Show fresh data reflecting the update. |
| 8 | **DELETE /tasks/:id — Delete a task** | Show `{ message: "Task deleted" }` |
| 9 | **GET /tasks — After DELETE (Cache MISS)** | Show that the deleted task is no longer in the response. |
| 10 | **GET /debug/cache/benchmark** | Show the automated benchmark with `uncachedResponseTimeMs`, `cachedResponseTimeMs`, and `speedupFactor` |
| 11 | **GET /debug/cache — Final Stats** | Show accumulated hits and misses after all testing |
| 12 | **Server Console Logs** | Show the terminal with response time logs (`completed in Xms`) |
| 13 | **Response Time Comparison Table** | A screenshot of your filled-in table (from above) with actual measured values |

---

## Supplementary Problems Completed

### ✅ 1. Single-Task Caching (`GET /tasks/:id`)
- Cached separately using key pattern `task:<userId>:<taskId>`
- Each individual task has its own cache entry
- Invalidated along with all-tasks cache on any write operation

### ✅ 2. Cache Hit/Miss Counter (`/debug/cache`)
- `cacheStats.js` module tracks hits, misses, and calculates hit rate
- `GET /debug/cache` exposes: `{ hits, misses, totalRequests, hitRate, keys, ttl }`
- `DELETE /debug/cache` resets all counters and flushes the cache

### ✅ 3. Benchmark Endpoint (`/debug/cache/benchmark`)
- Automated comparison of uncached vs cached response time
- Returns `speedupFactor` showing how much faster cached responses are

---

## Key Questions & Answers (Viva)

### 1. Why must the cache be invalidated on every write operation?
If the cache is not invalidated after a POST/PUT/DELETE, the `GET /tasks` endpoint would return **stale (old) data** from the cache instead of the updated data from MongoDB. This means:
- A newly created task would not appear in the task list
- An updated task would show old values
- A deleted task would still appear in the list
This violates **data correctness** — the API would lie to the user.

### 2. What is a reasonable TTL for task management, and what trade-off does it represent?
**60 seconds** is a reasonable TTL. The trade-off:
- **Shorter TTL** (e.g., 10s) = More fresh data, but more frequent DB queries (less performance benefit)
- **Longer TTL** (e.g., 300s) = Better performance, but higher risk of serving stale data
- 60 seconds balances freshness vs performance for a task management context.

### 3. Why is `node-cache` not suitable for multi-server deployment?
`node-cache` stores data in the **process memory** of a single Node.js instance. If the app runs on multiple servers:
- Each server has its own separate cache
- A write on Server A would invalidate only Server A's cache
- Server B would still serve stale data from its own cache
**Solution:** Use a shared cache like **Redis** or **Memcached** for multi-server deployments.

### 4. What is `.lean()` and why is it used?
`.lean()` tells Mongoose to return **plain JavaScript objects** instead of full Mongoose documents. This:
- Skips Mongoose document overhead (getters, setters, `save()`, etc.)
- Uses less memory
- Is faster for read-only operations (like caching)

### 5. What happens when the server restarts?
The cache is completely **wiped** because `node-cache` stores data in RAM. This is expected behavior for in-memory caching — it is not persistent storage. After restart, the first request for each user will be a cache MISS.

### 6. Why include userId in cache keys?
To prevent **cross-user data leakage**. Without userId in the key, User A could receive User B's cached tasks. The key pattern `tasks:<userId>` ensures each user's data is isolated.

### 7. What is the difference between cache HIT and MISS?
- **HIT:** Data found in cache → returned immediately (no DB query)
- **MISS:** Data not found in cache → query MongoDB → store result in cache → return data

---

## Troubleshooting Guide

| Symptom | Likely Cause | Fix |
|---|---|---|
| Updated task not reflected in GET | Cache not invalidated after write | Ensure `invalidateUserCache(req.user.id)` is called in POST/PUT/DELETE |
| No measurable time difference | TTL too short or small dataset | Use fixed cache key, TTL ≥ 60s, add more tasks |
| Cache works but server restart clears it | In-memory cache resets on restart | Expected behavior — document as known limitation |
| `X-Response-Time` header missing | Middleware order issue | Ensure response-time middleware is before route handlers |

---

## How to Run

```bash
# 1. Navigate to Backend directory
cd Backend

# 2. Install dependencies (includes node-cache)
npm install

# 3. Create .env file with required variables
#    MONGO_URI=mongodb://localhost:27017/taskmanager
#    JWT_SECRET=your_secret_key

# 4. Start the server
node server.js
# Server running on port 5000

# 5. Test in Postman:
#    - POST /register → create account
#    - POST /login → get JWT token
#    - GET /tasks → first call = cache MISS, second call = cache HIT
#    - GET /debug/cache → view stats
#    - GET /debug/cache/benchmark → automated comparison
```

---

## Project Structure (Backend)

```
Backend/
├── cache.js              ← Cache module (node-cache instance + invalidation)
├── cacheStats.js         ← Hit/miss counter module
├── middleware/
│   ├── auth.js           ← JWT authentication middleware
│   └── validate.js       ← Request validation middleware
├── models/
│   ├── Task.js           ← Task Mongoose model
│   └── User.js           ← User Mongoose model
├── server.js             ← Main server (routes + caching logic + response-time tracking)
├── package.json          ← Dependencies (includes node-cache)
├── .env                  ← Environment variables (MONGO_URI, JWT_SECRET)
└── PRACTICAL_9.md        ← Practical 9 quick reference
```

---

## Learning Outcomes Achieved

- ✅ Implemented in-memory caching using `node-cache`
- ✅ Designed correct cache invalidation logic for all write operations (POST/PUT/DELETE)
- ✅ Measured and compared API response times empirically (cached vs uncached)
- ✅ Reasoned about the trade-offs of caching strategies (TTL, staleness, multi-server)
- ✅ Cached single-task endpoint separately (supplementary)
- ✅ Added cache hit/miss counter with debug endpoint (supplementary)
- ✅ Created automated benchmark endpoint (supplementary)
