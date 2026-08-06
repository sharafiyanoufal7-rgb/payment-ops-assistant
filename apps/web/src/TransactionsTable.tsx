import { useEffect, useState } from 'react'
import { fetchTransactions, type TransactionListQuery, type TransactionListResponse, type TransactionSortField } from './api.js'

const STATUS_OPTIONS = ['SUCCESS', 'PENDING', 'FAILED']
const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'SEK', 'NOK', 'DKK']
const PAGE_SIZE = 10

export function TransactionsTable() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [currency, setCurrency] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<TransactionSortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [response, setResponse] = useState<TransactionListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // debounce the search box so we don't fire a request on every keystroke
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  // reset to page 1 whenever a filter changes (not on page itself changing)
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, currency, dateFrom, dateTo, sortBy, sortOrder])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const query: TransactionListQuery = {
      page,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
      status: status || undefined,
      currency: currency || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortOrder,
    }

    fetchTransactions(query)
      .then((data) => {
        if (cancelled) return
        setResponse(data)
      })
      .catch(() => {
        if (cancelled) return
        setError('Unable to load transactions. Please try again later.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, debouncedSearch, status, currency, dateFrom, dateTo, sortBy, sortOrder])

  function toggleSort(field: TransactionSortField) {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  function sortIndicator(field: TransactionSortField) {
    if (sortBy !== field) return ''
    return sortOrder === 'asc' ? ' ▲' : ' ▼'
  }

  const pageCount = response ? Math.ceil(response.total / response.pageSize) : 0

  return (
    <div className="page-card">
      <h2>Transactions</h2>

      <div className="filters-row">
        <input
          type="text"
          placeholder="Search transaction ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="">All currencies</option>
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label>
          From
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </div>

      {loading && <p>Loading transactions…</p>}

      {!loading && error && (
        <p role="alert">
          {error} <button type="button" onClick={() => setPage((p) => p)}>Retry</button>
        </p>
      )}

      {!loading && !error && response && response.data.length === 0 && (
        <p>No transactions match these filters.</p>
      )}

      {!loading && !error && response && response.data.length > 0 && (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th onClick={() => toggleSort('transactionId')} style={{ cursor: 'pointer' }}>
                    Transaction ID{sortIndicator('transactionId')}
                  </th>
                  <th onClick={() => toggleSort('amount')} style={{ cursor: 'pointer' }}>
                    Amount{sortIndicator('amount')}
                  </th>
                  <th onClick={() => toggleSort('currency')} style={{ cursor: 'pointer' }}>
                    Currency{sortIndicator('currency')}
                  </th>
                  <th onClick={() => toggleSort('status')} style={{ cursor: 'pointer' }}>
                    Status{sortIndicator('status')}
                  </th>
                  <th onClick={() => toggleSort('createdAt')} style={{ cursor: 'pointer' }}>
                    Created At{sortIndicator('createdAt')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {response.data.map((t) => (
                  <tr key={t.id}>
                    <td>{t.transactionId}</td>
                    <td>{t.amount}</td>
                    <td>{t.currency}</td>
                    <td>{t.status}</td>
                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-controls">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>Page {page} of {pageCount}</span>
            <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
