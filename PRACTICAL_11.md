# Practical 11: Containerization with Docker and Docker Compose

**Course Outcomes / Program Outcomes:** CO5 / PO3, PO5  
**Subject:** Advanced Web Development / Full-Stack Development  
**Student Name:** Hardik Jethava  
**Application:** Full-Stack Task Management Application  

---

## 1. Objective
To containerize the full-stack Task Management application (React Frontend, Node/Express Backend, and MongoDB Database) using Docker and orchestrate the multi-container services using Docker Compose.

---

## 2. System Architecture & Topology

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

### Services Breakdown:
| Service | Image / Build Context | Port Mapping | Dependencies | Purpose |
|---|---|---|---|---|
| **frontend** | `./Frontend` (Dockerfile, Node 18) | `5173:5173` | `backend` | React client built & served via Vite preview |
| **backend** | `./Backend` (Dockerfile, Node 18) | `5000:5000` | `mongodb` | Express REST API connected to MongoDB container |
| **mongodb** | `mongo:latest` | `27017:27017` | None | Official MongoDB database with persistent volume |

---

## 3. Files Created and Modified

### New Files Created:
1. **`Backend/Dockerfile`**:
   - Uses `node:18` base image.
   - Sets working directory to `/app`.
   - Copies `package*.json` and runs `npm install` (utilizing Docker layer caching).
   - Copies source code.
   - Exposes port `5000` and starts server via `CMD ["node", "server.js"]`.

2. **`Backend/.dockerignore`**:
   - Excludes `node_modules`, `npm-debug.log`, `.env`, and `.git` from Docker build context to prevent build slowdowns and credential leakage.

3. **`Frontend/Dockerfile`**:
   - Multi-stage build concept using `node:18 AS build`.
   - Copies package manifests, runs `npm install`, copies source, runs `npm run build`.
   - Exposes port `5173` and serves via `npm run preview -- --host 0.0.0.0`.

4. **`Frontend/.dockerignore`**:
   - Excludes `node_modules`, `dist`, `.env`, and `.git` from the Docker build context.

5. **`docker-compose.yml`**:
   - Defines `mongodb`, `backend`, and `frontend` services under a single configuration.
   - Configures internal bridge network `app-network`.
   - Configures persistent named volume `mongo-data` mapped to `/data/db`.
   - Establishes startup dependencies (`backend` depends on `mongodb`, `frontend` depends on `backend`).
   - Injects environment variables (`MONGO_URI=mongodb://mongodb:27017/taskmanager`, `JWT_SECRET`, `PORT=5000`).

### Files Modified:
1. **`Backend/server.js`**:
   - Updated connection logic to safely fall back to `mongodb://mongodb:27017/taskmanager` when `MONGO_URI` is passed from Docker Compose.
   - Bound Express listener to dynamic `process.env.PORT || 5000`.
2. **`Backend/.env.example`**:
   - Added reference for Docker Compose connection string vs local connection string.
3. **`Frontend/vite.config.js`**:
   - Configured `server` and `preview` options with `port: 5173` and `host: '0.0.0.0'`.
4. **`Frontend/package.json`**:
   - Updated `preview` script to `"vite preview --port 5173 --host 0.0.0.0"`.

---

## 4. Key Questions & Conceptual Analysis (Viva Preparation)

### Q1: Why does the backend container need to reference the MongoDB container by its service name (`mongodb`) rather than `localhost`?
> **Answer:** In Docker, each container has its own isolated network namespace and its own private loopback interface (`localhost` / `127.0.0.1`). Inside the `backend` container, `localhost` refers only to the backend container itself. Docker Compose creates a private DNS resolver on the user-defined bridge network (`app-network`), which automatically maps each service name (e.g. `mongodb`) to the private IP address of that container. Therefore, inter-container communication must use `mongodb://mongodb:27017/...`.

### Q2: What is the difference between `EXPOSE` in a Dockerfile and the `ports` mapping in `docker-compose.yml`?
> **Answer:**
> - **`EXPOSE` (Dockerfile):** Acts as documentation and metadata. It indicates which port the containerized process intends to listen on inside the container. It does **not** publish or map the port to the host machine.
> - **`ports` (docker-compose.yml):** Actually publishes and maps the port from the host machine to the container (format `HOST_PORT:CONTAINER_PORT`). This allows outside clients (like host web browsers or Postman) to access the service via `http://localhost:<HOST_PORT>`.

### Q3: Why is it considered bad practice to copy `node_modules` into a Docker image instead of running `npm install` inside the container?
> **Answer:**
> 1. **Architecture Mismatch:** Native binary dependencies (like `bcryptjs` or OS-specific C++ bindings) compiled for the host OS (e.g., Windows x64) will fail or crash inside a Linux-based Docker container.
> 2. **Build Context Bloat:** `node_modules` contains thousands of files, slowing down the Docker build context transfer significantly.
> 3. **Reproducibility & Clean State:** Running `npm install` inside the container guarantees a clean, consistent, and container-native dependency installation based solely on `package.json` and `package-lock.json`.

---

## 5. Supplementary Problems Completed

1. **`.dockerignore` files added:**
   - Both `./Backend/.dockerignore` and `./Frontend/.dockerignore` exclude `node_modules`, build artifacts, and local `.env` files.
2. **Multi-stage frontend build:**
   - Used `FROM node:18 AS build` to build production assets with `npm run build` and serve them cleanly via Vite preview.
3. **Named Volume for MongoDB Data Persistence:**
   - Added `mongo-data` volume in `docker-compose.yml` mounted to `/data/db`.
   - Data persists even if containers are stopped (`docker compose down`) and restarted.

---

## 6. How to Run the Application (Step-by-Step for Students)

### Step 1: Open Docker Desktop
Ensure Docker Desktop is running on your computer. You should see the Docker whale icon in your Windows system tray.

### Step 2: Open Terminal at Project Root
Open PowerShell or Command Prompt at:
```bash
c:\Users\hardik\Desktop\React App\Hardik_portfolio
```

### Step 3: Start All Services with Docker Compose
Run the single orchestration command:
```bash
docker compose up --build
```
*(Or in detached background mode: `docker compose up --build -d`)*

### Step 4: Verify Container Status
Run:
```bash
docker ps
```
You should see 3 running containers:
- `taskmanager-frontend` (Port 5173)
- `taskmanager-backend` (Port 5000)
- `taskmanager-mongodb` (Port 27017)

### Step 5: Test in the Browser & Postman
- **Frontend Web UI:** Open [http://localhost:5173](http://localhost:5173)
- **Backend Health Check:** Open [http://localhost:5000/health](http://localhost:5000/health) (returns `{"status":"ok"}`)
- **MongoDB Connection:** Check backend logs via `docker compose logs backend` showing `MongoDB connected: mongodb://mongodb:27017/taskmanager`.

### Step 6: Stop the Application
When finished testing:
```bash
docker compose down
```
*(Note: Because of the named volume `mongo-data`, your tasks and user accounts remain safely saved in MongoDB when you restart!)*
