// Import location service for distance and in-state calculations
const locationService = require('./location-service');

// Question weights (must add up to 100%)
const WEIGHTS = {
    budget: 0.15,           // Q1 - 15%
    financialAid: 0.12,     // Q2 - 12%
    region: 0.14,           // Q3 - 14% (INCREASED from 10%)
    major: 0.14,            // Q4 - 14% (INCREASED from 10%)
    outcomes: 0.08,         // Q5 - 8%
    reputation: 0.07,       // Q6 - 7%
    safety: 0.06,           // Q7 - 6%
    size: 0.05,             // Q8 - 5%
    setting: 0.03,          // Q9 - 3% (reduced)
    culture: 0.03,          // Q10 - 3% (reduced)
    distance: 0.04,         // Q11 - 4%
    careerServices: 0.03,   // Q12 - 3%
    faculty: 0.03,          // Q13 - 3%
    athletics: 0.02,        // Q14 - 2% (reduced)
    facilities: 0.02        // Q15 - 2% (reduced)
};

// Score budget (0-100) - considers in-state vs out-of-state tuition
function scoreBudget(college, userBudget, userZipCode) {
    if (!userBudget || !college.annual_cost_min || !college.annual_cost_max) {
        return 50; // Neutral score if no data
    }

    // Determine if user qualifies for in-state tuition
    const isInState = userZipCode ? locationService.isInState(userZipCode, college.state) : false;

    // Use appropriate tuition cost
    // In-state: use minimum cost (annual_cost_min typically represents in-state)
    // Out-of-state: use maximum cost (annual_cost_max typically represents out-of-state)
    const effectiveCost = isInState ? college.annual_cost_min : college.annual_cost_max;

    // Score based on whether user can afford it
    if (userBudget >= effectiveCost) {
        // Can afford it - give high score
        // Bonus points if it's significantly under budget
        const savings = userBudget - effectiveCost;
        const savingsBonus = Math.min(10, savings / 5000); // Up to 10 bonus points
        return Math.min(100, 90 + savingsBonus);
    }

    // Can't fully afford - score based on how close they are
    const shortfall = effectiveCost - userBudget;
    const percentageShort = shortfall / effectiveCost;

    if (percentageShort < 0.1) return 75;  // Within 10% - very close
    if (percentageShort < 0.25) return 50; // Within 25% - might work with aid
    if (percentageShort < 0.5) return 25;  // Within 50% - stretch
    return 0; // More than 50% short - probably not affordable
}

// Score financial aid importance (0-100)
function scoreFinancialAid(college, userImportance) {
    if (!college.financial_aid_available) return 50;

    const importanceMap = {
        'Not Important': 0,
        'Somewhat Important': 0.33,
        'Very Important': 0.66,
        'Critical': 1.0
    };

    const userWeight = importanceMap[userImportance] || 0.5;
    const collegeScore = (college.financial_aid_available / 10) * 100;

    // If user doesn't care, give neutral score
    if (userWeight === 0) return 50;

    // Weight college's rating by user's importance
    return collegeScore * userWeight + (50 * (1 - userWeight));
}

// Score region match (0-100)
function scoreRegion(college, preferredRegions) {
    if (!preferredRegions || preferredRegions.length === 0) return 100;

    // Convert to array if it's a single string
    const regions = Array.isArray(preferredRegions) ? preferredRegions : [preferredRegions];

    if (regions.includes('No Preference')) return 100;

    return regions.includes(college.region) ? 100 : 0;
}

// Score major availability (0-100)
function scoreMajor(college, desiredMajor) {
    if (!desiredMajor || !college.majors) return 50;

    const collegeMajors = college.majors.split(',').map(m => m.trim().toLowerCase());
    const searchTerm = desiredMajor.toLowerCase().trim();

    // Exact match
    if (collegeMajors.includes(searchTerm)) return 100;

    // Partial match (e.g., "computer" matches "computer science")
    const hasPartialMatch = collegeMajors.some(m =>
        m.includes(searchTerm) || searchTerm.includes(m)
    );

    return hasPartialMatch ? 70 : 20; // Give some credit even for no match to avoid harsh penalties
}

