import { useState } from 'react'

function App() {
  const [activePage, setActivePage] = useState<'dashboard' | 'transactions' | 'upload'>('dashboard')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMessage, setUploadMessage] = useState('')

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Please choose a file first.')
      return
    }

    try {
      const response = await fetch('http://localhost:3001/transactions/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: selectedFile.name,
        }),
      })

      const data = await response.json()

      setUploadMessage(data.message ?? 'Upload successful')
    } catch (error) {
      setUploadMessage('Upload failed. Please make sure the backend is running.')
      console.error(error)
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>Payment Ops</h1>
        <nav className="nav-links">
          <button
            type="button"
            className={activePage === 'dashboard' ? 'active' : ''}
            onClick={() => setActivePage('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activePage === 'transactions' ? 'active' : ''}
            onClick={() => setActivePage('transactions')}
          >
            Transactions
          </button>
          <button
            type="button"
            className={activePage === 'upload' ? 'active' : ''}
            onClick={() => setActivePage('upload')}
          >
            Upload
          </button>
        </nav>
      </aside>

      <section className="content-area">
        {activePage === 'dashboard' && (
          <div className="page-card">
            <h2>Dashboard</h2>
            <p>Overview for payment operations.</p>
          </div>
        )}

        {activePage === 'transactions' && (
          <div className="page-card">
            <h2>Transactions</h2>
            <p>Transaction list will appear here.</p>
          </div>
        )}

        {activePage === 'upload' && (
          <div className="page-card upload-card">
            <h2>Upload Page</h2>
            <label className="file-input-label">
              <span>Choose File</span>
              <input
                type="file"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <button type="button" className="upload-button" onClick={handleUpload}>
              Upload Button
            </button>

            {uploadMessage && <p className="upload-message">{uploadMessage}</p>}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
