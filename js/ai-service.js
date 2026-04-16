// ai-service.js
// Calls Google Gemini API to generate a structured study plan.
// Falls back to a rich mock if API key is missing or call fails.

const GEMINI_API_KEY = 'AIzaSyBl4JEP3pFHKbz3-v0P2MZ_tMjYkjkuLcc'; // ← Replace with your key

const AIService = {

    // ──────────────────────────────────────────────────────────────
    //  Main entry point
    // ──────────────────────────────────────────────────────────────
    async generateStudyPlan(rawTopic, rawGoal, rawWeaknesses) {
        const topic      = rawTopic.length > 80 ? rawTopic.substring(0, 80) + '...' : rawTopic || 'the core subject';
        const goal       = rawGoal       || 'mastery';
        const weaknesses = rawWeaknesses || 'these areas';

        // Try Gemini first; fall back to mock if no key or error
        if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
            try {
                return await this._callGemini(topic, goal, weaknesses);
            } catch (err) {
                console.warn('[Gemini] Failed, using mock:', err.message);
                return this._mockPlan(topic, goal, weaknesses);
            }
        }
        return this._mockPlan(topic, goal, weaknesses);
    },

    // ──────────────────────────────────────────────────────────────
    //  Gemini API call
    // ──────────────────────────────────────────────────────────────
    async _callGemini(topic, goal, weaknesses) {
        const prompt = `
You are an expert AI tutor. A student wants a personalised study plan.
Topic: "${topic}"
Goal: "${goal}"
Weak areas: "${weaknesses}"

Return ONLY a valid JSON object (no markdown fences, no extra text) matching EXACTLY this schema:
{
  "overview": "<2-sentence summary>",
  "roadmap": [
    { "id": "day-1", "dayLabel": "<Phase label>", "tasks": [
        { "id": "t1-1", "title": "<task>", "completed": false }
    ]}
  ],
  "practiceQuestions": [
    { "id": 1, "text": "<question>", "difficulty": "Easy|Medium|Hard" }
  ],
  "revisionPriorities": [
    { "topic": "<area>", "urgency": "Critical|High|Moderate", "reason": "<why>" }
  ],
  "resources": [
    { "title": "<title>", "url": "<real url>", "type": "Documentation|Video|Article|Repository|Course", "description": "<desc>" }
  ]
}

Rules:
- roadmap must have exactly 4 phases, each with 2-3 tasks
- practiceQuestions must have exactly 20 items (numbered 1-20), each unique 
- revisionPriorities must have exactly 3 items
- resources must have 5 real, clickable URLs relevant to the topic
- difficulty must cycle varied (not all the same)
- Return ONLY the JSON, nothing else.`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
            })
        });

        if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);

        const data = await res.json();
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Strip markdown code fences if Gemini wraps them anyway
        text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

        const parsed = JSON.parse(text);

        // Attach metadata so state.js can display it
        parsed.metadata = { topic, goal, weaknessFocus: weaknesses, createdAt: new Date().toISOString() };
        return parsed;
    },

    // ──────────────────────────────────────────────────────────────
    //  Rich fallback mock (used when no API key / Gemini fails)
    // ──────────────────────────────────────────────────────────────
    _mockPlan(topic, goal, weaknesses) {
        return new Promise(resolve => {
            setTimeout(() => {
                const difficulties = ['Easy', 'Medium', 'Hard'];
                const questionTemplates = [
                    `What is the primary function and purpose of ${topic}?`,
                    `How would you explain the syntax or structure of ${topic} to a beginner?`,
                    `What are the most common real-world use-cases for ${topic}?`,
                    `How exactly does ${topic} help you achieve: "${goal}"?`,
                    `Describe the execution lifecycle or foundation of ${topic}.`,
                    `Why is "${weaknesses}" often a stumbling block for learners?`,
                    `What is the most effective way to debug or troubleshoot ${weaknesses}?`,
                    `What are the performance implications of poor ${topic} implementation?`,
                    `If your implementation of ${weaknesses} fails silently, where do you check first?`,
                    `How would you redesign a legacy system to incorporate ${topic} securely?`,
                    `Explain any known stability vulnerabilities related to ${weaknesses}.`,
                    `What are the community best practices and conventions for ${topic}?`,
                    `How is state or memory managed when using ${topic}?`,
                    `What happens under the hood when ${topic} is executed?`,
                    `Describe a scenario where you would explicitly AVOID using ${topic}.`,
                    `Write pseudocode to resolve a problem related to ${weaknesses}.`,
                    `How can you optimize ${topic} implementations for better efficiency?`,
                    `What prerequisites are absolutely required before learning ${topic}?`,
                    `How would you summarise the importance of ${topic} in a job interview?`,
                    `What is the most frequent anti-pattern developers make with ${weaknesses}?`
                ];

                const enc = encodeURIComponent;
                resolve({
                    metadata: { topic, goal, weaknessFocus: weaknesses, createdAt: new Date().toISOString() },
                    overview: `Your dedicated roadmap to learn ${topic}, formulated to bypass ${weaknesses} so you can ${goal}.`,
                    roadmap: [
                        { id:'day-1', dayLabel:'Phase 1: Establishing the Baseline', tasks:[
                            { id:'t1-1', title:`Read the introductory overview of ${topic}`, completed:false },
                            { id:'t1-2', title:`Set up your study environment for ${topic}`, completed:false },
                            { id:'t1-3', title:`Define ${weaknesses} in your own words`, completed:false }
                        ]},
                        { id:'day-2', dayLabel:`Phase 2: Connecting to "${goal}"`, tasks:[
                            { id:'t2-1', title:`Study a working demo of ${topic}`, completed:false },
                            { id:'t2-2', title:`Map how ${topic} helps achieve: ${goal}`, completed:false },
                            { id:'t2-3', title:`Note patterns related to ${weaknesses}`, completed:false }
                        ]},
                        { id:'day-3', dayLabel:'Phase 3: Active Application', tasks:[
                            { id:'t3-1', title:`Implement ${topic} from scratch without references`, completed:false },
                            { id:'t3-2', title:`Intentionally break and fix parts related to ${weaknesses}`, completed:false }
                        ]},
                        { id:'day-4', dayLabel:'Phase 4: Optimisation & Review', tasks:[
                            { id:'t4-1', title:`Research advanced edge-cases for ${topic}`, completed:false },
                            { id:'t4-2', title:`Refactor to industry best practices`, completed:false }
                        ]}
                    ],
                    practiceQuestions: questionTemplates.map((text, i) => ({
                        id: i + 1, text, difficulty: difficulties[i % 3]
                    })),
                    revisionPriorities: [
                        { topic: weaknesses, urgency:'Critical', reason:'Directly identified as your vulnerability — do not skip this.' },
                        { topic:`Ecosystem dependencies of ${topic}`, urgency:'High', reason:'Understanding what connects to this topic is as important as the topic itself.' },
                        { topic:`Pipeline execution for ${goal}`, urgency:'Moderate', reason:'Map out step-by-step how to achieve your outcome without gaps.' }
                    ],
                    resources: [
                        { title:`${topic} Official Docs`, url:`https://www.google.com/search?q=${enc(topic)}+official+documentation`, type:'Documentation', description:`The canonical reference for ${topic}.` },
                        { title:`${weaknesses} Tutorial`, url:`https://www.youtube.com/results?search_query=${enc(weaknesses)}+tutorial`, type:'Video', description:'A targeted walkthrough for your weak areas.' },
                        { title:`Best practices: ${goal}`, url:`https://dev.to/search?q=${enc(goal)}`, type:'Article', description:'Community articles on achieving your specific goal.' },
                        { title:`${topic} on GitHub`, url:`https://github.com/search?q=${enc(topic)}`, type:'Repository', description:'Real-world code examples to learn from.' },
                        { title:`Interactive ${topic} Course`, url:`https://www.coursera.org/search?query=${enc(topic)}`, type:'Course', description:'Structured video course with exercises.' }
                    ]
                });
            }, 1200);
        });
    }
};

window.AIService = AIService;