// Score scale-based importance questions (0-100)
function scoreScaleFactor(college, userImportance, collegeRating) {
    if (!collegeRating) return 50;

    const importanceMap = {
        'Not Important': 0,
        'Somewhat Important': 0.33,
        'Very Important': 0.66,
        'Critical': 1.0
    };

    const userWeight = importanceMap[userImportance] || 0.5;
    const collegeScore = (collegeRating / 10) * 100;

    // If user doesn't care, give neutral score
    if (userWeight === 0) return 50;

    // Weight college's rating by user's importance
    return collegeScore * userWeight + (50 * (1 - userWeight));
}

// Score post-graduation outcomes (0-100)
function scoreOutcomes(college, userImportance) {
    if (!college.graduation_rate && !college.job_placement_rate) return 50;

    // Average graduation rate and job placement rate
    const avgOutcome = ((college.graduation_rate || 0) + (college.job_placement_rate || 0)) / 2;

    const importanceMap = {
        'Not Important': 0,
        'Somewhat Important': 0.33,
        'Very Important': 0.66,
        'Critical': 1.0
    };

    const userWeight = importanceMap[userImportance] || 0.5;
    const collegeScore = avgOutcome;

    if (userWeight === 0) return 50;

    return collegeScore * userWeight + (50 * (1 - userWeight));
}

// Score school size (0-100)
function scoreSize(college, preferredSize) {
    if (!preferredSize || !college.student_population) return 50;

    const population = college.student_population;

    const sizeRanges = {
        'Small (<5,000)': [0, 5000],
        'Medium (5,000-15,000)': [5000, 15000],
        'Large (>15,000)': [15000, Infinity],
        'No Preference': [0, Infinity]
    };

    const range = sizeRanges[preferredSize];
    if (!range) return 50;

    if (preferredSize === 'No Preference') return 100;

    // Check if population is in range
    if (population >= range[0] && population < range[1]) return 100;

    // Partial credit for adjacent sizes
    if (Math.abs(population - range[0]) < 5000 || Math.abs(population - range[1]) < 5000) {
        return 60;
    }

    return 30; // Give some credit even for mismatches
}

// Score campus setting (0-100)
function scoreSetting(college, preferredSetting) {
    if (!preferredSetting || !college.campus_setting) return 50;

    if (preferredSetting === 'No Preference') return 100;

    return college.campus_setting === preferredSetting ? 100 : 30;
}

// Score campus culture (0-100)
function scoreCulture(college, preferredCulture) {
    if (!preferredCulture || !college.campus_culture) return 50;

    const collegeCulture = college.campus_culture.toLowerCase();
    const userCulture = preferredCulture.toLowerCase();

    // Check for keyword matches
    if (collegeCulture.includes(userCulture) || userCulture.includes(collegeCulture)) {
        return 100;
    }

    return 50; // Neutral if no match
}

// Haversine formula to calculate distance between two lat/long points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles

    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in miles
}

// Score distance from home (0-100)
// Calculates actual distance using zip code coordinates
function scoreDistance(college, userZipCode) {
    if (!userZipCode || !college.latitude || !college.longitude) {
        return 50; // Neutral score if no location data
    }

    // Get user's coordinates from zip code
    const userCoords = locationService.getCoordinatesFromZip(userZipCode);
    if (!userCoords) {
        return 50; // Can't determine user location
    }

    // Calculate distance in miles
    const distance = locationService.calculateDistance(
        userCoords.lat,
        userCoords.lon,
        college.latitude,
        college.longitude
    );

    if (distance === null) return 50;

    // Score based on distance
    // Closer schools get higher scores (most students prefer closer)
    // But some distance is fine - it's about preference
    if (distance < 50) return 100;       // Very close - excellent
    if (distance < 100) return 90;       // Within 100 miles - great
    if (distance < 250) return 75;       // Within 250 miles - good
    if (distance < 500) return 60;       // Within 500 miles - reasonable
    if (distance < 1000) return 40;      // Within 1000 miles - far but doable
    if (distance < 2000) return 25;      // Across country
    return 15; // Very far (Hawaii, Alaska, etc.)
}

// Score athletics (0-100)
function scoreAthletics(college, userImportance) {
    return scoreScaleFactor(college, userImportance, college.athletics_rating);
}

