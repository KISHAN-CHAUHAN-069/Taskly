# Taskly | Real-time Kanban SaaS Platform

Taskly is a real-time, glassmorphic Kanban Board SaaS application. It features fluid drag-and-drop task card reordering, transactional SQLite database updates via Prisma, and instantaneous synchronization across all connected clients using Socket.io.

---

## Technical Stack

- **Frontend**: React (Vite), DnD-Kit (`@dnd-kit/core` & `@dnd-kit/sortable`), Socket.io-client, Lucide React, and modern Vanilla CSS (with CSS variables and dark-mode styles).
- **Backend**: Node.js, Express, Socket.io server, Prisma ORM, and SQLite database.

---

## How to Run Manually

To run the application manually, you need to launch both the **backend API server** and the **frontend dev server**. Follow these steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16.x or higher is recommended).

---

### Step 1: Set up and Run the Backend Server

1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Install the backend dependencies:
   ```bash
   npm install
   ```

3. Initialize the SQLite database and run the migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

4. Seed the database with mock users, initial board layouts, and sample tasks:
   ```bash
   # Populates the main demo board
   npm run prisma:seed

   # Populates the "Beta Testing Release" board (3 tasks per column, varied assignees and priorities)
   node prisma/create-beta-board.js
   ```

5. Start the backend server in development mode:
   ```bash
   npm run dev
   ```
   *The backend will now be running on [http://localhost:5000](http://localhost:5000).*

---

### Step 2: Set up and Run the Frontend Client

1. Open a **new, separate terminal** and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Install the frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend development server will now be running on [http://localhost:3000](http://localhost:3000).*

---

### Step 3: Access and Test Real-time Sync

1. Open [http://localhost:3000](http://localhost:3000) in your web browser.
2. Select the **"Beta Testing Release"** board in the sidebar.
3. Open another browser tab or window next to it at the same address.
4. Drag and drop a task or edit task details in one window. You will see it update in the other window instantly!
