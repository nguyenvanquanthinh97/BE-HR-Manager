# Require
- Install Nodejs version from 8.x
- Install mongodb
- Install PM2 (production) or Nodemon(development) to manage project
- For online database, you can create your own Database, after creating your database replace connect string in .env file with your own mongo database ('MONGODB_URL'), or use the one that i've already registered in .env
- Register SEND_GRID to get its key for using sending email service (OR using the one  that i've already registered in .env )
- Register Cloudinary Service and get its ('CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET')
- Register TimeZoneDB to get its key or use the one i've created in .env
# How to use
- After copying this folder
- Go into this folder and open command line
- type 'npm install' to install all the node_modules package it need
- type 'sudo npm install --global pm2' or 'sudo npm install --global nodemon'
- You can redefined both 'JWT_SECRET' and 'DEFINED_PASSWORD' in .env
# Script
- By default it will run on port 5000
- Type 'npm run dev' to operate this project in development mode (Nodemon), or you can:
- Use PM2 to run in manage task: 
- Type 'pm2 start app.js --name BE-HR-Manager' if you want to run in 'fork' mode
- Type 'pm2 start app.js --name BE-HR-Manager -i 0' if you want to run in 'cluster' mode (use as much as CPU Threads to create children).
# Database
- All indexes in Mongo Database, i recommended to create index in 'background' mode to not be blocked while create index in databse.
- after connect to mongodb via shell script (Example: 'mongo "mongodb+srv://office-manager-3cpmo.mongodb.net/office-manager" --username Thinh97')
- type 'db.office_workplaces.createIndex({location: "2dsphere"}, {background: true})'
- type 'db.projects.createIndex({"taskList._id": 1}, {background: true}'
- type 'db.users.createIndex({email: 1}, {unique: true, background: true})'