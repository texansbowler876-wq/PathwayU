const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

function initializeDatabase() {
    const dbPath = path.join(__dirname, 'colleges.db');
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
            return;
        }
        console.log('Connected to the SQLite database.');
    });

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    db.exec(schema, (err) => {
        if (err) {
            console.error('Error creating schema:', err.message);
            return;
        }
        console.log('Database schema created successfully!');
        console.log('Database location:', dbPath);
    });

    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
            return;
        }
        console.log('Database connection closed.');
    });
}

// Run if executed directly
if (require.main === module) {
    console.log('Initializing database...');
    initializeDatabase();
}

module.exports = { initializeDatabase };
