const express = require('express');
const { Resend } = require('resend');
const dbService = require('../services/db-service');

const router = express.Router();

function buildEmailHtml(results) {
    const topFive = results?.topFive || [];
    const mentions = results?.honorableMentions || [];

    const topFiveHtml = topFive.map((result, index) => {
        const college = result.college || {};
        return `
            <li>
                <strong>#${index + 1} ${college.name || 'Unknown College'}</strong><br>
                ${college.city || ''}${college.state ? `, ${college.state}` : ''}<br>
                Match: ${result.totalScore || 0}%<br>
                ${result.aiSummary || ''}
            </li>
        `;
    }).join('');

    const mentionsHtml = mentions.map((m) => {
        return `<li>${m.name} (${m.score}% match)</li>`;
    }).join('');

    return `
        <div style="font-family: Arial, sans-serif; color: #14213d;">
            <h2>Your PathwayU Recommendations</h2>
            <p>Here are your top matches:</p>
            <ol>${topFiveHtml}</ol>
            <h3>Honorable Mentions</h3>
            <ul>${mentionsHtml || '<li>No additional matches found.</li>'}</ul>
        </div>
    `;
}

router.post('/results', async (req, res) => {
    try {
        const { sessionId, email } = req.body || {};

        if (!sessionId || !email) {
            return res.status(400).json({ success: false, message: 'Session ID and email are required.' });
        }

        if (!process.env.RESEND_API_KEY) {
            return res.status(500).json({ success: false, message: 'Email service is not configured.' });
        }

        const session = await dbService.getSession(sessionId);
        if (!session || !session.results) {
            return res.status(404).json({ success: false, message: 'Results not found for this session.' });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const html = buildEmailHtml(session.results);

        await resend.emails.send({
            from: 'PathwayU <onboarding@resend.dev>',
            to: email,
            subject: 'Your PathwayU College Recommendations',
            html
        });

        return res.json({ success: true });
    } catch (error) {
        console.error('Email send error:', error);
        return res.status(500).json({ success: false, message: 'Failed to send email.' });
    }
});

module.exports = router;
