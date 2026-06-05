import React, { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Trash2 } from 'lucide-react';
import TaskCard from './TaskCard';

export default function KanbanColumn({ 
  column, 
  tasks, 
  onAddTaskClick, 
  onDeleteColumnClick, 
  onRenameColumn 
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(column.name);

  useEffect(() => {
    setTitleVal(column.name);
  }, [column.name]);

  const handleRenameSubmit = () => {
    setIsEditingTitle(false);
    if (titleVal.trim() && titleVal !== column.name) {
      onRenameColumn(column.id, titleVal);
    } else {
      setTitleVal(column.name);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`board-column ${isOver ? 'dragging-over' : ''}`}
    >
      <div className="column-header">
        <div className="column-title-container">
          {isEditingTitle ? (
            <input
              type="text"
              value={titleVal}
              onChange={(e) => setTitleVal(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              autoFocus
              className="column-title-input"
            />
          ) : (
            <span
              className="column-title-input"
              style={{ border: '1px solid transparent', cursor: 'pointer', display: 'inline-block' }}
              onClick={() => setIsEditingTitle(true)}
            >
              {column.name}
            </span>
          )}
          <span className="column-count">{tasks.length}</span>
        </div>
        
        <div className="column-actions">
          <button
            onClick={() => onDeleteColumnClick(column.id)}
            className="column-action-btn delete-col"
            title="Delete Column and Tasks"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="column-tasks">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={(t) => onAddTaskClick(t, column.id)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div style={{ flexGrow: 1, minHeight: '60px' }} />
        )}
      </div>

      <button className="add-task-inline" onClick={() => onAddTaskClick(null, column.id)}>
        <Plus size={14} /> Add Task
      </button>
    </div>
  );
}
