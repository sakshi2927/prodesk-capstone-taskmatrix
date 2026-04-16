# prodesk-capstone-Taskmatrix

## TaskMatrix - Smart Project Management System

TaskMatrix is a modern, scalable project management tool inspired by Jira and Asana. It helps teams efficiently manage projects, assign tasks, track progress, and collaborate in real-time using an intuitive Kanban interface.

This repository currently contains the frontend app built with Next.js 16, Supabase Authentication, route protection, and Zustand global user state.

## Setup

1. Create a Supabase project.
2. In Supabase, enable Email authentication.
3. Copy `.env.local.example` to `.env.local` and fill in your Supabase URL and anon key.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Auth Routes

- `/login`: Login form connected to Supabase Auth.
- `/register`: Registration form connected to Supabase Auth.
- `/dashboard`: Protected page. Unauthenticated users are redirected to `/login` by `proxy.ts`.

## Global User State

The authenticated user is stored in Zustand and displayed in the dashboard with:

- Name
- Email
- UID

## Planned Product Scope

- Project management (create/manage projects and members)
- Task management (create/edit/delete, assignee, priority, due date)
- Kanban board with drag-and-drop status flow
- Realtime activity updates

## Design Reference

Figma: https://www.figma.com/design/zDBB9hUXh6lwgcvex1Labn/TaskMatrix-UI?node-id=0-1&t=D0s92XWSDKkKmKPP-1
