const Anthropic = require('@anthropic-ai/sdk');
const { getDistanceToCollege, isCollegeInState } = require('./matching-engine');

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
});

// Generate summary for a single college
async function generateCollegeSummary(matchResult, userProfile) {
    const college = matchResult.college;

    // Calculate distance and in-state status
    const distance = getDistanceToCollege(college, userProfile.zipCode);
    const isInState = isCollegeInState(college, userProfile.zipCode);

    // Determine effective tuition
    const effectiveTuition = isInState ? college.annual_cost_min : college.annual_cost_max;
    const tuitionType = isInState ? 'in-state' : 'out-of-state';

    // Build distance string
    const distanceStr = distance ? `${distance} miles from home` : 'distance unknown';

    const prompt = `You are a college counselor. Write a 2-3 sentence summary explaining why ${college.name} is a good match for this student.

Student Profile:
- Budget: $${userProfile.budget}
- Home State: ${userProfile.homeState}
- Major: ${userProfile.major}
- Location Preference: ${userProfile.region}
- School Size Preference: ${userProfile.size}
- Campus Setting: ${userProfile.setting}
- Key Priorities: Financial aid ${userProfile.financialAidImportance}, Reputation ${userProfile.reputationImportance}, Outcomes ${userProfile.outcomesImportance}

College Info:
- Name: ${college.name}
- Location: ${college.city}, ${college.state} (${college.region})
- Distance from Student: ${distanceStr}
- In-State for Student: ${isInState ? 'YES (qualifies for in-state tuition!)' : 'No (out-of-state tuition applies)'}
- Effective Tuition: $${effectiveTuition?.toLocaleString()} (${tuitionType})
- Full Cost Range: $${college.annual_cost_min?.toLocaleString()} (in-state) - $${college.annual_cost_max?.toLocaleString()} (out-of-state)
- Type: ${college.institution_type}
- Size: ${college.student_population?.toLocaleString()} students
- Campus Setting: ${college.campus_setting}
- Notable Programs: ${college.majors}
- Graduation Rate: ${college.graduation_rate}%
- Average Starting Salary: $${college.avg_starting_salary?.toLocaleString()}
- Match Score: ${matchResult.totalScore}%

Write a compelling, personalized summary (2-3 sentences) that connects the student's preferences to this college's strengths. If the student qualifies for in-state tuition, mention this cost advantage. Mention the distance if relevant. Be specific and encouraging.`;

    try {
        const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 250,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        return message.content[0].text;
    } catch (error) {
        console.error('Error generating summary for', college.name, ':', error.message);
        // Return a fallback summary if AI fails
        const inStateNote = isInState ? ` As an in-state student, you'd pay the lower tuition rate of $${college.annual_cost_min?.toLocaleString()}.` : '';
        const distanceNote = distance ? ` Located ${distance} miles from your home.` : '';
        return `${college.name} in ${college.city}, ${college.state} offers strong programs in ${college.majors.split(',')[0]} with a ${college.graduation_rate}% graduation rate.${inStateNote}${distanceNote}`;
    }
}

// Generate summaries for all top 5 colleges in parallel
async function generateAllSummaries(topFive, userProfile) {
    console.log('Generating AI summaries for top 5 colleges...');

    const summaryPromises = topFive.map(matchResult =>
        generateCollegeSummary(matchResult, userProfile)
    );

    const summaries = await Promise.all(summaryPromises);

    return topFive.map((matchResult, index) => ({
        college: matchResult.college,
        totalScore: matchResult.totalScore,
        aiSummary: summaries[index]
    }));
}

module.exports = {
    generateCollegeSummary,
    generateAllSummaries
};
