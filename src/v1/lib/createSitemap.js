import path from 'path';
import fs from 'fs/promises';

export const createSitemap = async ({ outputPath, processedUrls, sitemap }) => {
  let sitemapHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Learning Resource Sitemap</title>
    <style>
      :root {
        --primary-color: #4f46e5;
        --primary-light: #eef2ff;
        --text-color: #1f2937;
        --bg-color: #ffffff;
        --section-bg: #f9fafb;
        --border-color: #e5e7eb;
        --status-good: #22c55e;
        --status-unattempted: #f59e0b;
      }
      
      body {
        font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        margin: 0;
        padding: 0;
        background-color: var(--bg-color);
        color: var(--text-color);
        line-height: 1.6;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }
      
      header {
        text-align: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--border-color);
      }
      
      h1 {
        color: var(--primary-color);
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
      }
      
      .subtitle {
        color: #6b7280;
        font-size: 1.2rem;
      }
      
      .topics-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 2rem;
      }
      
      .topic-card {
        background-color: var(--section-bg);
        border-radius: 0.75rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .topic-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
      }
      
      .topic-header {
        background-color: var(--primary-color);
        color: white;
        padding: 1rem 1.5rem;
        position: relative;
      }
      
      .topic-header h2 {
        margin: 0;
        font-size: 1.3rem;
      }
      
      .completion-badge {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 9999px;
        padding: 0.25rem 0.75rem;
        font-size: 0.85rem;
        font-weight: 500;
      }
      
      .subtopic {
        padding: 0.5rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
      }
      
      .subtopic-title {
        font-weight: 600;
        color: #4b5563;
        margin: 0.5rem 0;
        font-size: 1rem;
      }
      
      .chapters {
        list-style-type: none;
        padding: 0;
        margin: 0.5rem 0 1rem 0;
      }
      
      .chapter-item {
        padding: 0.5rem 0.75rem;
        margin: 0.5rem 0;
        background-color: white;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }
      
      .chapter-link {
        color: var(--primary-color);
        text-decoration: none;
        flex-grow: 1;
        padding: 0.25rem 0;
      }
      
      .chapter-link:hover {
        text-decoration: underline;
      }
      
      .status-indicator {
        height: 0.75rem;
        width: 0.75rem;
        border-radius: 50%;
        margin-right: 0.75rem;
      }
      
      .status-GOOD {
        background-color: var(--status-good);
      }
      
      .status-UNATTEMPTED {
        background-color: var(--status-unattempted);
      }
      
      .status-label {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 9999px;
        font-weight: 500;
      }
      
      .label-GOOD {
        background-color: #dcfce7;
        color: #166534;
      }
      
      .label-UNATTEMPTED {
        background-color: #fef3c7;
        color: #92400e;
      }
      
      .search-box {
        width: 100%;
        max-width: 500px;
        margin: 0 auto 2rem auto;
        display: block;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid var(--border-color);
        font-size: 1rem;
      }
      
      .no-results {
        text-align: center;
        color: #6b7280;
        padding: 2rem;
      }
      
      .summary {
        text-align: center;
        margin-bottom: 2rem;
        color: #6b7280;
      }
      
      @media (max-width: 768px) {
        .topics-container {
          grid-template-columns: 1fr;
        }
        
        .container {
          padding: 1rem;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <h1>Learning Resource Sitemap</h1>
        <p class="subtitle">Interactive sitemap of educational materials</p>
      </header>
      
      <input type="text" id="search" class="search-box" placeholder="Search topics or chapters...">
      
      <div class="summary">
        <p>Total pages in archive: ${processedUrls ? processedUrls.size : 0}</p>
      </div>
      
      <div class="topics-container" id="topicsContainer">
        ${generateTopicCards(sitemap)}
      </div>
    </div>
    
    <script>
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
          
          if (matchesTerm) {
            card.style.display = '';
            hasResults = true;
          } else {
            card.style.display = 'none';
          }
        });
        
        const noResultsEl = document.getElementById('noResults');
        if (!hasResults && !noResultsEl && searchTerm.length > 0) {
          const noResults = document.createElement('div');
          noResults.id = 'noResults';
          noResults.className = 'no-results';
          noResults.textContent = 'No matching topics or chapters found';
          document.getElementById('topicsContainer').appendChild(noResults);
        } else if (hasResults && noResultsEl) {
          noResultsEl.remove();
        }
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
          <span class="completion-badge">${topic.completion}% complete</span>
        </div>
        
        ${topic.subtopics.map(subtopic => `
          <div class="subtopic">
            <h3 class="subtopic-title">${escapeHtml(subtopic.title)}</h3>
            <ul class="chapters">
              ${subtopic.chapters.map(chapter => `
                <li class="chapter-item">
                  <span class="status-indicator status-${chapter.status}"></span>
                  <a href="${chapter.local_url}" class="chapter-link">${escapeHtml(chapter.title)}</a>
                  <span class="status-label label-${chapter.status}">${chapter.status}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
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