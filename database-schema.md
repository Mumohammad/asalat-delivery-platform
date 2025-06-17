# Database Schema Documentation

## Overview
This document describes the database schema for the Asalat Altafasil delivery driver platform using Supabase PostgreSQL.

## Tables

### 1. users
Extends Supabase's built-in `auth.users` table with additional profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, references auth.users(id) |
| email | VARCHAR(255) | User email address |
| full_name | VARCHAR(255) | User's full name |
| phone | VARCHAR(20) | Phone number |
| role | user_role | User role (admin, driver, super_admin) |
| preferred_language | VARCHAR(2) | Language preference (en, ar) |
| is_active | BOOLEAN | Account status |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |

### 2. driver_applications
Stores driver registration applications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References users(id) |
| full_name | VARCHAR(255) | Driver's full name |
| national_id | VARCHAR(20) | National ID or Iqama number |
| mobile_number | VARCHAR(20) | Mobile phone number |
| city_of_operation | VARCHAR(100) | City where driver will operate |
| vehicle_make | VARCHAR(100) | Vehicle manufacturer |
| vehicle_model | VARCHAR(100) | Vehicle model |
| year_of_manufacture | INTEGER | Vehicle year |
| vehicle_color | VARCHAR(50) | Vehicle color |
| license_plate | VARCHAR(20) | Vehicle license plate |
| preferred_platform | platform_type | hungerstation, jahez, or both |
| work_type | work_type | freelance or sponsorship |
| status | application_status | Application status |
| admin_notes | TEXT | Admin notes on application |
| rejection_reason | TEXT | Reason for rejection if applicable |
| submitted_at | TIMESTAMP | Application submission time |
| reviewed_at | TIMESTAMP | When application was reviewed |
| approved_at | TIMESTAMP | When application was approved |

### 3. driver_documents
Stores uploaded documents for driver applications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| application_id | UUID | References driver_applications(id) |
| document_type | document_type | Type of document |
| file_name | VARCHAR(255) | Original file name |
| file_path | VARCHAR(500) | Storage path |
| file_size | INTEGER | File size in bytes |
| mime_type | VARCHAR(100) | File MIME type |
| is_verified | BOOLEAN | Document verification status |
| uploaded_at | TIMESTAMP | Upload time |
| verified_at | TIMESTAMP | Verification time |
| verified_by | UUID | Admin who verified |

### 4. contact_messages
Stores contact form submissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | Contact person name |
| email | VARCHAR(255) | Contact email |
| phone | VARCHAR(20) | Contact phone |
| subject | VARCHAR(255) | Message subject |
| message | TEXT | Message content |
| is_read | BOOLEAN | Read status |
| responded_at | TIMESTAMP | Response time |
| responded_by | UUID | Admin who responded |
| created_at | TIMESTAMP | Message creation time |

### 5. system_settings
Stores application configuration settings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| setting_key | VARCHAR(100) | Setting identifier |
| setting_value | JSONB | Setting value (JSON) |
| description | TEXT | Setting description |
| is_active | BOOLEAN | Setting status |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

### 6. application_status_history
Tracks status changes for driver applications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| application_id | UUID | References driver_applications(id) |
| previous_status | application_status | Previous status |
| new_status | application_status | New status |
| changed_by | UUID | Admin who made the change |
| notes | TEXT | Change notes |
| created_at | TIMESTAMP | Change time |

## Custom Types

### user_role
- `admin`: Platform administrator
- `driver`: Delivery driver
- `super_admin`: Super administrator with full access

### application_status
- `pending`: Newly submitted application
- `under_review`: Application being reviewed
- `approved`: Application approved
- `rejected`: Application rejected
- `requires_documents`: Additional documents needed

### work_type
- `freelance`: Independent contractor
- `sponsorship`: Company-sponsored driver

### platform_type
- `hungerstation`: Hungerstation only
- `jahez`: Jahez only
- `both`: Both platforms

### document_type
- `national_id`: National ID or Iqama
- `driving_license`: Saudi driving license
- `vehicle_registration`: Vehicle registration (Istimara)
- `insurance`: Vehicle insurance
- `iban_certificate`: IBAN certificate for payments

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- **Users**: Can view and update their own profiles
- **Driver Applications**: Drivers can view/create/update their own applications; Admins can view/update all
- **Documents**: Users can view/upload their own documents; Admins can view all
- **Contact Messages**: Anyone can create; Admins can view/update all
- **System Settings**: Admin-only access
- **Status History**: Users can view their own; Admins can view/create all

## Indexes

Performance indexes are created on:
- Foreign key relationships
- Frequently queried columns (status, dates, email)
- Search-relevant fields

## Triggers

- `updated_at` triggers automatically update timestamp fields on record changes

## Storage

A separate storage bucket `driver-documents` is used for file uploads with appropriate access policies.

