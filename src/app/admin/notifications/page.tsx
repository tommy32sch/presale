'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Bell,
  Send,
  Loader2,
  Mail,
  MessageSquare,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface Notification {
  id: string;
  order_id: string;
  stage_id: number;
  channel: 'sms' | 'email';
  recipient: string;
  message_body: string;
  status: string;
  batch_id: string | null;
  error_message: string | null;
  created_at: string;
  order?: { order_number: string; customer_name: string };
  stage?: { display_name: string };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending_review');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    setSelectedIds(new Set());
  }, [statusFilter]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const handleEdit = async () => {
    if (!editingNotification) return;

    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNotification.id,
          message_body: editedMessage,
        }),
      });

      if (res.ok) {
        toast.success('Message updated');
        setEditingNotification(null);
        fetchNotifications();
      } else {
        toast.error('Failed to update message');
      }
    } catch {
      toast.error('Failed to update message');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Notification removed');
        fetchNotifications();
      } else {
        toast.error('Failed to remove notification');
      }
    } catch {
      toast.error('Failed to remove notification');
    }
  };

  const handleSendSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error('No notifications selected');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Sent: ${data.sent} | Failed: ${data.failed}`);
        setSelectedIds(new Set());
        fetchNotifications();
      } else {
        toast.error(data.error || 'Failed to send notifications');
      }
    } catch {
      toast.error('Failed to send notifications');
    } finally {
      setSending(false);
      setShowConfirmDialog(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'sent':
        return <Badge className="bg-green-500"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'sms' ? (
      <MessageSquare className="h-4 w-4" />
    ) : (
      <Mail className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Review and send customer notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending_review">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          {(statusFilter === 'pending_review' || statusFilter === 'approved') && (
            <Button
              onClick={() => setShowConfirmDialog(true)}
              disabled={selectedIds.size === 0 || sending}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Selected ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No notifications in this queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Select all */}
          {(statusFilter === 'pending_review' || statusFilter === 'approved') && (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <Checkbox
                checked={selectedIds.size === notifications.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm">
                Select all ({notifications.length})
              </span>
            </div>
          )}

          {/* Notifications list */}
          {notifications.map((notification) => (
            <Card key={notification.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {(statusFilter === 'pending_review' || statusFilter === 'approved') && (
                    <Checkbox
                      checked={selectedIds.has(notification.id)}
                      onCheckedChange={() => toggleSelect(notification.id)}
                      className="mt-1"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {getChannelIcon(notification.channel)}
                      <span className="font-medium">
                        {notification.order?.order_number}
                      </span>
                      <span className="text-muted-foreground">
                        {notification.order?.customer_name}
                      </span>
                      {getStatusBadge(notification.status)}
                      <Badge variant="outline">{notification.stage?.display_name}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      To: {notification.recipient}
                    </p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {notification.message_body}
                    </p>
                    {notification.error_message && (
                      <p className="text-sm text-destructive mt-2">
                        Error: {notification.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {notification.status === 'pending_review' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingNotification(notification);
                          setEditedMessage(notification.message_body);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {(notification.status === 'pending_review' || notification.status === 'failed') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingNotification} onOpenChange={() => setEditingNotification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              Customize this notification before sending
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            rows={5}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNotification(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm send dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notifications</DialogTitle>
            <DialogDescription>
              Are you sure you want to send {selectedIds.size} notification(s)?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendSelected} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
