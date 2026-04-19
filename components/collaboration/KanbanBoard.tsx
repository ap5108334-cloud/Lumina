"use client";

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, CheckCircle2, Circle, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface KanbanBoardProps {
  socket: Socket | null;
}

interface KanbanTask {
  id: string;
  title: string;
  owner: string;
  status: 'todo' | 'doing' | 'done';
}

export default function KanbanBoard({ socket }: KanbanBoardProps) {
  const { user } = useAuth();
  const [kanban, setKanban] = useState<{ todo: KanbanTask[], doing: KanbanTask[], done: KanbanTask[] }>({
    todo: [],
    doing: [],
    done: []
  });
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.on('init', (state) => {
      setKanban(state.kanban);
    });

    socket.on('kanban-update', (newKanban) => {
      setKanban(newKanban);
    });

    return () => {
      socket.off('init');
      socket.off('kanban-update');
    };
  }, [socket]);

  const addTask = () => {
    if (!newTask.trim() || !socket) return;

    const task: KanbanTask = {
      id: Math.random().toString(36).slice(2),
      title: newTask,
      owner: user?.name || 'Anonymous',
      status: 'todo'
    };

    const updated = { ...kanban, todo: [...kanban.todo, task] };
    setKanban(updated);
    socket.emit('kanban-update', updated);
    setNewTask('');
  };

  const moveTask = (task: KanbanTask, to: 'todo' | 'doing' | 'done') => {
    if (!socket) return;

    const from = task.status;
    const filteredFrom = (kanban[from] as KanbanTask[]).filter(t => t.id !== task.id);
    const updatedTo = [...(kanban[to] as KanbanTask[]), { ...task, status: to, owner: user?.name || task.owner }];

    const newKanban = { ...kanban, [from]: filteredFrom, [to]: updatedTo };
    setKanban(newKanban);
    socket.emit('kanban-update', newKanban);
  };

  const Column = ({ title, status, tasks, icon: Icon, color }: { title: string, status: 'todo' | 'doing' | 'done', tasks: KanbanTask[], icon: any, color: string }) => (
    <div className="flex flex-col gap-3 min-w-[200px] flex-1">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
           <Icon className={cn("w-3.5 h-3.5", color)} />
           <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h4>
        </div>
        <Badge variant="secondary" className="text-[9px] px-1.5">{tasks.length}</Badge>
      </div>

      <div className="flex-1 space-y-2.5 min-h-[100px] p-2 rounded-xl bg-secondary/10 border border-dashed border-border/50">
        {tasks.map((task) => (
          <Card key={task.id} className="bg-card/50 border-border/50 shadow-sm group hover:border-primary/50 transition-all">
            <CardContent className="p-3">
              <p className="text-xs font-medium mb-2">{task.title}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                   <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="w-2.5 h-2.5 text-primary" />
                   </div>
                   <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{task.owner}</span>
                </div>
                
                <div className="flex gap-1 opacity-10 group-hover:opacity-100 transition-opacity">
                  {status !== 'todo' && <button onClick={() => moveTask(task, 'todo')} className="p-1 hover:text-primary"><Circle className="w-3 h-3" /></button>}
                  {status !== 'doing' && <button onClick={() => moveTask(task, 'doing')} className="p-1 hover:text-lumina-amber"><Clock className="w-3 h-3" /></button>}
                  {status !== 'done' && <button onClick={() => moveTask(task, 'done')} className="p-1 hover:text-lumina-green"><CheckCircle2 className="w-3 h-3" /></button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="New team task..."
          className="h-9 text-xs"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <Button onClick={addTask} size="sm" className="h-9 gap-1.5">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
        <Column title="What I Want to Do" status="todo" tasks={kanban.todo} icon={Circle} color="text-slate-400" />
        <Column title="What I AM Doing" status="doing" tasks={kanban.doing} icon={Clock} color="text-lumina-amber" />
        <Column title="Goal Executed" status="done" tasks={kanban.done} icon={CheckCircle2} color="text-lumina-green" />
      </div>
    </div>
  );
}
