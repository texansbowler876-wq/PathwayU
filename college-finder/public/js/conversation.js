// Conversation Flow Manager

// DOM Elements
let landingPage, questionContainer, progressContainer, loadingScreen;
let questionText, questionHelper, answerInput, nextBtn, backBtn, submitBtn;
let progressText, progressPercent, progressFill;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    setupEventListeners();
});

function initializeElements() {
    landingPage = document.getElementById('landingPage');
    questionContainer = document.getElementById('questionContainer');
    progressContainer = document.getElementById('progressContainer');
    loadingScreen = document.getElementById('loadingScreen');

    questionText = document.getElementById('questionText');
    questionHelper = document.getElementById('questionHelper');
    answerInput = document.getElementById('answerInput');
    nextBtn = document.getElementById('nextBtn');
    backBtn = document.getElementById('backBtn');
    submitBtn = document.getElementById('submitBtn');

    progressText = document.getElementById('progressText');
    progressPercent = document.getElementById('progressPercent');
    progressFill = document.getElementById('progressFill');
}

function setupEventListeners() {
    document.getElementById('startQuizBtn').addEventListener('click', startQuiz);
    nextBtn.addEventListener('click', handleNext);
    backBtn.addEventListener('click', handleBack);
    submitBtn.addEventListener('click', handleSubmit);
}

// Start the quiz
async function startQuiz() {
    try {
        // Initialize state
        AppState.init();

        // Fetch questions
        const questionsResponse = await fetch('/api/questions');
        const questionsData = await questionsResponse.json();

        if (!questionsData.success) {
            throw new Error('Failed to load questions');
        }

        AppState.questions = questionsData.questions;
        AppState.totalQuestions = questionsData.totalQuestions;

        // Create session
        const sessionResponse = await fetch('/api/session/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const sessionData = await sessionResponse.json();

        if (!sessionData.success) {
            throw new Error('Failed to create session');
        }

        AppState.sessionId = sessionData.sessionId;

        // Hide landing page, show question container
        landingPage.style.display = 'none';
        progressContainer.style.display = 'block';
        questionContainer.style.display = 'block';

        // Load first question
        loadQuestion();

    } catch (error) {
        console.error('Error starting quiz:', error);
        alert('Failed to start quiz. Please try again.');
    }
}

// Load current question
function loadQuestion() {
    const question = AppState.getCurrentQuestion();

    if (!question) {
        console.error('No question found');
        return;
    }

    // Update question text
    questionText.textContent = question.text;
    questionHelper.textContent = question.helper || '';

    // Update progress
    updateProgress();

    // Generate input based on question type
    generateInput(question);

    // Update button states
    updateButtons();

    // Pre-fill answer if exists
    const existingAnswer = AppState.getResponse(question.id);
    if (existingAnswer !== undefined) {
        prefillAnswer(question, existingAnswer);
    }
}

// Generate input field based on question type
function generateInput(question) {
    answerInput.innerHTML = '';

    if (question.type === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'answerField';
        input.placeholder = question.placeholder || '';
        input.addEventListener('input', () => {
            AppState.saveResponse(question.id, input.value);
            updateButtons();
        });
        answerInput.appendChild(input);
    }
    else if (question.type === 'text') {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'answerField';
        input.placeholder = question.placeholder || '';
        input.addEventListener('input', () => {
            AppState.saveResponse(question.id, input.value);
            updateButtons();
        });
        answerInput.appendChild(input);
    }
    else if (question.type === 'select') {
        const select = document.createElement('select');
        select.id = 'answerField';

        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select an option...';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        select.appendChild(placeholderOption);

        // Add options
        question.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });

        select.addEventListener('change', () => {
            AppState.saveResponse(question.id, select.value);
            updateButtons();
        });

        answerInput.appendChild(select);
    }
    else if (question.type === 'multi-select') {
        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'checkbox-group';
        checkboxGroup.id = 'answerField';

        question.options.forEach(option => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = option;
            checkbox.id = `option-${option}`;

            const label = document.createElement('label');
            label.htmlFor = `option-${option}`;
            label.textContent = option;
            label.style.cursor = 'pointer';

            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(label);

            // Handle checkbox change
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    checkboxItem.classList.add('checked');
                } else {
                    checkboxItem.classList.remove('checked');
                }
                updateMultiSelectResponse(question.id);
            });

            // Make the whole div clickable
            checkboxItem.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });

            checkboxGroup.appendChild(checkboxItem);
        });

        answerInput.appendChild(checkboxGroup);
    }
}

