const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// --- API ENDPOINTS ---

// GET /api/users - Fetch mock users for dropdown lists
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/boards - Fetch list of all boards
app.get('/api/boards', async (req, res) => {
  try {
    const boards = await prisma.board.findMany();
    res.json(boards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

// POST /api/boards - Create a board
app.post('/api/boards', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Board name is required' });

  try {
    const board = await prisma.board.create({
      data: { name, description }
    });
    
    // Auto-create a couple of columns for convenience
    const defaultCols = ['To Do', 'In Progress', 'Done'];
    for (let i = 0; i < defaultCols.length; i++) {
      await prisma.column.create({
        data: {
          name: defaultCols[i],
          position: i,
          boardId: board.id
        }
      });
    }

    res.status(201).json(board);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
});

// GET /api/boards/:id - Fetch a full board with columns and tasks sorted by position
app.get('/api/boards/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              orderBy: { position: 'asc' },
              include: { assignee: true }
            }
          }
        }
      }
    });

    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json(board);
  } catch (error) {
    console.error('Error fetching board details:', error);
    res.status(500).json({ error: 'Failed to fetch board details' });
  }
});

// POST /api/columns - Create column
app.post('/api/columns', async (req, res) => {
  const { name, boardId } = req.body;
  if (!name || !boardId) {
    return res.status(400).json({ error: 'Name and boardId are required' });
  }

  try {
    const colCount = await prisma.column.count({ where: { boardId } });
    const column = await prisma.column.create({
      data: {
        name,
        boardId,
        position: colCount
      },
      include: {
        tasks: true
      }
    });

    // Notify clients of column creation
    io.to(`board:${boardId}`).emit('column:created', column);

    res.status(201).json(column);
  } catch (error) {
    console.error('Error creating column:', error);
    res.status(500).json({ error: 'Failed to create column' });
  }
});

