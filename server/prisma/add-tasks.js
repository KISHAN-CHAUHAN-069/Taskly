const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Get the most recently created board
  const board = await prisma.board.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { columns: true }
  });

  if (!board) {
    console.error("No boards found!");
    return;
  }
  console.log(`Found Board: ${board.name} (ID: ${board.id})`);
  console.log(`Columns: ${board.columns.map(c => c.name).join(', ')}`);

  // 2. Get all users
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.error("No users found! Please seed users first.");
    return;
  }

  // 3. Define tasks for each default column
  const taskTemplates = {
    'To Do': [
      { title: 'Setup CI/CD Pipeline', description: 'Configure GitHub Actions for automated build and test runner.', priority: 'HIGH' },
      { title: 'Write API Documentation', description: 'Document all REST endpoints and WebSockets events using Swagger/OpenAPI.', priority: 'MEDIUM' },
      { title: 'Integrate Email Service', description: 'Setup SendGrid or Resend to deliver transactional notification emails.', priority: 'LOW' }
    ],
    'In Progress': [
      { title: 'Refactor State Management', description: 'Clean up local React state using clean hooks and context providers.', priority: 'MEDIUM' },
      { title: 'Add Auth Middleware', description: 'Protect Express API endpoints with JWT session verification tokens.', priority: 'URGENT' },
      { title: 'Optimize Database Queries', description: 'Add SQLite indices on foreign keys and run Prisma optimization benchmarks.', priority: 'LOW' }
    ],
    'Done': [
      { title: 'Initial Project Setup', description: 'Initialize React Vite template and Node Express backend server.', priority: 'MEDIUM' },
      { title: 'Configure Prisma ORM', description: 'Setup SQLite datasource, generate client libraries, and check tables.', priority: 'HIGH' },
      { title: 'Design Landing Page Wireframes', description: 'Create draft wireframes for the Kanban home view layouts.', priority: 'LOW' }
    ]
  };

  for (const col of board.columns) {
    // Fallback if column names differ
    const templates = taskTemplates[col.name] || [
      { title: `Task 1 for ${col.name}`, description: 'Auto-generated details.', priority: 'LOW' },
      { title: `Task 2 for ${col.name}`, description: 'Auto-generated details.', priority: 'MEDIUM' },
      { title: `Task 3 for ${col.name}`, description: 'Auto-generated details.', priority: 'HIGH' }
    ];

    console.log(`Adding tasks to column: ${col.name}...`);
    const currentTaskCount = await prisma.task.count({ where: { columnId: col.id } });

    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      // Select different assignees
      const assignee = users[i % users.length];

      await prisma.task.create({
        data: {
          title: template.title,
          description: template.description,
          position: currentTaskCount + i,
          priority: template.priority,
          dueDate: new Date(Date.now() + 86400000 * (i + 2)), // 2 to 4 days from now
          columnId: col.id,
          assigneeId: assignee.id
        }
      });
    }
  }

  console.log("All tasks populated successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
