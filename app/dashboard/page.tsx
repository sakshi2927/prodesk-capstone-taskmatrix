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
import { toast } from "sonner";

import { clearDemoSession, isFetchFailure } from "@/lib/demo-auth";
import { readDemoTasks, saveDemoTasks } from "@/lib/demo-tasks";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth-store";

import type { TaskItem, TaskStatus } from "@/lib/task-types";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

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

function formatTaskSummary(description: string | null): string {
  if (!description) {
    return "No description provided.";
  }

  return description;
}

function formatAiSubtasks(subtasks: string[]): string {
  return subtasks.map((subtask) => `- ${subtask}`).join("\n");
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
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
  const [pendingDeleteTask, setPendingDeleteTask] = useState<TaskItem | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [aiSubtasks, setAiSubtasks] = useState<string[]>([]);
  const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);

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

  const taskSections = [
    { label: "Task Form", href: "#task-form" },
    { label: "Analytics", href: "#analytics" },
    { label: "Tasks", href: "#tasks" },
  ];

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

    if (isDemoMode) {
      setTasks(readDemoTasks(uid));
      setIsLoadingTasks(false);
      return;
    }

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
      if (isFetchFailure(fetchTasksError)) {
        setTasks(readDemoTasks(uid));
        return;
      }

      if (fetchTasksError instanceof Error) {
        setTasksError(fetchTasksError.message);
      } else {
        setTasksError("Unable to load tasks. Please try again.");
      }
      toast.error("Unable to load tasks.");
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
    if (isDemoMode) {
      clearDemoSession();
      clearUser();
      toast.success("Logged out successfully.");
      router.push("/login");
      return;
    }

    try {
      const client = getSupabaseClient();
      await client.auth.signOut();
      clearUser();
      toast.success("Logged out successfully.");
      router.push("/login");
    } catch (logoutError) {
      if (logoutError instanceof Error) {
        setError(logoutError.message);
        toast.error(logoutError.message);
      } else {
        setError("Unable to logout. Please try again.");
        toast.error("Unable to logout. Please try again.");
      }
    }
  };

  const onGenerateSubtasks = async () => {
    if (!createTitle.trim()) {
      setTasksError("Add a title before generating sub-steps.");
      toast.error("Add a title before generating sub-steps.");
      return;
    }

    setTasksError("");
    setIsGeneratingSubtasks(true);

    if (isDemoMode) {
      setAiSubtasks([
        `Clarify the scope and success criteria for ${createTitle.trim()}.`,
        createDescription.trim()
          ? `Use the description to break ${createTitle.trim()} into smaller implementation steps.`
          : `List the key pieces needed to finish ${createTitle.trim()}.`,
        `Review edge cases, dependencies, and risks for ${createTitle.trim()}.`,
        `Test and ship ${createTitle.trim()} with a quick verification pass.`,
      ]);
      toast.success("Sub-steps generated.");
      setIsGeneratingSubtasks(false);
      return;
    }

    try {
      const response = await fetch("/api/ai/task-substeps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDescription.trim(),
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { subtasks?: unknown; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to generate sub-steps right now.");
      }

      const generatedSubtasks = Array.isArray(data?.subtasks)
        ? (data?.subtasks as unknown[])
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0)
        : [];

      if (!generatedSubtasks.length) {
        throw new Error("Gemini returned no usable sub-steps.");
      }

      setAiSubtasks(generatedSubtasks);
      toast.success("Sub-steps generated.");
    } catch (generateError) {
      const message = generateError instanceof Error ? generateError.message : "Unable to generate sub-steps right now.";
      setTasksError(message);
      toast.error(message);
    } finally {
      setIsGeneratingSubtasks(false);
    }
  };

  const useAiSubtasks = () => {
    if (!aiSubtasks.length) {
      return;
    }

    const generatedDescription = formatAiSubtasks(aiSubtasks);
    setCreateDescription((current) => {
      const baseDescription = current.trim();

      if (!baseDescription) {
        return generatedDescription;
      }

      return `${baseDescription}\n\nSuggested sub-steps:\n${generatedDescription}`;
    });
    toast.success("AI sub-steps added to the description.");
  };

  const askToDeleteTask = (task: TaskItem) => {
    setPendingDeleteTask(task);
  };

  const cancelDeleteTask = () => {
    setPendingDeleteTask(null);
  };

  const confirmDeleteTask = async () => {
    if (!user || !pendingDeleteTask) {
      return;
    }

    setTasksError("");
    setDeletingId(pendingDeleteTask.id);

    if (isDemoMode) {
      setTasks((previous) => {
        const nextTasks = previous.filter((task) => task.id !== pendingDeleteTask.id);
        saveDemoTasks(user.uid, nextTasks);
        return nextTasks;
      });
      toast.success("Task successfully deleted.");
      setPendingDeleteTask(null);
      setDeletingId(null);
      return;
    }

    try {
      const client = getSupabaseClient();
      const { error: deleteError } = await client
        .from("tasks")
        .delete()
        .eq("id", pendingDeleteTask.id)
        .eq("user_id", user.uid);

      if (deleteError) {
        throw deleteError;
      }

      setTasks((previous) => {
        const nextTasks = previous.filter((task) => task.id !== pendingDeleteTask.id);
        saveDemoTasks(user.uid, nextTasks);
        return nextTasks;
      });
      toast.success("Task successfully deleted.");
      setPendingDeleteTask(null);
    } catch (deleteTaskError) {
      if (isFetchFailure(deleteTaskError)) {
        setTasks((previous) => {
          const nextTasks = previous.filter((task) => task.id !== pendingDeleteTask.id);
          saveDemoTasks(user.uid, nextTasks);
          return nextTasks;
        });
        toast.success("Task successfully deleted.");
        setPendingDeleteTask(null);
        return;
      }

      const message = deleteTaskError instanceof Error ? deleteTaskError.message : "Unable to delete task. Please try again.";
      setTasksError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
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

    if (isDemoMode) {
      const fallbackTask: TaskItem = {
        id: `demo-${crypto.randomUUID()}`,
        user_id: user.uid,
        title: createTitle.trim(),
        description: createDescription.trim() ? createDescription.trim() : null,
        status: createStatus,
        created_at: new Date().toISOString(),
      };

      setTasks((previous) => {
        const nextTasks = [fallbackTask, ...previous];
        saveDemoTasks(user.uid, nextTasks);
        return nextTasks;
      });
      setCreateTitle("");
      setCreateDescription("");
      setCreateStatus("todo");
      setAiSubtasks([]);
      toast.success("Task successfully created.");
      setIsCreating(false);
      return;
    }

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

      const createdTask = normalizeTask(data as TaskRow);
      setTasks((previous) => {
        const nextTasks = [createdTask, ...previous];
        saveDemoTasks(user.uid, nextTasks);
        return nextTasks;
      });
      setCreateTitle("");
      setCreateDescription("");
      setCreateStatus("todo");
      setAiSubtasks([]);
      toast.success("Task successfully created.");
    } catch (createTaskError) {
      if (isFetchFailure(createTaskError)) {
        const fallbackTask: TaskItem = {
          id: `demo-${crypto.randomUUID()}`,
          user_id: user.uid,
          title: createTitle.trim(),
          description: createDescription.trim() ? createDescription.trim() : null,
          status: createStatus,
          created_at: new Date().toISOString(),
        };

        setTasks((previous) => {
          const nextTasks = [fallbackTask, ...previous];
          saveDemoTasks(user.uid, nextTasks);
          return nextTasks;
        });
        setCreateTitle("");
        setCreateDescription("");
        setCreateStatus("todo");
        setAiSubtasks([]);
        toast.success("Task successfully created.");
        return;
      }

      if (createTaskError instanceof Error) {
        setTasksError(createTaskError.message);
        toast.error(createTaskError.message);
      } else {
        setTasksError("Unable to create task. Please try again.");
        toast.error("Unable to create task. Please try again.");
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

    if (isDemoMode) {
      const updatedTask: TaskItem = {
        ...editingTask,
        title: editTitle.trim(),
        description: editDescription.trim() ? editDescription.trim() : null,
        status: editStatus,
      };

      setTasks((previous) => {
        const nextTasks = previous.map((task) => (task.id === updatedTask.id ? updatedTask : task));
        saveDemoTasks(user.uid, nextTasks);
        return nextTasks;
      });
      closeEditModal();
      toast.success("Task changes saved.");
      setIsSavingEdit(false);
      return;
    }

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
      setTasks((previous) => {
        const nextTasks = previous.map((task) => (task.id === updatedTask.id ? updatedTask : task));
        saveDemoTasks(user.uid, nextTasks);
        return nextTasks;
      });

      closeEditModal();
      toast.success("Task changes saved.");
    } catch (saveEditError) {
      if (isFetchFailure(saveEditError) && editingTask) {
        const updatedTask: TaskItem = {
          ...editingTask,
          title: editTitle.trim(),
          description: editDescription.trim() ? editDescription.trim() : null,
          status: editStatus,
        };

        setTasks((previous) => {
          const nextTasks = previous.map((task) => (task.id === updatedTask.id ? updatedTask : task));
          saveDemoTasks(user.uid, nextTasks);
          return nextTasks;
        });
        closeEditModal();
        toast.success("Task changes saved.");
        return;
      }

      if (saveEditError instanceof Error) {
        setTasksError(saveEditError.message);
        toast.error(saveEditError.message);
      } else {
        setTasksError("Unable to update task. Please try again.");
        toast.error("Unable to update task. Please try again.");
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!isAuthReady || !user) {
    return (
      <main className="auth-shell">
        <div className="auth-card rise-in w-full max-w-md space-y-4 text-center">
          <div
            className="mx-auto h-10 w-10 animate-spin rounded-full border-2"
            style={{ borderColor: "var(--line)", borderTopColor: "var(--brand)" }}
          />
          <div className="space-y-2">
            <div className="skeleton h-4 w-28 mx-auto" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5 mx-auto" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-shell mx-auto min-h-screen w-full max-w-6xl p-4 sm:p-5 md:p-10">
      <header className="hero-band rise-in mb-8 overflow-hidden rounded-3xl border p-5 md:p-7" style={{ borderColor: "var(--line)" }}>
        <div className="hero-glow" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-5">
              <div>
                <p className="auth-badge">Authenticated Session</p>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Hello, {user.name}</h1>
                <p className="mt-2 text-sm md:text-base" style={{ color: "var(--muted)" }}>
                  Your account is active and this route is protected by the Next.js proxy guard.
                </p>
              </div>

              <nav className="hidden flex-wrap gap-2 md:flex" aria-label="Dashboard sections">
                {taskSections.map((section) => (
                  <a key={section.href} href={section.href} className="nav-pill">
                    {section.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-3 self-start">
              <button
                type="button"
                onClick={() => setIsMenuOpen(true)}
                className="ghost-btn px-4 py-2 text-sm font-semibold md:hidden"
                aria-label="Open navigation menu"
                aria-expanded={isMenuOpen}
              >
                Menu
              </button>
              <button type="button" onClick={onLogout} className="ghost-btn px-4 py-2 text-sm font-semibold">
                Logout
              </button>
            </div>
          </div>

          {isMenuOpen ? (
            <div className="fixed inset-0 z-40 md:hidden">
              <button
                type="button"
                className="mobile-menu-backdrop"
                onClick={() => setIsMenuOpen(false)}
                aria-label="Close navigation menu"
              />
              <div className="mobile-menu-panel absolute right-4 top-20 w-[min(20rem,calc(100vw-2rem))] rounded-3xl border p-4" style={{ borderColor: "var(--line)" }}>
                <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                  Quick Jump
                </p>
                <div className="mt-4 grid gap-2">
                  {taskSections.map((section) => (
                    <a
                      key={section.href}
                      href={section.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="nav-link-mobile"
                    >
                      {section.label}
                    </a>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    void onLogout();
                  }}
                  className="ghost-btn mt-4 w-full px-4 py-2 text-sm font-semibold"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : null}
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
        <article className="surface-card rounded-2xl p-5 md:p-6" id="task-form">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight">Add Task</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Create a task, then let Gemini draft sub-steps before you save.
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

            <div className="surface-card rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.62)" }}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
                Gemini Assist
              </p>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                Generate a short action plan from the task title and description.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void onGenerateSubtasks()}
                  disabled={isGeneratingSubtasks}
                  className="ghost-btn px-4 py-2 text-sm font-semibold"
                >
                  {isGeneratingSubtasks ? "Generating..." : "Generate sub-steps"}
                </button>
                {aiSubtasks.length ? (
                  <button type="button" onClick={useAiSubtasks} className="ghost-btn px-4 py-2 text-sm font-semibold">
                    Use suggestions
                  </button>
                ) : null}
              </div>

              {aiSubtasks.length ? (
                <ul className="mt-4 grid gap-2 text-sm" style={{ color: "var(--foreground)" }}>
                  {aiSubtasks.map((subtask) => (
                    <li key={subtask} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.82)" }}>
                      {subtask}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <button type="submit" disabled={isCreating} className="primary-btn">
              {isCreating ? "Saving..." : "Add Task"}
            </button>
          </form>
        </article>

        <article className="surface-card rounded-2xl p-5 md:p-6" id="analytics">
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
              <div
                className="grid h-full place-items-center rounded-xl border border-dashed text-sm"
                style={{ borderColor: "var(--line)", color: "var(--muted)", background: "rgba(255,255,255,0.65)" }}
              >
                Complete tasks to populate this chart.
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="surface-card rise-in mt-8 rounded-2xl p-5 md:p-6" id="tasks">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Your Tasks</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {tasks.length} task{tasks.length === 1 ? "" : "s"} loaded
          </p>
        </div>

        {isLoadingTasks ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:hidden">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="surface-card rounded-2xl p-4">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton mt-3 h-3 w-full" />
                  <div className="skeleton mt-2 h-3 w-4/5" />
                  <div className="mt-4 flex gap-2">
                    <div className="skeleton h-9 w-20 rounded-lg" />
                    <div className="skeleton h-9 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-hidden rounded-2xl border" style={{ borderColor: "var(--line)" }}>
              <div className="grid gap-2 bg-[rgba(255,255,255,0.72)] p-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="grid grid-cols-[1.2fr,1.4fr,0.8fr,0.8fr,0.9fr] gap-3 rounded-xl border p-3" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.88)" }}>
                    <div className="skeleton h-4 w-32" />
                    <div className="skeleton h-4 w-full" />
                    <div className="skeleton h-4 w-20" />
                    <div className="skeleton h-4 w-24" />
                    <div className="skeleton h-4 w-24 justify-self-end" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : tasks.length ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:hidden">
              {tasks.map((task) => (
                <article key={task.id} className="surface-card rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold">{task.title}</p>
                      <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                        {formatTaskSummary(task.description)}
                      </p>
                    </div>
                    <span className={getStatusChipClass(task.status)}>{statusLabel[task.status]}</span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm" style={{ color: "var(--muted)" }}>
                    <div>
                      <span className="font-semibold" style={{ color: "var(--foreground)" }}>
                        Created: 
                      </span>
                      {formatDate(task.created_at)}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => openEditModal(task)} className="ghost-btn flex-1 px-3 py-2 text-sm">
                      Edit
                    </button>
                    <button type="button" onClick={() => askToDeleteTask(task)} disabled={deletingId === task.id} className="delete-btn flex-1 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-65">
                      {deletingId === task.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
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
                        {formatTaskSummary(task.description)}
                      </td>
                      <td className="border-y px-3 py-3 text-sm" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.88)" }}>
                        <span className={getStatusChipClass(task.status)}>{statusLabel[task.status]}</span>
                      </td>
                      <td className="border-y px-3 py-3 text-sm" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.88)" }}>
                        {formatDate(task.created_at)}
                      </td>
                      <td className="rounded-r-xl border-y border-r px-3 py-3" style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.88)" }}>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openEditModal(task)} className="ghost-btn px-3 py-1.5 text-xs">
                            Edit
                          </button>

                          <button type="button" onClick={() => askToDeleteTask(task)} disabled={deletingId === task.id} className="delete-btn rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 disabled:opacity-65">
                            {deletingId === task.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              <button type="button" className="ghost-btn px-3 py-1.5 text-xs" onClick={closeEditModal} disabled={isSavingEdit}>
                Close
              </button>
            </div>

            <form className="space-y-3" onSubmit={onSaveEdit}>
              <div>
                <label htmlFor="edit-task-title" className="mb-1 block text-sm font-medium tracking-wide">
                  Title
                </label>
                <input id="edit-task-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} className="field-input" required />
              </div>

              <div>
                <label htmlFor="edit-task-description" className="mb-1 block text-sm font-medium tracking-wide">
                  Description
                </label>
                <textarea id="edit-task-description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} className="field-input min-h-24 resize-y" />
              </div>

              <div>
                <label htmlFor="edit-task-status" className="mb-1 block text-sm font-medium tracking-wide">
                  Status
                </label>
                <select id="edit-task-status" value={editStatus} onChange={(event) => setEditStatus(event.target.value as TaskStatus)} className="field-input">
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

      {pendingDeleteTask ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(36,26,18,0.38)] px-4 backdrop-blur-[2px]">
          <section className="w-full max-w-md rounded-2xl border p-5" style={{ borderColor: "var(--line)", background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,250,245,0.94))", boxShadow: "var(--shadow-strong)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--muted)" }}>
              Confirm delete
            </p>
            <h3 className="mt-3 text-lg font-semibold tracking-tight">Delete this task?</h3>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              {pendingDeleteTask.title} will be removed from your workspace.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={cancelDeleteTask} className="ghost-btn px-4 py-2 text-sm font-semibold sm:flex-1">
                Cancel
              </button>
              <button type="button" onClick={() => void confirmDeleteTask()} disabled={deletingId === pendingDeleteTask.id} className="delete-btn rounded-lg border px-4 py-2 text-sm font-semibold sm:flex-1 disabled:opacity-65">
                {deletingId === pendingDeleteTask.id ? "Deleting..." : "Delete task"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
