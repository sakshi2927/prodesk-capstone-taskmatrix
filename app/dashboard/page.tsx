"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";

type TaskStatus = "todo" | "in_progress" | "done";

type TaskItem = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
};

type TaskRow = {
  id: unknown;
  user_id: unknown;
  title: unknown;
  description: unknown;
  status: unknown;
  created_at: unknown;
};

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const statusLabel: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

function getStatusChipClass(status: TaskStatus): string {
  if (status === "done") {
    return "status-chip status-chip-done";
  }

  if (status === "in_progress") {
    return "status-chip status-chip-progress";
  }

  return "status-chip status-chip-todo";
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "todo" || value === "in_progress" || value === "done";
}

function normalizeTask(row: TaskRow): TaskItem {
  return {
    id: typeof row.id === "string" ? row.id : "",
    user_id: typeof row.user_id === "string" ? row.user_id : "",
    title: typeof row.title === "string" && row.title.trim() ? row.title : "Untitled task",
    description: typeof row.description === "string" ? row.description : null,
    status: isTaskStatus(row.status) ? row.status : "todo",
    created_at:
      typeof row.created_at === "string" && row.created_at
        ? row.created_at
        : new Date().toISOString(),
  };
}

function formatDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }
  return parsed.toLocaleDateString();
}

function toChartDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown";
  }
  return parsed.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthReady = useAuthStore((state) => state.isAuthReady);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksError, setTasksError] = useState("");
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStatus, setCreateStatus] = useState<TaskStatus>("todo");
  const [isCreating, setIsCreating] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const completedTasksByDay = useMemo(() => {
    const aggregate = new Map<string, number>();

    tasks
      .filter((task) => task.status === "done")
      .forEach((task) => {
        const key = toChartDate(task.created_at);
        aggregate.set(key, (aggregate.get(key) ?? 0) + 1);
      });

    return Array.from(aggregate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, total]) => ({ day, total }));
  }, [tasks]);

  const statusTotals = useMemo(() => {
    return tasks.reduce(
      (counts, task) => {
        counts[task.status] += 1;
        return counts;
      },
      { todo: 0, in_progress: 0, done: 0 } as Record<TaskStatus, number>,
    );
  }, [tasks]);

  const fetchTasks = async (uid: string) => {
    setTasksError("");
    setIsLoadingTasks(true);

    try {
      const client = getSupabaseClient();
      const { data, error: fetchError } = await client
        .from("tasks")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      const normalizedTasks = (data ?? [])
        .map((row) => normalizeTask(row as TaskRow))
        .filter((task) => task.id);

      setTasks(normalizedTasks);
    } catch (fetchTasksError) {
      if (fetchTasksError instanceof Error) {
        setTasksError(fetchTasksError.message);
      } else {
        setTasksError("Unable to load tasks. Please try again.");
      }
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    if (isAuthReady && !user) {
      router.replace("/login");
    }
  }, [isAuthReady, router, user]);

  useEffect(() => {
    if (!isAuthReady || !user) {
      return;
    }

    void fetchTasks(user.uid);
  }, [isAuthReady, user]);

  const onLogout = async () => {
    try {
      const client = getSupabaseClient();
      await client.auth.signOut();
      router.push("/login");
    } catch (logoutError) {
      if (logoutError instanceof Error) {
        setError(logoutError.message);
      } else {
        setError("Unable to logout. Please try again.");
      }
    }
  };

  const onCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    if (!createTitle.trim()) {
      setTasksError("Task title is required.");
      return;
    }

    setTasksError("");
    setIsCreating(true);

    try {
      const client = getSupabaseClient();
      const { data, error: createError } = await client
        .from("tasks")
        .insert({
          user_id: user.uid,
          title: createTitle.trim(),
          description: createDescription.trim() ? createDescription.trim() : null,
          status: createStatus,
        })
        .select("*")
        .single();

      if (createError) {
        throw createError;
      }

      setTasks((previous) => [normalizeTask(data as TaskRow), ...previous]);
      setCreateTitle("");
      setCreateDescription("");
      setCreateStatus("todo");
    } catch (createTaskError) {
      if (createTaskError instanceof Error) {
        setTasksError(createTaskError.message);
      } else {
        setTasksError("Unable to create task. Please try again.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditStatus(task.status);
    setTasksError("");
  };

  const closeEditModal = () => {
    setEditingTask(null);
    setEditTitle("");
    setEditDescription("");
    setEditStatus("todo");
  };

  const onSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user || !editingTask) {
      return;
    }

    if (!editTitle.trim()) {
      setTasksError("Task title is required.");
      return;
    }

    setTasksError("");
    setIsSavingEdit(true);

    try {
      const client = getSupabaseClient();
      const { data, error: updateError } = await client
        .from("tasks")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() ? editDescription.trim() : null,
          status: editStatus,
        })
        .eq("id", editingTask.id)
        .eq("user_id", user.uid)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedTask = normalizeTask(data as TaskRow);
      setTasks((previous) =>
        previous.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
      );

      closeEditModal();
    } catch (saveEditError) {
      if (saveEditError instanceof Error) {
        setTasksError(saveEditError.message);
      } else {
        setTasksError("Unable to update task. Please try again.");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const onDeleteTask = async (taskId: string) => {
    if (!user || !taskId) {
      return;
    }

    const shouldDelete = window.confirm("Are you sure you want to delete this task?");
    if (!shouldDelete) {
      return;
    }

    setTasksError("");
    setDeletingId(taskId);

    try {
      const client = getSupabaseClient();
      const { error: deleteError } = await client
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", user.uid);

      if (deleteError) {
        throw deleteError;
      }

      setTasks((previous) => previous.filter((task) => task.id !== taskId));
    } catch (deleteTaskError) {
      if (deleteTaskError instanceof Error) {
        setTasksError(deleteTaskError.message);
      } else {
        setTasksError("Unable to delete task. Please try again.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAuthReady || !user) {
    return (
      <main className="auth-shell">
        <div className="auth-card rise-in text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Preparing your workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-shell mx-auto min-h-screen w-full max-w-6xl p-5 md:p-10">
      <header className="hero-band rise-in mb-8 overflow-hidden rounded-3xl border p-6 md:p-7" style={{ borderColor: "var(--line)" }}>
        <div className="hero-glow" aria-hidden="true" />
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="auth-badge">Authenticated Session</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Hello, {user.name}</h1>
            <p className="mt-2 text-sm md:text-base" style={{ color: "var(--muted)" }}>
              Your account is active and this route is protected by the Next.js proxy guard.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="ghost-btn px-4 py-2 text-sm font-semibold"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="rise-in grid gap-4 md:grid-cols-3">
        <article className="surface-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
            Name
          </p>
          <p className="mt-2 text-base font-semibold">{user.name}</p>
        </article>

        <article className="surface-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
            Email
          </p>
          <p className="mt-2 text-base font-semibold break-all">{user.email}</p>
        </article>

        <article className="surface-card rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
            UID
          </p>
          <p className="mt-2 text-sm font-semibold break-all">{user.uid}</p>
        </article>
      </section>

      <section className="rise-in mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <article className="surface-card rounded-2xl p-5 md:p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Add Task</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Create a task and sync it instantly to Supabase.
            </p>
          </div>

          <form className="space-y-3" onSubmit={onCreateTask}>
            <div>
              <label htmlFor="task-title" className="mb-1 block text-sm font-medium tracking-wide">
                Title
              </label>
              <input
                id="task-title"
                value={createTitle}
                onChange={(event) => setCreateTitle(event.target.value)}
                className="field-input"
                placeholder="Design onboarding screen"
                required
              />
            </div>

            <div>
              <label htmlFor="task-description" className="mb-1 block text-sm font-medium tracking-wide">
                Description
              </label>
              <textarea
                id="task-description"
                value={createDescription}
                onChange={(event) => setCreateDescription(event.target.value)}
                className="field-input min-h-24 resize-y"
                placeholder="Add acceptance criteria and notes"
              />
            </div>

            <div>
              <label htmlFor="task-status" className="mb-1 block text-sm font-medium tracking-wide">
                Status
              </label>
              <select
                id="task-status"
                value={createStatus}
                onChange={(event) => setCreateStatus(event.target.value as TaskStatus)}
                className="field-input"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={isCreating} className="primary-btn">
              {isCreating ? "Saving..." : "Add Task"}
            </button>
          </form>
        </article>

        <article className="surface-card rounded-2xl p-5 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Analytics</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                Completed tasks by day.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              <span className="kpi-pill">Todo: {statusTotals.todo}</span>
              <span className="kpi-pill">In Progress: {statusTotals.in_progress}</span>
              <span className="kpi-pill">Done: {statusTotals.done}</span>
            </div>
          </div>

          <div className="chart-panel h-64 w-full">
            {completedTasksByDay.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completedTasksByDay} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,120,98,0.25)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#c14f2a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-xl border border-dashed text-sm" style={{ borderColor: "var(--line)", color: "var(--muted)", background: "rgba(255,255,255,0.65)" }}>
                Complete tasks to populate this chart.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="surface-card rise-in mt-8 rounded-2xl p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Your Tasks</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {tasks.length} task{tasks.length === 1 ? "" : "s"} loaded
          </p>
        </div>

        {isLoadingTasks ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Loading tasks...
          </p>
        ) : tasks.length ? (
          <div className="overflow-x-auto">
            <table className="task-table min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                    Title
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                    Description
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                    Created
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="task-row rounded-xl">
                    <td className="rounded-l-xl border-y border-l px-3 py-3 text-sm font-medium" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.88)" }}>
                      {task.title}
                    </td>
                    <td className="border-y px-3 py-3 text-sm" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.88)" }}>
                      {task.description || "-"}
                    </td>
                    <td className="border-y px-3 py-3 text-sm" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.88)" }}>
                      <span className={getStatusChipClass(task.status)}>{statusLabel[task.status]}</span>
                    </td>
                    <td className="border-y px-3 py-3 text-sm" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.88)" }}>
                      {formatDate(task.created_at)}
                    </td>
                    <td className="rounded-r-xl border-y border-r px-3 py-3" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.88)" }}>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(task)}
                          className="ghost-btn px-3 py-1.5 text-xs"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void onDeleteTask(task.id)}
                          disabled={deletingId === task.id}
                          className="delete-btn rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 disabled:opacity-65"
                        >
                          {deletingId === task.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No tasks yet. Add your first task above.
          </p>
        )}
      </section>

      {error ? <p className="error-note mt-4 text-sm">{error}</p> : null}
      {tasksError ? <p className="error-note mt-2 text-sm">{tasksError}</p> : null}

      {editingTask ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(36,26,18,0.38)] px-4 backdrop-blur-[2px]">
          <section className="w-full max-w-lg rounded-2xl border p-5" style={{ borderColor: "var(--line)", background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,250,245,0.93))", boxShadow: "var(--shadow-strong)" }}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-tight">Edit Task</h3>
              <button
                type="button"
                className="ghost-btn px-3 py-1.5 text-xs"
                onClick={closeEditModal}
                disabled={isSavingEdit}
              >
                Close
              </button>
            </div>

            <form className="space-y-3" onSubmit={onSaveEdit}>
              <div>
                <label htmlFor="edit-task-title" className="mb-1 block text-sm font-medium tracking-wide">
                  Title
                </label>
                <input
                  id="edit-task-title"
                  value={editTitle}
                  onChange={(event) => setEditTitle(event.target.value)}
                  className="field-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit-task-description" className="mb-1 block text-sm font-medium tracking-wide">
                  Description
                </label>
                <textarea
                  id="edit-task-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  className="field-input min-h-24 resize-y"
                />
              </div>

              <div>
                <label htmlFor="edit-task-status" className="mb-1 block text-sm font-medium tracking-wide">
                  Status
                </label>
                <select
                  id="edit-task-status"
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value as TaskStatus)}
                  className="field-input"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button type="submit" disabled={isSavingEdit} className="primary-btn">
                {isSavingEdit ? "Saving changes..." : "Save Changes"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
