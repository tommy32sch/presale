'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Target,
  Bell,
  Store,
  Save,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    production_target_days: 30,
    notify_on_stage_change: true,
    notify_on_delay: true,
  });

  // Shopify state
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyLoading, setShopifyLoading] = useState(true);

  useEffect(() => {
    // Fetch settings
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setSettings({
            production_target_days: data.settings.production_target_days || 30,
            notify_on_stage_change: data.settings.notify_on_stage_change ?? true,
            notify_on_delay: data.settings.notify_on_delay ?? true,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Fetch Shopify connection status
    fetch('/api/admin/shopify/sync')
      .then((res) => res.json())
      .then((data) => {
        setShopifyConnected(data.connected || false);
      })
      .catch(() => {})
      .finally(() => setShopifyLoading(false));
  }, []);

  const handleSave = async () => {
    if (settings.production_target_days < 1 || settings.production_target_days > 365) {
      toast.error('Target days must be between 1 and 365');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings saved');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage application configuration</p>
      </div>

      {/* Production Health Target */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Production Health Target</CardTitle>
          </div>
          <CardDescription>
            Set the target number of days from payment received to delivery. Orders exceeding this target will appear as &quot;behind&quot; on the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label htmlFor="targetDays">Target Days</Label>
              <Input
                id="targetDays"
                type="number"
                min={1}
                max={365}
                value={settings.production_target_days}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    production_target_days: parseInt(e.target.value) || 1,
                  }))
                }
                className="max-w-[120px]"
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Orders at 70-100% of this target will show as &quot;at risk&quot;. Orders exceeding it will show as &quot;behind&quot;.
          </p>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Configure when notifications are generated for customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notify_on_stage_change}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  notify_on_stage_change: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-input"
            />
            <div>
              <p className="text-sm font-medium">Notify on stage changes</p>
              <p className="text-xs text-muted-foreground">
                Queue notifications when an order moves to a new stage
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.notify_on_delay}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  notify_on_delay: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-input"
            />
            <div>
              <p className="text-sm font-medium">Notify on delays</p>
              <p className="text-xs text-muted-foreground">
                Queue notifications when an order is marked as delayed
              </p>
            </div>
          </label>
          <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Preferences
          </Button>
        </CardContent>
      </Card>

      {/* Shopify Connection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Shopify Connection</CardTitle>
          </div>
          <CardDescription>
            Manage your Shopify store integration for automatic order syncing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shopifyLoading ? (
            <Skeleton className="h-8 w-48" />
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {shopifyConnected ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-status-success" />
                    <span className="font-medium">Connected</span>
                    <Badge variant="success">Active</Badge>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Not Connected</span>
                  </>
                )}
              </div>
              {shopifyConnected ? (
                <Button variant="outline" size="sm" asChild>
                  <a href="/admin">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync from Dashboard
                  </a>
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <a href="/admin">Connect from Dashboard</a>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
