# prodesk-capstone-Taskmatrix
# 🚀 TaskMatrix – Smart Project Management System

## 📖 Overview
TaskMatrix is a modern, scalable project management tool inspired by Jira and Asana. It helps teams efficiently manage projects, assign tasks, track progress, and collaborate in real-time using an intuitive Kanban interface.

This application is built as part of a capstone project to demonstrate production-level frontend development skills.

---

## 👩‍💻 Track
Frontend Development

---

## ⚙️ Tech Stack

### Frontend
- React.js / Next.js
- Tailwind CSS
- Redux Toolkit / Zustand

### Backend
- Node.js
- Express.js

### Database
- MongoDB (Mongoose)

### Authentication
- JWT Authentication

### Realtime Features
- Socket.io

### Deployment
- Frontend: Vercel
- Backend: Render

---

## 🎯 Core Features

### 🔐 Authentication
- User Signup & Login
- Secure JWT-based authentication
- Role-based access (Admin / Member)

---

### 📁 Project Management
- Create and delete projects
- Add/remove team members
- View all projects in dashboard

---

### 🧩 Task Management
- Create, edit, delete tasks
- Assign tasks to team members
- Set priority levels (Low, Medium, High)
- Add due dates

---

### 📊 Kanban Board
- Drag-and-drop functionality
- Task status columns:
  - To Do
  - In Progress
  - Done

---

### 🔔 Activity Feed (Realtime)
- Live updates when tasks are created or updated
- Track user actions in real-time

---

### 💬 (Optional Advanced Features)
- Task comments
- File attachments
- Notifications system

---

## 🧱 System Architecture

### 🗄️ Database Design (MongoDB)

#### Users Collection
- _id
- name
- email
- password
- role

#### Projects Collection
- _id
- name
- members (array of userIds)

#### Tasks Collection
- _id
- title
- description
- status (todo, in-progress, done)
- priority
- assignedTo (userId)
- projectId
- dueDate

#### Comments Collection (Optional)
- taskId
- userId
- message

---

### 🔗 Relationships
- A user can be part of multiple projects
- A project contains multiple tasks
- Each task is assigned to one user

---

## 🎨 UI/UX Design (Figma)
👉 Figma Link: https://www.figma.com/design/zDBB9hUXh6lwgcvex1Labn/TaskMatrix-UI?node-id=0-1&t=D0s92XWSDKkKmKPP-1

### Designed Screens:
1. Login Page
2. Dashboard with Kanban Board
3. Task Details Page

---

## 📸 Screenshots
<img width="1236" height="514" alt="Screenshot 2026-04-10 125649" src="https://github.com/user-attachments/assets/bee64085-402c-4eef-9270-811ed3c9bc89" />


---

## 🧪 API Endpoints (Planned)

### Auth
- POST /api/auth/signup
- POST /api/auth/login

### Projects
- GET /api/projects
- POST /api/projects
- DELETE /api/projects/:id

### Tasks
- GET /api/tasks/:projectId
- POST /api/tasks
- PUT /api/tasks/:id
- DELETE /api/tasks/:id

---

## 🧠 State Management (Frontend)

``` js
{
  user: {},
  projects: [],
  tasks: [],
  ui: {
    loading: false,
    error: null
  }
}