// Main matching function
function calculateMatch(college, userResponses) {
    // Get user's zip code (question 11) for location-based calculations
    const userZipCode = userResponses[11];

    const scores = {
        budget: scoreBudget(college, userResponses[1], userZipCode),
        financialAid: scoreFinancialAid(college, userResponses[2]),
        region: scoreRegion(college, userResponses[3]),
        major: scoreMajor(college, userResponses[4]),
        outcomes: scoreOutcomes(college, userResponses[5]),
        reputation: scoreScaleFactor(college, userResponses[6], college.academic_reputation),
        safety: scoreScaleFactor(college, userResponses[7], college.safety_rating),
        size: scoreSize(college, userResponses[8]),
        setting: scoreSetting(college, userResponses[9]),
        culture: scoreCulture(college, userResponses[10]),
        distance: scoreDistance(college, userResponses[11]),
        careerServices: scoreScaleFactor(college, userResponses[12], college.career_services_rating),
        faculty: scoreScaleFactor(college, userResponses[13], college.faculty_quality),
        athletics: scoreAthletics(college, userResponses[14]),
        facilities: scoreScaleFactor(college, userResponses[15], college.facilities_rating)
    };

    // Calculate weighted total score
    let totalScore = 0;
    totalScore += scores.budget * WEIGHTS.budget;
    totalScore += scores.financialAid * WEIGHTS.financialAid;
    totalScore += scores.region * WEIGHTS.region;
    totalScore += scores.major * WEIGHTS.major;
    totalScore += scores.outcomes * WEIGHTS.outcomes;
    totalScore += scores.reputation * WEIGHTS.reputation;
    totalScore += scores.safety * WEIGHTS.safety;
    totalScore += scores.size * WEIGHTS.size;
    totalScore += scores.setting * WEIGHTS.setting;
    totalScore += scores.culture * WEIGHTS.culture;
    totalScore += scores.distance * WEIGHTS.distance;
    totalScore += scores.careerServices * WEIGHTS.careerServices;
    totalScore += scores.faculty * WEIGHTS.faculty;
    totalScore += scores.athletics * WEIGHTS.athletics;
    totalScore += scores.facilities * WEIGHTS.facilities;

    return {
        college: college,
        totalScore: Math.round(totalScore),
        breakdown: scores
    };
}

// Get top recommendations
function getTopRecommendations(matchResults) {
    // Sort by totalScore descending
    const sorted = matchResults.sort((a, b) => b.totalScore - a.totalScore);

    return {
        topFive: sorted.slice(0, 5),
        honorableMentions: sorted.slice(5, 10).map((result, index) => ({
            rank: index + 6,
            name: result.college.name,
            score: result.totalScore
        }))
    };
}

// Build user profile from responses for AI summary generation
function buildUserProfile(responses) {
    const zipCode = responses[11];
    const userState = zipCode ? locationService.getStateFromZip(zipCode) : null;

    return {
        budget: responses[1] || 'Not specified',
        financialAidImportance: responses[2] || 'Not specified',
        region: Array.isArray(responses[3]) ? responses[3].join(', ') : (responses[3] || 'No preference'),
        major: responses[4] || 'Undecided',
        outcomesImportance: responses[5] || 'Not specified',
        reputationImportance: responses[6] || 'Not specified',
        safetyImportance: responses[7] || 'Not specified',
        size: responses[8] || 'No preference',
        setting: responses[9] || 'No preference',
        culture: responses[10] || 'Open to all',
        zipCode: zipCode || 'Not specified',
        homeState: userState || 'Unknown',
        careerServicesImportance: responses[12] || 'Not specified',
        facultyImportance: responses[13] || 'Not specified',
        athleticsImportance: responses[14] || 'Not specified',
        facilitiesImportance: responses[15] || 'Not specified'
    };
}

// Helper function to calculate distance for a specific college
function getDistanceToCollege(college, userZipCode) {
    if (!userZipCode || !college.latitude || !college.longitude) {
        return null;
    }

    const userCoords = locationService.getCoordinatesFromZip(userZipCode);
    if (!userCoords) return null;

    return locationService.calculateDistance(
        userCoords.lat,
        userCoords.lon,
        college.latitude,
        college.longitude
    );
}

// Check if college is in-state for user
function isCollegeInState(college, userZipCode) {
    return locationService.isInState(userZipCode, college.state);
}

module.exports = {
    calculateMatch,
    getTopRecommendations,
    buildUserProfile,
    getDistanceToCollege,
    isCollegeInState
};
