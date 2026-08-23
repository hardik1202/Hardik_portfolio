import { getToken, clearToken } from "./auth";

const BASE_URL = "http://localhost:5000";

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res, fallbackMessage) {
  if (res.status === 401) {
    clearToken();
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  if (!res.ok) throw new Error(`${fallbackMessage} (${res.status})`);
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Invalid email or password");
  return res.json(); // { token }
}

export async function register(email, password) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
}

export async function getTasks() {
  const res = await fetch(`${BASE_URL}/tasks`, {
    headers: { ...authHeaders() },
  });
  return handleResponse(res, "Failed to fetch tasks");
}

export async function createTask(task) {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(task),
  });
  return handleResponse(res, "Failed to create task");
}

export async function updateTask(id, updates) {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(updates),
  });
  return handleResponse(res, "Failed to update task");
}

export async function deleteTask(id) {
  const res = await fetch(`${BASE_URL}/tasks/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  return handleResponse(res, "Failed to delete task");
}
