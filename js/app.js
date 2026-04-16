// app.js — Full controller: login → intake → Gemini AI → IndexedDB → dashboard → result card + history

document.addEventListener('DOMContentLoaded', async () => {

    // ─── DOM refs ────────────────────────────────────────────────
    const loginSection     = document.getElementById('login-section');
    const intakeSection    = document.getElementById('intake-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const resultOverlay    = document.getElementById('result-overlay');
    const historyOverlay   = document.getElementById('history-overlay');

    const loginForm        = document.getElementById('login-form');
    const manualForm       = document.getElementById('intake-form-manual');
    const uploadForm       = document.getElementById('intake-form-upload');

    const tabManual        = document.getElementById('tab-manual');
    const tabUpload        = document.getElementById('tab-upload');

    const planLoading      = document.getElementById('plan-loading');
    const dashGrid         = document.getElementById('dashboard-grid-container');
    const loadingStatus    = document.getElementById('loading-status-text');

    const planOverview     = document.getElementById('plan-overview');
    const roadmapList      = document.getElementById('roadmap-list');
    const prioritiesList   = document.getElementById('priorities-list');
    const questionsList    = document.getElementById('questions-list');
    const resourcesList    = document.getElementById('resources-list');
    const progressPath     = document.getElementById('progress-path');
    const progressText     = document.getElementById('progress-text');

    const headerUserInfo   = document.getElementById('header-user-info');
    const headerName       = document.getElementById('header-student-name');
    const headerEmail      = document.getElementById('header-student-email');
    const avatarInitials   = document.getElementById('avatar-initials');
    const logoutBtn        = document.getElementById('logout-btn');

    const resetBtn         = document.getElementById('reset-btn');
    const viewResultBtn    = document.getElementById('view-result-btn');
    const viewHistoryBtn   = document.getElementById('view-history-btn');
    const resultCloseBtn   = document.getElementById('result-close-btn');
    const resultPrintBtn   = document.getElementById('result-print-btn');
    const historyCloseBtn  = document.getElementById('history-close-btn');
    const historyList      = document.getElementById('history-list');
    const fileTagsEl       = document.getElementById('file-tags');
    const fileInput        = document.getElementById('study-file');

    // ─── Initialise IndexedDB ────────────────────────────────────
    await DB.open();
    console.log('[App] IndexedDB ready.');

    // ─── Boot: check login ───────────────────────────────────────
    const student = Auth.getStudent();
    if (student) {
        showStudentHeader(student);
        const plan = await DB.getPlan(student.email);
        if (plan) { renderPlan(plan); showDashboard(); }
        else       { showIntake(); }
    } else {
        loginSection.style.display = 'block';
    }

    // ─── File tag preview on file select ────────────────────────
    if (fileInput && fileTagsEl) {
        fileInput.addEventListener('change', () => {
            fileTagsEl.innerHTML = '';
            Array.from(fileInput.files).forEach(f => {
                const tag = document.createElement('span');
                tag.className = 'file-tag';
                tag.innerHTML = `📄 ${f.name} <button type="button" class="file-tag-remove" title="Remove">&times;</button>`;
                // Note: actual removal from FileList is not possible via DOM — tag is cosmetic
                fileTagsEl.appendChild(tag);
            });
        });
    }

    // ─── Login ───────────────────────────────────────────────────
    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const name  = document.getElementById('student-name').value.trim();
        const email = document.getElementById('student-email').value.trim();
        const s     = Auth.login(name, email);
        await DB.saveStudent(s);
        showStudentHeader(s);
        loginSection.style.display = 'none';
        showIntake();
    });

    // ─── Logout ──────────────────────────────────────────────────
    logoutBtn.addEventListener('click', () => {
        Auth.logout();
        headerUserInfo.style.display  = 'none';
        dashboardSection.style.display = 'none';
        intakeSection.style.display    = 'none';
        loginSection.style.display     = 'block';
    });

    // ─── Tab switching ───────────────────────────────────────────
    tabManual.addEventListener('click', () => {
        tabManual.classList.add('active'); tabUpload.classList.remove('active');
        manualForm.style.display = 'flex'; uploadForm.style.display  = 'none';
    });
    tabUpload.addEventListener('click', () => {
        tabUpload.classList.add('active'); tabManual.classList.remove('active');
        uploadForm.style.display = 'flex'; manualForm.style.display  = 'none';
    });

    // ─── Manual form ─────────────────────────────────────────────
    manualForm.addEventListener('submit', async e => {
        e.preventDefault();
        const topic      = document.getElementById('topic').value.trim();
        const goal       = document.getElementById('goal').value.trim();
        const weaknesses = document.getElementById('weaknesses').value.trim();
        await runGeneration(topic, goal, weaknesses,
            document.getElementById('generate-manual-btn'),
            '🤖 Asking Gemini AI to build your plan...');
    });

    // ─── Upload form (with manual weakness override) ─────────────
    uploadForm.addEventListener('submit', async e => {
        e.preventDefault();
        const files = fileInput.files;
        if (!files.length) return;

        const manualWeaknesses = document.getElementById('upload-weaknesses').value.trim();
        const btn = document.getElementById('generate-upload-btn');
        btn.disabled = true; btn.textContent = 'Reading Files...';
        showLoading('📂 Extracting content from your files...');

        // Read and extract raw text from txt files
        let extractedText = '', names = [];
        for (const f of files) {
            names.push(f.name.replace(/\.[^.]+$/, ''));
            if (f.type.match('text.*') || f.name.endsWith('.txt')) {
                const rawText = await f.text();
                extractedText += rawText.substring(0, 300) + '\n';
            }
        }
        await new Promise(r => setTimeout(r, 800));

        const joined  = names.join(', ');
        const topic   = extractedText.trim()
            ? `Concepts from ${joined}: "${extractedText.trim().substring(0, 80)}..."`
            : `Key topics from: ${joined}`;
        const goal    = `Master the core concepts established in ${joined}`;

        // Use manually entered weakness if given, else auto-detect from file
        const weaknesses = manualWeaknesses
            ? manualWeaknesses
            : extractedText.trim()
                ? `Complex ideas in: "${extractedText.trim().substring(0, 40)}..."`
                : `Difficult sections within ${joined}`;

        await runGeneration(topic, goal, weaknesses, btn, '🤖 Gemini AI is analysing your files...');
    });

    // ─── Shared generation pipeline (saves to IndexedDB) ─────────
    async function runGeneration(topic, goal, weaknesses, btn, statusMsg) {
        const originalText = btn.textContent;
        btn.disabled = true;
        showLoading(statusMsg);
        try {
            const plan = await AIService.generateStudyPlan(topic, goal, weaknesses);

            // Save current active plan to IndexedDB (Plans store)
            const s = Auth.getStudent();
            await DB.savePlan(s.email, plan);

            // Append to history store so we keep every plan ever generated
            await DB.addToHistory(s.email, plan);

            // Also keep localStorage as a fast cache (AppState)
            AppState.savePlan(plan);

            renderPlan(plan);
            showDashboard();
        } catch (err) {
            console.error(err);
            alert('Generation failed. Please try again.');
            showIntake();
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    // ─── Change Path ─────────────────────────────────────────────
    resetBtn.addEventListener('click', async () => {
        const s = Auth.getStudent();
        const plan = s ? await DB.getPlan(s.email) : AppState.loadPlan();
        if (plan?.metadata) {
            document.getElementById('topic').value      = plan.metadata.topic || '';
            document.getElementById('goal').value       = plan.metadata.goal  || '';
            document.getElementById('weaknesses').value = plan.metadata.weaknessFocus || '';
        }
        if (s) await DB.deletePlan(s.email);
        AppState.clearAll();
        showIntake();
    });

    // ─── Result Card ─────────────────────────────────────────────
    viewResultBtn.addEventListener('click', async () => {
        const s   = Auth.getStudent();
        const plan = s ? await DB.getPlan(s.email) : AppState.loadPlan();
        if (!s || !plan) return;

        const percent   = await DB.calculateProgress(s.email);
        const totalTasks = plan.roadmap.reduce((a, d) => a + d.tasks.length, 0);
        const doneTasks  = plan.roadmap.reduce((a, d) => a + d.tasks.filter(t => t.completed).length, 0);

        let grade, gradeLabel, gradeColor;
        if      (percent >= 90) { grade='A+'; gradeLabel='Outstanding!';  gradeColor='#10b981'; }
        else if (percent >= 75) { grade='A';  gradeLabel='Excellent!';    gradeColor='#0ea5e9'; }
        else if (percent >= 60) { grade='B';  gradeLabel='Good Progress'; gradeColor='#14b8a6'; }
        else if (percent >= 40) { grade='C';  gradeLabel='Keep Going!';   gradeColor='#f59e0b'; }
        else                    { grade='D';  gradeLabel='Just Starting'; gradeColor='#f43f5e'; }

        const initials = s.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        document.getElementById('result-avatar').textContent        = initials;
        document.getElementById('result-name').textContent          = s.name;
        document.getElementById('result-email').textContent         = s.email;
        document.getElementById('result-date').textContent          = `Generated: ${new Date(plan.metadata.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}`;
        document.getElementById('result-topic').textContent         = plan.metadata.topic.substring(0, 22) + (plan.metadata.topic.length > 22 ? '…' : '');
        document.getElementById('result-progress-val').textContent  = `${percent}%`;
        document.getElementById('result-tasks-done').textContent    = `${doneTasks}/${totalTasks}`;
        document.getElementById('result-questions').textContent     = `${plan.practiceQuestions.length}`;
        document.getElementById('result-goal').textContent          = plan.metadata.goal;
        document.getElementById('result-weakness').textContent      = plan.metadata.weaknessFocus;
        document.getElementById('result-grade-letter').textContent  = grade;
        document.getElementById('result-grade-label').textContent   = gradeLabel;
        document.getElementById('result-grade-circle').style.borderColor = gradeColor;
        document.getElementById('result-grade-circle').style.color       = gradeColor;

        resultOverlay.style.display = 'flex';
    });

    resultCloseBtn.addEventListener('click', () => { resultOverlay.style.display = 'none'; });
    resultOverlay.addEventListener('click', e => { if (e.target === resultOverlay) resultOverlay.style.display = 'none'; });
    resultPrintBtn.addEventListener('click', () => window.print());

    // ─── History Panel ────────────────────────────────────────────
    viewHistoryBtn.addEventListener('click', async () => {
        const s = Auth.getStudent();
        if (!s) return;
        const records = await DB.getHistory(s.email);

        historyList.innerHTML = records.length === 0
            ? '<li style="color:var(--text-secondary); text-align:center; padding:20px;">No history yet — generate your first plan!</li>'
            : records.map((r, i) => `
                <li class="history-item">
                    <div class="history-meta">
                        <span class="history-index">#${records.length - i}</span>
                        <span class="history-date">${new Date(r.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>
                    </div>
                    <div class="history-topic"><strong>${r.topic}</strong></div>
                    <div class="history-detail">
                        <span>🎯 ${r.goal}</span>
                        <span>⚠️ ${r.weaknesses}</span>
                    </div>
                </li>
            `).join('');

        historyOverlay.style.display = 'flex';
    });

    historyCloseBtn.addEventListener('click', () => { historyOverlay.style.display = 'none'; });
    historyOverlay.addEventListener('click', e => { if (e.target === historyOverlay) historyOverlay.style.display = 'none'; });

    // ─── Helpers ─────────────────────────────────────────────────
    function showLoading(msg = 'Curating your personalised path...') {
        loadingStatus.textContent     = msg;
        intakeSection.style.display   = 'none';
        dashboardSection.style.display = 'flex';
        dashGrid.style.display        = 'none';
        planLoading.style.display     = 'block';
    }

    function showDashboard() {
        intakeSection.style.display   = 'none';
        dashboardSection.style.display = 'flex';
        dashGrid.style.display        = 'grid';
        planLoading.style.display     = 'none';
    }

    function showIntake() {
        dashboardSection.style.display = 'none';
        intakeSection.style.display    = 'block';
    }

    function showStudentHeader(s) {
        const initials = s.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        avatarInitials.textContent   = initials;
        headerName.textContent       = s.name;
        headerEmail.textContent      = s.email;
        headerUserInfo.style.display = 'flex';
    }

    // ─── Progress ring ────────────────────────────────────────────
    async function updateProgress() {
        const s   = Auth.getStudent();
        const pct = s ? await DB.calculateProgress(s.email) : AppState.calculateProgress();
        progressText.textContent = `${pct}%`;
        progressPath.setAttribute('stroke-dasharray', `${pct}, 100`);
    }

    // ─── Render full plan ─────────────────────────────────────────
    function renderPlan(plan) {
        planOverview.textContent = plan.overview;

        // Roadmap
        roadmapList.innerHTML = '';
        plan.roadmap.forEach(day => {
            const wrap = document.createElement('div');
            wrap.className = 'timeline-item';
            const h4 = document.createElement('h4');
            h4.textContent = day.dayLabel;
            wrap.appendChild(h4);

            const ul = document.createElement('ul');
            ul.className = 'task-list';
            day.tasks.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-item ${task.completed ? 'completed' : ''}`;
                const cb = document.createElement('input');
                cb.type    = 'checkbox';
                cb.checked = task.completed;
                cb.addEventListener('change', async ev => {
                    const s = Auth.getStudent();
                    if (s) {
                        await DB.updateTask(s.email, day.id, task.id, ev.target.checked);
                    } else {
                        AppState.updateTaskStatus(day.id, task.id, ev.target.checked);
                    }
                    li.classList.toggle('completed', ev.target.checked);
                    await updateProgress();
                });
                const sp = document.createElement('span');
                sp.textContent = task.title;
                li.appendChild(cb); li.appendChild(sp);
                ul.appendChild(li);
            });
            wrap.appendChild(ul);
            roadmapList.appendChild(wrap);
        });

        // Revision Priorities
        prioritiesList.innerHTML = plan.revisionPriorities.map(p => {
            if (typeof p === 'string') return `<li>${p}</li>`;
            const cls = p.urgency === 'Critical' ? 'diff-hard' : p.urgency === 'High' ? 'diff-medium' : 'diff-easy';
            return `<li><strong>${p.topic}</strong> <span class="diff-badge ${cls}">${p.urgency}</span><p class="res-desc">${p.reason}</p></li>`;
        }).join('');

        // Practice Questions
        questionsList.innerHTML = plan.practiceQuestions.map((q, i) => {
            const text = typeof q === 'string' ? q : q.text;
            const diff = q.difficulty ? `<span class="diff-badge diff-${q.difficulty.toLowerCase()}">${q.difficulty}</span>` : '';
            return `<li><strong>${i + 1}.</strong> ${text} ${diff}</li>`;
        }).join('');

        // Resources
        resourcesList.innerHTML = plan.resources.map(r =>
            `<li>
                <a href="${r.url}" target="_blank" rel="noopener noreferrer">${r.title}</a>
                <span class="res-type">${r.type}</span>
                ${r.description ? `<p class="res-desc">${r.description}</p>` : ''}
            </li>`
        ).join('');

        updateProgress();
    }
});
