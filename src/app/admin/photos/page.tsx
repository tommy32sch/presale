'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { Photo, Stage, Order } from '@/types';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Link,
  Loader2,
  Check,
} from 'lucide-react';

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (error: Error | null, result: { event: string; info: { public_id: string; secure_url: string } }) => void
      ) => { open: () => void };
    };
  }
}

interface PhotoWithAssignments extends Photo {
  stage?: { display_name: string };
  order_photos?: { order_id: string }[];
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<PhotoWithAssignments[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('');

  const fetchPhotos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (stageFilter && stageFilter !== 'all') {
        params.set('stage_id', stageFilter);
      }
      const res = await fetch(`/api/admin/photos?${params}`);
      const data = await res.json();
      if (data.success) {
        setPhotos(data.photos);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  }, [stageFilter]);

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

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders?limit=100');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchPhotos(), fetchStages(), fetchOrders()]).finally(() =>
      setLoading(false)
    );
  }, [fetchPhotos]);

  useEffect(() => {
    fetchPhotos();
    setSelectedPhotos(new Set());
  }, [stageFilter, fetchPhotos]);

  const handleUpload = () => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'presale_tracker';

    if (!cloudName) {
      toast.error('Cloudinary not configured');
      return;
    }

    if (!window.cloudinary) {
      // Load Cloudinary script if not loaded
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.onload = () => openWidget(cloudName, uploadPreset);
      document.body.appendChild(script);
    } else {
      openWidget(cloudName, uploadPreset);
    }
  };

  const openWidget = (cloudName: string, uploadPreset: string) => {
    const widget = window.cloudinary?.createUploadWidget(
      {
        cloudName,
        uploadPreset,
        sources: ['local', 'camera'],
        multiple: true,
        maxFiles: 20,
        resourceType: 'image',
        folder: 'presale-tracker',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxFileSize: 10000000, // 10MB
      },
      async (error, result) => {
        if (error) {
          console.error('Upload error:', error);
          toast.error('Upload failed');
          return;
        }

        if (result.event === 'success') {
          // Save to database
          setUploading(true);
          try {
            const res = await fetch('/api/admin/photos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cloudinary_public_id: result.info.public_id,
                cloudinary_url: result.info.secure_url,
              }),
            });

            if (res.ok) {
              toast.success('Photo uploaded');
              fetchPhotos();
            }
          } catch {
            toast.error('Failed to save photo');
          } finally {
            setUploading(false);
          }
        }
      }
    );

    widget?.open();
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/photos?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Photo deleted');
        fetchPhotos();
      } else {
        toast.error('Failed to delete photo');
      }
    } catch {
      toast.error('Failed to delete photo');
    }
  };

  const handleAssign = async () => {
    if (selectedPhotos.size === 0 || selectedOrders.size === 0) {
      toast.error('Select photos and orders');
      return;
    }

    if (!selectedStage) {
      toast.error('Please select a stage for these photos');
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch('/api/admin/photos/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_ids: Array.from(selectedPhotos),
          order_ids: Array.from(selectedOrders),
          stage_id: parseInt(selectedStage),
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Assigned ${data.assigned} photo-order pairs`);
        setShowAssignDialog(false);
        setSelectedPhotos(new Set());
        setSelectedOrders(new Set());
        setSelectedStage('');
        fetchPhotos();
      } else {
        toast.error(data.error || 'Failed to assign photos');
      }
    } catch {
      toast.error('Failed to assign photos');
    } finally {
      setAssigning(false);
    }
  };

  const togglePhoto = (id: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleOrder = (id: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6" />
            Photos
          </h1>
          <p className="text-muted-foreground">
            Upload and assign factory photos to orders
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload Photos
          </Button>
        </div>
      </div>

      {selectedPhotos.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">
            {selectedPhotos.size} photo(s) selected
          </span>
          <Button size="sm" onClick={() => setShowAssignDialog(true)}>
            <Link className="mr-2 h-4 w-4" />
            Assign to Orders
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedPhotos(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      {photos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No photos uploaded yet</p>
            <Button onClick={handleUpload} className="mt-4">
              <Upload className="mr-2 h-4 w-4" />
              Upload Your First Photo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`relative group rounded-lg overflow-hidden border-2 transition-colors ${
                selectedPhotos.has(photo.id)
                  ? 'border-primary'
                  : 'border-transparent hover:border-muted-foreground/50'
              }`}
            >
              <div
                className="aspect-square cursor-pointer"
                onClick={() => togglePhoto(photo.id)}
              >
                <img
                  src={photo.cloudinary_url}
                  alt={photo.caption || 'Factory photo'}
                  className="w-full h-full object-cover"
                />
              </div>
              {selectedPhotos.has(photo.id) && (
                <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(photo.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                {photo.stage && (
                  <Badge variant="secondary" className="text-xs">
                    {photo.stage.display_name}
                  </Badge>
                )}
                {photo.order_photos && photo.order_photos.length > 0 && (
                  <Badge variant="outline" className="text-xs ml-1">
                    {photo.order_photos.length} orders
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Photos to Orders</DialogTitle>
            <DialogDescription>
              Select a stage and orders to assign the {selectedPhotos.size} selected photo(s) to.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Which stage are these photos from?</label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
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

          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Select orders:</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrders(new Set(orders.map((o) => o.id)))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrders(new Set())}
              >
                Deselect All
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {orders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedOrders.has(order.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
                onClick={() => toggleOrder(order.id)}
              >
                <Checkbox
                  checked={selectedOrders.has(order.id)}
                  onCheckedChange={() => toggleOrder(order.id)}
                />
                <div className="flex-1">
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.customer_name} - {order.items_description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={selectedOrders.size === 0 || assigning}
            >
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Assign to {selectedOrders.size} Order(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
