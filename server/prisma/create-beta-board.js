const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Creating Beta Testing Release board...");

  // 1. Fetch seeded users
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.error("Please seed users first.");
    return;
  }

  // 2. Create the board
  const board = await prisma.board.create({
    data: {
      name: 'Beta Testing Release',
      description: 'Board to track beta feedback'
    }
  });
  console.log(`Board created: ${board.name} (ID: ${board.id})`);

  // 3. Create default columns
  const cols = ['To Do', 'In Progress', 'Done'];
  const columns = [];
  for (let i = 0; i < cols.length; i++) {
    const col = await prisma.column.create({
      data: {
        name: cols[i],
        position: i,
        boardId: board.id
      }
    });
    columns.push(col);
  }
  console.log("Columns created: To Do, In Progress, Done");

  // 4. Define tasks for each column
  const taskTemplates = {
    'To Do': [
      { title: 'Fix Signup Validation Bug', description: 'Ensure email format check prevents invalid registrations.', priority: 'URGENT' },
      { title: 'Write User Acceptance Tests', description: 'Draft scenarios to cover login, board, and card reordering flows.', priority: 'MEDIUM' },
      { title: 'Update Terms of Service', description: 'Review privacy policies and incorporate billing statements.', priority: 'LOW' }
    ],
    'In Progress': [
      { title: 'Implement Stripe Webhooks', description: 'Listen for payment success events to activate user accounts.', priority: 'HIGH' },
      { title: 'Refactor Drag & Drop Shadows', description: 'Enhance visual drop indicators when dragging over empty lanes.', priority: 'MEDIUM' },
      { title: 'Add Socket Connection Alerts', description: 'Display a reconnecting warning if the WebSocket connection drops.', priority: 'LOW' }
    ],
    'Done': [
      { title: 'Initialize Database Migration', description: 'Set up SQLite with foreign-key indexes for Kanban columns.', priority: 'HIGH' },
      { title: 'Setup Server Logging Middleware', description: 'Enable request logging on the API routes to aid debugging.', priority: 'LOW' },
      { title: 'Define Font Custom Variables', description: 'Import Outfit fonts and specify standard letter weights.', priority: 'MEDIUM' }
    ]
  };

  // 5. Add 3 tasks to each column
  for (const col of columns) {
    const templates = taskTemplates[col.name];
    console.log(`Adding 3 tasks to column ${col.name}...`);
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const assignee = users[i % users.length];

      await prisma.task.create({
        data: {
          title: template.title,
          description: template.description,
          position: i,
          priority: template.priority,
          dueDate: new Date(Date.now() + 86400000 * (i + 2)), // 2 to 4 days from now
          columnId: col.id,
          assigneeId: assignee.id
        }
      });
    }
  }

  console.log("Board created and tasks populated successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
