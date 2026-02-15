'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, Phone, Mail, AlertCircle } from 'lucide-react';

type LookupType = 'phone' | 'email';

export function OrderLookupForm() {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lookupType, setLookupType] = useState<LookupType>('phone');
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
          phone: lookupType === 'phone' ? phone.trim() : undefined,
          email: lookupType === 'email' ? email.trim() : undefined,
          lookupType,
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

  const isFormValid = orderNumber.trim() && (
    lookupType === 'phone' ? phone.trim() : email.trim()
  );

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="sr-only">
        <CardTitle>Order Lookup</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Lookup type toggle */}
          <div className="space-y-2">
            <Label className="text-sm">Verify with:</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={lookupType === 'phone' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setLookupType('phone')}
                disabled={isLoading}
              >
                <Phone className="h-4 w-4 mr-2" />
                Phone
              </Button>
              <Button
                type="button"
                variant={lookupType === 'email' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setLookupType('email')}
                disabled={isLoading}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>

          {lookupType === 'phone' ? (
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
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="text-lg"
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">
                The email address used when placing your order
              </p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full text-lg py-6"
            disabled={isLoading || !isFormValid}
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
            Can't find your order? Double-check your order number and {lookupType === 'phone' ? 'phone number' : 'email'} match your confirmation email.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
