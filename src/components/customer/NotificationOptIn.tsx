'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NotificationPreference } from '@/types';
import { Bell, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationOptInProps {
  orderId: string;
  onClose: () => void;
  onOptIn: (preferences: NotificationPreference) => void;
}

export function NotificationOptIn({ orderId, onClose, onOptIn }: NotificationOptInProps) {
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleOptIn = async () => {
    if (!smsEnabled && !emailEnabled) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sms_enabled: smsEnabled,
          email_enabled: emailEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      const prefs: NotificationPreference = {
        order_id: orderId,
        sms_enabled: smsEnabled,
        email_enabled: emailEnabled,
        opted_in_at: new Date().toISOString(),
      };

      toast.success('Notification preferences saved!');
      onOptIn(prefs);
    } catch {
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Stay Updated</DialogTitle>
          <DialogDescription className="text-center">
            Get notified when your order moves to a new stage. We&apos;ll only send important updates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <Checkbox
              id="sms"
              checked={smsEnabled}
              onCheckedChange={(checked) => setSmsEnabled(checked === true)}
            />
            <Label
              htmlFor="sms"
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive text messages for order updates
                </p>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <Checkbox
              id="email"
              checked={emailEnabled}
              onCheckedChange={(checked) => setEmailEnabled(checked === true)}
            />
            <Label
              htmlFor="email"
              className="flex items-center gap-2 cursor-pointer flex-1"
            >
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive emails with detailed updates
                </p>
              </div>
            </Label>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleOptIn} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Enable Notifications'
            )}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Maybe Later
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          You can change your preferences anytime. We respect your privacy.
        </p>
      </DialogContent>
    </Dialog>
  );
}
