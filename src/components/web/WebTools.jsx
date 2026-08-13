import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Copy, Check, ExternalLink, Globe, Database, FileText, Download, Play } from 'lucide-react';

const GOOGLE_DRIVE_JS = `(async function() {
    // 1. Broadly search for any element containing a data-id
    const allElements = document.querySelectorAll('[data-id]');
    let extractedData = "";
    let count = 0;
    let processedIds = new Set();

    // 2. Loop through every found ID
    allElements.forEach(el => {
        const fileId = el.getAttribute('data-id');
        if (fileId && fileId.length > 15 && !processedIds.has(fileId)) {
            let fileName = "";
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel) {
                fileName = ariaLabel.split(',')[0];
            } else {
                const childAriaNode = el.querySelector('[aria-label]');
                if (childAriaNode) {
                    fileName = childAriaNode.getAttribute('aria-label').split(',')[0];
                }
            }
            if (!fileName || fileName.length < 2) {
                const textChunks = el.innerText.split('\\n').map(t => t.trim()).filter(t => t.length > 0);
                if (textChunks.length > 0) fileName = textChunks[0];
            }
            fileName = fileName.replace(/^File:\\s*/i, '').replace(/^ไฟล์:\\s*/i, '').trim();

            if (fileName && fileName.length > 0 && !fileName.includes('ชื่อ') && !fileName.toLowerCase().includes('name')) {
                const fileUrl = \`https://drive.google.com/file/d/\${fileId}/view?usp=sharing\`;
                extractedData += \`\${fileName}\\t|\\t\${fileUrl}\\n\`;
                processedIds.add(fileId);
                count++;
            }
        }
    });

    if (count === 0) {
        console.error("⚠️ Couldn't find any files.");
        return;
    }

    try {
        await navigator.clipboard.writeText(extractedData);
        console.log("📋 Data successfully copied to clipboard!");
    } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = extractedData;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
    }
    
    const newWindow = window.open();
    if (newWindow) {
        newWindow.document.write(\`<pre style="font-family: monospace; font-size: 14px; white-space: pre-wrap;">\${extractedData}</pre>\`);
        newWindow.document.title = \`Extracted \${count} Drive Links\`;
    }
})();`;

const FIREBASE_STORAGE_JS = `(async function() {
    const allRows = document.querySelectorAll('tr, [role="row"]');
    const fileRows = Array.from(allRows).filter(row => {
        return row.textContent.includes('.png') || row.textContent.includes('.jpg'); 
    });

    if (fileRows.length === 0) {
        console.error("⚠️ Couldn't find any rows with .png or .jpg files.");
        return;
    }

    console.log(\`🤖 Found \${fileRows.length} files. Starting automated extraction...\`);
    let extractedData = "";
    let count = 0;
    
    for (let i = 0; i < fileRows.length; i++) {
        const row = fileRows[i];
        const clickableElement = row.querySelector('td') || row; 
        clickableElement.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const link = document.querySelector('a[href*="firebasestorage.googleapis.com/v0/b/"]');
        if (link) {
            const fileName = link.textContent.trim();
            const fileUrl = link.href;
            if (!extractedData.includes(fileUrl)) {
                extractedData += \`\${fileName}\\t|\\t\${fileUrl}\\n\`;
                count++;
            }
        }
    }

    try {
        await navigator.clipboard.writeText(extractedData);
        console.log("📋 Data successfully copied to clipboard!");
    } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = extractedData;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
    }
    
    const newWindow = window.open();
    if (newWindow) {
        newWindow.document.write(\`<pre style="font-family: monospace; font-size: 14px; white-space: pre-wrap;">\${extractedData}</pre>\`);
        newWindow.document.title = \`Extracted \${count} Links\`;
    }
})();`;

