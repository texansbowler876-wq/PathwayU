// Results Page Manager

// DOM Elements
let resultsContainer, loadingScreen, errorScreen;
let topFiveDiv, honorableMentionsUl;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    loadResults();
});

function initializeElements() {
    resultsContainer = document.getElementById('resultsContainer');
    loadingScreen = document.getElementById('loadingScreen');
    errorScreen = document.getElementById('errorScreen');

    topFiveDiv = document.getElementById('topFive');
    honorableMentionsUl = document.getElementById('honorableMentions');

    // Setup event listeners
    document.getElementById('startOverBtn').addEventListener('click', () => {
        window.location.href = '/';
    });

    document.getElementById('shareBtn').addEventListener('click', handleShare);

    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            window.location.href = '/';
        });
    }
}

// Get session ID from URL
function getSessionId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('session');
}

// Load results from API
async function loadResults() {
    try {
        const sessionId = getSessionId();

        if (!sessionId) {
            throw new Error('No session ID provided');
        }

        // Fetch results
        const response = await fetch(`/api/results/${sessionId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to load results');
        }

        // Display results
        displayResults(data.results);

        // Hide loading, show results
        loadingScreen.style.display = 'none';
        resultsContainer.style.display = 'block';

    } catch (error) {
        console.error('Error loading results:', error);
        showError(error.message);
    }
}

// Display results
function displayResults(results) {
    // Display top 5
    displayTopFive(results.topFive);

    // Display honorable mentions
    displayHonorableMentions(results.honorableMentions);
}

// Display top 5 colleges
function displayTopFive(topFive) {
    topFiveDiv.innerHTML = '';

    topFive.forEach((result, index) => {
        const college = result.college;
        const rank = index + 1;

        // Get distance and in-state info
        const distance = result.distance;
        const isInState = result.isInState;
        const effectiveTuition = result.effectiveTuition;

        // Build location string with distance
        const distanceStr = distance ? ` (${distance} miles away)` : '';
        const tuitionLabel = isInState ? 'In-State Tuition' : 'Out-of-State Tuition';
        const tuitionBadge = isInState
            ? '<span class="tuition-badge in-state">IN-STATE</span>'
            : '<span class="tuition-badge out-of-state">OUT-OF-STATE</span>';

        const card = document.createElement('div');
        card.className = 'college-card';

        card.innerHTML = `
            <div class="college-header">
                <div style="display: flex; align-items: flex-start;">
                    <div class="college-rank">#${rank}</div>
                    <div class="college-info">
                        <h3 class="college-name">${college.name}</h3>
                        <p class="college-location">${college.city}, ${college.state}${distanceStr}</p>
                    </div>
                </div>
                <div class="match-score">${result.totalScore}% Match</div>
            </div>

            <p class="college-summary">${result.aiSummary}</p>

            <div class="college-details">
                <p><strong>Type:</strong> ${college.institution_type}</p>
                <p>
                    <strong>Your Cost:</strong> $${effectiveTuition?.toLocaleString()}/year ${tuitionBadge}
                </p>
                <p><strong>Full Range:</strong> $${college.annual_cost_min?.toLocaleString()} (in-state) - $${college.annual_cost_max?.toLocaleString()} (out-of-state)</p>
                <p><strong>Students:</strong> ${college.student_population?.toLocaleString()}</p>
                <p><strong>Campus:</strong> ${college.campus_setting}</p>
                <p><strong>Graduation Rate:</strong> ${college.graduation_rate}%</p>
            </div>

            <div class="college-links">
                <a href="${college.website_url}" target="_blank" class="college-link">
                    Visit Website
                </a>
                <a href="${college.scholarship_url}" target="_blank" class="college-link scholarship-link">
                    View Scholarships
                </a>
            </div>
        `;

        topFiveDiv.appendChild(card);
    });
}

// Display honorable mentions
function displayHonorableMentions(mentions) {
    honorableMentionsUl.innerHTML = '';

    if (!mentions || mentions.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No additional matches found.';
        honorableMentionsUl.appendChild(li);
        return;
    }

    mentions.forEach(mention => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${mention.name}
            <span class="mention-score">${mention.score}% match</span>
        `;
        honorableMentionsUl.appendChild(li);
    });
}

// Handle share button
function handleShare() {
    const sessionId = getSessionId();
    const shareUrl = `${window.location.origin}/results?session=${sessionId}`;

    // Try to copy to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                alert('Results link copied to clipboard! You can save it and come back anytime.');
            })
            .catch(() => {
                // Fallback: show the URL
                prompt('Copy this link to save your results:', shareUrl);
            });
    } else {
        // Fallback for older browsers
        prompt('Copy this link to save your results:', shareUrl);
    }
}

// Show error screen
function showError(message) {
    loadingScreen.style.display = 'none';
    resultsContainer.style.display = 'none';
    errorScreen.style.display = 'block';

    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message || 'An error occurred while loading results.';
    }
}
