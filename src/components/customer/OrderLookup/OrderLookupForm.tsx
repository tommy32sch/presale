'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, Phone, AlertCircle } from 'lucide-react';

export function OrderLookupForm() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Order not found');
        setIsLoading(false);
        return;
      }

      // Store order data in sessionStorage for the tracking page
      sessionStorage.setItem('orderData', JSON.stringify(data.order));

      // Navigate to tracking page
      router.push(`/track/${data.order.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="sr-only">
        <CardTitle>Order Lookup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderNumber" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Number
            </Label>
            <Input
              id="orderNumber"
              type="text"
              placeholder="#1001 or 1001"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
              disabled={isLoading}
              className="text-lg"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              You can find this in your order confirmation email
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={isLoading}
              className="text-lg"
              autoComplete="tel"
            />
            <p className="text-xs text-muted-foreground">
              The phone number used when placing your order
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full text-lg py-6"
            disabled={isLoading || !orderNumber.trim() || !phone.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Looking up order...
              </>
            ) : (
              'Track Order'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">
            Can't find your order? Double-check your order number and phone number match your confirmation email.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
