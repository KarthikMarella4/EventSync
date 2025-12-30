import React, { useState } from 'react';
import { Task } from '../types';
import { supabase } from '../lib/supabase';

interface TaskItemProps {
    task: Task;
    onUpdate: (updatedTask: Task) => void;
    onDelete?: (taskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete }) => {
    const [isCompleting, setIsCompleting] = useState(false);

    const toggleComplete = async () => {
        setIsCompleting(true);
        const newVal = !task.isCompleted;

        try {
            const { error } = await supabase
                .from('tasks')
                .update({ is_completed: newVal })
                .eq('id', task.id);

            if (error) throw error;

            onUpdate({ ...task, isCompleted: newVal });
        } catch (e) {
            console.error('Failed to update task', e);
            // Revert optimistic update if we did one (here we just wait)
        } finally {
            setIsCompleting(false);
        }
    };

    const isOverdue = !task.isCompleted && task.dueDate && new Date(task.dueDate) < new Date();

    // Format due date simply
    const formatDue = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const today = new Date();
        const isToday = d.toDateString() === today.toDateString();

        if (isToday) return 'Today, ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return d.toLocaleDateString() + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`
      relative overflow-hidden rounded-2xl p-4 transition-all duration-300 border
      ${task.isCompleted
                ? 'bg-gray-50 border-gray-100 opacity-60'
                : isOverdue
                    ? 'bg-white border-red-200 shadow-sm'
                    : 'bg-white border-green-100 shadow-sm hover:shadow-md hover:border-green-200'
            }
    `}>
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                    onClick={toggleComplete}
                    disabled={isCompleting}
                    className={`
            shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5
            ${task.isCompleted
                            ? 'bg-gray-400 border-gray-400 text-white'
                            : isOverdue
                                ? 'border-red-400 hover:bg-red-50'
                                : 'border-green-500 hover:bg-green-50'
                        }
          `}
                >
                    {task.isCompleted && <span className="material-symbols-outlined text-[16px]">check</span>}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold truncate transition-all ${task.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                        {task.title}
                    </h4>

                    {(task.dueDate || task.description) && (
                        <div className="flex items-center gap-3 mt-1.5">
                            {task.dueDate && (
                                <div className={`flex items-center gap-1 text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                    <span className="material-symbols-outlined text-[12px]">{task.reminderTime ? 'notifications_active' : 'schedule'}</span>
                                    <span>{formatDue(task.dueDate)}</span>
                                </div>
                            )}
                            {task.description && (
                                <p className="text-[11px] text-gray-400 truncate max-w-[150px]">{task.description}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                    {task.reminderTime && !task.isCompleted && (
                        <span className="material-symbols-outlined text-[18px] text-green-500 animate-pulse">notifications</span>
                    )}

                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                            className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors shrink-0"
                            title="Delete Task"
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Visual Status Indicator Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${task.isCompleted ? 'bg-gray-300' : isOverdue ? 'bg-red-500' : 'bg-green-500'}`}></div>
        </div>
    );
};
