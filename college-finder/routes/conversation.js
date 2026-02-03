const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../services/db-service');

// The 15 questions in order (weighted highest to lowest)
const QUESTIONS = [
    {
        id: 1,
        text: "What is your annual budget for college (including tuition, room & board)?",
        type: "number",
        weight: 15,
        placeholder: "e.g., 25000",
        helper: "Enter total annual budget in USD"
    },
    {
        id: 2,
        text: "How important is financial aid and scholarship availability?",
        type: "select",
        weight: 12,
        options: ["Not Important", "Somewhat Important", "Very Important", "Critical"]
    },
    {
        id: 3,
        text: "Which region(s) of the US do you prefer?",
        type: "multi-select",
        weight: 10,
        options: ["Northeast", "Southeast", "Midwest", "Southwest", "West Coast", "No Preference"]
    },
    {
        id: 4,
        text: "What major or field of study are you interested in?",
        type: "text",
        weight: 10,
        placeholder: "e.g., Computer Science, Nursing, Business"
    },
    {
        id: 5,
        text: "How important are post-graduation outcomes (job placement, salary)?",
        type: "select",
        weight: 8,
        options: ["Not Important", "Somewhat Important", "Very Important", "Critical"]
    },
    {
        id: 6,
        text: "How important is school reputation and rankings?",
        type: "select",
        weight: 7,
        options: ["Not Important", "Somewhat Important", "Very Important", "Critical"]
    },
    {
        id: 7,
        text: "How important is campus safety?",
        type: "select",
        weight: 6,
        options: ["Not Important", "Somewhat Important", "Very Important", "Critical"]
    },
    {
        id: 8,
        text: "What school size do you prefer?",
        type: "select",
        weight: 5,
        options: ["Small (<5,000)", "Medium (5,000-15,000)", "Large (>15,000)", "No Preference"]
    },
    {
        id: 9,
        text: "What campus setting do you prefer?",
        type: "select",
        weight: 5,
        options: ["Urban", "Suburban", "Rural", "No Preference"]
    },
    {
        id: 10,
        text: "What type of campus culture appeals to you?",
        type: "text",
        weight: 5,
        placeholder: "e.g., Diverse, Liberal, Conservative, Academic-focused"
    },
    {
        id: 11,
        text: "What is your home zip code? (We'll calculate distance)",
        type: "text",
        weight: 4,
        placeholder: "e.g., 10001"
    },
    {
        id: 12,
        text: "How important are career services and job placement support?",
        type: "select",
        weight: 3,
        options: ["Not Important", "Somewhat Important", "Very Important", "Critical"]
    },
    {
        id: 13,
        text: "How important is faculty quality and small class sizes?",
        type: "select",
        weight: 3,
        options: ["Not Important", "Somewhat Important", "Very Important", "Critical"]
    },
    {
        id: 14,
        text: "How important are athletics and sports programs?",
        type: "select",
        weight: 4,
        options: ["Not Important", "Somewhat Important", "Very Important", "Critical"]
    },
    {
        id: 15,
        text: "How important are campus facilities and student life (dining, housing, recreation)?",
        type: "select",
        weight: 3,
        options: ["Not Important", "Somewhat Important", "Very Important", "Critical"]
    }
];

// GET /api/questions - Get all questions
router.get('/questions', (req, res) => {
    res.json({
        success: true,
        questions: QUESTIONS,
        totalQuestions: QUESTIONS.length
    });
});

// POST /api/session/start - Create a new session
router.post('/session/start', async (req, res) => {
    try {
        const sessionId = uuidv4();
        await db.createSession(sessionId);

        res.json({
            success: true,
            sessionId: sessionId,
            message: 'Session created successfully'
        });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create session',
            error: error.message
        });
    }
});

// GET /api/session/:sessionId - Get session data
router.get('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await db.getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        res.json({
            success: true,
            session: session
        });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get session',
            error: error.message
        });
    }
});

// PUT /api/session/:sessionId - Update session (save answer)
router.put('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { currentQuestion, responses, completed } = req.body;

        // Get existing session
        const session = await db.getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        // Merge new responses with existing ones
        const updatedResponses = { ...session.responses, ...responses };

        await db.updateSession(sessionId, {
            currentQuestion: currentQuestion !== undefined ? currentQuestion : session.current_question,
            responses: updatedResponses,
            completed: completed !== undefined ? completed : session.completed
        });

        res.json({
            success: true,
            message: 'Session updated successfully'
        });
    } catch (error) {
        console.error('Error updating session:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update session',
            error: error.message
        });
    }
});

// POST /api/questions/answer - Submit an answer
router.post('/questions/answer', async (req, res) => {
    try {
        const { sessionId, questionId, answer } = req.body;

        // Validate input
        if (!sessionId || !questionId || answer === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: sessionId, questionId, or answer'
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

        // Update responses
        const updatedResponses = { ...session.responses };
        updatedResponses[questionId] = answer;

        // Update session
        await db.updateSession(sessionId, {
            currentQuestion: questionId,
            responses: updatedResponses
        });

        res.json({
            success: true,
            message: 'Answer saved successfully',
            questionId: questionId
        });
    } catch (error) {
        console.error('Error saving answer:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save answer',
            error: error.message
        });
    }
});

module.exports = router;
