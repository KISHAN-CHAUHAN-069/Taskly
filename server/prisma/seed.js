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

  // 4. Create Sample Tasks (4 tasks per column)
  const taskTemplates = {
    'Backlog': [
      { title: 'Define SaaS pricing tiers', description: 'Configure tier models (free, basic, pro) and user boundaries.', priority: 'LOW' },
      { title: 'Competitor benchmark analysis', description: 'Map out pricing structures and major feature sets of competitors.', priority: 'MEDIUM' },
      { title: 'Draft investor presentation deck', description: 'Compile product milestones, target market sizes, and budget sheets.', priority: 'LOW' },
      { title: 'Design brand typography rules', description: 'Select logo colors, heading families, and component weights.', priority: 'LOW' }
    ],
    'To Do': [
      { title: 'Design Database Schema', description: 'Design database tables for Board, Column, Task, and User including positions for lists.', priority: 'HIGH' },
      { title: 'Implement Move Endpoint', description: 'Write the transaction and algorithmic reordering endpoint for task moving between columns.', priority: 'URGENT' },
      { title: 'Draft API authorization design', description: 'Prepare structure diagrams mapping auth middleware tokens to routing controllers.', priority: 'MEDIUM' },
      { title: 'Setup error monitoring integration', description: 'Evaluate Sentry or LogRocket to capture client-side run crashes.', priority: 'LOW' }
    ],
    'In Progress': [
      { title: 'Setup Socket.io Rooms', description: 'Enable real-time communication by setting up socket rooms for each individual board.', priority: 'MEDIUM' },
      { title: 'Refactor custom React sidebar', description: 'Clean up styling files and implement custom collapse toggles.', priority: 'MEDIUM' },
      { title: 'Optimize SQLite database queries', description: 'Bench performance speeds and ensure proper SQLite indexes exist.', priority: 'HIGH' },
      { title: 'Configure Vite API proxy routes', description: 'Point local client calls seamlessly to the Express server.', priority: 'LOW' }
    ],
    'In Review': [
      { title: 'Setup ESLint configurations', description: 'Establish static check boundaries and enforce strict syntax rules.', priority: 'LOW' },
      { title: 'Verify drag-and-drop mechanics', description: 'Check DND sensor distance thresholds and drop indicator outlines.', priority: 'HIGH' },
      { title: 'Audit package security issues', description: 'Run npm audit checks and verify dependency updates.', priority: 'MEDIUM' },
      { title: 'Document local environment scripts', description: 'Detail running commands, seeds, and db resets in Markdown.', priority: 'LOW' }
    ],
    'Done': [
      { title: 'Initialize React Vite project', description: 'Build file directories, setup boilerplate, and install packages.', priority: 'LOW' },
      { title: 'Install server dependencies', description: 'Download Express, Prisma Client, and Socket.io packages.', priority: 'LOW' },
      { title: 'Establish global CSS theme layout', description: 'Declare Outfit font imports and custom CSS HSL color tokens.', priority: 'MEDIUM' },
      { title: 'Create database migration files', description: 'Execute initial migration scripts to build tables.', priority: 'HIGH' }
    ]
  };

  for (const col of seededColumns) {
    const templates = taskTemplates[col.name] || [];
    console.log(`Adding 4 tasks to column: ${col.name}...`);
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const assignee = seededUsers[i % seededUsers.length];

      await prisma.task.create({
        data: {
          title: template.title,
          description: template.description,
          position: i,
          priority: template.priority,
          dueDate: new Date(Date.now() + 86400000 * (i + 2)),
          columnId: col.id,
          assigneeId: assignee.id
        }
      });
    }
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
