import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Copy, Check, ExternalLink, Globe, Database, FileText, Download, Play, Image, Info, Sparkles } from 'lucide-react';

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

const NATIVE_BATCH_DOWNLOAD_JS = `async function prepareNativeBatchDownload() {
    let userInput = prompt("How many pictures do you want to extract?", "10");
    let total = parseInt(userInput);
    
    if (isNaN(total) || total <= 0) return;

    let thumbnails = document.querySelectorAll('div.thumbnail-overlay');
    let highResUrls = [];
    
    console.log(\`🚀 Extracting \${total} links. Please do not click anything...\`);

    // 1. Loop through and grab the high-resolution source links
    for (let i = 0; i < total && i < thumbnails.length; i++) {
        console.log(\`Extracting link for picture \${i + 1}...\`);
        thumbnails[i].click();
        
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        let allImages = Array.from(document.querySelectorAll('img'));
        let fullImage = allImages.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];

        if (fullImage && fullImage.src) {
            highResUrls.push(fullImage.src);
        }

        let closeBtn = document.querySelector('button[aria-label="Back"], button[mattooltip="Back"], button[aria-label="Close"]');
        if (closeBtn) closeBtn.click();
        else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
        
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("✅ Links collected! Transforming the page for Native Download...");

    // 2. Safely wipe the entire webpage and change the background to dark gray
    document.body.innerText = '';
    document.body.style.backgroundColor = '#1e1e1e';
    document.body.style.color = '#ffffff';
    document.body.style.textAlign = 'center';
    document.body.style.padding = '50px';
    document.body.style.overflowY = 'scroll';

    // 3. Build the instructions securely (bypassing TrustedHTML errors)
    let h1 = document.createElement('h1');
    h1.innerText = '✅ Images Ready for Batch Download!';
    document.body.appendChild(h1);

    let h2 = document.createElement('h2');
    h2.innerText = 'Press Ctrl + S on your keyboard right now.';
    h2.style.color = '#4CAF50';
    document.body.appendChild(h2);

    let p = document.createElement('p');
    p.innerText = 'When the save window opens, ensure "Save as type" is set to "Webpage, Complete". \\nEdge will save an HTML file AND create a folder containing all of your JPG image files!';
    document.body.appendChild(p);

    let hr = document.createElement('hr');
    document.body.appendChild(hr);

    // 4. Inject only the high-resolution images back onto the screen
    highResUrls.forEach(url => {
        let img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '80%';
        img.style.margin = '20px auto';
        img.style.border = '2px solid #555';
        img.style.display = 'block';
        document.body.appendChild(img);
    });
}

prepareNativeBatchDownload();`;

