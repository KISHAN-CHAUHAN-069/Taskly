const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing boards, columns, and tasks to prevent duplicates on rerun
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();

  // 1. Create Mock Users
  const usersData = [
    {
      name: 'Sarah Connor',
      email: 'sarah@acme.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    },
    {
      name: 'John Doe',
      email: 'john@acme.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    },
    {
      name: 'Alex Rivera',
      email: 'alex@acme.com',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'
    },
    {
      name: 'Emily Chen',
      email: 'emily@acme.com',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
    }
  ];

  const seededUsers = [];
  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u
    });
    seededUsers.push(user);
  }
  console.log(`Seeded ${seededUsers.length} users.`);

  // 2. Create a Default Board
  const board = await prisma.board.create({
    data: {
      name: 'Product Development SaaS',
      description: 'Main product board for tracking Kanban workflows, real-time collaboration, and task lists.'
    }
  });
  console.log(`Seeded Board: ${board.name} (ID: ${board.id})`);

  // 3. Create Columns
  const columnsData = [
    { name: 'Backlog', position: 0 },
    { name: 'To Do', position: 1 },
    { name: 'In Progress', position: 2 },
    { name: 'In Review', position: 3 },
    { name: 'Done', position: 4 }
  ];

  const seededColumns = [];
  for (const c of columnsData) {
    const column = await prisma.column.create({
      data: {
        name: c.name,
        position: c.position,
        boardId: board.id
      }
    });
    seededColumns.push(column);
  }
  console.log(`Seeded ${seededColumns.length} columns.`);

  // 4. Create Sample Tasks
  const backlogCol = seededColumns[0];
  const todoCol = seededColumns[1];
  const inProgressCol = seededColumns[2];

  const tasksData = [
    {
      title: 'Design Database Schema',
      description: 'Design database tables for Board, Column, Task, and User including positions for lists.',
      position: 0,
      priority: 'HIGH',
      columnId: todoCol.id,
      assigneeId: seededUsers[0].id, // Sarah
      dueDate: new Date(Date.now() + 86400000 * 2) // 2 days from now
    },
    {
      title: 'Implement Move Endpoint',
      description: 'Write the transaction and algorithmic reordering endpoint for task moving between columns.',
      position: 1,
      priority: 'URGENT',
      columnId: todoCol.id,
      assigneeId: seededUsers[1].id, // John
      dueDate: new Date(Date.now() + 86400000 * 3) // 3 days from now
    },
    {
      title: 'Setup Socket.io Rooms',
      description: 'Enable real-time communication by setting up socket rooms for each individual board.',
      position: 0,
      priority: 'MEDIUM',
      columnId: inProgressCol.id,
      assigneeId: seededUsers[2].id, // Alex
      dueDate: new Date(Date.now() + 86400000 * 5)
    },
    {
      title: 'Vite & React Boilerplate',
      description: 'Initialize a clean React application utilizing Vite and vanilla styling custom variables.',
      position: 0,
      priority: 'LOW',
      columnId: backlogCol.id,
      assigneeId: seededUsers[3].id, // Emily
      dueDate: new Date(Date.now() - 86400000) // 1 day ago (Overdue)
    }
  ];

  for (const t of tasksData) {
    await prisma.task.create({
      data: t
    });
  }
  console.log('Seeded tasks successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
