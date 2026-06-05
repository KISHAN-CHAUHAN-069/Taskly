import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { KanbanSquare, Users, Globe, Layout, Plus, CheckCircle2 } from 'lucide-react';
import KanbanBoard from './components/KanbanBoard';
import Modal from './components/Modal';

export default function App() {
  const [boards, setBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [boardData, setBoardData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeUserId, setActiveUserId] = useState('');
  
  // Board Modal States
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');

  // Real-time Connection State
  const [isConnected, setIsConnected] = useState(false);
  
  // Toast notifications
  const [toasts, setToasts] = useState([]);
  
  const socketRef = useRef(null);

  const showToast = (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // 1. Connect Socket.io client
  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Real-time sync connected.');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Real-time sync disconnected.');
    });

    // Real-time board event listeners
    socket.on('task:moved', (data) => {
      console.log('Real-time task moved event:', data);
      // Background reload to sync database state
      if (activeBoardId) {
        fetchBoardDetails(activeBoardId, false);
      }
    });

    const handleDataChange = () => {
      if (activeBoardId) {
        fetchBoardDetails(activeBoardId, false);
      }
    };

    socket.on('task:created', handleDataChange);
    socket.on('task:updated', handleDataChange);
    socket.on('task:deleted', handleDataChange);
    socket.on('column:created', handleDataChange);
    socket.on('column:updated', handleDataChange);
    socket.on('column:deleted', handleDataChange);

    return () => {
      socket.disconnect();
    };
  }, [activeBoardId]);

  // 2. Fetch Board List and Users on boot
  useEffect(() => {
    fetchBoards();
    fetchUsers();
  }, []);

  // 3. Join board room when active board changes
  useEffect(() => {
    if (activeBoardId && socketRef.current) {
      socketRef.current.emit('board:join', activeBoardId);
      fetchBoardDetails(activeBoardId);
    }
    return () => {
      if (activeBoardId && socketRef.current) {
        socketRef.current.emit('board:leave', activeBoardId);
      }
    };
  }, [activeBoardId]);

  const fetchBoards = async () => {
    try {
      const res = await fetch('/api/boards');
      const data = await res.json();
      setBoards(data);
      if (data.length > 0 && !activeBoardId) {
        setActiveBoardId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch boards', 'error');
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
      if (data.length > 0) {
        setActiveUserId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch mock users', 'error');
    }
  };

  const fetchBoardDetails = async (boardId, showLoading = true) => {
    try {
      const res = await fetch(`/api/boards/${boardId}`);
      if (!res.ok) throw new Error('Board not found');
      const data = await res.json();
      
      setBoardData(data);
      setColumns(data.columns || []);
      
      // Extract tasks from columns
      let extractedTasks = [];
      data.columns.forEach((col) => {
        if (col.tasks) {
          extractedTasks = [...extractedTasks, ...col.tasks];
        }
      });
      setTasks(extractedTasks);
    } catch (err) {
      console.error(err);
      if (showLoading) showToast('Failed to load board details', 'error');
    }
  };

  // 4. Create Board handler
  const handleCreateBoard = () => {
    setNewBoardName('');
    setNewBoardDesc('');
    setIsBoardModalOpen(true);
  };

  const handleCreateBoardSubmit = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoardName, description: newBoardDesc || 'Project board' })
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setBoards((prev) => [...prev, data]);
      setActiveBoardId(data.id);
      setIsBoardModalOpen(false);
      showToast('Board created successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to create board', 'error');
    }
  };

  // 5. Create Column handler
  const handleCreateColumn = async (name) => {
    try {
      const res = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, boardId: activeBoardId })
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setColumns((prev) => [...prev, data]);
      showToast('Column added');
    } catch (err) {
      console.error(err);
      showToast('Failed to create column', 'error');
    }
  };

  // 6. Rename Column handler
  const handleRenameColumn = async (columnId, newName) => {
    try {
      const res = await fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setColumns((prev) => prev.map((c) => (c.id === columnId ? data : c)));
    } catch (err) {
      console.error(err);
      showToast('Failed to rename column', 'error');
    }
  };

  // 7. Delete Column handler
  const handleDeleteColumn = async (columnId) => {
    if (!window.confirm('Delete this column? All tasks inside will be deleted too.')) return;
    try {
      const res = await fetch(`/api/columns/${columnId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setColumns((prev) => prev.filter((c) => c.id !== columnId));
      setTasks((prev) => prev.filter((t) => t.columnId !== columnId));
      showToast('Column deleted');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete column', 'error');
    }
  };

  // 8. Create Task handler
  const handleCreateTask = async (taskData) => {
    const completeTaskData = {
      ...taskData,
      assigneeId: taskData.assigneeId || activeUserId
    };

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completeTaskData)
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTasks((prev) => [...prev, data]);
      showToast('Task created');
    } catch (err) {
      console.error(err);
      showToast('Failed to create task', 'error');
    }
  };

  // 9. Update Task details
  const handleUpdateTask = async (taskId, taskData) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data : t)));
      showToast('Task updated');
    } catch (err) {
      console.error(err);
      showToast('Failed to update task', 'error');
    }
  };

  // 10. Delete Task
  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task deleted');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete task', 'error');
    }
  };

  // 11. Move Task Optimistic UI Reordering Logic
  const handleMoveTask = (taskId, sourceColumnId, targetColumnId, sourcePosition, targetPosition) => {
    // 1. Create rollback snapshot
    const backupTasks = tasks.map((t) => ({ ...t }));
    
    // 2. Perform Optimistic local reordering immediately
    let localTasks = tasks.map((t) => ({ ...t }));
    const taskToMove = localTasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    if (sourceColumnId === targetColumnId) {
      // Shifting positions within the same column
      const colTasks = localTasks
        .filter((t) => t.columnId === sourceColumnId)
        .sort((a, b) => a.position - b.position);

      const [removed] = colTasks.splice(sourcePosition, 1);
      colTasks.splice(targetPosition, 0, removed);

      // Reassign sequential indices to preserve order
      colTasks.forEach((t, i) => {
        const item = localTasks.find((ut) => ut.id === t.id);
        if (item) item.position = i;
      });
    } else {
      // Reordering between different columns
      // Adjust positions in source column
      localTasks.forEach((t) => {
        if (t.columnId === sourceColumnId && t.position > sourcePosition) {
          t.position -= 1;
        }
      });

      // Adjust positions in target column
      localTasks.forEach((t) => {
        if (t.columnId === targetColumnId && t.position >= targetPosition) {
          t.position += 1;
        }
      });

      // Relocate the moving task
      taskToMove.columnId = targetColumnId;
      taskToMove.position = targetPosition;
    }

    // Apply state optimistically
    setTasks(localTasks);

    // 3. Dispatch the API call in the background
    fetch(`/api/tasks/${taskId}/move`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetColumnId, targetPosition })
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('API move call failed');
        const updatedTask = await res.json();
        // Update the item with database details (like formatted relations)
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
      })
      .catch((err) => {
        console.error('API Error, rolling back:', err);
        showToast('Network error, reverting card move...', 'error');
        // Rollback to backup state on failure
        setTasks(backupTasks);
      });
  };

  const selectedUser = users.find((u) => u.id === activeUserId);

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div className="logo-section">
          <div className="logo-icon">
            <KanbanSquare size={18} color="#fff" />
          </div>
          <span className="logo-text">Taskly</span>
        </div>

        <div className="section-label">Boards</div>
        <ul className="board-list">
          {boards.map((b) => (
            <li
              key={b.id}
              onClick={() => setActiveBoardId(b.id)}
              className={`board-item ${activeBoardId === b.id ? 'active' : ''}`}
            >
              <Layout size={16} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.name}
              </span>
            </li>
          ))}
          <button className="new-board-btn" onClick={handleCreateBoard}>
            <Plus size={14} /> New Board
          </button>
        </ul>

        {/* User Selection Overlay */}
        <div className="user-profile-box">
          <div className="section-label" style={{ marginTop: 0 }}>Active User</div>
          <div className="user-selector">
            {selectedUser ? (
              <>
                <img src={selectedUser.avatarUrl} alt={selectedUser.name} className="user-avatar" />
                <div className="user-details">
                  <select
                    className="form-select"
                    style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '0.8rem', fontWeight: 600, width: '130px' }}
                    value={activeUserId}
                    onChange={(e) => setActiveUserId(e.target.value)}
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id} style={{ background: '#0f1524' }}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <span className="user-role">SaaS Member</span>
                </div>
              </>
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading users...</span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Board View */}
      <main className="main-panel">
        <header className="top-bar">
          <div className="board-info">
            <h1 className="board-title-h1">{boardData?.name || 'Loading board...'}</h1>
            <span className="board-desc">{boardData?.description || 'Synchronizing workspace'}</span>
          </div>

          <div className="status-badge-container">
            <div className="connection-status">
              <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
              <span>{isConnected ? 'Sync Active' : 'Offline Mode'}</span>
            </div>
          </div>
        </header>

        {boardData ? (
          <KanbanBoard
            board={boardData}
            columns={columns}
            tasks={tasks}
            users={users}
            onMoveTask={handleMoveTask}
            onRenameColumn={handleRenameColumn}
            onDeleteColumn={handleDeleteColumn}
            onCreateColumn={handleCreateColumn}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onCreateTask={handleCreateTask}
          />
        ) : (
          <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            Loading Board Configuration...
          </div>
        )}
      </main>

      {/* Create Board Modal */}
      <Modal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        title="Create New Board"
      >
        <form onSubmit={handleCreateBoardSubmit}>
          <div className="modal-body" style={{ padding: 0 }}>
            <div className="form-group">
              <label className="form-label">Board Name</label>
              <input
                type="text"
                className="form-input"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="e.g. Acme Marketing, Sprint Planning"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={newBoardDesc}
                onChange={(e) => setNewBoardDesc(e.target.value)}
                placeholder="Detail what this board tracks..."
              />
            </div>
          </div>
          <div className="modal-footer" style={{ padding: '1rem 0 0 0', marginTop: '1.5rem', background: 'transparent', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsBoardModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Board
            </button>
          </div>
        </form>
      </Modal>

      {/* Toast Alert Drawer */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <CheckCircle2 size={16} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
