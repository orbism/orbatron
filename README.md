# orbatron
orbatron "cv" site

## Stack
- js + css for fancy stuff
- static html container
- php for webform

## Environment Variables
Create a `.env` file in the project root with these variables:
```
SMTP_HOST=smtp.dreamhost.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=no-reply@orbatron.org
EMAIL_TO=your_email@domain.com
```

Note: The `.env` file is protected from web access via `.htaccess` rules.