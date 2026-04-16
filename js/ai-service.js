// ai-service.js
// Mocks an AI API that generates a structured study plan from prompt parameters.

const AIService = {
    /**
     * Mocks an AI generation process returning structured JSON.
     * In a real hackathon, you could replace this with a fetch() call to OpenAI / Gemini.
     * 
     * @param {string} topic - e.g., "Web Security"
     * @param {string} goal - e.g., "Pass security audit"
     * @param {string} weaknesses - e.g., "XSS, CSRF"
     * @returns {Promise<Object>} The structured study plan
     */
    async generateStudyPlan(topic, goal, weaknesses) {
        return new Promise((resolve) => {
            console.log(`[AI Mock] Generating plan for Topic: ${topic}, Goal: ${goal}, Weaknesses: ${weaknesses}`);
            
            // Simulate network delay to show "AI Thinking" loading state in the UI
            setTimeout(() => {
                const plan = {
                    metadata: {
                        topic,
                        goal,
                        weaknessFocus: weaknesses,
                        createdAt: new Date().toISOString()
                    },
                    overview: `A personalized accelerated path to master ${topic} focusing heavily on your weak areas (${weaknesses}), structured to help you achieve your goal: ${goal}.`,
                    roadmap: [
                        {
                            id: 'day-1',
                            dayLabel: 'Phase 1: Fundamentals & Weakness Addressing',
                            tasks: [
                                { id: 't1-1', title: `Review core theoretical concepts of ${topic}`, completed: false },
                                { id: 't1-2', title: `Deep dive reading into ${weaknesses.split(',')[0] || weaknesses}`, completed: false }
                            ]
                        },
                        {
                            id: 'day-2',
                            dayLabel: 'Phase 2: Practical Application',
                            tasks: [
                                { id: 't2-1', title: `Build an isolated environment/sandbox for ${topic}`, completed: false },
                                { id: 't2-2', title: `Implement a mini-project focusing on ${goal}`, completed: false }
                            ]
                        },
                        {
                            id: 'day-3',
                            dayLabel: 'Phase 3: Testing & Mastery',
                            tasks: [
                                { id: 't3-1', title: `Complete 5 advanced practice scenarios`, completed: false },
                                { id: 't3-2', title: `Review implementation against best practices`, completed: false }
                            ]
                        }
                    ],
                    practiceQuestions: [
                        `Can you explain the main principles of ${topic} to someone without technical background?`,
                        `How exactly do you mitigate issues related to ${weaknesses || 'this topic'}?`,
                        `What are the most common pitfalls when trying to ${goal}?`
                    ],
                    revisionPriorities: [
                        weaknesses || "Core Syntax Rules",
                        "Security & Vulnerability Patterns",
                        "Performance and Optimization Best Practices"
                    ],
                    resources: [
                        { title: `${topic} Official Documentation Overview`, url: "#", type: "Documentation" },
                        { title: `Mastering ${weaknesses || 'advanced concepts'} in 20 minutes (Video)`, url: "#", type: "Video" },
                        { title: `Interactive Sandbox Environment for ${topic}`, url: "#", type: "Interactive" }
                    ]
                };

                resolve(plan);
            }, 2500); // 2.5 second mock delay
        });
    }
};

// Make AIService globally available
window.AIService = AIService;
console.log('AI Service module loaded.');
