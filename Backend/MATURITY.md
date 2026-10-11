# Richardson Maturity Model Evaluation — Task Manager API

## Evaluation Table

| Level | Criterion | Does your API satisfy this? | Evidence |
|-------|-----------|------------------------------|----------|
| 0 | Single URL, single HTTP verb for everything |  Not applicable (API is above this level) | API uses 4 distinct verbs and 2 distinct URL patterns, not a single endpoint |
| 1 | Multiple URLs, one per resource/resource-instance | Yes | `/tasks` (collection) and `/tasks/:id` (individual resource) are separate URLs |
| 2 | Correct HTTP verbs used + meaningful status codes returned | 
Yes | `GET /tasks` → 200, `POST /tasks` → 201 (or 400 if invalid), `PUT /tasks/:id` → 200 (or 404), `DELETE /tasks/:id` → 200 (or 404). Verbs map correctly to CRUD actions. |
| 3 | Hypermedia controls (HATEOAS) — responses include links to related actions |  No | Current responses return plain task objects with no `_links` field. See HATEOAS Awareness section below for proposed structure. |

## Conclusion

The current Task Manager API satisfies **Level 2** of the Richardson Maturity Model. It uses resource-based URLs (`/tasks`, `/tasks/:id`), correct HTTP verbs for each CRUD operation, and returns appropriate, meaningful HTTP status codes (200, 201, 400, 404, 500) rather than always returning 200 with an error message in the body. It does not yet implement Level 3, as responses do not include hypermedia links.

## HATEOAS Awareness (Level 3 — Not Implemented, For Awareness Only)

If targeting Level 3, each task response would include a `_links` object showing available related actions, e.g.:

\`\`\`json
{
  "id": 1,
  "title": "Learn Express",
  "completed": false,
  "_links": {
    "self": "/tasks/1",
    "delete": "/tasks/1"
  }
}
\`\`\`

This would let clients discover available actions (like deleting or updating a task) dynamically from the response itself, rather than needing prior knowledge of the API's URL structure.

## Why Most Production APIs Stop at Level 2

Most production REST APIs stop at Level 2 because it already provides the practical benefits of REST — predictable resource-based URLs, correct HTTP semantics, and clear status codes — which is enough for most client applications (web/mobile apps) that are built with prior knowledge of the API's endpoints via documentation (e.g., Swagger/Postman collections). Level 3 (HATEOAS) adds complexity: clients must be built to parse and follow hypermedia links dynamically, which is rarely needed since front-end teams typically hardcode API calls based on API docs anyway. The extra engineering effort for HATEOAS often isn't justified unless the API is designed for long-term evolution with many independent, decoupled clients (e.g., large-scale public APIs).