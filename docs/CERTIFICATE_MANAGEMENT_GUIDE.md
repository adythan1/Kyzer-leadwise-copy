# Certificate Management System

A comprehensive certificate management feature that allows admins to upload certificate templates and dynamically issue certificates to users upon course completion.

## 🎯 Features

### Admin Features
- **Template Management**: Upload and manage certificate templates
- **Dynamic Placeholders**: Define placeholders for dynamic content (user name, course title, etc.)
- **Default Templates**: Set default templates for automatic certificate generation
- **Template Preview**: Preview templates before publishing

### User Features
- **Automatic Certificate Generation**: Certificates are automatically generated when users complete courses
- **Dynamic Content**: Certificates are personalized with user and course information
- **Download Certificates**: Users can download their certificates as images
- **Certificate Sharing**: Share certificates with others

### Gallery theme (default)

Generated certificate **images** (preview, download, modal) use the **Gallery** layout by default so they align with the learner **Certificates** page: navy frame (`#0C1C4F`), white inner panel with a large bottom-right corner radius, faint “L” watermark, Leadwise logo (or your uploaded template logo), “Verified certificate of course completion”, bold course title, “Awarded to” + recipient in navy, issue date / certificate ID, and a `#1565FF` accent strip at the bottom. **Classic**, **Modern**, **Elegant**, and **Corporate** themes still use the older centered “Certificate of Completion” canvas layout.

## 🗄️ Database Setup

### 1. Run the SQL Schema

Execute the SQL commands in `CERTIFICATE_TEMPLATES_SCHEMA.sql` in your Supabase SQL editor:

```sql
-- This will create:
-- - certificate_templates table
-- - Add template_id and certificate_data columns to certificates table
-- - Set up RLS policies
-- - Create indexes for performance
-- - Insert a default template
```

### 2. Storage Bucket Setup

Make sure you have a `certificates` storage bucket in Supabase for storing certificate templates:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `certificates`
3. Set it as public for certificate template access

## 🎨 How to Use

### For Admins

#### 1. Access Certificate Templates
- Navigate to **Courses** → **Certificate Templates** in the admin panel
- Only users with `manage_courses` permission can access this section

#### 2. Create a Certificate Template
1. Click **"New Template"**
2. Fill in the template information:
   - **Name**: Descriptive name for the template
   - **Description**: Optional description
   - **Template Image**: Upload a certificate background image (PNG, JPG up to 5MB)
   - **Dynamic Fields**: Select which placeholders to use

#### 3. Available Placeholders
- `{{user_name}}` - Full name of the certificate recipient
- `{{course_title}}` - Title of the completed course
- `{{completion_date}}` - Date when the course was completed
- `{{issue_date}}` - Date when the certificate was issued
- `{{instructor_name}}` - Name of the course instructor
- `{{certificate_id}}` - Unique certificate identifier
- `{{organization_name}}` - Name of the organization (if applicable)

#### 4. Template Management
- **Set Default**: Mark a template as default for automatic use
- **Edit**: Modify existing templates
- **Delete**: Remove templates (with confirmation)
- **Preview**: View how the template looks

### For Users

#### 1. Course Completion
- Complete all lessons in a course
- Certificate is automatically generated using the default template
- Notification appears on course completion page

#### 2. Viewing Certificates
- Go to **Certificates** in the main navigation
- View all earned certificates
- See completion dates and course information

#### 3. Downloading Certificates
- Click the **Download** button on any certificate
- System generates a personalized certificate image
- Downloads as PNG file with dynamic content filled in

## 🔧 Technical Implementation

### Frontend Components

#### 1. `CertificateTemplates.jsx`
- Main admin interface for template management
- Lists all templates with management actions
- Shows available placeholders and usage instructions

#### 2. `CertificateTemplateForm.jsx`
- Form component for creating/editing templates
- Handles file upload for certificate background images
- Placeholder selection with descriptions

### Backend Functions

#### 1. Certificate Template Management
```javascript
// Fetch all templates
await actions.fetchCertificateTemplates();

// Create new template
await actions.createCertificateTemplate(templateData);

// Update existing template
await actions.updateCertificateTemplate(templateId, updates);

// Delete template
await actions.deleteCertificateTemplate(templateId);
```

#### 2. Certificate Generation
```javascript
// Generate certificate from template
await actions.generateCertificateFromTemplate(userId, courseId, templateId);

// Generate downloadable certificate with filled placeholders
await actions.generateCertificatePreview(certificateId);
```

### Course Completion Integration

The system automatically generates certificates when users complete courses:

1. **Course Completion Detection**: When a user finishes the last lesson
2. **Template Selection**: Uses the default template or falls back to the first available
3. **Data Population**: Fills in user and course information
4. **Certificate Creation**: Stores the certificate record in the database

## 🎨 Customization

### Template Positioning

The certificate generation uses predefined positions for placeholders. To customize positions, modify the `positions` object in the `generateCertificatePreview` function:

```javascript
const positions = {
  '{{user_name}}': { x: centerX, y: canvas.height * 0.45 },
  '{{course_title}}': { x: centerX, y: canvas.height * 0.55 },
  // Add more positions as needed
};
```

### Styling

Customize the certificate text appearance by modifying the canvas context properties:

```javascript
ctx.fillStyle = '#000000';  // Text color
ctx.textAlign = 'center';   // Text alignment
ctx.font = 'bold 24px Arial'; // Font style
```

## 🔐 Security & Permissions

### Role-Based Access
- **Admins**: Full access to template management
- **Users with `manage_courses`**: Can create and manage templates
- **Regular Users**: Can view and download their own certificates

### Row Level Security (RLS)
- Certificate templates are protected by RLS policies
- Users can only access their own certificates
- Admins can access all certificates for management purposes

## 🚀 Getting Started

1. **Setup Database**: Run the SQL schema in Supabase
2. **Configure Storage**: Create the `certificates` storage bucket
3. **Create Templates**: Upload your first certificate template
4. **Test Flow**: Complete a course to test automatic certificate generation

## 🔍 Testing

### Test Certificate Generation
1. Create a test course with lessons
2. Upload a certificate template and set it as default
3. Enroll in and complete the course
4. Verify certificate appears in the Certificates page
5. Test certificate download functionality

### Test Template Management
1. Access the Certificate Templates page as an admin
2. Create, edit, and delete templates
3. Test template upload functionality
4. Verify placeholder selection works correctly

## 📝 Notes

- Certificate templates support common image formats (PNG, JPG)
- Maximum file size for templates is 5MB
- Certificates are generated as PNG images for download
- The system supports multiple templates with one marked as default
- Placeholder positions are currently fixed but can be made configurable in future updates