export default function WebTools() {
  const [activeTab, setActiveTab] = useState('gdrive');
  const [copied, setCopied] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [extractedList, setExtractedList] = useState([]);

  const copySnippet = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parsePastedContent = () => {
    if (!pasteInput.trim()) return;
    const lines = pasteInput.split('\n');
    const results = [];

    if (activeTab === 'gdrive') {
      // Regexp for drive file IDs or URLs
      const driveRegex = /(?:id=|[a-zA-Z0-9_-]{25,})/g;
      const matches = pasteInput.match(driveRegex) || [];
      const unique = Array.from(new Set(matches));
      unique.forEach((id, idx) => {
        if (id.length > 20) {
          results.push({
            name: `Drive File ${idx + 1}`,
            url: `https://drive.google.com/file/d/${id}/view?usp=sharing`
          });
        }
      });
    } else {
      // Regexp for firebase storage URLs
      const fbRegex = /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^\s"'>]+/g;
      const matches = pasteInput.match(fbRegex) || [];
      const unique = Array.from(new Set(matches));
      unique.forEach((url, idx) => {
        const decoded = decodeURIComponent(url.split('/o/')[1]?.split('?')[0] || `file_${idx+1}`);
        results.push({
          name: decoded,
          url: url
        });
      });
    }

    setExtractedList(results);
  };

  const exportTSV = () => {
    if (extractedList.length === 0) return;
    const content = extractedList.map(item => `${item.name}\t|\t${item.url}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_${activeTab}_links.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div className="subtab-nav">
        <button
          className={`subtab-btn ${activeTab === 'gdrive' ? 'active' : ''}`}
          onClick={() => { setActiveTab('gdrive'); setExtractedList([]); }}
        >
          <Globe size={16} /> Google Drive Link Extractor
        </button>
        <button
          className={`subtab-btn ${activeTab === 'firebase' ? 'active' : ''}`}
          onClick={() => { setActiveTab('firebase'); setExtractedList([]); }}
        >
          <Database size={16} /> Firebase Storage Link Extractor
        </button>
      </div>

      {activeTab === 'gdrive' && (
        <div>
          <InfoHeader
            category="web"
            title="Google Drive Link Extractor"
            description="Automated browser JavaScript snippet to extract file titles and viewable links directly from Google Drive folder views."
            workInstruction={`1. Click '📋 Copy Google Drive JS Snippet to Clipboard'.\n2. Open your Google Drive folder in Google Chrome, Edge, or Firefox.\n3. Press F12 to open Developer Console, paste the script into the Console tab, and press Enter.\n4. Extracted titles and links will be automatically copied to clipboard and displayed in a new browser tab.`}
          />

          <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} style={{ color: '#34d399' }} /> Google Drive Browser JS Snippet
              </h3>
              <button
                className="btn btn-success"
                onClick={() => copySnippet(GOOGLE_DRIVE_JS)}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied to Clipboard!' : '📋 Copy Google Drive JS Snippet'}
              </button>
            </div>

            <textarea
              className="form-textarea"
              rows={12}
              value={GOOGLE_DRIVE_JS}
              readOnly
              style={{ background: '#090d16', color: '#a7f3d0' }}
            />
          </div>
        </div>
      )}

      {activeTab === 'firebase' && (
        <div>
          <InfoHeader
            category="web"
            title="Firebase Storage Link Extractor"
            description="Automated browser JavaScript snippet to extract file names and direct download URLs from Firebase Storage Console."
            workInstruction={`1. Click '📋 Copy Firebase Storage JS Snippet to Clipboard'.\n2. Open your Firebase Storage Console file list view in your web browser.\n3. Press F12 to open Developer Console, paste the script into the Console tab, and press Enter.\n4. File download links will be copied to your clipboard and opened in a preview window.`}
          />

          <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} style={{ color: '#60a5fa' }} /> Firebase Storage Browser JS Snippet
              </h3>
              <button
                className="btn btn-primary"
                onClick={() => copySnippet(FIREBASE_STORAGE_JS)}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied to Clipboard!' : '📋 Copy Firebase Storage JS Snippet'}
              </button>
            </div>

            <textarea
              className="form-textarea"
              rows={12}
              value={FIREBASE_STORAGE_JS}
              readOnly
              style={{ background: '#090d16', color: '#93c5fd' }}
            />
          </div>
        </div>
      )}

      {/* Online Link Parser / Simulator */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Play size={18} style={{ color: '#a78bfa' }} /> Online Page Source & Text Link Parser
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Paste raw HTML source code or text copied from {activeTab === 'gdrive' ? 'Google Drive' : 'Firebase Storage'} to extract links directly inside this web tool:
        </p>

        <textarea
          className="form-textarea"
          rows={5}
          placeholder={`Paste ${activeTab === 'gdrive' ? 'Google Drive HTML / text' : 'Firebase console storage text'} here...`}
          value={pasteInput}
          onChange={(e) => setPasteInput(e.target.value)}
        />

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
          <button className="btn btn-primary" onClick={parsePastedContent}>
            🔍 Parse & Extract Links
          </button>
          {extractedList.length > 0 && (
            <button className="btn btn-success" onClick={exportTSV}>
              <Download size={16} /> Export Extracted Links (.txt)
            </button>
          )}
        </div>

        {extractedList.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#34d399' }}>
              Extracted {extractedList.length} Link(s):
            </h4>
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>File Name</th>
                    <th>Extracted URL</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedList.map((item, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{item.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', wordBreak: 'break-all', color: '#60a5fa' }}>
                        {item.url}
                      </td>
                      <td>
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                          <ExternalLink size={12} /> Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
