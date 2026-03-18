'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, X, CheckCheck, Trash2, MessageSquare, AlertCircle, Info, ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase/provider';
import {
  subscribeToNotifications,
  deleteNotificationForUser,
  clearAllNotificationsForUser,
  type Notification,
} from '@/lib/notifications';
import { useToast } from '@/hooks/use-toast';

const TYPE_ICON: Record<string, React.ReactNode> = {
  general: <Info className="h-4 w-4 text-blue-500" />,
  status_update: <MessageSquare className="h-4 w-4 text-green-500" />,
  alert: <ShieldAlert className="h-4 w-4 text-red-500" />,
};

function timeAgo(ts: any): string {
  if (!ts?.seconds) return '';
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function NotificationBell({ role }: { role: 'citizen' | 'rescue' | 'admin' }) {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Live subscription
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(role, user.uid, setNotifications);
    return () => unsub();
  }, [role, user]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectMode(false);
        setSelected(new Set());
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.length;

  const handleDelete = async (id: string) => {
    if (!user) return;
    setLoading(id);
    await deleteNotificationForUser(id, user.uid);
    setLoading(null);
  };

  const handleDeleteSelected = async () => {
    if (!user || selected.size === 0) return;
    setLoading('bulk');
    await Promise.all([...selected].map(id => deleteNotificationForUser(id, user.uid)));
    setSelected(new Set());
    setSelectMode(false);
    setLoading(null);
    toast({ title: 'Removed', description: `${selected.size} notification(s) removed.` });
  };

  const handleClearAll = async () => {
    if (!user) return;
    setLoading('all');
    await clearAllNotificationsForUser(role, user.uid);
    setLoading(null);
    setIsOpen(false);
    toast({ title: 'Cleared', description: 'All notifications cleared.' });
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => { setIsOpen(p => !p); setSelectMode(false); setSelected(new Set()); }}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-[340px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-[2000] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
            <span className="font-bold text-slate-800 text-sm">
              Notifications {unread > 0 && (
                <span className="ml-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-black">
                  {unread}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={() => { setSelectMode(p => !p); setSelected(new Set()); }}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${selectMode ? 'bg-primary text-white' : 'hover:bg-slate-100 text-slate-500'}`}
                  >
                    Select
                  </button>
                  {!selectMode && (
                    <button
                      onClick={handleClearAll}
                      disabled={loading === 'all'}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                      title="Clear all"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                </>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Select mode toolbar */}
          {selectMode && selected.size > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b">
              <span className="text-xs font-bold text-primary">{selected.size} selected</span>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs gap-1"
                disabled={loading === 'bulk'}
                onClick={handleDeleteSelected}
              >
                <Trash2 className="h-3 w-3" />
                {loading === 'bulk' ? 'Removing…' : 'Remove Selected'}
              </Button>
            </div>
          )}

          {/* List */}
          <div className="overflow-y-auto max-h-[380px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-10 w-10 text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm font-medium">No notifications</p>
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => selectMode && toggleSelect(n.id)}
                className={`flex gap-3 px-4 py-3 border-b last:border-0 hover:bg-slate-50 transition-colors group ${selectMode ? 'cursor-pointer' : ''} ${selected.has(n.id) ? 'bg-primary/5' : ''}`}
              >
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selected.has(n.id)}
                    onChange={() => toggleSelect(n.id)}
                    className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                    onClick={e => e.stopPropagation()}
                  />
                )}
                <div className="flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? TYPE_ICON.general}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">by {n.sentByName}</span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                  </div>
                </div>
                {!selectMode && (
                  <button
                    onClick={() => handleDelete(n.id)}
                    disabled={loading === n.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