// PATCH /api/columns/:id - Edit Column Name or position
app.patch('/api/columns/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const column = await prisma.column.update({
      where: { id },
      data: { name }
    });

    io.to(`board:${column.boardId}`).emit('column:updated', column);

    res.json(column);
  } catch (error) {
    console.error('Error updating column:', error);
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// DELETE /api/columns/:id - Delete a column and cascade delete all its tasks, adjusting positions of other columns
app.delete('/api/columns/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const column = await prisma.column.findUnique({ where: { id } });
    if (!column) return res.status(404).json({ error: 'Column not found' });

    const boardId = column.boardId;
    const deletedPosition = column.position;

    await prisma.$transaction(async (tx) => {
      // 1. Delete column
      await tx.column.delete({ where: { id } });

      // 2. Decrement other columns
      await tx.column.updateMany({
        where: {
          boardId,
          position: { gt: deletedPosition }
        },
        data: {
          position: { decrement: 1 }
        }
      });
    });

    io.to(`board:${boardId}`).emit('column:deleted', { columnId: id });

    res.json({ message: 'Column deleted successfully', columnId: id });
  } catch (error) {
    console.error('Error deleting column:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// POST /api/tasks - Create a task
app.post('/api/tasks', async (req, res) => {
  const { title, description, columnId, priority, dueDate, assigneeId } = req.body;
  if (!title || !columnId) {
    return res.status(400).json({ error: 'Title and columnId are required' });
  }

  try {
    const column = await prisma.column.findUnique({ where: { id: columnId } });
    if (!column) return res.status(404).json({ error: 'Column not found' });

    const taskCount = await prisma.task.count({ where: { columnId } });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        position: taskCount,
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        columnId,
        assigneeId: assigneeId || null
      },
      include: { assignee: true }
    });

    io.to(`board:${column.boardId}`).emit('task:created', task);

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id - Edit task attributes
app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, priority, dueDate, assigneeId } = req.body;

  try {
    const originalTask = await prisma.task.findUnique({
      where: { id },
      include: { column: true }
    });
    if (!originalTask) return res.status(404).json({ error: 'Task not found' });

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title : originalTask.title,
        description: description !== undefined ? description : originalTask.description,
        priority: priority !== undefined ? priority : originalTask.priority,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : originalTask.dueDate,
        assigneeId: assigneeId !== undefined ? (assigneeId || null) : originalTask.assigneeId
      },
      include: { assignee: true }
    });

    io.to(`board:${originalTask.column.boardId}`).emit('task:updated', updatedTask);

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PATCH /api/tasks/:id/move - Move task and shift other task positions accordingly
app.patch('/api/tasks/:id/move', async (req, res) => {
  const { id } = req.params;
  const { targetColumnId, targetPosition } = req.body;

  if (!targetColumnId || targetPosition === undefined) {
    return res.status(400).json({ error: 'targetColumnId and targetPosition are required' });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { column: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const sourceColumnId = task.columnId;
    const sourcePosition = task.position;
    const boardId = task.column.boardId;

    // Check if moving inside same column or different column
    if (sourceColumnId === targetColumnId) {
      if (sourcePosition === targetPosition) {
        return res.json(task);
      }

      await prisma.$transaction(async (tx) => {
        if (sourcePosition < targetPosition) {
          // Moving down: Decrement positions of tasks between sourcePosition + 1 and targetPosition
          await tx.task.updateMany({
            where: {
              columnId: sourceColumnId,
              position: {
                gt: sourcePosition,
                lte: targetPosition
              }
            },
            data: {
              position: { decrement: 1 }
            }
          });
        } else {
          // Moving up: Increment positions of tasks between targetPosition and sourcePosition - 1
          await tx.task.updateMany({
            where: {
              columnId: sourceColumnId,
              position: {
                gte: targetPosition,
                lt: sourcePosition
              }
            },
            data: {
              position: { increment: 1 }
            }
          });
        }

        // Set moving task position
        await tx.task.update({
          where: { id },
          data: { position: targetPosition }
        });
      });
    } else {
      // Moving to a different column
      await prisma.$transaction(async (tx) => {
        // 1. Decrement positions of tasks greater than sourcePosition in source column
        await tx.task.updateMany({
          where: {
            columnId: sourceColumnId,
            position: { gt: sourcePosition }
          },
          data: {
            position: { decrement: 1 }
          }
        });

        // 2. Increment positions of tasks greater than or equal to targetPosition in target column
        await tx.task.updateMany({
          where: {
            columnId: targetColumnId,
            position: { gte: targetPosition }
          },
          data: {
            position: { increment: 1 }
          }
        });

        // 3. Move task to target column and set target position
        await tx.task.update({
          where: { id },
          data: {
            columnId: targetColumnId,
            position: targetPosition
          }
        });
      });
    }

    const movedTask = await prisma.task.findUnique({
      where: { id },
      include: { assignee: true }
    });

    // Broadcast the event to other clients in this board room
    io.to(`board:${boardId}`).emit('task:moved', {
      taskId: id,
      sourceColumnId,
      targetColumnId,
      sourcePosition,
      targetPosition,
      task: movedTask
    });

    res.json(movedTask);
  } catch (error) {
    console.error('Error moving task:', error);
    res.status(500).json({ error: 'Failed to move task' });
  }
});

// DELETE /api/tasks/:id - Delete task and shift remaining task positions
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: { column: true }
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const columnId = task.columnId;
    const deletedPosition = task.position;
    const boardId = task.column.boardId;

    await prisma.$transaction(async (tx) => {
      // Delete task
      await tx.task.delete({ where: { id } });

      // Shift remaining items
      await tx.task.updateMany({
        where: {
          columnId,
          position: { gt: deletedPosition }
        },
        data: {
          position: { decrement: 1 }
        }
      });
    });

    // Notify clients of deletion
    io.to(`board:${boardId}`).emit('task:deleted', { taskId: id, columnId });

    res.json({ message: 'Task deleted successfully', taskId: id, columnId });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// --- SOCKET.IO CONNECTIONS ---
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  // Join room for specific board
  socket.on('board:join', (boardId) => {
    socket.join(`board:${boardId}`);
    console.log(`Socket ${socket.id} joined board room: board:${boardId}`);
  });

  socket.on('board:leave', (boardId) => {
    socket.leave(`board:${boardId}`);
    console.log(`Socket ${socket.id} left board room: board:${boardId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