// Update multi-select response
function updateMultiSelectResponse(questionId) {
    const checkboxes = document.querySelectorAll('#answerField input[type="checkbox"]');
    const selected = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    AppState.saveResponse(questionId, selected);
    updateButtons();
}

// Prefill answer if user is going back
function prefillAnswer(question, answer) {
    if (question.type === 'number' || question.type === 'text') {
        const input = document.getElementById('answerField');
        if (input) input.value = answer;
    }
    else if (question.type === 'select') {
        const select = document.getElementById('answerField');
        if (select) select.value = answer;
    }
    else if (question.type === 'multi-select' && Array.isArray(answer)) {
        const checkboxes = document.querySelectorAll('#answerField input[type="checkbox"]');
        checkboxes.forEach(cb => {
            if (answer.includes(cb.value)) {
                cb.checked = true;
                cb.closest('.checkbox-item').classList.add('checked');
            }
        });
    }
}

// Update progress bar
function updateProgress() {
    const progress = AppState.getProgress();
    const questionNumber = AppState.currentQuestionIndex + 1;

    progressText.textContent = `Question ${questionNumber} of ${AppState.totalQuestions}`;
    progressPercent.textContent = `${progress}%`;
    progressFill.style.width = `${progress}%`;
}

// Update button states
function updateButtons() {
    const isAnswered = AppState.isCurrentQuestionAnswered();
    const canGoBack = AppState.canGoBack();
    const isLast = AppState.isLastQuestion();

    nextBtn.disabled = !isAnswered;
    backBtn.style.display = canGoBack ? 'inline-block' : 'none';

    if (isLast) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-block';
        submitBtn.disabled = !isAnswered;
    } else {
        nextBtn.style.display = 'inline-block';
        submitBtn.style.display = 'none';
    }
}

// Handle next button
async function handleNext() {
    const question = AppState.getCurrentQuestion();

    // Save to backend
    await saveAnswer(question.id, AppState.getResponse(question.id));

    // Move to next question
    AppState.nextQuestion();
    loadQuestion();
}

// Handle back button
function handleBack() {
    AppState.previousQuestion();
    loadQuestion();
}

// Handle submit button
async function handleSubmit() {
    try {
        // Save last answer
        const question = AppState.getCurrentQuestion();
        await saveAnswer(question.id, AppState.getResponse(question.id));

        // Show loading screen
        questionContainer.style.display = 'none';
        progressContainer.style.display = 'none';
        loadingScreen.style.display = 'block';

        // Submit to matching API
        const response = await fetch('/api/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: AppState.sessionId })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to generate recommendations');
        }

        // Redirect to results page
        window.location.href = `/results?session=${AppState.sessionId}`;

    } catch (error) {
        console.error('Error submitting:', error);
        alert('Failed to generate recommendations. Please try again.');
        loadingScreen.style.display = 'none';
        questionContainer.style.display = 'block';
        progressContainer.style.display = 'block';
    }
}

// Save answer to backend
async function saveAnswer(questionId, answer) {
    try {
        await fetch('/api/questions/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: AppState.sessionId,
                questionId: questionId,
                answer: answer
            })
        });
    } catch (error) {
        console.error('Error saving answer:', error);
        // Don't block user progress if save fails
    }
}
