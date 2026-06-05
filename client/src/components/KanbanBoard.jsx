import React, { useState } from 'react';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import Modal from './Modal';

export default function KanbanBoard({
  board,
  columns,
  tasks,
  users,
  onMoveTask,
  onRenameColumn,
  onDeleteColumn,
  onCreateColumn,
  onUpdateTask,
  onDeleteTask,
  onCreateTask,
}) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeColumnIdForNewTask, setActiveColumnIdForNewTask] = useState(null);

  // Form states for task creation and editing
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');

  // Column creation states
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // drag only triggers if cursor moves 5px, allowing regular click events
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const openTaskModal = (task, defaultColumnId) => {
    if (task) {
      // Edit task Mode
      setSelectedTask(task);
      setTaskTitle(task.title);
      setTaskDesc(task.description || '');
      setTaskPriority(task.priority);
      setTaskDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setTaskAssignee(task.assigneeId || '');
      setActiveColumnIdForNewTask(task.columnId);
    } else {
      // Create task Mode
      setSelectedTask(null);
      setTaskTitle('');
      setTaskDesc('');
      setTaskPriority('MEDIUM');
      setTaskDueDate('');
      setTaskAssignee('');
      setActiveColumnIdForNewTask(defaultColumnId);
    }
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const taskData = {
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority,
      dueDate: taskDueDate || null,
      assigneeId: taskAssignee || null,
      columnId: activeColumnIdForNewTask
    };

    if (selectedTask) {
      onUpdateTask(selectedTask.id, taskData);
    } else {
      onCreateTask(taskData);
    }
    setIsTaskModalOpen(false);
  };

  const handleTaskDelete = () => {
    if (selectedTask) {
      onDeleteTask(selectedTask.id);
      setIsTaskModalOpen(false);
    }
  };

  const handleCreateColumnSubmit = (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    onCreateColumn(newColumnName);
    setNewColumnName('');
    setShowAddColumn(false);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    // Retrieve active task
    const draggedTask = tasks.find((t) => t.id === activeId);
    if (!draggedTask) return;

    const sourceColumnId = draggedTask.columnId;
    let targetColumnId = sourceColumnId;
    let targetPosition = 0;

    // Check if target drop zone is a column directly
    const isOverColumn = columns.some((col) => col.id === overId);

    if (isOverColumn) {
      targetColumnId = overId;
      const colTasks = tasks.filter((t) => t.columnId === targetColumnId);
      targetPosition = colTasks.length;
      
      // Correct for same-column drops to prevent off-by-one errors
      if (sourceColumnId === targetColumnId) {
        targetPosition = Math.max(0, colTasks.length - 1);
      }
    } else {
      // Dragged over another task card
      const targetTask = tasks.find((t) => t.id === overId);
      if (!targetTask) return;

      targetColumnId = targetTask.columnId;
      targetPosition = targetTask.position;
    }

    onMoveTask(activeId, sourceColumnId, targetColumnId, draggedTask.position, targetPosition);
  };

  return (
    <div className="board-wrapper">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        {columns.map((column) => {
          const columnTasks = tasks
            .filter((t) => t.columnId === column.id)
            .sort((a, b) => a.position - b.position);

          return (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={columnTasks}
              onAddTaskClick={openTaskModal}
              onRenameColumn={onRenameColumn}
              onDeleteColumnClick={onDeleteColumn}
            />
          );
        })}
      </DndContext>

      {/* Add Column Segment */}
      {showAddColumn ? (
        <form className="new-col-form" onSubmit={handleCreateColumnSubmit}>
          <input
            type="text"
            placeholder="New Column Title"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            className="new-col-input"
            autoFocus
            required
          />
          <div className="new-col-actions">
            <button type="submit" className="btn btn-primary">Add Column</button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowAddColumn(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="new-column-placeholder" onClick={() => setShowAddColumn(true)}>
          + Add Column
        </div>
      )}

      {/* Add/Edit Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={selectedTask ? 'Edit Task' : 'Create Task'}
      >
        <form onSubmit={handleTaskSubmit}>
          <div className="modal-body" style={{ padding: 0 }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                className="form-input"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="What is this task about?"
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                placeholder="Detail the work to be done..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Assignee</label>
              <select
                className="form-select"
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="modal-footer" style={{ padding: '1rem 0 0 0', marginTop: '1.5rem', background: 'transparent', borderTop: '1px solid var(--border-color)' }}>
            {selectedTask && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleTaskDelete}
                style={{ marginRight: 'auto' }}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTaskModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {selectedTask ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
