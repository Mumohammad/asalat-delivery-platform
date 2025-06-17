-- Seed data for development and testing

-- Insert system settings
INSERT INTO public.system_settings (setting_key, setting_value, description) VALUES
('app_config', '{"maintenance_mode": false, "registration_enabled": true, "max_applications_per_user": 1}', 'General application configuration'),
('supported_cities', '["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Khobar", "Tabuk", "Abha"]', 'List of supported cities for driver operations'),
('platform_requirements', '{"hungerstation": {"min_age": 18, "required_documents": ["national_id", "driving_license", "vehicle_registration", "insurance"]}, "jahez": {"min_age": 19, "required_documents": ["national_id", "driving_license", "vehicle_registration", "insurance", "iban_certificate"]}}', 'Platform-specific requirements'),
('notification_settings', '{"email_enabled": true, "sms_enabled": false, "admin_notifications": true}', 'Notification configuration'),
('file_upload_settings', '{"max_file_size": 5242880, "allowed_types": ["image/jpeg", "image/png", "application/pdf"], "storage_bucket": "driver-documents"}', 'File upload configuration');

-- Note: User accounts should be created through Supabase Auth
-- The following are example entries that would be created after user registration

-- Example admin user (this would be created through the auth system)
-- INSERT INTO public.users (id, email, full_name, phone, role, preferred_language) VALUES
-- ('00000000-0000-0000-0000-000000000001', 'admin@asalat-altafasil.com', 'System Administrator', '+966501234567', 'admin', 'en');

-- Example driver applications for testing (these would reference real user IDs)
-- INSERT INTO public.driver_applications (
--     user_id, full_name, national_id, mobile_number, city_of_operation,
--     vehicle_make, vehicle_model, year_of_manufacture, vehicle_color,
--     preferred_platform, work_type, status
-- ) VALUES
-- ('00000000-0000-0000-0000-000000000002', 'Ahmed Al-Rashid', '1234567890', '+966501111111', 'Riyadh',
--  'Toyota', 'Camry', 2020, 'White', 'both', 'freelance', 'pending'),
-- ('00000000-0000-0000-0000-000000000003', 'Mohammed Al-Fahad', '1234567891', '+966502222222', 'Jeddah',
--  'Honda', 'Civic', 2019, 'Black', 'hungerstation', 'sponsorship', 'approved');

-- Example contact messages
INSERT INTO public.contact_messages (name, email, phone, subject, message) VALUES
('Sarah Al-Zahra', 'sarah@example.com', '+966503333333', 'Registration Question', 'I would like to know more about the registration process for Jahez platform.'),
('Omar Al-Mutairi', 'omar@example.com', '+966504444444', 'Technical Support', 'I am having trouble uploading my driving license document.'),
('Fatima Al-Qasimi', 'fatima@example.com', '+966505555555', 'Partnership Inquiry', 'Does your company provide vehicle rental services for drivers?');

-- Create storage bucket for driver documents (this should be done through Supabase dashboard or CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('driver-documents', 'driver-documents', false);

-- Storage policies would be created like this:
-- CREATE POLICY "Authenticated users can upload documents" ON storage.objects FOR INSERT WITH CHECK (
--     bucket_id = 'driver-documents' AND auth.role() = 'authenticated'
-- );
-- CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT USING (
--     bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]
-- );

