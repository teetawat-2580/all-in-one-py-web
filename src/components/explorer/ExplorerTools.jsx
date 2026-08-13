import React, { useState } from 'react';
import InfoHeader from '../common/InfoHeader';
import { Folder, Upload, Copy, Download, Check, Settings, Code, FileText } from 'lucide-react';

export default function ExplorerTools() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [keepExt, setKeepExt] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [casing, setCasing] = useState('original'); // original, upper, lower, title
  const [delimiter, setDelimiter] = useState('newline'); // newline, comma, semicolon, tab
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArr = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArr]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArr = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...filesArr]);
    }
  };

  const getFormattedNames = () => {
    return selectedFiles.map(file => {
      let name = file.name;
      if (!keepExt) {
        const lastDot = name.lastIndexOf('.');
        if (lastDot > 0) {
          name = name.substring(0, lastDot);
        }
      }

      if (casing === 'upper') name = name.toUpperCase();
      else if (casing === 'lower') name = name.toLowerCase();
      else if (casing === 'title') {
        name = name.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      }

      return `${prefix}${name}${suffix}`;
    });
  };

  const getJoinedOutput = () => {
    const names = getFormattedNames();
    if (delimiter === 'comma') return names.join(', ');
    if (delimiter === 'semicolon') return names.join('; ');
    if (delimiter === 'tab') return names.join('\t');
    return names.join('\n');
  };

  const copyToClipboard = () => {
    const text = getJoinedOutput();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportToFile = (format) => {
    const names = getFormattedNames();
    let content = '';
    let mimeType = 'text/plain';
    let fileExt = 'txt';

    if (format === 'txt') {
      content = getJoinedOutput();
    } else if (format === 'csv') {
      content = 'Filename\n' + names.map(n => `"${n.replace(/"/g, '""')}"`).join('\n');
      mimeType = 'text/csv';
      fileExt = 'csv';
    } else if (format === 'json') {
      content = JSON.stringify(names, null, 2);
      mimeType = 'application/json';
      fileExt = 'json';
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted_filenames.${fileExt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateRegFile = () => {
    const regContent = `Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\shell\\ExtractFilenames]
@="📋 Extract All Filenames in Folder"

[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\shell\\ExtractFilenames\\command]
@="cmd.exe /c dir \\"%1\\" /b | clip"

[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\Background\\shell\\ExtractFilenames]
@="📋 Extract All Filenames in Folder"

[HKEY_CURRENT_USER\\Software\\Classes\\Directory\\Background\\shell\\ExtractFilenames\\command]
@="cmd.exe /c dir \\"%V\\" /b | clip"
`;
    const blob = new Blob([regContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'enable_windows_explorer_right_click.reg';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '20px' }}>
      <InfoHeader
        category="explorer"
        title="File Explorer Filename Extractor"
        description="Batch extract names of selected files or entire folders from File Explorer directly to your clipboard and text files."
        workInstruction={`1. Select or drag & drop files into the input dropzone.\n2. Toggle options (Keep file extension, casing, prefix/suffix, delimiter).\n3. Click 'Copy Filenames to Clipboard' or Export as TXT / CSV / JSON.\n4. Optionally download the Windows Registry script to add right-click context menu integration!`}
      />

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        {/* Left Column: File Selection & Options */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Folder size={18} style={{ color: '#fbbf24' }} /> Step 1: Select Files
          </h3>

          <div
            className={`dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('explorer-file-input').click()}
          >
            <Upload size={32} style={{ color: '#fbbf24', marginBottom: '8px' }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>
              Click to select or drag & drop files here
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
              Supports selecting multiple files from any folder
            </p>
            <input
              id="explorer-file-input"
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {selectedFiles.length} file(s) loaded
            </span>
            {selectedFiles.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedFiles([])}
              >
                Clear Files
              </button>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} style={{ color: '#60a5fa' }} /> Step 2: Extraction Options
          </h3>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={keepExt}
                onChange={(e) => setKeepExt(e.target.checked)}
              />
              Keep file extensions (e.g. .pdf, .png)
            </label>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Prefix (Optional):</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Doc_"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Suffix (Optional):</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. _v1"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Case Transformation:</label>
              <select className="form-select" value={casing} onChange={(e) => setCasing(e.target.value)}>
                <option value="original">Original Case</option>
                <option value="upper">UPPERCASE</option>
                <option value="lower">lowercase</option>
                <option value="title">Title Case</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Delimiter:</label>
              <select className="form-select" value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                <option value="newline">New Line (\n)</option>
                <option value="comma">Comma (,)</option>
                <option value="semicolon">Semicolon (;)</option>
                <option value="tab">Tab (\t)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Output & Actions */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} style={{ color: '#34d399' }} /> Extracted Result
            </h3>
            <button
              className="btn btn-success"
              disabled={selectedFiles.length === 0}
              onClick={copyToClipboard}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : '📋 Copy to Clipboard'}
            </button>
          </div>

          <textarea
            className="form-textarea"
            style={{ flexGrow: 1, minHeight: '260px', marginBottom: '16px' }}
            readOnly
            value={selectedFiles.length > 0 ? getJoinedOutput() : 'No files selected yet. Drag & drop files on the left.'}
          />

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" disabled={selectedFiles.length === 0} onClick={() => exportToFile('txt')}>
              <Download size={14} /> Download .TXT
            </button>
            <button className="btn btn-secondary btn-sm" disabled={selectedFiles.length === 0} onClick={() => exportToFile('csv')}>
              <Download size={14} /> Download .CSV
            </button>
            <button className="btn btn-secondary btn-sm" disabled={selectedFiles.length === 0} onClick={() => exportToFile('json')}>
              <Download size={14} /> Download .JSON
            </button>
          </div>
        </div>
      </div>

      {/* Windows Context Menu Integration Banner */}
      <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Code size={18} /> Windows File Explorer Right-Click Integration
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
              Add '📋 Extract All Filenames in Folder' directly into your Windows Explorer context menu!
            </p>
          </div>
          <button className="btn btn-primary" onClick={generateRegFile}>
            <Download size={16} /> Download .REG Setup Script
          </button>
        </div>
      </div>
    </div>
  );
}
