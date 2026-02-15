'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderWithProgress, Stage, StageStatus } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Search,
  Upload,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Plus,
  Loader2,
  CheckSquare,
  X,
  CheckCircle,
  Clock,
  Circle,
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
  const [stageFilter, setStageFilter] = useState(searchParams.get('stage') || 'all');

  // Add order dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newOrder, setNewOrder] = useState({
    order_number: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    items_description: '',
    quantity: '1',
  });

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stages, setStages] = useState<Stage[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkUpdate, setBulkUpdate] = useState({
    stage_id: '',
    status: 'completed' as StageStatus,
    queue_notification: false,
  });

  const page = parseInt(searchParams.get('page') || '1');

  const fetchOrders = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (search) params.set('search', search);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (stageFilter && stageFilter !== 'all') params.set('stage', stageFilter);

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
  }, [page, statusFilter, stageFilter]);

  // Fetch stages for bulk update
  useEffect(() => {
    const fetchStages = async () => {
      try {
        const res = await fetch('/api/admin/stages');
        const data = await res.json();
        if (data.success) {
          setStages(data.stages);
        }
      } catch (error) {
        console.error('Error fetching stages:', error);
      }
    };
    fetchStages();
  }, []);

  // Clear selection when page/filter changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter, stageFilter, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (stageFilter && stageFilter !== 'all') params.set('stage', stageFilter);
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

  const getProgressPercentage = (order: OrderWithProgress): number => {
    if (!order.progress || order.progress.length === 0) return 0;
    const completed = order.progress.filter((p) => p.status === 'completed').length;
    return Math.round((completed / order.progress.length) * 100);
  };

  const getStageBadgeColor = (order: OrderWithProgress): string => {
    if (!order.progress || order.progress.length === 0) return 'bg-secondary text-secondary-foreground';
    const totalStages = order.progress.length;
    const completed = order.progress.filter((p) => p.status === 'completed').length;
    const ratio = completed / totalStages;
    if (ratio >= 1) return 'bg-status-success-muted text-status-success';
    if (ratio >= 0.7) return 'bg-status-warning-muted text-status-warning';
    if (ratio >= 0.3) return 'bg-status-info-muted text-status-info';
    if (ratio > 0) return 'bg-status-pending-muted text-status-pending';
    return 'bg-secondary text-secondary-foreground';
  };

  const handleQuickStageUpdate = async (orderId: string, stageId: number, status: StageStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_id: stageId,
          status,
          queue_notification: false,
        }),
      });

      if (res.ok) {
        toast.success('Stage updated');
        fetchOrders();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update stage');
      }
    } catch {
      toast.error('Failed to update stage');
    }
  };

  const handleAddOrder = async () => {
    // Validate required fields
    if (!newOrder.order_number || !newOrder.customer_name || !newOrder.customer_email || !newOrder.customer_phone || !newOrder.items_description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setAdding(true);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOrder,
          quantity: parseInt(newOrder.quantity) || 1,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Order created successfully');
        setShowAddDialog(false);
        setNewOrder({
          order_number: '',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          items_description: '',
          quantity: '1',
        });
        fetchOrders();
      } else {
        toast.error(data.error || 'Failed to create order');
      }
    } catch {
      toast.error('Failed to create order');
    } finally {
      setAdding(false);
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (!data?.orders) return;
    if (selectedIds.size === data.orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.orders.map((o) => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkUpdate = async () => {
    if (!bulkUpdate.stage_id) {
      toast.error('Please select a stage');
      return;
    }

    setBulkUpdating(true);
    try {
      const res = await fetch('/api/admin/orders/bulk-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedIds),
          stage_id: parseInt(bulkUpdate.stage_id),
          status: bulkUpdate.status,
          queue_notification: bulkUpdate.queue_notification,
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(`Updated ${result.updated} orders${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`);
        setShowBulkDialog(false);
        setSelectedIds(new Set());
        setBulkUpdate({ stage_id: '', status: 'completed', queue_notification: false });
        fetchOrders();
      } else {
        toast.error(result.error || 'Failed to update orders');
      }
    } catch {
      toast.error('Failed to update orders');
    } finally {
      setBulkUpdating(false);
    }
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Order
          </Button>
          <Link href="/admin/orders/upload">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload CSV
            </Button>
          </Link>
        </div>
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
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="delayed">Delayed Only</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id.toString()}>
                {stage.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="font-medium">{selectedIds.size} order{selectedIds.size !== 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
            <Button size="sm" onClick={() => setShowBulkDialog(true)}>
              Update Status
            </Button>
          </div>
        </div>
      )}

      {/* Orders table */}
      {loading ? (
        <div className="rounded-md border">
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4 items-center py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-20" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="h-4 w-32 hidden md:block" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24 hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={data?.orders && data.orders.length > 0 && selectedIds.size === data.orders.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Items</TableHead>
                  <TableHead>Current Stage</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
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
                    <TableRow
                      key={order.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(order.id)}
                          onCheckedChange={() => toggleSelect(order.id)}
                        />
                      </TableCell>
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
                          <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                          {order.customer_phone && (
                            <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                        {order.items_description}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Badge className={getStageBadgeColor(order)}>
                              {getCurrentStage(order)}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuLabel>Update stage</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {stages.map((stage) => {
                                  const progress = order.progress?.find((p) => p.stage_id === stage.id);
                                  const isCompleted = progress?.status === 'completed';
                                  const isInProgress = progress?.status === 'in_progress';
                                  return (
                                    <DropdownMenuItem
                                      key={stage.id}
                                      disabled={isCompleted}
                                      onClick={() => handleQuickStageUpdate(
                                        order.id,
                                        stage.id,
                                        isInProgress ? 'completed' : 'in_progress'
                                      )}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle className="h-3.5 w-3.5 mr-2 text-status-success" />
                                      ) : isInProgress ? (
                                        <Clock className="h-3.5 w-3.5 mr-2 text-status-info" />
                                      ) : (
                                        <Circle className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                      )}
                                      {stage.display_name}
                                    </DropdownMenuItem>
                                  );
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <Progress value={getProgressPercentage(order)} className="h-1.5 w-20" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, yyyy')}
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

      {/* Add Order Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Order</DialogTitle>
            <DialogDescription>
              Manually create a new order. All fields are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="order_number">Order Number</Label>
              <Input
                id="order_number"
                placeholder="#1001"
                value={newOrder.order_number}
                onChange={(e) => setNewOrder({ ...newOrder, order_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                placeholder="John Smith"
                value={newOrder.customer_name}
                onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Customer Email</Label>
              <Input
                id="customer_email"
                type="email"
                placeholder="john@example.com"
                value={newOrder.customer_email}
                onChange={(e) => setNewOrder({ ...newOrder, customer_email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Customer Phone</Label>
              <Input
                id="customer_phone"
                placeholder="(555) 123-4567"
                value={newOrder.customer_phone}
                onChange={(e) => setNewOrder({ ...newOrder, customer_phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="items_description">Items Description</Label>
              <Input
                id="items_description"
                placeholder="Blue Jacket (M), Red T-Shirt (L)"
                value={newOrder.items_description}
                onChange={(e) => setNewOrder({ ...newOrder, items_description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newOrder.quantity}
                onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddOrder} disabled={adding}>
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update {selectedIds.size} Order{selectedIds.size !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Set the stage and status for all selected orders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bulk_stage">Stage</Label>
              <Select
                value={bulkUpdate.stage_id}
                onValueChange={(value) => setBulkUpdate({ ...bulkUpdate, stage_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id.toString()}>
                      {stage.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk_status">Status</Label>
              <Select
                value={bulkUpdate.status}
                onValueChange={(value) => setBulkUpdate({ ...bulkUpdate, status: value as StageStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="queue_notification"
                checked={bulkUpdate.queue_notification}
                onCheckedChange={(checked) =>
                  setBulkUpdate({ ...bulkUpdate, queue_notification: checked === true })
                }
              />
              <Label htmlFor="queue_notification" className="text-sm font-normal">
                Queue notifications for customers who opted in
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdate} disabled={bulkUpdating}>
              {bulkUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Orders'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
