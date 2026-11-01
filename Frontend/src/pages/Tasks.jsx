import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";
import { getTasks, createTask, updateTask, deleteTask, generateAiDescription } from "../api";
import { isLoggedIn } from "../auth";

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New task form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Practical 13: AI Generation states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState(null);
  const [aiCooldown, setAiCooldown] = useState(0);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [rowError, setRowError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("medium");
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
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cooldown countdown timer for rate-limiting
  useEffect(() => {
    if (aiCooldown <= 0) return;
    const interval = setInterval(() => {
      setAiCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [aiCooldown]);

  // Practical 13: Handle AI Description & Priority Generation
  const handleGenerateAi = async () => {
    if (!title.trim()) {
      setAiNotice({ type: "warning", message: "Please enter a task title first." });
      return;
    }

    setAiLoading(true);
    setAiNotice(null);

    try {
      const data = await generateAiDescription(title.trim());
      if (data.description) {
        setDescription(data.description);
      }
      if (data.priority) {
        setPriority(data.priority);
      }

      if (data.fallback) {
        setAiNotice({
          type: "fallback",
          message: data.message || "AI API unreachable. Smart fallback template applied."
        });
      } else {
        setAiNotice({
          type: "success",
          message: `✨ AI generated description and suggested "${data.priority}" priority (${data.source}).`
        });
      }
      // Start 15-second cooldown to respect rate limits
      setAiCooldown(15);
    } catch (err) {
      if (handleAuthError(err)) return;
      setAiNotice({
        type: "error",
        message: err.message || "Failed to generate AI description. Graceful fallback active."
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setCreating(true);
    setCreateError(null);

    // Optimistic UI: show a temporary task immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticTask = {
      _id: tempId,
      title: title.trim(),
      description: description.trim(),
      priority,
      completed: false
    };
    setTasks((prev) => [optimisticTask, ...prev]);

    try {
      const saved = await createTask({
        title: title.trim(),
        description: description.trim(),
        priority
      });
      // Replace the optimistic task with the real one from the server
      setTasks((prev) => prev.map((t) => (t._id === tempId ? saved : t)));
      setTitle("");
      setDescription("");
      setPriority("medium");
      setAiNotice(null);
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
    setEditDescription(task.description || "");
    setEditPriority(task.priority || "medium");
    setRowError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  };

  const saveEdit = async (id) => {
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    setRowError(null);
    try {
      const updated = await updateTask(id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority
      });
      setTasks((prev) => prev.map((t) => (t._id === id ? updated : t)));
      setEditingId(null);
      setEditTitle("");
      setEditDescription("");
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

  const getPriorityBadgeClass = (p) => {
    if (p === "high") return "badge-high";
    if (p === "low") return "badge-low";
    return "badge-medium";
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} onRetry={fetchTasks} />;

  return (
    <section className="section-card">
      <p className="eyebrow">Task Management System</p>
      <h2>My Tasks</h2>

      {/* Practical 13: Enhanced Task Creation Form with AI Assistant */}
      <form onSubmit={handleCreate} className="task-create-form" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
          <input
            type="text"
            className="contact-input"
            style={{ flex: 1, minWidth: "220px" }}
            placeholder="What needs to be done? (e.g. Prepare client demo)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            type="button"
            className="retry-btn"
            style={{
              backgroundColor: aiCooldown > 0 ? "#6b7280" : "#4f46e5",
              color: "#fff",
              cursor: (aiLoading || aiCooldown > 0) ? "not-allowed" : "pointer"
            }}
            onClick={handleGenerateAi}
            disabled={aiLoading || aiCooldown > 0}
            title="Auto-generate description & suggest priority using AI"
          >
            {aiLoading ? "Thinking... ⏳" : aiCooldown > 0 ? `Wait (${aiCooldown}s)` : "✨ Auto-fill with AI"}
          </button>
        </div>

        {/* AI Disclaimer & Status Notice */}
        {aiNotice && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "13px",
              marginBottom: "8px",
              backgroundColor: aiNotice.type === "success" ? "rgba(16, 185, 129, 0.15)" :
                               aiNotice.type === "fallback" ? "rgba(245, 158, 11, 0.15)" :
                               aiNotice.type === "warning" ? "rgba(234, 179, 8, 0.15)" : "rgba(239, 68, 68, 0.15)",
              color: aiNotice.type === "success" ? "#10b981" :
                     aiNotice.type === "fallback" ? "#f59e0b" :
                     aiNotice.type === "warning" ? "#ca8a04" : "#ef4444",
              border: "1px solid currentColor"
            }}
          >
            {aiNotice.message}
            <div style={{ fontSize: "11px", opacity: 0.85, marginTop: "2px" }}>
              🤖 <em>Responsible AI: Suggestions are AI-generated. Review before saving.</em>
            </div>
          </div>
        )}

        {/* Editable Description */}
        <div style={{ marginBottom: "8px" }}>
          <textarea
            className="contact-input"
            style={{ width: "100%", minHeight: "65px", resize: "vertical", fontFamily: "inherit" }}
            placeholder="Task description (auto-filled by AI or written manually)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Priority Selector & Submit Button */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label htmlFor="priority-select" style={{ fontSize: "14px", fontWeight: 500 }}>Priority:</label>
            <select
              id="priority-select"
              className="contact-input"
              style={{ width: "auto", padding: "6px 10px" }}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🔴 High</option>
            </select>
          </div>

          <button className="tip-btn" type="submit" disabled={creating}>
            {creating ? "Adding..." : "+ Add Task"}
          </button>
        </div>
      </form>

      {createError && <ErrorMessage message={createError} />}
      {rowError && <ErrorMessage message={rowError} />}

      {/* Task List */}
      <ul className="projects-list">
        {tasks.length === 0 ? (
          <p>No tasks yet. Enter a title above and try the ✨ AI auto-fill button!</p>
        ) : (
          tasks.map((task) => (
            <li key={task._id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {editingId === task._id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    type="text"
                    className="contact-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    className="contact-input"
                    style={{ minHeight: "50px", resize: "vertical" }}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Task description..."
                  />
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      className="contact-input"
                      style={{ width: "auto", padding: "4px 8px" }}
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
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
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleComplete(task)}
                      />
                      <span style={{ textDecoration: task.completed ? "line-through" : "none", fontWeight: 600 }}>
                        {task.title}
                      </span>
                    </label>

                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        backgroundColor: task.priority === "high" ? "rgba(239, 68, 68, 0.2)" :
                                         task.priority === "low" ? "rgba(16, 185, 129, 0.2)" : "rgba(234, 179, 8, 0.2)",
                        color: task.priority === "high" ? "#ef4444" :
                               task.priority === "low" ? "#10b981" : "#ca8a04"
                      }}
                    >
                      {task.priority || "medium"}
                    </span>
                  </div>

                  {task.description && (
                    <p style={{ margin: "2px 0 6px 26px", fontSize: "14px", opacity: 0.85, whiteSpace: "pre-wrap" }}>
                      {task.description}
                    </p>
                  )}

                  <div style={{ marginLeft: "26px" }}>
                    <button className="retry-btn" onClick={() => startEdit(task)}>
                      Edit
                    </button>
                    {confirmDeleteId === task._id ? (
                      <span style={{ marginLeft: "8px" }}>
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
                        style={{ marginLeft: "8px" }}
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
