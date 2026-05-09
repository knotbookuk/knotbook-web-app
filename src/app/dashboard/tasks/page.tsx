"use client";

import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/Icon";

/* ─── Types ─── */

type Priority = "HIGH" | "MEDIUM" | "LOW";
type Status = "TODO" | "IN_PROGRESS" | "COMPLETED";
type Column = "To Do" | "In Progress" | "Completed";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  priority: Priority;
  status: Status;
  category: string | null;
  completedAt: string | null;
  sortOrder: number;
}

const columns: Column[] = ["To Do", "In Progress", "Completed"];

const statusToColumn: Record<Status, Column> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const columnToStatus: Record<Column, Status> = {
  "To Do": "TODO",
  "In Progress": "IN_PROGRESS",
  "Completed": "COMPLETED",
};

const columnConfig: Record<
  Column,
  { icon: string; headerBg: string; count: string }
> = {
  "To Do": {
    icon: "assignment",
    headerBg: "bg-error-container/20",
    count: "bg-error-container/30 text-error",
  },
  "In Progress": {
    icon: "pending",
    headerBg: "bg-tertiary-container/20",
    count: "bg-tertiary-container/30 text-tertiary",
  },
  Completed: {
    icon: "task_alt",
    headerBg: "bg-secondary-container/20",
    count: "bg-secondary-container/30 text-secondary",
  },
};

const priorityStyles: Record<Priority, { bg: string; text: string; dot: string }> = {
  HIGH: {
    bg: "bg-error-container/25",
    text: "text-error",
    dot: "bg-error",
  },
  MEDIUM: {
    bg: "bg-tertiary-container/25",
    text: "text-tertiary",
    dot: "bg-tertiary",
  },
  LOW: {
    bg: "bg-secondary-container/30",
    text: "text-secondary",
    dot: "bg-secondary",
  },
};

const priorityLabel: Record<Priority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

/* ─── Loading Skeleton ─── */

function TasksSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-12 w-72 bg-surface-container-low rounded-xl" />
          <div className="mt-2 h-4 w-48 bg-surface-container-low rounded-lg" />
        </div>
        <div className="h-12 w-36 bg-surface-container-low rounded-full" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border text-center">
            <div className="h-6 w-6 bg-surface-container-low rounded-full mx-auto" />
            <div className="h-9 w-10 bg-surface-container-low rounded-lg mx-auto mt-2" />
            <div className="h-4 w-20 bg-surface-container-low rounded-md mx-auto mt-2" />
          </div>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((col) => (
          <div key={col} className="space-y-4">
            <div className="h-14 bg-surface-container-low rounded-2xl" />
            {[1, 2, 3].map((card) => (
              <div key={card} className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border">
                <div className="h-4 w-3/4 bg-surface-container-low rounded-md" />
                <div className="h-3 w-1/2 bg-surface-container-low rounded-md mt-3" />
                <div className="h-3 w-1/3 bg-surface-container-low rounded-md mt-2" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Task Modal ─── */

interface TaskFormData {
  title: string;
  description: string;
  assigneeName: string;
  dueDate: string;
  priority: Priority;
  status: Status;
  category: string;
}

const emptyTaskForm: TaskFormData = {
  title: "",
  description: "",
  assigneeName: "",
  dueDate: "",
  priority: "MEDIUM",
  status: "TODO",
  category: "",
};

function TaskModal({
  editingTask,
  defaultStatus,
  onClose,
  onSaved,
}: {
  editingTask: Task | null;
  defaultStatus?: Status;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = editingTask !== null;
  const [form, setForm] = useState<TaskFormData>(() => {
    if (editingTask) {
      return {
        title: editingTask.title,
        description: editingTask.description || "",
        assigneeName: editingTask.assigneeName || "",
        dueDate: editingTask.dueDate ? editingTask.dueDate.slice(0, 10) : "",
        priority: editingTask.priority,
        status: editingTask.status,
        category: editingTask.category || "",
      };
    }
    return { ...emptyTaskForm, status: defaultStatus || "TODO" };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Task title is required");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      assigneeName: form.assigneeName.trim() || null,
      dueDate: form.dueDate || null,
      priority: form.priority,
      status: form.status,
      category: form.category.trim() || null,
    };

    try {
      const url = isEditing ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-lg sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline text-2xl text-on-surface">
            {isEditing ? "Edit Task" : "Assign Task"}
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <Icon name="close" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error-container/20 text-error text-sm font-label">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
              Title *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="What needs to be done?"
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details or notes"
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Assignee + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
                Assignee
              </label>
              <input
                type="text"
                value={form.assigneeName}
                onChange={(e) => setForm({ ...form, assigneeName: e.target.value })}
                placeholder="e.g. Sister Hana"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
                Category
              </label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Venue, Decor"
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              min={form.status === "COMPLETED" ? undefined : new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-on-surface-variant font-label mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                className="w-full px-4 py-3 rounded-xl bg-surface-container-low ghost-border text-on-surface text-sm font-label focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl ghost-border text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="gold-gradient text-white px-6 py-2.5 rounded-xl font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {saving ? "Saving..." : isEditing ? "Update" : "Assign Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Delete Confirmation Modal ─── */

function DeleteConfirmModal({
  taskTitle,
  onConfirm,
  onClose,
}: {
  taskTitle: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow px-5 pt-5 pb-20 sm:p-8 w-full sm:max-w-sm sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto">
        <div className="text-center">
          <Icon name="delete_forever" className="text-error text-4xl mb-3" />
          <h3 className="font-headline text-xl text-on-surface mb-2">Delete Task</h3>
          <p className="text-sm text-on-surface-variant font-label">
            Are you sure you want to delete <strong>&ldquo;{taskTitle}&rdquo;</strong>? This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl ghost-border text-sm font-label text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-error text-white text-sm font-label font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page Component ─── */

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Status>("TODO");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    const start = Date.now();
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      // API returns array directly
      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch {
      // Silently handle
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 300) await new Promise(r => setTimeout(r, 300 - elapsed));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getColumnTasks = (column: Column) =>
    tasks.filter((t) => statusToColumn[t.status] === column);

  const handleAssignTask = () => {
    setEditingTask(null);
    setDefaultStatus("TODO");
    setModalOpen(true);
  };

  const handleAddToColumn = (column: Column) => {
    setEditingTask(null);
    setDefaultStatus(columnToStatus[column]);
    setModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleModalSaved = () => {
    setModalOpen(false);
    setEditingTask(null);
    fetchTasks();
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleStatusChange = async (task: Task, newStatus: Status) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      fetchTasks();
    } catch {
      // Could show error toast
    }
  };

  const handleDeleteClick = (task: Task) => {
    setDeleteTarget(task);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/tasks/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteTarget(null);
      fetchTasks();
    } catch {
      setDeleteTarget(null);
    }
  };

  if (loading) return <TasksSkeleton />;

  return (
    <div className="space-y-8 transition-opacity duration-500 ease-out" style={{ opacity: loading ? 0 : 1 }}>
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Family Task Board
          </h1>
          <p className="mt-1 text-on-surface-variant text-sm font-label">
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} across your wedding team
          </p>
        </div>
        <button
          onClick={handleAssignTask}
          className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Icon name="person_add" className="text-lg" />
          Assign Task
        </button>
      </div>

      {/* ─── Summary Stats ─── */}
      <div className="grid grid-cols-3 gap-4">
        {columns.map((col) => {
          const count = getColumnTasks(col).length;
          const config = columnConfig[col];
          return (
            <div
              key={col}
              className="bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border text-center"
            >
              <Icon name={config.icon} className="text-primary/40 text-2xl" />
              <p className="font-headline text-3xl text-on-surface mt-1">
                {count}
              </p>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider mt-1 font-label">
                {col}
              </p>
            </div>
          );
        })}
      </div>

      {/* ─── Kanban Board ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const config = columnConfig[column];
          const columnTasks = getColumnTasks(column);

          return (
            <div key={column} className="space-y-4">
              {/* Column Header */}
              <div
                className={`flex items-center justify-between p-4 rounded-2xl ${config.headerBg}`}
              >
                <div className="flex items-center gap-2">
                  <Icon name={config.icon} className="text-on-surface-variant text-lg" />
                  <h2 className="font-headline text-lg text-on-surface">
                    {column}
                  </h2>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-label font-semibold ${config.count}`}
                >
                  {columnTasks.length}
                </span>
              </div>

              {/* Task Cards */}
              <div className="space-y-3">
                {columnTasks.map((task) => {
                  const pStyle = priorityStyles[task.priority];

                  return (
                    <div
                      key={task.id}
                      className={`bg-surface-container-lowest rounded-2xl p-5 ambient-shadow ghost-border hover:shadow-lg transition-all cursor-pointer group ${
                        column === "Completed" ? "opacity-75" : ""
                      }`}
                      onClick={() => handleEditTask(task)}
                    >
                      {/* Priority + title + actions */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 shrink-0 ${pStyle.dot}`}
                        />
                        <h3
                          className={`font-label text-sm font-medium text-on-surface leading-snug flex-1 ${
                            column === "Completed"
                              ? "line-through text-on-surface-variant"
                              : ""
                          }`}
                        >
                          {task.title}
                        </h3>
                        {/* Quick actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                          {/* Move status buttons */}
                          {column !== "Completed" && (
                            <button
                              onClick={() => handleStatusChange(task, column === "To Do" ? "IN_PROGRESS" : "COMPLETED")}
                              className="p-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant/60 hover:text-primary transition-colors cursor-pointer"
                              title={column === "To Do" ? "Move to In Progress" : "Mark Complete"}
                            >
                              <Icon name={column === "To Do" ? "arrow_forward" : "check_circle"} className="text-base" />
                            </button>
                          )}
                          {column === "Completed" && (
                            <button
                              onClick={() => handleStatusChange(task, "TODO")}
                              className="p-1 rounded-lg hover:bg-surface-container-low text-on-surface-variant/60 hover:text-primary transition-colors cursor-pointer"
                              title="Move back to To Do"
                            >
                              <Icon name="undo" className="text-base" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(task)}
                            className="p-1 rounded-lg hover:bg-error-container/20 text-on-surface-variant/60 hover:text-error transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Icon name="delete" className="text-base" />
                          </button>
                        </div>
                      </div>

                      {/* Description snippet */}
                      {task.description && (
                        <p className="text-xs text-on-surface-variant/60 mt-1.5 ml-5 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Assignee */}
                      {task.assigneeName && (
                        <div className="flex items-center gap-2 mt-3 ml-5">
                          <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center">
                            <Icon name="person" className="text-xs text-on-surface-variant/60" />
                          </div>
                          <span className="text-xs font-label text-on-surface-variant">
                            {task.assigneeName}
                          </span>
                        </div>
                      )}

                      {/* Due date + priority tag + category */}
                      <div className="flex items-center justify-between mt-3 ml-5">
                        <div className="flex items-center gap-3">
                          {task.dueDate && (
                            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/60 font-label">
                              <Icon name="calendar_today" className="text-sm" />
                              {new Date(task.dueDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </div>
                          )}
                          {task.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant/70 font-label">
                              {task.category}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-label font-semibold ${pStyle.bg} ${pStyle.text}`}
                        >
                          {priorityLabel[task.priority]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add task button */}
              <button
                onClick={() => handleAddToColumn(column)}
                className="w-full py-3 rounded-2xl border border-dashed border-outline-variant/40 text-xs font-label text-on-surface-variant/50 hover:text-primary hover:border-primary/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Icon name="add" className="text-sm" />
                Add Task
              </button>
            </div>
          );
        })}
      </div>

      {/* ─── Modals ─── */}
      {modalOpen && (
        <TaskModal
          editingTask={editingTask}
          defaultStatus={defaultStatus}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          taskTitle={deleteTarget.title}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
