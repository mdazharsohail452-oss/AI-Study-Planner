// Application Entry Point - Handling Intake Form & Dashboard UI Logic

document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized. Phase 4 & 5 loaded.');

    const intakeForm = document.getElementById('intake-form');
    const intakeSection = document.getElementById('intake-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const dashboardGrid = document.getElementById('dashboard-grid-container');
    const generateBtn = document.getElementById('generate-btn');
    const planLoading = document.getElementById('plan-loading');
    const resetBtn = document.getElementById('reset-btn');

    // DOM Elements for Dashboard rendering
    const planOverview = document.getElementById('plan-overview');
    const roadmapList = document.getElementById('roadmap-list');
    const prioritiesList = document.getElementById('priorities-list');
    const questionsList = document.getElementById('questions-list');
    const resourcesList = document.getElementById('resources-list');
    const progressPath = document.getElementById('progress-path');
    const progressText = document.getElementById('progress-text');

    // Bootstrapping
    const existingPlan = AppState.loadPlan();
    if (existingPlan) {
        console.log('Restoring existing plan from state.');
        renderPlan(existingPlan);
        showDashboard();
    }

    if (intakeForm) {
        intakeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const topic = document.getElementById('topic').value.trim();
            const goal = document.getElementById('goal').value.trim();
            const weaknesses = document.getElementById('weaknesses').value.trim();

            if (!topic || !goal) return;

            // Show Loading State
            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
            showLoading();

            try {
                // Generate and save to state
                const plan = await AIService.generateStudyPlan(topic, goal, weaknesses);
                AppState.savePlan(plan);
                
                // Render and transition UI
                renderPlan(plan);
                showDashboard();
            } catch (error) {
                console.error('Error generating plan:', error);
                alert('Plan generation failed.');
                showIntake();
            } finally {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate Path';
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            AppState.clearAll();
            intakeForm.reset();
            showIntake();
        });
    }

    // Handlers
    function handleTaskToggle(dayId, taskId, isCompleted, liElement) {
        AppState.updateTaskStatus(dayId, taskId, isCompleted);
        updateProgress();
        if(isCompleted) {
            liElement.classList.add('completed');
        } else {
            liElement.classList.remove('completed');
        }
    }

    // View Transitions
    function showLoading() {
        intakeSection.style.display = 'none';
        dashboardSection.style.display = 'flex';
        dashboardGrid.style.display = 'none';
        planLoading.style.display = 'block';
    }

    function showDashboard() {
        intakeSection.style.display = 'none';
        dashboardSection.style.display = 'flex';
        dashboardGrid.style.display = 'grid';
        planLoading.style.display = 'none';
    }

    function showIntake() {
        dashboardSection.style.display = 'none';
        intakeSection.style.display = 'block';
    }

    // Data Binding
    function updateProgress() {
        const percent = AppState.calculateProgress();
        progressText.textContent = `${percent}%`;
        progressPath.setAttribute('stroke-dasharray', `${percent}, 100`);
    }

    function renderPlan(plan) {
        planOverview.textContent = plan.overview;
        
        // Render Timeline
        roadmapList.innerHTML = '';
        plan.roadmap.forEach(day => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            
            const title = document.createElement('h4');
            title.textContent = day.dayLabel;
            item.appendChild(title);

            const ul = document.createElement('ul');
            ul.className = 'task-list';

            day.tasks.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-item ${task.completed ? 'completed' : ''}`;
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = task.completed;
                checkbox.addEventListener('change', (e) => {
                    handleTaskToggle(day.id, task.id, e.target.checked, li);
                });

                const labelSpan = document.createElement('span');
                labelSpan.textContent = task.title;

                li.appendChild(checkbox);
                li.appendChild(labelSpan);
                ul.appendChild(li);
            });

            item.appendChild(ul);
            roadmapList.appendChild(item);
        });

        // Render Priority List Widget
        prioritiesList.innerHTML = plan.revisionPriorities
            .map(p => `<li>${p}</li>`).join('');

        // Render Practice Qs Widget
        questionsList.innerHTML = plan.practiceQuestions
            .map(q => `<li>${q}</li>`).join('');

        // Render Resources Widget
        resourcesList.innerHTML = plan.resources
            .map(r => `<li><a href="${r.url}" target="_blank">${r.title}</a> <br><small style="color: var(--text-secondary)">Format: ${r.type}</small></li>`).join('');

        // Recalculate Tracking Ring
        updateProgress();
    }
});
