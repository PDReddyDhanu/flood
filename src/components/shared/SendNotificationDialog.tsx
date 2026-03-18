'use client';

import React, { useState } from 'react';
import { Send, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sendNotification, type NotifTarget, type NotifType } from '@/lib/notifications';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** 'admin' can send to citizen | rescue | all. 'rescue' can only send to citizen. */
  senderRole: 'admin' | 'rescue';
}

export function SendNotificationDialog({ isOpen, onClose, senderRole }: Props) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState<NotifTarget>(
    senderRole === 'rescue' ? 'citizen' : 'all'
  );
  const [type, setType] = useState<NotifType>('general');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ variant: 'destructive', title: 'Missing fields', description: 'Title and message are required.' });
      return;
    }
    setLoading(true);
    try {
      await sendNotification(title, message, targetRole, type);
      toast({ title: '✅ Notification Sent', description: `Delivered to ${targetRole === 'all' ? 'everyone' : `${targetRole} users`}.` });
      setTitle('');
      setMessage('');
      onClose();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message || 'Could not send notification.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl border-0 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-headline font-bold">Send Notification</DialogTitle>
          </div>
          <DialogDescription>
            {senderRole === 'rescue'
              ? 'Broadcast a message to citizens in the area.'
              : 'Broadcast a message to citizens, rescue teams, or all users.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            {/* Target */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recipients</Label>
              <Select
                value={targetRole}
                onValueChange={v => setTargetRole(v as NotifTarget)}
                disabled={senderRole === 'rescue'}
              >
                <SelectTrigger className="h-10 rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Citizens</SelectItem>
                  {senderRole === 'admin' && <SelectItem value="rescue">Rescue Teams</SelectItem>}
                  {senderRole === 'admin' && <SelectItem value="all">Everyone</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</Label>
              <Select value={type} onValueChange={v => setType(v as NotifType)}>
                <SelectTrigger className="h-10 rounded-xl border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">📢 General</SelectItem>
                  <SelectItem value="alert">🚨 Alert</SelectItem>
                  <SelectItem value="status_update">✅ Status Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</Label>
            <Input
              placeholder="Short, clear subject..."
              className="h-10 rounded-xl border-2"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={80}
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Message</Label>
            <Textarea
              placeholder="Enter your message..."
              className="resize-none rounded-xl border-2 min-h-[100px]"
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
            />
            <p className="text-[10px] text-slate-400 text-right">{message.length}/500</p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1 rounded-xl h-11" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl font-bold gap-2 bg-primary hover:bg-primary/90"
              onClick={handleSend}
              disabled={loading || !title.trim() || !message.trim()}
            >
              <Send className="h-4 w-4" />
              {loading ? 'Sending…' : 'Send Now'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
