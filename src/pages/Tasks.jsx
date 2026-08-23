import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";
import { getTasks, createTask, updateTask, deleteTask } from "../api";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [rowError, setRowError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const navigate = useNavigate();

  // Central place to handle "session expired / not logged in"
  const handleAuthError = (err) => {
    if (err.status === 401) {
      navigate("/login");
      return true;
    }
    return false;
  };

  const fetchTasks = () => {
    setLoading(true);
    setError(null);
    getTasks()
      .then(setTasks)
      .catch((err) => {
        if (handleAuthError(err)) return;
        setError(err.message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCreating(true);
    setCreateError(null);

    // Optimistic UI: show a temporary task immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = { _id: tempId, title, completed: false };
    setTasks((prev) => [optimisticTask, ...prev]);

    try {
      const saved = await createTask({ title });
      // Replace the optimistic task with the real one from the server
      setTasks((prev) => prev.map((t) => (t._id === tempId ? saved : t)));
      setTitle("");
    } catch (err) {
      // Roll back the optimistic task on failure
      setTasks((prev) => prev.filter((t) => t._id !== tempId));
      if (handleAuthError(err)) return;
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleComplete = async (task) => {
    setRowError(null);
    try {
      const updated = await updateTask(task._id, { completed: !task.completed });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? updated : t)));
    } catch (err) {
      if (handleAuthError(err)) return;
      setRowError(err.message);
    }
  };

  const startEdit = (task) => {
    setEditingId(task._id);
    setEditTitle(task.title);
    setRowError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const saveEdit = async (id) => {
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    setRowError(null);
    try {
      const updated = await updateTask(id, { title: editTitle.trim() });
      setTasks((prev) => prev.map((t) => (t._id === id ? updated : t)));
      setEditingId(null);
      setEditTitle("");
    } catch (err) {
      if (handleAuthError(err)) return;
      setRowError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id) => {
    setRowError(null);
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      if (handleAuthError(err)) return;
      setRowError(err.message);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchTasks} />;

  return (
    <section className="section-card">
      <h2>My Tasks</h2>

      <form
        onSubmit={handleCreate}
        style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "16px" }}
      >
        <input
          type="text"
          className="contact-input"
          placeholder="New task title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button className="tip-btn" type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add Task"}
        </button>
      </form>
      {createError && <ErrorMessage message={createError} />}
      {rowError && <ErrorMessage message={rowError} />}

      <ul className="projects-list">
        {tasks.length === 0 ? (
          <p>No tasks yet. Add one above!</p>
        ) : (
          tasks.map((task) => (
            <li key={task._id}>
              {editingId === task._id ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="text"
                    className="contact-input"
                    style={{ width: "auto", flex: 1 }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(task._id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <button
                    className="retry-btn"
                    onClick={() => saveEdit(task._id)}
                    disabled={savingEdit}
                  >
                    {savingEdit ? "Saving..." : "Save"}
                  </button>
                  <button className="retry-btn" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleComplete(task)}
                    />
                    <span style={{ textDecoration: task.completed ? "line-through" : "none" }}>
                      {task.title}
                    </span>
                  </label>

                  <div style={{ marginTop: "6px" }}>
                    <button className="retry-btn" onClick={() => startEdit(task)}>
                      Edit
                    </button>{" "}
                    {confirmDeleteId === task._id ? (
                      <span style={{ marginLeft: "6px" }}>
                        Delete this task?{" "}
                        <button className="retry-btn" onClick={() => handleDelete(task._id)}>
                          Yes
                        </button>{" "}
                        <button className="retry-btn" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        className="retry-btn"
                        style={{ marginLeft: "6px" }}
                        onClick={() => setConfirmDeleteId(task._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export default Tasks;
