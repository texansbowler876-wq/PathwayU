const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'colleges.db');

// Helper function to run database queries
function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(query, params, function(err) {
            db.close();
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
}

// Helper function to get a single row
function getRow(query, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.get(query, params, (err, row) => {
            db.close();
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Helper function to get all rows
function getAllRows(query, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.all(query, params, (err, rows) => {
            db.close();
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Session functions
async function createSession(sessionId) {
    const query = `
        INSERT INTO user_sessions (session_id, responses)
        VALUES (?, ?)
    `;
    await runQuery(query, [sessionId, JSON.stringify({})]);
    return sessionId;
}

async function getSession(sessionId) {
    const query = 'SELECT * FROM user_sessions WHERE session_id = ?';
    const session = await getRow(query, [sessionId]);

    if (session && session.responses) {
        session.responses = JSON.parse(session.responses);
    }
    if (session && session.results) {
        session.results = JSON.parse(session.results);
    }

    return session;
}

async function updateSession(sessionId, updates) {
    const { currentQuestion, responses, results, completed } = updates;

    let query = 'UPDATE user_sessions SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (currentQuestion !== undefined) {
        query += ', current_question = ?';
        params.push(currentQuestion);
    }

    if (responses !== undefined) {
        query += ', responses = ?';
        params.push(JSON.stringify(responses));
    }

    if (results !== undefined) {
        query += ', results = ?';
        params.push(JSON.stringify(results));
    }

    if (completed !== undefined) {
        query += ', completed = ?';
        params.push(completed);
    }

    query += ' WHERE session_id = ?';
    params.push(sessionId);

    await runQuery(query, params);
    return true;
}

// College functions
async function getAllColleges() {
    const query = 'SELECT * FROM colleges';
    return await getAllRows(query);
}

async function getCollegeById(id) {
    const query = 'SELECT * FROM colleges WHERE id = ?';
    return await getRow(query, [id]);
}

async function searchColleges(searchTerm) {
    const query = `
        SELECT * FROM colleges
        WHERE name LIKE ? OR city LIKE ? OR state LIKE ?
        LIMIT 20
    `;
    const term = `%${searchTerm}%`;
    return await getAllRows(query, [term, term, term]);
}

async function getCollegesByRegion(region) {
    const query = 'SELECT * FROM colleges WHERE region = ?';
    return await getAllRows(query, [region]);
}

async function getCollegesByCostRange(minCost, maxCost) {
    const query = `
        SELECT * FROM colleges
        WHERE annual_cost_min <= ? AND annual_cost_max >= ?
    `;
    return await getAllRows(query, [maxCost, minCost]);
}

module.exports = {
    createSession,
    getSession,
    updateSession,
    getAllColleges,
    getCollegeById,
    searchColleges,
    getCollegesByRegion,
    getCollegesByCostRange
};
