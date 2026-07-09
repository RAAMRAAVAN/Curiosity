# Apache2 Deployment Guide for Next.js Static Export

## Prerequisites
- Ubuntu VM with Apache2 installed
- Node.js and npm installed
- `mod_rewrite` enabled in Apache2

## Step 1: Enable Required Apache Modules

```bash
sudo a2enmod rewrite
sudo a2enmod deflate
sudo a2enmod expires
sudo systemctl restart apache2
```

## Step 2: Build Your Next.js Application

```bash
cd /path/to/kokrajhar_client2
npm run build
npm run export
# This creates the 'out' folder with all static files
```

## Step 3: Configure Apache Virtual Host

Create a new Apache config file (or edit existing):

```bash
sudo nano /etc/apache2/sites-available/your-domain.conf
```

Add this configuration:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    DocumentRoot /var/www/your-domain/public_html

    <Directory /var/www/your-domain/public_html>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/your-domain-error.log
    CustomLog ${APACHE_LOG_DIR}/your-domain-access.log combined
</VirtualHost>
```

## Step 4: Deploy Static Files

```bash
# Copy the contents of 'out' folder to Apache document root
sudo cp -r out/* /var/www/your-domain/public_html/
sudo chown -R www-data:www-data /var/www/your-domain/public_html
sudo chmod -R 755 /var/www/your-domain/public_html
```

## Step 5: Copy .htaccess File

```bash
# Copy the .htaccess file from this project to document root
sudo cp .htaccess /var/www/your-domain/public_html/
sudo chown www-data:www-data /var/www/your-domain/public_html/.htaccess
sudo chmod 644 /var/www/your-domain/public_html/.htaccess
```

## Step 6: Enable Site and Restart Apache

```bash
sudo a2ensite your-domain.conf
sudo apache2ctl configtest  # Should return "Syntax OK"
sudo systemctl restart apache2
```

## Step 7: Optional - Setup SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d your-domain.com -d www.your-domain.com
```

## Automated Deployment Script (Optional)

Create a deployment script to automate the build and deploy process:

```bash
#!/bin/bash
cd /path/to/kokrajhar_client2
npm run build
npm run export
sudo rm -rf /var/www/your-domain/public_html/*
sudo cp -r out/* /var/www/your-domain/public_html/
sudo cp .htaccess /var/www/your-domain/public_html/
sudo chown -R www-data:www-data /var/www/your-domain/public_html
echo "Deployment completed!"
```

Save as `deploy.sh` and run: `bash deploy.sh`

## Troubleshooting

### Routes returning 404
- Check `.htaccess` is in the document root
- Verify `mod_rewrite` is enabled: `apache2ctl -M | grep rewrite`
- Check Apache error log: `sudo tail -f /var/apache2/error.log`

### Static files not loading
- Check file permissions: `sudo chmod -R 755 /var/www/your-domain/public_html`
- Verify Apache user owns files: `ls -la /var/www/your-domain/public_html`

### Page refresh redirects to index
- Ensure `.htaccess` file is present
- Confirm `AllowOverride All` is set in VirtualHost config
- Run: `apache2ctl configtest` to check for syntax errors
