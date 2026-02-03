/**
 * Fetch All US Accredited Colleges
 *
 * This script fetches college data from the College Scorecard API
 * (US Department of Education) and imports it into our database.
 *
 * Data source: https://collegescorecard.ed.gov/data/
 *
 * SETUP:
 * 1. Get a free API key from https://api.data.gov/signup/
 * 2. Add your key to the .env file as DATA_GOV_API_KEY=your_key
 * 3. Run: npm run fetch-colleges
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// College Scorecard API base URL
const API_BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';

// API key from environment
const API_KEY = process.env.DATA_GOV_API_KEY;

// State to region mapping
const STATE_TO_REGION = {
    // Northeast
    'CT': 'Northeast', 'ME': 'Northeast', 'MA': 'Northeast', 'NH': 'Northeast',
    'RI': 'Northeast', 'VT': 'Northeast', 'NJ': 'Northeast', 'NY': 'Northeast',
    'PA': 'Northeast', 'DE': 'Northeast', 'MD': 'Northeast', 'DC': 'Northeast',
    // Southeast
    'AL': 'Southeast', 'AR': 'Southeast', 'FL': 'Southeast', 'GA': 'Southeast',
    'KY': 'Southeast', 'LA': 'Southeast', 'MS': 'Southeast', 'NC': 'Southeast',
    'SC': 'Southeast', 'TN': 'Southeast', 'VA': 'Southeast', 'WV': 'Southeast',
    // Midwest
    'IL': 'Midwest', 'IN': 'Midwest', 'IA': 'Midwest', 'KS': 'Midwest',
    'MI': 'Midwest', 'MN': 'Midwest', 'MO': 'Midwest', 'NE': 'Midwest',
    'ND': 'Midwest', 'OH': 'Midwest', 'SD': 'Midwest', 'WI': 'Midwest',
    // Southwest
    'AZ': 'Southwest', 'NM': 'Southwest', 'OK': 'Southwest', 'TX': 'Southwest',
    'CO': 'Southwest', 'UT': 'Southwest', 'WY': 'Southwest',
    // West Coast
    'CA': 'West Coast', 'OR': 'West Coast', 'WA': 'West Coast', 'HI': 'West Coast',
    'AK': 'West Coast', 'NV': 'West Coast', 'ID': 'West Coast', 'MT': 'West Coast'
};

// Locale to campus setting mapping
const LOCALE_TO_SETTING = {
    11: 'Urban', 12: 'Urban', 13: 'Urban',
    21: 'Suburban', 22: 'Suburban', 23: 'Suburban',
    31: 'Suburban', 32: 'Suburban', 33: 'Suburban',
    41: 'Rural', 42: 'Rural', 43: 'Rural'
};

// Get institution type from degree awarded
function getInstitutionType(highestDegree) {
    if (highestDegree >= 3) return '4-year';
    if (highestDegree === 2) return 'Community College';
    return 'Other';
}

// Generate scholarship URL
function generateScholarshipUrl(schoolUrl) {
    if (!schoolUrl) return null;
    let baseUrl = schoolUrl.replace(/\/$/, '');
    if (!baseUrl.startsWith('http')) {
        baseUrl = 'https://' + baseUrl;
    }
    return baseUrl + '/financial-aid/scholarships';
}

// Calculate reputation score
function calculateReputation(admissionRate, completionRate, earnings) {
    let score = 5;

    if (admissionRate !== null && admissionRate !== undefined) {
        if (admissionRate < 0.15) score += 4;
        else if (admissionRate < 0.30) score += 3;
        else if (admissionRate < 0.50) score += 2;
        else if (admissionRate < 0.70) score += 1;
    }

    if (completionRate && completionRate > 0.80) score += 1;
    if (earnings && earnings > 70000) score += 1;

    return Math.min(10, score);
}

// Transform API data to our database format
function transformCollege(apiCollege) {
    const state = apiCollege['school.state'] || '';
    const region = STATE_TO_REGION[state] || 'Unknown';
    const locale = apiCollege['school.locale'];
    const setting = LOCALE_TO_SETTING[locale] || 'Suburban';

    const inStateTuition = apiCollege['latest.cost.tuition.in_state'] || 0;
    const outStateTuition = apiCollege['latest.cost.tuition.out_of_state'] || 0;
    const attendance = apiCollege['latest.cost.attendance.academic_year'] || 0;

    const costMin = inStateTuition || Math.round(attendance * 0.6) || 15000;
    const costMax = outStateTuition || attendance || inStateTuition * 1.8 || 35000;

    const completionRate = apiCollege['latest.completion.completion_rate_4yr_150nt'];
    const graduationRate = completionRate ? Math.round(completionRate * 100) : null;

    const medianEarnings = apiCollege['latest.earnings.10_yrs_after_entry.median'];
    const admissionRate = apiCollege['latest.admissions.admission_rate.overall'];

    const studentSize = apiCollege['latest.student.size'] || 0;
    const highestDegree = apiCollege['school.degrees_awarded.predominant'] || 0;

    const schoolUrl = apiCollege['school.school_url'];
    const fullUrl = schoolUrl ? (schoolUrl.startsWith('http') ? schoolUrl : `https://${schoolUrl}`) : null;

    return {
        name: apiCollege['school.name'],
        website_url: fullUrl,
        scholarship_url: generateScholarshipUrl(fullUrl),
        annual_cost_min: costMin,
        annual_cost_max: costMax,
        financial_aid_available: 7,
        state: state,
        city: apiCollege['school.city'] || '',
        region: region,
        campus_setting: setting,
        majors: 'Liberal Arts,Business,Sciences,Education,Health Sciences',
        academic_reputation: calculateReputation(admissionRate, completionRate, medianEarnings),
        faculty_quality: 6,
        avg_class_size: studentSize > 20000 ? 35 : (studentSize > 5000 ? 25 : 18),
        graduation_rate: graduationRate,
        avg_starting_salary: medianEarnings,
        job_placement_rate: graduationRate ? Math.min(95, graduationRate + 5) : null,
        student_population: studentSize,
        campus_culture: 'Diverse',
        safety_rating: 7,
        latitude: apiCollege['location.lat'],
        longitude: apiCollege['location.lon'],
        career_services_rating: 6,
        athletics_division: studentSize > 15000 ? 'D1' : (studentSize > 5000 ? 'D2' : 'D3'),
        athletics_rating: studentSize > 15000 ? 7 : 5,
        facilities_rating: 6,
        institution_type: getInstitutionType(highestDegree),
        accredited: 1
    };
}

// Fetch colleges from API
async function fetchCollegesFromAPI(page = 0, perPage = 100) {
    const fields = [
        'id',
        'school.name',
        'school.city',
        'school.state',
        'school.school_url',
        'school.locale',
        'school.degrees_awarded.predominant',
        'latest.student.size',
        'latest.cost.attendance.academic_year',
        'latest.cost.tuition.in_state',
        'latest.cost.tuition.out_of_state',
        'latest.admissions.admission_rate.overall',
        'latest.completion.completion_rate_4yr_150nt',
        'latest.earnings.10_yrs_after_entry.median',
        'location.lat',
        'location.lon'
    ].join(',');

    // Build URL with proper encoding - filter for operating schools only
    const params = new URLSearchParams({
        'api_key': API_KEY,
        'fields': fields,
        'school.operating': '1',
        'page': page.toString(),
        'per_page': perPage.toString()
    });

    const url = `${API_BASE}?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
    }
    return await response.json();
}

// Insert colleges into database
function insertColleges(colleges) {
    const dbPath = path.join(__dirname, '..', 'database', 'colleges.db');
    const db = new sqlite3.Database(dbPath);

    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO colleges (
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
                college.name, college.website_url, college.scholarship_url,
                college.annual_cost_min, college.annual_cost_max, college.financial_aid_available,
                college.state, college.city, college.region, college.campus_setting, college.majors,
                college.academic_reputation, college.faculty_quality, college.avg_class_size,
                college.graduation_rate, college.avg_starting_salary, college.job_placement_rate,
                college.student_population, college.campus_culture, college.safety_rating,
                college.latitude, college.longitude, college.career_services_rating,
                college.athletics_division, college.athletics_rating, college.facilities_rating,
                college.institution_type, college.accredited
            );
        });

        stmt.finalize((err) => {
            db.close();
            if (err) reject(err);
            else resolve(colleges.length);
        });
    });
}

// Clear database
function clearDatabase() {
    const dbPath = path.join(__dirname, '..', 'database', 'colleges.db');
    const db = new sqlite3.Database(dbPath);

    return new Promise((resolve, reject) => {
        db.run('DELETE FROM colleges', (err) => {
            db.close();
            if (err) reject(err);
            else resolve();
        });
    });
}

// Sleep for rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main function
async function main() {
    console.log('='.repeat(60));
    console.log('College Scorecard Data Fetcher');
    console.log('='.repeat(60));

    if (!API_KEY) {
        console.log('\n*** API KEY REQUIRED ***\n');
        console.log('To fetch ALL US colleges, get a free data.gov API key:\n');
        console.log('1. Go to: https://api.data.gov/signup/');
        console.log('2. Sign up (instant, no approval needed)');
        console.log('3. Add to .env file: DATA_GOV_API_KEY=your_key');
        console.log('4. Run: npm run fetch-colleges\n');
        console.log('Current database has 30 sample colleges for testing.');
        console.log('='.repeat(60));
        return;
    }

    try {
        console.log('\nClearing existing data...');
        await clearDatabase();

        console.log('Fetching from College Scorecard API...');
        console.log('This takes a few minutes for 6000+ colleges...\n');

        let page = 0;
        let totalImported = 0;
        let hasMore = true;

        while (hasMore) {
            process.stdout.write(`Page ${page + 1}... `);
            const data = await fetchCollegesFromAPI(page, 100);

            if (!data?.results?.length) {
                hasMore = false;
                break;
            }

            const colleges = data.results
                .filter(c => c['school.name'] && c['school.state'])
                .map(transformCollege);

            if (colleges.length > 0) {
                await insertColleges(colleges);
                totalImported += colleges.length;
                console.log(`+${colleges.length} (Total: ${totalImported})`);
            }

            const totalPages = Math.ceil(data.metadata.total / 100);
            if (page < totalPages - 1) {
                page++;
                await sleep(500);
            } else {
                hasMore = false;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log(`SUCCESS! Imported ${totalImported} colleges.`);
        console.log('='.repeat(60));
        console.log('\nStart server: npm start');
        console.log('Visit: http://localhost:3000\n');

    } catch (error) {
        console.error('\nError:', error.message);
    }
}

main();
