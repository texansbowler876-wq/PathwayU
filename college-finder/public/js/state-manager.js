// Application State Manager

const AppState = {
    sessionId: null,
    currentQuestionIndex: 0,
    totalQuestions: 15,
    questions: [],
    responses: {},
    isLoading: false,

    // Initialize state
    init() {
        this.responses = {};
        this.currentQuestionIndex = 0;
    },

    // Get current question
    getCurrentQuestion() {
        return this.questions[this.currentQuestionIndex];
    },

    // Check if we can go back
    canGoBack() {
        return this.currentQuestionIndex > 0;
    },

    // Check if this is the last question
    isLastQuestion() {
        return this.currentQuestionIndex === this.totalQuestions - 1;
    },

    // Go to next question
    nextQuestion() {
        if (this.currentQuestionIndex < this.totalQuestions - 1) {
            this.currentQuestionIndex++;
            return true;
        }
        return false;
    },

    // Go to previous question
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            return true;
        }
        return false;
    },

    // Save response for current question
    saveResponse(questionId, answer) {
        this.responses[questionId] = answer;
    },

    // Get response for a question
    getResponse(questionId) {
        return this.responses[questionId];
    },

    // Calculate progress percentage
    getProgress() {
        return Math.round(((this.currentQuestionIndex + 1) / this.totalQuestions) * 100);
    },

    // Check if current question is answered
    isCurrentQuestionAnswered() {
        const currentQuestion = this.getCurrentQuestion();
        if (!currentQuestion) return false;

        const response = this.responses[currentQuestion.id];

        // For multi-select, check if at least one option is selected
        if (currentQuestion.type === 'multi-select') {
            return Array.isArray(response) && response.length > 0;
        }

        // For other types, check if response exists and is not empty
        return response !== undefined && response !== null && response !== '';
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppState;
}
