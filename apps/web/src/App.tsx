import { useState } from 'react'

type TransactionRecord = {
  id: string
  transactionId: string
  amount: number
  currency: string
  status: string
  failureReason: string | null
  createdAt: string
}

function App() {
  const [activePage, setActivePage] = useState<'dashboard' | 'transactions' | 'upload'>('dashboard')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Please choose a file first.')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch('http://localhost:3001/transactions/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setUploadMessage(data.message ?? 'Upload failed.')
        return
      }

      setUploadMessage(`${data.importedCount ?? 0} records imported successfully`)
      setTransactions(data.records ?? [])
      setActivePage('transactions')
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

            {transactions.length === 0 ? (
              <p>No imported transactions yet.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>Amount</th>
                      <th>Currency</th>
                      <th>Status</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.transactionId}</td>
                        <td>{transaction.amount}</td>
                        <td>{transaction.currency}</td>
                        <td>{transaction.status}</td>
                        <td>{new Date(transaction.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activePage === 'upload' && (
          <div className="page-card upload-card">
            <h2>Upload Page</h2>
            <label className="file-input-label">
              <span>Choose File</span>
              <input
                type="file"
                accept=".csv"
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
