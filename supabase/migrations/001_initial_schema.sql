-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'driver', 'super_admin');
CREATE TYPE application_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'requires_documents');
CREATE TYPE work_type AS ENUM ('freelance', 'sponsorship');
CREATE TYPE platform_type AS ENUM ('hungerstation', 'jahez', 'both');
CREATE TYPE document_type AS ENUM ('national_id', 'driving_license', 'vehicle_registration', 'insurance', 'iban_certificate');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role user_role DEFAULT 'driver',
    preferred_language VARCHAR(2) DEFAULT 'en',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver applications table
CREATE TABLE public.driver_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Personal Information
    full_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(20) UNIQUE NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    city_of_operation VARCHAR(100) NOT NULL,
    
    -- Vehicle Information
    vehicle_make VARCHAR(100) NOT NULL,
    vehicle_model VARCHAR(100),
    year_of_manufacture INTEGER NOT NULL,
    vehicle_color VARCHAR(50),
    license_plate VARCHAR(20),
    
    -- Work Preferences
    preferred_platform platform_type NOT NULL,
    work_type work_type NOT NULL,
    
    -- Application Status
    status application_status DEFAULT 'pending',
    admin_notes TEXT,
    rejection_reason TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table for file uploads
CREATE TABLE public.driver_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    application_id UUID REFERENCES public.driver_applications(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES public.users(id)
);

-- Contact messages table
CREATE TABLE public.contact_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table
CREATE TABLE public.system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application status history for tracking changes
CREATE TABLE public.application_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    application_id UUID REFERENCES public.driver_applications(id) ON DELETE CASCADE,
    previous_status application_status,
    new_status application_status NOT NULL,
    changed_by UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_driver_applications_user_id ON public.driver_applications(user_id);
CREATE INDEX idx_driver_applications_status ON public.driver_applications(status);
CREATE INDEX idx_driver_applications_submitted_at ON public.driver_applications(submitted_at);
CREATE INDEX idx_driver_documents_application_id ON public.driver_documents(application_id);
CREATE INDEX idx_contact_messages_created_at ON public.contact_messages(created_at);
CREATE INDEX idx_contact_messages_is_read ON public.contact_messages(is_read);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_email ON public.users(email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_driver_applications_updated_at BEFORE UPDATE ON public.driver_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Driver applications policies
CREATE POLICY "Drivers can view own applications" ON public.driver_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Drivers can create applications" ON public.driver_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Drivers can update own pending applications" ON public.driver_applications FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admin policies for driver applications
CREATE POLICY "Admins can view all applications" ON public.driver_applications FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can update applications" ON public.driver_applications FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Document policies
CREATE POLICY "Users can view own documents" ON public.driver_documents FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.driver_applications WHERE id = application_id AND user_id = auth.uid())
);
CREATE POLICY "Users can upload documents for own applications" ON public.driver_documents FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.driver_applications WHERE id = application_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all documents" ON public.driver_documents FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Contact messages policies
CREATE POLICY "Anyone can create contact messages" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all contact messages" ON public.contact_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can update contact messages" ON public.contact_messages FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- System settings policies (admin only)
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Application status history policies
CREATE POLICY "Users can view own application history" ON public.application_status_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.driver_applications WHERE id = application_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all application history" ON public.application_status_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Admins can create application history" ON public.application_status_history FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

