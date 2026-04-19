"use client";

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Whiteboard from '@/components/collaboration/Whiteboard';
import GroupChat from '@/components/collaboration/GroupChat';
import KanbanBoard from '@/components/collaboration/KanbanBoard';
import StudySquad from '@/components/collaboration/StudySquad';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Wifi, WifiOff, Sparkles, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CollaborationPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [squadFocus, setSquadFocus] = useState<Record<string, any>>({});

  useEffect(() => {
    // Connect to the standalone collaboration server
    const socketInstance = io('http://localhost:3005');

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Connected to collaboration server');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from collaboration server');
    });

    socketInstance.on('squad-focus-update', (data: any) => {
      setSquadFocus(data);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-lumina-purple" />
            Group Discussion Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time collaboration & progress tracking</p>
        </div>
        <div className="flex items-center gap-3">
           <div className={cn(
             "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all",
             connected ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
           )}>
             {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
             {connected ? "Live Sync Active" : "Offline Mode"}
           </div>
           <div className="flex -space-x-2">
             {Object.values(squadFocus).slice(0, 3).map((m: any, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold">
                  {m.id.split(" ").pop()[0]}
                </div>
             ))}
             {Object.values(squadFocus).length > 3 && (
                <div className="w-8 h-8 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  +{Object.values(squadFocus).length - 3}
                </div>
             )}
           </div>
        </div>
      </div>

      {/* Main Grid: T-Layout */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        
        {/* Top: Whiteboard */}
        <div className="h-[45%] shrink-0">
           <Whiteboard socket={socket} />
        </div>

        {/* Bottom Rows */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-6 min-h-0">
          
          {/* Study Squad (1.5/6) */}
          <div className="md:col-span-2 h-full min-h-0">
            <StudySquad squadFocus={squadFocus} />
          </div>

          {/* Group Chat (2/6) */}
          <div className="md:col-span-2 h-full min-h-0">
            <GroupChat socket={socket} />
          </div>

          {/* Kanban Board (2.5/6) */}
          <div className="md:col-span-2 h-full min-h-0">
             <Card className="h-full flex flex-col overflow-hidden border-border/50 bg-card/10 backdrop-blur-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/40">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Layout className="w-3.5 h-3.5 text-lumina-amber" />
                    Multi-User Progress Engine
                  </h3>
                </div>
                <div className="flex-1 p-4 overflow-hidden">
                   <KanbanBoard socket={socket} />
                 </div>
              </Card>
           </div>
 
         </div>
       </div>
     </div>
   );
 }
