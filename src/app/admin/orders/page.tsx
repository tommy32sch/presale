'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderWithProgress } from '@/types';
import { format } from 'date-fns';
import {
  Search,
  Upload,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
} from 'lucide-react';

interface OrdersResponse {
  orders: OrderWithProgress[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');

  const page = parseInt(searchParams.get('page') || '1');

  const fetchOrders = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (search) params.set('search', search);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

    try {
      const res = await fetch(`/api/admin/orders?${params}`);
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    router.push(`/admin/orders?${params}`);
    fetchOrders();
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/admin/orders?${params}`);
  };

  const getCurrentStage = (order: OrderWithProgress) => {
    const inProgress = order.progress?.find((p) => p.status === 'in_progress');
    if (inProgress) return inProgress.stage?.display_name;

    const completed = order.progress?.filter((p) => p.status === 'completed');
    if (completed?.length) {
      const last = completed.sort((a, b) =>
        (a.stage?.sort_order || 0) - (b.stage?.sort_order || 0)
      ).pop();
      return last?.stage?.display_name;
    }
    return 'Pending';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            Manage and track all customer orders
          </p>
        </div>
        <Link href="/admin/orders/upload">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="delayed">Delayed Only</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{order.order_number}</span>
                          {order.is_delayed && (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{order.customer_email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {order.items_description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getCurrentStage(order)}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/orders/${order.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * data.pagination.limit + 1} to{' '}
                {Math.min(page * data.pagination.limit, data.pagination.total)} of{' '}
                {data.pagination.total} orders
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= data.pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
