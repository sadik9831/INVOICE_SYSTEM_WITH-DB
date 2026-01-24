# Invoice System - Deployment Guide

## Quick Deploy to Free Hosting

### Option 1: InfinityFree (Recommended - Completely Free)
**Features:** Free PHP hosting, MySQL database, No ads, 5GB storage

**Steps:**
1. Sign up at https://www.infinityfree.com
2. Create a new account and domain (choose free subdomain)
3. Note your MySQL credentials from cPanel
4. Upload files via File Manager or FTP
5. Import database using phpMyAdmin
6. Update `db.php` with new credentials

---

### Option 2: 000webhost (Alternative Free Option)
**Features:** Free PHP hosting, MySQL database, 1GB storage

**Steps:**
1. Sign up at https://www.000webhost.com
2. Create a website
3. Use File Manager to upload files
4. Create MySQL database
5. Import your database
6. Update `db.php` credentials

---

## Pre-Deployment Checklist

### 1. Export Your Database
From phpMyAdmin (http://localhost/phpmyadmin):
- Select `invoices` database
- Click **Export** tab
- Click **Go** to download SQL file

### 2. Files to Upload
Upload ALL files from `c:\xampp\htdocs\invoice-system\` folder:
```
✓ index.html
✓ script.js
✓ style.css
✓ db.php
✓ get_next_invoice.php
✓ get_invoice.php
✓ insert_invoice.php
✓ update_invoice.php
✓ customers.php
✓ check_table.php
```

### 3. Update db.php After Upload
Replace these values with hosting provider's credentials:
```php
$host = 'localhost';           // Usually stays 'localhost'
$dbname = 'your_db_name';      // From hosting control panel
$username = 'your_db_user';    // From hosting control panel
$password = 'your_db_pass';    // From hosting control panel
```

### 4. Update script.js
Change line 2 to your new domain:
```javascript
const API_BASE_URL = 'https://your-site.infinityfreeapp.com';
```

### 5. Import Database
1. Go to phpMyAdmin on hosting
2. Select your database
3. Click **Import**
4. Upload the SQL file you exported
5. Click **Go**

---

## After Deployment

### Test All Features:
- [ ] Load invoice number
- [ ] Fetch customer list
- [ ] Add new customer
- [ ] Create new invoice
- [ ] Save invoice
- [ ] Load old invoice
- [ ] Update invoice
- [ ] Generate PDF
- [ ] Print invoice

### Access from Mobile:
Just open your browser and visit your new URL!

---

## Troubleshooting

**Problem:** "Database connection failed"
- Check db.php credentials match hosting panel

**Problem:** "API calls not working"
- Verify script.js API_BASE_URL matches your domain

**Problem:** "Can't upload files"
- Use FTP client like FileZilla if File Manager fails

---

## Need Help?
If you encounter any issues during deployment, let me know!
