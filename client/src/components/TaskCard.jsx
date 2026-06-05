import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar } from 'lucide-react';

export default function TaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Prevent drag listeners from blocking click events
  const handleCardClick = (e) => {
    // Only open details if we didn't drag
    onClick(task);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="task-card"
      onClick={handleCardClick}
    >
      <div className="task-card-header">
        <div className="task-card-title">{task.title}</div>
      </div>
      
      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}
      
      <div className="task-card-footer" onClick={(e) => e.stopPropagation()}>
        <div className="task-badges">
          <span className={`priority-badge ${task.priority.toLowerCase()}`}>
            {task.priority}
          </span>
          {task.dueDate && (
            <span className={`date-badge ${isOverdue ? 'overdue' : ''}`}>
              <Calendar size={11} />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
        
        {task.assignee ? (
          <img
            src={task.assignee.avatarUrl}
            alt={task.assignee.name}
            className="card-assignee-avatar"
            title={task.assignee.name}
          />
        ) : (
          <div className="card-assignee-placeholder" title="No Assignee">?</div>
        )}
      </div>
    </div>
  );
}
