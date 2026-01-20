import Papa from 'papaparse';
import { OrderCSVRow, StageUpdateCSVRow } from '@/types';
import { normalizePhone } from '@/lib/utils/phone';
import { normalizeOrderNumber } from '@/lib/utils/order';

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
}

/**
 * Parse Orders CSV
 * Expected columns: order_number, customer_name, customer_email, customer_phone, items_description, quantity
 */
export function parseOrdersCSV(csvContent: string): ParseResult<OrderCSVRow> {
  const errors: string[] = [];
  const data: OrderCSVRow[] = [];

  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (result.errors.length > 0) {
    errors.push(...result.errors.map((e) => `Row ${e.row}: ${e.message}`));
  }

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rowNum = i + 2; // Account for header row

    // Validate required fields
    if (!row.order_number) {
      errors.push(`Row ${rowNum}: Missing order_number`);
      continue;
    }
    if (!row.customer_name) {
      errors.push(`Row ${rowNum}: Missing customer_name`);
      continue;
    }
    if (!row.customer_email) {
      errors.push(`Row ${rowNum}: Missing customer_email`);
      continue;
    }
    if (!row.customer_phone) {
      errors.push(`Row ${rowNum}: Missing customer_phone`);
      continue;
    }
    if (!row.items_description) {
      errors.push(`Row ${rowNum}: Missing items_description`);
      continue;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.customer_email)) {
      errors.push(`Row ${rowNum}: Invalid email format`);
      continue;
    }

    // Validate phone number
    const normalizedPhone = normalizePhone(row.customer_phone);
    if (!normalizedPhone) {
      errors.push(`Row ${rowNum}: Invalid phone number`);
      continue;
    }

    data.push({
      order_number: normalizeOrderNumber(row.order_number),
      customer_name: row.customer_name.trim(),
      customer_email: row.customer_email.trim().toLowerCase(),
      customer_phone: row.customer_phone.trim(),
      items_description: row.items_description.trim(),
      quantity: row.quantity || '1',
    });
  }

  return {
    success: errors.length === 0,
    data,
    errors,
  };
}

/**
 * Parse Stage Updates CSV
 * Expected columns: order_number, stage, status, estimated_start_date, estimated_end_date, notes
 */
export function parseStageUpdatesCSV(csvContent: string): ParseResult<StageUpdateCSVRow> {
  const errors: string[] = [];
  const data: StageUpdateCSVRow[] = [];

  const validStages = [
    'payment_received',
    'sent_to_manufacturer',
    'materials_sourcing',
    'production_started',
    'quality_check',
    'shipped',
    'delivered',
  ];

  const validStatuses = ['not_started', 'in_progress', 'completed'];

  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (result.errors.length > 0) {
    errors.push(...result.errors.map((e) => `Row ${e.row}: ${e.message}`));
  }

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rowNum = i + 2;

    if (!row.order_number) {
      errors.push(`Row ${rowNum}: Missing order_number`);
      continue;
    }
    if (!row.stage) {
      errors.push(`Row ${rowNum}: Missing stage`);
      continue;
    }
    if (!row.status) {
      errors.push(`Row ${rowNum}: Missing status`);
      continue;
    }

    const stageName = row.stage.trim().toLowerCase().replace(/\s+/g, '_');
    if (!validStages.includes(stageName)) {
      errors.push(`Row ${rowNum}: Invalid stage "${row.stage}"`);
      continue;
    }

    const statusName = row.status.trim().toLowerCase();
    if (!validStatuses.includes(statusName)) {
      errors.push(`Row ${rowNum}: Invalid status "${row.status}"`);
      continue;
    }

    // Validate dates if provided
    if (row.estimated_start_date && isNaN(Date.parse(row.estimated_start_date))) {
      errors.push(`Row ${rowNum}: Invalid estimated_start_date`);
      continue;
    }
    if (row.estimated_end_date && isNaN(Date.parse(row.estimated_end_date))) {
      errors.push(`Row ${rowNum}: Invalid estimated_end_date`);
      continue;
    }

    data.push({
      order_number: normalizeOrderNumber(row.order_number),
      stage: stageName,
      status: statusName,
      estimated_start_date: row.estimated_start_date?.trim() || undefined,
      estimated_end_date: row.estimated_end_date?.trim() || undefined,
      notes: row.notes?.trim() || undefined,
    });
  }

  return {
    success: errors.length === 0,
    data,
    errors,
  };
}
