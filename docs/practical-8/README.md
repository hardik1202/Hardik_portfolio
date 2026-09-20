# Practical 8 — Performance Optimization and Lazy Loading in React

## Objective
Improve frontend performance using route-based lazy loading and code splitting.

## Problem Statement
Optimize the Task Management React application by lazy loading route-based components to reduce the initial bundle size.

## Implementation
- Implemented `React.lazy()` to dynamically import `Projects` and `Contact` pages.
- Wrapped route components with `Suspense` using `Spinner` as the fallback UI.

## Before vs After
- **Before:** Projects and Contact were part of the main bundle (`index-Bt0SfqSP.js`, ~248 kB).
- **After:** Projects and Contact are split into separate chunks, reducing the main bundle slightly (`index-CrdVnGWH.js`, ~245 kB) and delaying their loading until requested.

## Metrics
| Metric                 |            Before |       After |
| ---------------------- | ----------------: | ----------: |
| Initial JS bundle      |            248.04 kB |      245.24 kB |
| Projects chunk         | bundled initially | lazy loaded |
| Contact chunk          | bundled initially | lazy loaded |

## Key Questions
- **What is lazy loading?** A technique to delay loading components or resources until they are needed, reducing initial load time.
- **What is code splitting?** Breaking the application bundle into smaller, manageable chunks that can be loaded on demand.
- **Why does lazy loading improve perceived performance?** It reduces the size of the initial download, making the application interactive faster.
