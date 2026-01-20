'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CSVImportResult } from '@/types';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';

export default function CSVUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('orders');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', activeTab);

      const res = await fetch('/api/admin/orders/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        if (data.details) {
          setResult({
            success: false,
            imported: 0,
            skipped: 0,
            errors: data.details,
          });
        }
      } else {
        setResult(data);
      }
    } catch {
      setError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = (type: 'orders' | 'stages') => {
    let content: string;
    let filename: string;

    if (type === 'orders') {
      content = 'order_number,customer_name,customer_email,customer_phone,items_description,quantity\n#1001,John Smith,john@email.com,555-123-4567,"Blue Jacket (M)",1\n#1002,Jane Doe,jane@email.com,555-987-6543,"Red Hoodie (L), Black Pants (M)",2';
      filename = 'orders_template.csv';
    } else {
      content = 'order_number,stage,status,estimated_start_date,estimated_end_date,notes\n#1001,production_started,in_progress,2025-02-01,2025-02-05,\n#1001,materials_sourcing,completed,,,';
      filename = 'stage_updates_template.csv';
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Upload CSV</h1>
          <p className="text-muted-foreground">
            Import orders or update stages in bulk
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders">New Orders</TabsTrigger>
          <TabsTrigger value="stages">Stage Updates</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import New Orders</CardTitle>
              <CardDescription>
                Upload a CSV file with new customer orders. Existing order numbers will be skipped.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Select CSV File
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Orders CSV Template</p>
                  <p className="text-sm text-muted-foreground">
                    Download the template with correct column headers
                  </p>
                </div>
                <Button variant="outline" onClick={() => downloadTemplate('orders')}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Required columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>order_number</code> - e.g., #1001 or 1001</li>
                  <li><code>customer_name</code> - Full name</li>
                  <li><code>customer_email</code> - Valid email address</li>
                  <li><code>customer_phone</code> - Phone number (any format)</li>
                  <li><code>items_description</code> - Items ordered</li>
                  <li><code>quantity</code> - Optional, defaults to 1</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Update Order Stages</CardTitle>
              <CardDescription>
                Upload a CSV to update production stages for existing orders.
                Unchanged rows are automatically skipped.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleUpload}
                  className="hidden"
                  id="csv-upload-stages"
                />
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Drag and drop your CSV file here, or click to browse
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Select CSV File
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Stage Updates CSV Template</p>
                  <p className="text-sm text-muted-foreground">
                    Download the template with correct column headers
                  </p>
                </div>
                <Button variant="outline" onClick={() => downloadTemplate('stages')}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Required columns:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>order_number</code> - Existing order number</li>
                  <li><code>stage</code> - payment_received, sent_to_manufacturer, materials_sourcing, production_started, quality_check, shipped, delivered</li>
                  <li><code>status</code> - not_started, in_progress, completed</li>
                  <li><code>estimated_start_date</code> - Optional (YYYY-MM-DD)</li>
                  <li><code>estimated_end_date</code> - Optional (YYYY-MM-DD)</li>
                  <li><code>notes</code> - Optional admin notes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.errors.length === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  {result.imported}
                </Badge>
                <span className="text-sm">Imported</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{result.skipped}</Badge>
                <span className="text-sm">Skipped</span>
              </div>
              {result.errors.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{result.errors.length}</Badge>
                  <span className="text-sm">Errors</span>
                </div>
              )}
            </div>

            {result.errors.length > 0 && (
              <div className="mt-4">
                <p className="font-medium mb-2">Errors:</p>
                <div className="max-h-48 overflow-y-auto bg-muted rounded-lg p-3 text-sm space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-destructive">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
