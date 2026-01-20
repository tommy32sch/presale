# Presale Order Tracker

A mobile-first presale order tracking system for clothing brands. Customers can look up orders via order number + phone, see an Amazon-style timeline, view factory photos, and receive SMS/email notifications.

## Features

- **Customer Portal**: Order lookup with order number + phone verification
- **Visual Timeline**: Mobile-first vertical timeline with expandable stages
- **Factory Photos**: View production photos at each stage
- **Notifications**: SMS (Twilio) and Email (Resend) updates with review queue
- **Admin Dashboard**: Manage orders, upload CSVs, assign photos, send notifications
- **Two-way Messaging**: Customer inquiries and admin replies
- **Shipping Tracking**: Embedded carrier tracking (FedEx, UPS, USPS, DHL)

## Tech Stack

- **Next.js 15** - React framework with App Router
- **Supabase** - PostgreSQL database + auth
- **Tailwind CSS 4** - Styling with dark mode
- **shadcn/ui** - UI components
- **Twilio** - SMS notifications
- **Resend** - Email notifications
- **Cloudinary** - Image hosting
- **Upstash Redis** - Rate limiting

## Setup

### 1. Clone and Install

```bash
git clone <repository>
cd presale-tracker
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration file:
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Paste and run in the SQL Editor

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `JWT_SECRET` - A secure random string (min 32 chars)

Optional (for full functionality):
- Twilio credentials for SMS
- Resend API key for emails
- Cloudinary for photos
- Upstash Redis for rate limiting
- Ship24 API key for carrier tracking

### 4. Create Admin User

```bash
# Set admin credentials (optional, defaults exist)
export ADMIN_EMAIL="admin@yoursite.com"
export ADMIN_PASSWORD="secure-password"
export ADMIN_NAME="Admin User"

# Run seed script
npm run seed:admin
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for customer portal.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for admin dashboard.

## Usage

### Customer Flow

1. Customer visits homepage
2. Enters order number (#1001) and phone number
3. Views order timeline with stages, photos, and updates
4. Optionally enables SMS/email notifications
5. Can send messages with questions

### Admin Flow

1. Log in at `/admin/login`
2. Upload orders via CSV
3. Update stages manually or via CSV
4. Upload factory photos and assign to orders
5. Review and send notifications
6. Reply to customer messages

## CSV Formats

### Orders CSV
```csv
order_number,customer_name,customer_email,customer_phone,items_description,quantity
#1001,John Smith,john@email.com,555-123-4567,"Blue Jacket (M)",1
```

### Stage Updates CSV
```csv
order_number,stage,status,estimated_start_date,estimated_end_date,notes
#1001,production_started,in_progress,2025-02-01,2025-02-05,
```

Valid stages: `payment_received`, `sent_to_manufacturer`, `materials_sourcing`, `production_started`, `quality_check`, `shipped`, `delivered`

Valid statuses: `not_started`, `in_progress`, `completed`

## Production Stages

1. Payment Received
2. Order Sent to Manufacturer
3. Materials Sourcing
4. Production Started
5. Quality Check
6. Shipped
7. Delivered

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

Make sure to set all required environment variables in your deployment platform.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Customer lookup
│   ├── track/[orderId]/        # Order tracking page
│   ├── admin/                  # Admin pages
│   └── api/                    # API routes
├── components/
│   ├── customer/               # Customer components
│   ├── admin/                  # Admin components
│   └── ui/                     # shadcn components
├── lib/
│   ├── supabase/              # DB clients
│   ├── auth/                  # JWT auth
│   ├── notifications/         # Twilio/Resend
│   ├── csv/                   # CSV parser
│   └── utils/                 # Utilities
└── types/                     # TypeScript types
```

## Security

- Dual verification (order # + phone) for customer access
- Rate limiting on lookups (5/min per IP)
- JWT-based admin authentication
- Phone numbers masked in responses
- Row-level security in Supabase

## License

MIT