const CHATGPT_BATCH_DOWNLOAD_JS = `async function prepareChatGPTBatchDownload() {
    let userInput = prompt("How many ChatGPT images do you want to extract?", "20");
    let total = parseInt(userInput);
    
    if (isNaN(total) || total <= 0) return;

    console.log(\`🚀 Extracting up to \${total} ChatGPT images. Please wait...\`);

    // 1. Gather image elements / cards on chatgpt.com
    let imgElements = Array.from(document.querySelectorAll('img')).filter(img => {
        const src = img.src || '';
        return (
            src.includes('files.oaiusercontent.com') ||
            src.includes('oaistatic.com') ||
            src.includes('chatgpt.com') ||
            img.alt?.toLowerCase().includes('generated') ||
            img.alt?.toLowerCase().includes('dall') ||
            img.closest('[class*="image"], [class*="gallery"], [class*="grid"], [data-testid*="image"]') !== null
        );
    });

    let imageCards = Array.from(document.querySelectorAll('a[href*="/library"], a[href*="tab=images"], a[href*="/images/"], div[role="button"][class*="image"], div[data-testid*="image-card"], div.grid img, [class*="aspect-"] img'));
    let highResUrls = new Set();
    let clickTargets = imageCards.length > 0 ? imageCards : imgElements;
    
    for (let i = 0; i < total && i < clickTargets.length; i++) {
        let target = clickTargets[i];
        console.log(\`Extracting image \${i + 1}/\${Math.min(total, clickTargets.length)}...\`);

        let initialSrc = target.tagName === 'IMG' ? target.src : target.querySelector('img')?.src;
        if (initialSrc && !initialSrc.startsWith('data:image/svg')) {
            highResUrls.add(initialSrc);
        }

        try {
            target.click();
            await new Promise(resolve => setTimeout(resolve, 1500));

            let modalImgs = Array.from(document.querySelectorAll('div[role="dialog"] img, div[class*="modal"] img, div[class*="lightbox"] img, main img'));
            modalImgs.forEach(mImg => {
                if (mImg.src && (mImg.src.includes('files.oaiusercontent.com') || mImg.naturalWidth > 300 || mImg.width > 300)) {
                    highResUrls.add(mImg.src);
                }
            });

            let closeBtn = document.querySelector('button[aria-label="Close"], button[class*="close"], svg[class*="close"]')?.closest('button');
            if (closeBtn) closeBtn.click();
            else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));

            await new Promise(resolve => setTimeout(resolve, 800));
        } catch(e) {
            console.log('Skipped click interaction for image', i + 1);
        }
    }

    if (highResUrls.size === 0) {
        document.querySelectorAll('img').forEach(img => {
            if (img.src && !img.src.startsWith('data:image/svg') && (img.naturalWidth > 200 || img.src.includes('oaiusercontent'))) {
                highResUrls.add(img.src);
            }
        });
    }

    const finalUrls = Array.from(highResUrls).slice(0, total);

    if (finalUrls.length === 0) {
        alert("⚠️ Couldn't find any generated images on this ChatGPT page.");
        return;
    }

    console.log(\`✅ Collected \${finalUrls.length} high-res image links! Transforming page for Native Download...\`);

    // 2. Safely wipe the entire webpage and set sleek dark background
    document.body.innerText = '';
    document.body.style.backgroundColor = '#111827';
    document.body.style.color = '#ffffff';
    document.body.style.textAlign = 'center';
    document.body.style.padding = '40px 20px';
    document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    document.body.style.overflowY = 'scroll';

    // 3. Build UI instructions for Ctrl + S batch download
    let h1 = document.createElement('h1');
    h1.innerText = \`✅ \${finalUrls.length} ChatGPT Images Ready for Batch Download!\`;
    h1.style.color = '#10b981';
    h1.style.marginBottom = '10px';
    document.body.appendChild(h1);

    let h2 = document.createElement('h2');
    h2.innerText = 'Press Ctrl + S on your keyboard right now.';
    h2.style.color = '#38bdf8';
    h2.style.marginBottom = '16px';
    document.body.appendChild(h2);

    let p = document.createElement('p');
    p.innerText = 'When the save dialog opens, set "Save as type" to "Webpage, Complete".\\nYour browser (Edge/Chrome/Firefox) will automatically save all extracted image files into a single local folder!';
    p.style.fontSize = '15px';
    p.style.color = '#9ca3af';
    p.style.lineHeight = '1.6';
    document.body.appendChild(p);

    let hr = document.createElement('hr');
    hr.style.borderColor = '#374151';
    hr.style.margin = '30px auto';
    hr.style.maxWidth = '800px';
    document.body.appendChild(hr);

    // 4. Inject all collected high-resolution images back onto screen
    finalUrls.forEach((url, index) => {
        let container = document.createElement('div');
        container.style.margin = '24px auto';
        container.style.maxWidth = '85%';

        let img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '12px';
        img.style.border = '2px solid #374151';
        img.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        img.style.display = 'block';
        img.style.margin = '0 auto';
        
        let label = document.createElement('div');
        label.innerText = \`Image #\${index + 1}\`;
        label.style.marginTop = '8px';
        label.style.fontSize = '12px';
        label.style.color = '#6b7280';

        container.appendChild(img);
        container.appendChild(label);
        document.body.appendChild(container);
    });
}

prepareChatGPTBatchDownload();`;

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
    } else if (activeTab === 'chatgpt_batch') {
      const oaiRegex = /https:\/\/[^\s"'>]+\.(?:oaiusercontent|oaistatic)\.com\/[^\s"'>]+/g;
      const matches = pasteInput.match(oaiRegex) || pasteInput.match(/https:\/\/[^\s"'>]+\.(?:png|jpg|jpeg|webp)[^\s"'>]*/gi) || [];
      const unique = Array.from(new Set(matches));
      unique.forEach((url, idx) => {
        results.push({
          name: `ChatGPT Image ${idx + 1}`,
          url: url
        });
      });
    } else {
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
        <button
          className={`subtab-btn ${activeTab === 'native_batch' ? 'active' : ''}`}
          onClick={() => { setActiveTab('native_batch'); setExtractedList([]); }}
        >
          <Image size={16} /> Native Batch Image Extractor & Downloader
        </button>
        <button
          className={`subtab-btn ${activeTab === 'chatgpt_batch' ? 'active' : ''}`}
          onClick={() => { setActiveTab('chatgpt_batch'); setExtractedList([]); }}
        >
          <Sparkles size={16} /> ChatGPT Web Image Extractor & Downloader
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

      {activeTab === 'native_batch' && (
        <div>
          <InfoHeader
            category="web"
            title="Native Batch Image Extractor & Downloader"
            description="Automated browser JavaScript snippet to extract high-resolution image links from thumbnail overlays on web galleries, replace the DOM with full-res images, and leverage browser native Ctrl+S ('Webpage, Complete') batch saving."
            workInstruction={`1. Click '📋 Copy Native Batch Downloader JS Snippet to Clipboard'.\n2. Open the web page containing thumbnail overlays ('div.thumbnail-overlay') in your browser (Chrome/Edge/Firefox).\n3. Press F12 to open Developer Console in a separated / undocked window, paste the script into the Console tab, and press Enter.\n4. Enter the desired number of pictures when prompted (e.g. 10) and let the automated script run.\n5. Once the dark screen appears with your images, press Ctrl + S and choose 'Webpage, Complete' to save all JPG image files into a single local folder!`}
          />

          <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Image size={18} style={{ color: '#fbbf24' }} /> Native Batch Image Extractor & Downloader JS Snippet
              </h3>
              <button
                className="btn btn-success"
                onClick={() => copySnippet(NATIVE_BATCH_DOWNLOAD_JS)}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied to Clipboard!' : '📋 Copy Native Batch Downloader JS Snippet'}
              </button>
            </div>

            <textarea
              className="form-textarea"
              rows={15}
              value={NATIVE_BATCH_DOWNLOAD_JS}
              readOnly
              style={{ background: '#090d16', color: '#fde68a' }}
            />
          </div>

          {/* Explanation Card */}
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', borderLeft: '4px solid #fbbf24' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={18} /> How It Works & Key Notes
            </h4>
            <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <li><strong>DevTools Window Tip:</strong> Open Developer Tools (F12) in a <strong>separated / undocked window</strong> (via DevTools settings menu) so it doesn't obscure or shrink the webpage view.</li>
              <li><strong>Automated Extraction:</strong> Loops through elements with class <code>div.thumbnail-overlay</code>, clicks each one automatically, waits for the modal/full image to render, and selects the largest <code>&lt;img&gt;</code> element on the screen.</li>
              <li><strong>Auto-Close Modals:</strong> Closes image modal dialogs automatically by clicking back/close buttons or sending synthetic <code>Escape</code> keypress events.</li>
              <li><strong>Clean Screen Transformation:</strong> Once all links are gathered, it wipes the web page DOM (<code>document.body.innerText = ''</code>), sets a sleek dark background (<code>#1e1e1e</code>), and embeds all high-res image elements onto the page.</li>
              <li><strong>Browser Native Batch Saving (Ctrl + S):</strong> Instead of downloading images one-by-one or triggering blocked popup windows, pressing <code>Ctrl + S</code> in Chrome/Edge/Firefox with <em>"Webpage, Complete"</em> saves all images simultaneously into a single local folder on your computer!</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'chatgpt_batch' && (
        <div>
          <InfoHeader
            category="web"
            title="ChatGPT Web Batch Image Extractor & Downloader"
            description="Automated browser JavaScript snippet to extract high-resolution generated image links directly from ChatGPT web gallery (https://chatgpt.com/library?tab=images) or chat conversations, replace the DOM with high-res images, and trigger browser native Ctrl+S ('Webpage, Complete') batch download."
            workInstruction={`1. Click '📋 Copy ChatGPT Web JS Snippet to Clipboard'.\n2. Open ChatGPT image library (https://chatgpt.com/library?tab=images) or your ChatGPT conversation in Chrome/Edge/Firefox, and change the view to Grid View first.\n3. Press F12 to open Developer Console in a separated / undocked window, paste the script into the Console tab, and press Enter.\n4. Enter the desired number of pictures when prompted (e.g. 20) and allow the automated script to collect high-res URLs.\n5. Once the dark screen appears with your images, press Ctrl + S and select 'Webpage, Complete' to save all PNG/JPG image files into a single local folder!`}
          />

          <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} style={{ color: '#10b981' }} /> ChatGPT Web Image Extractor & Downloader JS Snippet
              </h3>
              <button
                className="btn btn-success"
                onClick={() => copySnippet(CHATGPT_BATCH_DOWNLOAD_JS)}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied to Clipboard!' : '📋 Copy ChatGPT Web JS Snippet'}
              </button>
            </div>

            <textarea
              className="form-textarea"
              rows={15}
              value={CHATGPT_BATCH_DOWNLOAD_JS}
              readOnly
              style={{ background: '#090d16', color: '#a7f3d0' }}
            />
          </div>

          {/* Explanation Card */}
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', borderLeft: '4px solid #10b981' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={18} /> How ChatGPT Image Extraction Works
            </h4>
            <ul style={{ paddingLeft: '20px', fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <li><strong>Target Platform:</strong> Designed specifically for <code>https://chatgpt.com/library?tab=images</code> and ChatGPT chat conversations with generated images (DALL-E 3).</li>
              <li><strong>DevTools Window Tip:</strong> Open Developer Tools (F12) in a <strong>separated / undocked window</strong> (via DevTools menu: Undock into separate window) so it doesn't shrink or cover page elements.</li>
              <li><strong>Important Note:</strong> Before running the JS snippet on <code>https://chatgpt.com/library?tab=images</code>, change the layout view to <strong>Grid View</strong> first so thumbnail cards are visible.</li>
              <li><strong>Smart Selection & Extraction:</strong> Automatically scans for <code>files.oaiusercontent.com</code> images, gallery cards, and lightbox previews to capture maximum resolution source URLs.</li>
              <li><strong>DOM Transformation:</strong> Clears the current page markup, sets a dark background theme, and embeds all high-res image elements cleanly on screen.</li>
              <li><strong>Browser Native Download (Ctrl + S):</strong> Pressing <code>Ctrl + S</code> in Chrome, Edge, or Firefox and choosing <em>"Webpage, Complete"</em> saves all images simultaneously into one local folder on your computer.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Online Link Parser / Simulator (for gdrive and firebase) */}
      {activeTab !== 'native_batch' && (
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
      )}
    </div>
  );
}
