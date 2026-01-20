'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Send,
  Loader2,
  ArrowLeft,
  User,
  CheckCircle,
} from 'lucide-react';
import { Message } from '@/types';

interface Conversation {
  order: {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
  };
  messages: Message[];
  unreadCount: number;
  latestMessage: string;
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/admin/messages');
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);

    // Mark as read
    if (conversation.unreadCount > 0) {
      try {
        await fetch('/api/admin/messages', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_id: conversation.order.id,
            mark_read: true,
          }),
        });

        // Update local state
        setConversations((prev) =>
          prev.map((c) =>
            c.order.id === conversation.order.id
              ? { ...c, unreadCount: 0 }
              : c
          )
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyContent.trim()) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedConversation.order.id,
          content: replyContent,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Reply sent');
        setReplyContent('');

        // Add message to conversation
        setSelectedConversation((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            messages: [...prev.messages, data.message],
          };
        });

        fetchConversations();
      } else {
        toast.error(data.error || 'Failed to send reply');
      }
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 md:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Messages
        </h1>
        <p className="text-muted-foreground">
          Customer inquiries and replies
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Conversations list */}
        <Card className="overflow-hidden">
          <div className="h-full overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.order.id}
                    className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedConversation?.order.id === conversation.order.id
                        ? 'bg-muted'
                        : ''
                    }`}
                    onClick={() => handleSelectConversation(conversation)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {conversation.order.order_number}
                      </span>
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default">{conversation.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.order.customer_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(conversation.latestMessage))} ago
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Conversation view */}
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <p className="font-medium">{selectedConversation.order.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.order.customer_name} ({selectedConversation.order.customer_email})
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.direction === 'outbound'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.direction === 'outbound'
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatDistanceToNow(new Date(message.created_at))} ago
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={!replyContent.trim() || sending}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a conversation to view messages
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
