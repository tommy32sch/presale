import { OrderLookupForm } from '@/components/customer/OrderLookup';
import { Package } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <span className="font-bold text-lg">Order Tracker</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand/Hero section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Track Your Order</h1>
            <p className="text-muted-foreground">
              Enter your order details below to see real-time updates on your presale order.
            </p>
          </div>

          {/* Lookup form */}
          <OrderLookupForm />

          {/* Features */}
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-1">📍</div>
              <p className="text-xs text-muted-foreground">Real-time tracking</p>
            </div>
            <div>
              <div className="text-2xl mb-1">📸</div>
              <p className="text-xs text-muted-foreground">Factory photos</p>
            </div>
            <div>
              <div className="text-2xl mb-1">🔔</div>
              <p className="text-xs text-muted-foreground">SMS & Email alerts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Questions about your order? We're here to help.</p>
        </div>
      </footer>
    </main>
  );
}
