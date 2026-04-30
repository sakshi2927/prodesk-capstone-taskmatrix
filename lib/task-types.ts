export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskItem = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_at: string;
};