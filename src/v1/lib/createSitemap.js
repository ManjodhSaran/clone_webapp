import path from 'path';
import fs from 'fs/promises';

export const createSitemap = async ({ outputPath, processedUrls, sitemap }) => {
  let sitemapHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learning Resource Hub</title>
    <style>
      :root {
        /* Main theme colors - student-friendly palette */
        --primary-color: #2563eb;
        --primary-light: #dbeafe;
        --secondary-color: #7c3aed;
        --secondary-light: #ede9fe;
        --accent-color: #0ea5e9;
        
        /* Text colors */
        --text-primary: #1e293b;
        --text-secondary: #475569;
        --text-light: #94a3b8;
        
        /* Background colors */
        --bg-primary: #ffffff;
        --bg-secondary: #f8fafc;
        --bg-tertiary: #f1f5f9;
        
        /* Status colors */
        --status-good: #10b981;
        --status-unattempted: #f59e0b;
        --status-in-progress: #6366f1;
        
        /* UI elements */
        --border-color: #e2e8f0;
        --shadow-sm: 0 1px 3px rgba(0,0,0,0.05);
        --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
        --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
        
        /* Spacing */
        --spacing-xs: 0.25rem;
        --spacing-sm: 0.5rem;
        --spacing-md: 1rem;
        --spacing-lg: 1.5rem;
        --spacing-xl: 2rem;
        
        /* Border radius */
        --radius-sm: 0.375rem;
        --radius-md: 0.5rem;
        --radius-lg: 0.75rem;
        --radius-full: 9999px;
      }
      
      /* Dark mode theme */
      .dark-theme {
        --primary-color: #3b82f6;
        --primary-light: #1e3a8a;
        --secondary-color: #8b5cf6;
        --secondary-light: #4c1d95;
        --accent-color: #0ea5e9;
        
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --text-light: #64748b;
        
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-tertiary: #334155;
        
        --border-color: #334155;
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      body {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        margin: 0;
        padding: 0;
        background-color: var(--bg-primary);
        color: var(--text-primary);
        line-height: 1.6;
        transition: background-color 0.3s, color 0.3s;
      }
      
      .container {
        max-width: 1280px;
        margin: 0 auto;
        padding: var(--spacing-xl);
      }
      
      header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-xl);
        padding-bottom: var(--spacing-lg);
        border-bottom: 1px solid var(--border-color);
        flex-wrap: wrap;
        gap: var(--spacing-md);
      }
      
      .header-left {
        flex: 1;
      }
      
      .header-right {
        display: flex;
        gap: var(--spacing-md);
        align-items: center;
      }
      
      h1 {
        color: var(--primary-color);
        font-size: 2.25rem;
        margin-bottom: var(--spacing-xs);
        font-weight: 700;
      }
      
      .subtitle {
        color: var(--text-secondary);
        font-size: 1.1rem;
      }
      
      /* Controls and Filters */
      .controls {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-xl);
        gap: var(--spacing-md);
      }
      
      .search-container {
        position: relative;
        flex: 1;
        min-width: 250px;
        max-width: 500px;
      }
      
      .search-icon {
        position: absolute;
        left: var(--spacing-md);
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-light);
      }
      
      .search-box {
        width: 100%;
        padding: var(--spacing-md) var(--spacing-md) var(--spacing-md) 2.5rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-color);
        font-size: 1rem;
        background-color: var(--bg-secondary);
        color: var(--text-primary);
        transition: border-color 0.3s, box-shadow 0.3s;
      }
      
      .search-box:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px var(--primary-light);
      }
      
      .filter-options {
        display: flex;
        gap: var(--spacing-md);
        align-items: center;
        flex-wrap: wrap;
      }
      
      .theme-toggle, .view-toggle, .filter-button {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: var(--spacing-sm) var(--spacing-md);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        transition: background-color 0.2s;
        color: var(--text-primary);
      }
      
      .theme-toggle:hover, .view-toggle:hover, .filter-button:hover {
        background-color: var(--primary-light);
      }
      
      .view-options {
        display: flex;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      
      .view-option {
        padding: var(--spacing-sm) var(--spacing-md);
        background-color: var(--bg-secondary);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        color: var(--text-primary);
      }
      
      .view-option.active {
        background-color: var(--primary-color);
        color: white;
      }
      
      .view-option:not(:last-child) {
        border-right: 1px solid var(--border-color);
      }
      
      /* Summary Section */
      .summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--spacing-xl);
        padding: var(--spacing-md) var(--spacing-lg);
        background-color: var(--bg-secondary);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
      }
      
      .summary-stat {
        text-align: center;
      }
      
      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary-color);
      }
      
      .stat-label {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }
      
      /* Topic Cards - Grid View */
      .topics-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: var(--spacing-xl);
        transition: all 0.3s ease;
      }
      
      /* Topic Cards - List View */
      .topics-container.list-view {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-lg);
      }
      
      .topic-card {
        background-color: var(--bg-secondary);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
        display: flex;
        flex-direction: column;
      }
      
      .topic-card:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-lg);
      }
      
      /* Adjust card layout for list view */
      .list-view .topic-card {
        flex-direction: row;
        min-height: 0;
      }
      
      .list-view .topic-header {
        width: 240px;
        min-width: 240px;
      }
      
      .list-view .topic-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      .topic-header {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        padding: var(--spacing-lg);
        position: relative;
      }
      
      .topic-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
      
      .topic-description {
        margin-top: var(--spacing-sm);
        font-size: 0.875rem;
        opacity: 0.9;
      }
      
      .completion-badge {
        position: absolute;
        top: var(--spacing-md);
        right: var(--spacing-md);
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: var(--radius-full);
        padding: var(--spacing-xs) var(--spacing-md);
        font-size: 0.75rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
      }
      
      .completion-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 4px;
        background-color: rgba(255, 255, 255, 0.5);
        transition: width 0.3s ease;
      }
      
      .subtopic {
        padding: var(--spacing-md) var(--spacing-lg);
        border-bottom: 1px solid var(--border-color);
      }
      
      .subtopic:last-child {
        border-bottom: none;
      }
      
      .subtopic-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
      }
      
      .subtopic-title {
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
        font-size: 1rem;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }
      
      .subtopic-icon {
        color: var(--accent-color);
      }
      
      .chapters {
        list-style-type: none;
        padding: 0;
        margin: var(--spacing-sm) 0 0 0;
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }
      
      .subtopic.open .chapters {
        max-height: 1000px; /* Arbitrary large value */
      }
      
      .chapter-item {
        padding: var(--spacing-sm) var(--spacing-md);
        margin: var(--spacing-sm) 0;
        background-color: var(--bg-tertiary);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: var(--shadow-sm);
        transition: transform 0.2s, background-color 0.2s;
      }
      
      .chapter-item:hover {
        transform: translateX(5px);
        background-color: var(--primary-light);
      }
      
      .chapter-link {
        color: var(--text-primary);
        text-decoration: none;
        flex-grow: 1;
        padding: var(--spacing-xs) 0;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
      }
      
      .status-indicator {
        height: 0.75rem;
        width: 0.75rem;
        border-radius: 50%;
        flex-shrink: 0;
      }
      
      .status-GOOD {
        background-color: var(--status-good);
      }
      
      .status-UNATTEMPTED {
        background-color: var(--status-unattempted);
      }
      
      .status-IN_PROGRESS {
        background-color: var(--status-in-progress);
      }
      
      .status-label {
        font-size: 0.75rem;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-full);
        font-weight: 500;
      }
      
      .label-GOOD {
        background-color: rgba(16, 185, 129, 0.2);
        color: var(--status-good);
      }
      
      .label-UNATTEMPTED {
        background-color: rgba(245, 158, 11, 0.2);
        color: var(--status-unattempted);
      }
      
      .label-IN_PROGRESS {
        background-color: rgba(99, 102, 241, 0.2);
        color: var(--status-in-progress);
      }
      
      .no-results {
        text-align: center;
        color: var(--text-secondary);
        padding: var(--spacing-xl);
        background-color: var(--bg-secondary);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
      }
      
      .footer {
        margin-top: var(--spacing-xl);
        padding-top: var(--spacing-lg);
        text-align: center;
        color: var(--text-light);
        border-top: 1px solid var(--border-color);
      }
      
      /* Responsive Design */
      @media (max-width: 768px) {
        .container {
          padding: var(--spacing-md);
        }
        
        header {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .header-right {
          width: 100%;
          justify-content: space-between;
        }
        
        .controls {
          flex-direction: column;
          align-items: stretch;
        }
        
        .search-container {
          max-width: 100%;
        }
        
        .filter-options {
          justify-content: space-between;
        }
        
        .summary {
          flex-direction: column;
          gap: var(--spacing-md);
        }
        
        .list-view .topic-card {
          flex-direction: column;
        }
        
        .list-view .topic-header {
          width: 100%;
        }
      }
      
      /* Utility Classes */
      .flex {
        display: flex;
      }
      
      .flex-col {
        flex-direction: column;
      }
      
      .items-center {
        align-items: center;
      }
      
      .justify-between {
        justify-content: space-between;
      }
      
      .gap-sm {
        gap: var(--spacing-sm);
      }
      
      .gap-md {
        gap: var(--spacing-md);
      }
      
      .hidden {
        display: none;
      }
      
      /* Animations */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .fade-in {
        animation: fadeIn 0.3s ease-in;
      }
      
      /* Loading indicator */
      .loading {
        text-align: center;
        padding: var(--spacing-xl);
      }
      
      .loading-spinner {
        display: inline-block;
        width: 50px;
        height: 50px;
        border: 3px solid rgba(0, 0, 0, 0.1);
        border-radius: 50%;
        border-top-color: var(--primary-color);
        animation: spin 1s ease-in-out infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div class="header-left">
          <h1>Learning Resource Hub</h1>
          <p class="subtitle">Your personalized study material archive</p>
        </div>
        <div class="header-right">
          <button id="themeToggle" class="theme-toggle" aria-label="Toggle dark mode">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
            <span id="themeLabel">Dark Mode</span>
          </button>
        </div>
      </header>
      
      <div class="controls">
        <div class="search-container">
          <div class="search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input type="text" id="search" class="search-box" placeholder="Search topics, chapters, or keywords...">
        </div>
        
        <div class="filter-options">
          <div class="view-options">
            <button id="gridViewBtn" class="view-option active" aria-label="Grid view">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button id="listViewBtn" class="view-option" aria-label="List view">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <button id="filterButton" class="filter-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Filter</span>
          </button>
        </div>
      </div>
      
      <div class="summary">
        <div class="summary-stat">
          <div class="stat-value">${processedUrls ? processedUrls.size : 0}</div>
          <div class="stat-label">Total Pages</div>
        </div>
        
        <div class="summary-stat">
          <div class="stat-value">${sitemap ? sitemap.length : 0}</div>
          <div class="stat-label">Topics</div>
        </div>
        
        <div class="summary-stat">
          <div class="stat-value" id="completionRate">0%</div>
          <div class="stat-label">Overall Completion</div>
        </div>
      </div>
      
      <div class="topics-container" id="topicsContainer">
        ${generateTopicCards(sitemap)}
      </div>
      
      <footer class="footer">
        <p>Last updated: ${new Date().toLocaleDateString()}</p>
      </footer>
    </div>
    
    <script>
      // Calculate overall completion rate
      function calculateCompletionRate() {
        const topics = ${JSON.stringify(sitemap || [])};
        if (topics.length === 0) return 0;
        
        let totalCompletion = 0;
        topics.forEach(topic => {
          totalCompletion += topic.completion || 0;
        });
        
        return Math.round(totalCompletion / topics.length);
      }
      
      document.getElementById('completionRate').textContent = calculateCompletionRate() + '%';
      
      // Toggle between grid and list view
      document.getElementById('gridViewBtn').addEventListener('click', function() {
        document.getElementById('topicsContainer').classList.remove('list-view');
        this.classList.add('active');
        document.getElementById('listViewBtn').classList.remove('active');
        localStorage.setItem('preferredView', 'grid');
      });
      
      document.getElementById('listViewBtn').addEventListener('click', function() {
        document.getElementById('topicsContainer').classList.add('list-view');
        this.classList.add('active');
        document.getElementById('gridViewBtn').classList.remove('active');
        localStorage.setItem('preferredView', 'list');
      });
      
      // Load user's preferred view
      const preferredView = localStorage.getItem('preferredView');
      if (preferredView === 'list') {
        document.getElementById('listViewBtn').click();
      }
      
      // Toggle subtopics expansion
      document.querySelectorAll('.subtopic-header').forEach(header => {
        header.addEventListener('click', function() {
          const subtopic = this.closest('.subtopic');
          subtopic.classList.toggle('open');
          
          // Update the chevron icon
          const chevron = this.querySelector('.chevron-icon');
          if (subtopic.classList.contains('open')) {
            chevron.innerHTML = '<path d="M18 15l-6-6-6 6"/>';
          } else {
            chevron.innerHTML = '<path d="M6 9l6 6 6-6"/>';
          }
        });
      });
      
      // Search functionality
      document.getElementById('search').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const topicCards = document.querySelectorAll('.topic-card');
        let hasResults = false;
        
        topicCards.forEach(card => {
          const title = card.querySelector('.topic-header h2').textContent.toLowerCase();
          const chapters = Array.from(card.querySelectorAll('.chapter-link')).map(el => el.textContent.toLowerCase());
          const subtopics = Array.from(card.querySelectorAll('.subtopic-title')).map(el => el.textContent.toLowerCase());
          
          const matchesTerm = title.includes(searchTerm) || 
                              chapters.some(ch => ch.includes(searchTerm)) || 
                              subtopics.some(st => st.includes(searchTerm));
          
          // If we match the search term, show this card and all its subtopics
          if (matchesTerm) {
            card.style.display = '';
            hasResults = true;
            
            // If we're specifically matching a chapter or subtopic, open those sections
            if (searchTerm.length > 0) {
              const subtopicElements = card.querySelectorAll('.subtopic');
              subtopicElements.forEach(subtopic => {
                const subtopicTitle = subtopic.querySelector('.subtopic-title').textContent.toLowerCase();
                const subtopicChapters = Array.from(subtopic.querySelectorAll('.chapter-link')).map(el => el.textContent.toLowerCase());
                
                if (subtopicTitle.includes(searchTerm) || subtopicChapters.some(ch => ch.includes(searchTerm))) {
                  subtopic.classList.add('open');
                }
              });
            }
          } else {
            card.style.display = 'none';
          }
        });
        
        const noResultsEl = document.getElementById('noResults');
        if (!hasResults && !noResultsEl && searchTerm.length > 0) {
          const noResults = document.createElement('div');
          noResults.id = 'noResults';
          noResults.className = 'no-results fade-in';
          noResults.textContent = 'No matching topics or chapters found';
          document.getElementById('topicsContainer').appendChild(noResults);
        } else if ((hasResults || searchTerm.length === 0) && noResultsEl) {
          noResultsEl.remove();
        }
      });
      
      // Dark mode toggle
      document.getElementById('themeToggle').addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        const isDarkMode = document.body.classList.contains('dark-theme');
        localStorage.setItem('darkMode', isDarkMode);
        
        // Update button text
        document.getElementById('themeLabel').textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
      });
      
      // Check for saved theme preference
      if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-theme');
        document.getElementById('themeLabel').textContent = 'Light Mode';
      }
      
      // Initialize progress bars
      document.querySelectorAll('.completion-progress').forEach(progress => {
        const percent = progress.getAttribute('data-percent');
        progress.style.width = percent + '%';
      });
    </script>
  </body>
  </html>
  `;

  await fs.writeFile(path.join(outputPath, 'index.html'), sitemapHtml);

  return path.join(outputPath, 'index.html');
}

function generateTopicCards(sitemap) {
  if (!sitemap || !Array.isArray(sitemap) || sitemap.length === 0) {
    return '<div class="no-results">No topics found in sitemap</div>';
  }

  return sitemap.map(topic => {
    return `
      <div class="topic-card">
        <div class="topic-header">
          <h2>${escapeHtml(topic.title)}</h2>
          <div class="topic-description">${topic.description ? escapeHtml(topic.description) : 'Study materials and resources'}</div>
          <span class="completion-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            ${topic.completion}% complete
          </span>
          <div class="completion-progress" data-percent="${topic.completion}" style="width: ${topic.completion}%"></div>
        </div>
        
        <div class="topic-content">
          ${topic.subtopics.map(subtopic => `
            <div class="subtopic">
              <div class="subtopic-header">
                <h3 class="subtopic-title">
                  <svg class="subtopic-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  ${escapeHtml(subtopic.title)}
                </h3>
                <svg class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg></div>
              <ul class="chapters">
                ${subtopic.chapters.map(chapter => `
                  <li class="chapter-item">
                    <a href="${chapter.local_url}" class="chapter-link">
                      <span class="status-indicator status-${chapter.status}"></span>
                      ${escapeHtml(chapter.title)}
                    </a>
                    <span class="status-label label-${chapter.status}">${chapter.status}</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}