const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

async function importColleges(csvFilePath) {
    const dbPath = path.join(__dirname, '..', 'database', 'colleges.db');
    const db = new sqlite3.Database(dbPath);

    const colleges = [];

    console.log('Reading CSV file...');

    // Read CSV
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                colleges.push({
                    name: row.name,
                    website_url: row.website_url,
                    scholarship_url: row.scholarship_url,
                    annual_cost_min: parseInt(row.annual_cost_min) || null,
                    annual_cost_max: parseInt(row.annual_cost_max) || null,
                    financial_aid_available: parseInt(row.financial_aid_available) || null,
                    state: row.state,
                    city: row.city,
                    region: row.region,
                    campus_setting: row.campus_setting,
                    majors: row.majors,
                    academic_reputation: parseInt(row.academic_reputation) || null,
                    faculty_quality: parseInt(row.faculty_quality) || null,
                    avg_class_size: parseInt(row.avg_class_size) || null,
                    graduation_rate: parseInt(row.graduation_rate) || null,
                    avg_starting_salary: parseInt(row.avg_starting_salary) || null,
                    job_placement_rate: parseInt(row.job_placement_rate) || null,
                    student_population: parseInt(row.student_population) || null,
                    campus_culture: row.campus_culture,
                    safety_rating: parseInt(row.safety_rating) || null,
                    latitude: parseFloat(row.latitude) || null,
                    longitude: parseFloat(row.longitude) || null,
                    career_services_rating: parseInt(row.career_services_rating) || null,
                    athletics_division: row.athletics_division,
                    athletics_rating: parseInt(row.athletics_rating) || null,
                    facilities_rating: parseInt(row.facilities_rating) || null,
                    institution_type: row.institution_type,
                    accredited: 1
                });
            })
            .on('end', () => {
                console.log(`Parsed ${colleges.length} colleges from CSV`);
                console.log('Inserting into database...');

                // Bulk insert
                const stmt = db.prepare(`
                    INSERT INTO colleges (
                        name, website_url, scholarship_url, annual_cost_min, annual_cost_max,
                        financial_aid_available, state, city, region, campus_setting, majors,
                        academic_reputation, faculty_quality, avg_class_size, graduation_rate,
                        avg_starting_salary, job_placement_rate, student_population, campus_culture,
                        safety_rating, latitude, longitude, career_services_rating, athletics_division,
                        athletics_rating, facilities_rating, institution_type, accredited
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                colleges.forEach((college) => {
                    stmt.run(
                        college.name,
                        college.website_url,
                        college.scholarship_url,
                        college.annual_cost_min,
                        college.annual_cost_max,
                        college.financial_aid_available,
                        college.state,
                        college.city,
                        college.region,
                        college.campus_setting,
                        college.majors,
                        college.academic_reputation,
                        college.faculty_quality,
                        college.avg_class_size,
                        college.graduation_rate,
                        college.avg_starting_salary,
                        college.job_placement_rate,
                        college.student_population,
                        college.campus_culture,
                        college.safety_rating,
                        college.latitude,
                        college.longitude,
                        college.career_services_rating,
                        college.athletics_division,
                        college.athletics_rating,
                        college.facilities_rating,
                        college.institution_type,
                        college.accredited
                    );
                });

                stmt.finalize((err) => {
                    if (err) {
                        console.error('Error inserting data:', err.message);
                        reject(err);
                    } else {
                        console.log(`Successfully imported ${colleges.length} colleges!`);

                        // Verify the import
                        db.get('SELECT COUNT(*) as count FROM colleges', (err, row) => {
                            if (err) {
                                console.error('Error verifying data:', err.message);
                            } else {
                                console.log(`Total colleges in database: ${row.count}`);
                            }

                            db.close((err) => {
                                if (err) {
                                    console.error('Error closing database:', err.message);
                                }
                                resolve();
                            });
                        });
                    }
                });
            })
            .on('error', (error) => {
                console.error('Error reading CSV:', error.message);
                reject(error);
            });
    });
}

// Run if executed directly
if (require.main === module) {
    const csvPath = path.join(__dirname, '..', 'database', 'seed-data', 'colleges.csv');
    console.log('Starting college data import...');
    console.log('CSV file:', csvPath);

    importColleges(csvPath)
        .then(() => {
            console.log('Import completed successfully!');
        })
        .catch((error) => {
            console.error('Import failed:', error);
            process.exit(1);
        });
}

module.exports = { importColleges };
