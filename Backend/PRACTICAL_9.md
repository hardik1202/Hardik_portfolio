# Practical 9: In-Memory Caching and Query Optimization

## Objective
Implement server-side in-memory caching using `node-cache` and measure its effect on API response time.

## Technologies Used
- Node.js
- Express.js
- Mongoose
- node-cache

## Cache Architecture
Implemented using a shared `node-cache` instance with a 60-second TTL.

- **GET /tasks**: Checks cache (`tasks:<userId>`). MISS -> Query DB (lean) -> Cache.
- **GET /tasks/:id**: Checks cache (`task:<userId>:<taskId>`). MISS -> Query DB (lean) -> Cache.
- **Write Operations (POST/PUT/DELETE)**: MongoDB write -> `invalidateUserCache(userId)` -> Response.

## Cache Keys
- `tasks:<userId>`: List of all tasks for a specific user.
- `task:<userId>:<taskId>`: Specific task for a specific user.

## TTL
60 seconds.

## Cache Hit/Miss Statistics
Tracked via `cacheStats.js` and exposed via `GET /debug/cache`.

## Query Optimization
- Added `.lean()` to all read queries in `GET /tasks` and `GET /tasks/:id`.

## Performance Testing

| Test | Request | Cache Status | Response Time |
| ---- | ---------- | ------------ | ------------- |
| 1 | GET /tasks | Uncached | ___ ms |
| 2 | GET /tasks | Uncached | ___ ms |
| 3 | GET /tasks | Uncached | ___ ms |
| 1 | GET /tasks | Cached | ___ ms |
| 2 | GET /tasks | Cached | ___ ms |
| 3 | GET /tasks | Cached | ___ ms |

*Note: Students must record their own response times as requested.*


## Viva Q&A
1. **What is caching?** Temporarily storing data to reduce expensive operations (like DB queries).
2. **Why is caching required?** To improve API performance and reduce DB load.
3. **What is node-cache?** An in-memory cache module for Node.js.
4. **What is TTL?** Time-To-Live; the duration an item remains in cache.
5. **Why is 60 seconds used?** A balance between data freshness and performance.
6. **What is cache hit?** Data found in cache.
7. **What is cache miss?** Data not found in cache.
8. **Why must cache be invalidated after POST/PUT/DELETE?** To prevent serving stale data.
9. **What happens if cache is not invalidated?** The user sees old/incorrect data after updates.
10. **Why is node-cache not suitable for multiple servers?** It is process-local; servers don't share memory.
11. **What happens when the server restarts?** The cache is cleared (in-memory).
12. **Why should cache keys be stable?** To ensure consistent hit rates.
13. **Why include user ID in cache keys?** To prevent cross-user data leakage.
14. **What is query optimization?** Improving query efficiency (e.g., `.lean()`, indexing).
15. **Why use `.lean()`?** Skips Mongoose document overhead for read-only data.
