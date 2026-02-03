const express = require('express');
const router = express.Router();
const db = require('../services/db-service');
const { calculateMatch, getTopRecommendations, buildUserProfile, getDistanceToCollege, isCollegeInState } = require('../services/matching-engine');
const { generateAllSummaries } = require('../services/ai-service');

// POST /api/match - Run matching algorithm and get recommendations
router.post('/match', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required'
            });
        }

        // Get session
        const session = await db.getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        const responses = session.responses;

        // Validate that user has answered all questions
        const totalQuestions = 15;
        const answeredQuestions = Object.keys(responses).length;

        if (answeredQuestions < totalQuestions) {
            return res.status(400).json({
                success: false,
                message: `Please answer all questions. Answered: ${answeredQuestions}/${totalQuestions}`
            });
        }

        console.log('Fetching all colleges...');
        // Get all colleges
        const colleges = await db.getAllColleges();

        console.log(`Calculating matches for ${colleges.length} colleges...`);
        // Calculate match scores for all colleges
        const matchResults = colleges.map(college => calculateMatch(college, responses));

        console.log('Getting top recommendations...');
        // Get top 10
        const recommendations = getTopRecommendations(matchResults);

        console.log('Building user profile...');
        // Build user profile for AI summaries
        const userProfile = buildUserProfile(responses);

        console.log('Generating AI summaries for top 5 colleges...');
        // Generate AI summaries for top 5
        const topFiveWithSummaries = await generateAllSummaries(
            recommendations.topFive,
            userProfile
        );

        // Add distance and in-state info to each result
        const userZipCode = responses[11];
        const enrichedTopFive = topFiveWithSummaries.map(result => {
            const distance = getDistanceToCollege(result.college, userZipCode);
            const inState = isCollegeInState(result.college, userZipCode);
            return {
                ...result,
                distance: distance,
                isInState: inState,
                effectiveTuition: inState ? result.college.annual_cost_min : result.college.annual_cost_max
            };
        });

        console.log('Saving results to session...');
        // Save results to session
        await db.updateSession(sessionId, {
            results: {
                topFive: enrichedTopFive,
                honorableMentions: recommendations.honorableMentions
            },
            completed: 1
        });

        console.log('Match complete! Sending results...');
        res.json({
            success: true,
            topFive: enrichedTopFive,
            honorableMentions: recommendations.honorableMentions
        });

    } catch (error) {
        console.error('Error during matching:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate recommendations',
            error: error.message
        });
    }
});

// GET /api/results/:sessionId - Get saved results
router.get('/results/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await db.getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        if (!session.completed || !session.results) {
            return res.status(400).json({
                success: false,
                message: 'No results available for this session'
            });
        }

        res.json({
            success: true,
            results: session.results
        });

    } catch (error) {
        console.error('Error getting results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get results',
            error: error.message
        });
    }
});

module.exports = router;
