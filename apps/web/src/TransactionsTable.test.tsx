import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TransactionsTable } from './TransactionsTable'
import * as api from './api.js'

vi.mock('./api.js', async () => {
  const actual = await vi.importActual<typeof api>('./api.js')
  return {
    ...actual,
    fetchTransactions: vi.fn(),
  }
})

const sampleRow = {
  id: '1',
  transactionId: 'TXN-1001',
  amount: 120.5,
  currency: 'USD',
  status: 'SUCCESS',
  failureReason: null,
  createdAt: '2026-08-01T00:00:00.000Z',
}

function makeResponse(overrides: Partial<{ data: typeof sampleRow[]; total: number; page: number; pageSize: number }> = {}) {
  return {
    data: [sampleRow],
    total: 1,
    page: 1,
    pageSize: 10,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TransactionsTable', () => {
  test('shows a loading state before data resolves', () => {
    vi.mocked(api.fetchTransactions).mockReturnValue(new Promise(() => {}))
    render(<TransactionsTable />)
    expect(screen.getByText('Loading transactions…')).toBeInTheDocument()
  })

  test('renders rows once data loads', async () => {
    vi.mocked(api.fetchTransactions).mockResolvedValue(makeResponse())
    render(<TransactionsTable />)
    await waitFor(() => {
      expect(screen.getByText('TXN-1001')).toBeInTheDocument()
    })
    const row = screen.getByText('TXN-1001').closest('tr')!
    expect(within(row).getByText('USD')).toBeInTheDocument()
  })

  test('shows the empty state when there are no matching transactions', async () => {
    vi.mocked(api.fetchTransactions).mockResolvedValue(makeResponse({ data: [], total: 0 }))
    render(<TransactionsTable />)
    await waitFor(() => {
      expect(screen.getByText('No transactions match these filters.')).toBeInTheDocument()
    })
  })

  test('shows an error message with a retry option when the fetch fails', async () => {
    vi.mocked(api.fetchTransactions).mockRejectedValue(new Error('network error'))
    render(<TransactionsTable />)
    await waitFor(() => {
      expect(screen.getByText('Unable to load transactions. Please try again later.')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  test('typing in the search box eventually calls fetchTransactions with the search term (debounced)', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchTransactions).mockResolvedValue(makeResponse())
    render(<TransactionsTable />)
    await waitFor(() => expect(api.fetchTransactions).toHaveBeenCalled())

    vi.mocked(api.fetchTransactions).mockClear()
    await user.type(screen.getByPlaceholderText('Search transaction ID…'), '1001')

    await waitFor(
      () => {
        expect(api.fetchTransactions).toHaveBeenCalledWith(
          expect.objectContaining({ search: '1001', page: 1 }),
        )
      },
      { timeout: 1000 },
    )
  })

  test('selecting a status filter calls fetchTransactions with that status', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchTransactions).mockResolvedValue(makeResponse())
    render(<TransactionsTable />)
    await waitFor(() => expect(api.fetchTransactions).toHaveBeenCalled())

    vi.mocked(api.fetchTransactions).mockClear()
    const [statusSelect] = screen.getAllByRole('combobox')
    await user.selectOptions(statusSelect, 'PENDING')

    await waitFor(() => {
      expect(api.fetchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING', page: 1 }),
      )
    })
  })

  test('selecting a currency filter calls fetchTransactions with that currency', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchTransactions).mockResolvedValue(makeResponse())
    render(<TransactionsTable />)
    await waitFor(() => expect(api.fetchTransactions).toHaveBeenCalled())

    vi.mocked(api.fetchTransactions).mockClear()
    const [, currencySelect] = screen.getAllByRole('combobox')
    await user.selectOptions(currencySelect, 'EUR')

    await waitFor(() => {
      expect(api.fetchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'EUR', page: 1 }),
      )
    })
  })

  test('clicking a column header sorts ascending, clicking again reverses to descending', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchTransactions).mockResolvedValue(makeResponse())
    render(<TransactionsTable />)
    await waitFor(() => expect(api.fetchTransactions).toHaveBeenCalled())

    vi.mocked(api.fetchTransactions).mockClear()
    await user.click(screen.getByText(/Amount/))

    await waitFor(() => {
      expect(api.fetchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'amount', sortOrder: 'asc' }),
      )
    })

    vi.mocked(api.fetchTransactions).mockClear()
    await user.click(screen.getByText(/Amount/))

    await waitFor(() => {
      expect(api.fetchTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'amount', sortOrder: 'desc' }),
      )
    })
  })

  test('pagination: Previous is disabled on page 1, Next advances to page 2', async () => {
    const user = userEvent.setup()
    vi.mocked(api.fetchTransactions).mockResolvedValue(
      makeResponse({ data: [sampleRow], total: 25, page: 1, pageSize: 10 }),
    )
    render(<TransactionsTable />)
    await waitFor(() => expect(screen.getByText('Page 1 of 3')).toBeInTheDocument())

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled()

    vi.mocked(api.fetchTransactions).mockClear()
    vi.mocked(api.fetchTransactions).mockResolvedValue(
      makeResponse({ data: [sampleRow], total: 25, page: 2, pageSize: 10 }),
    )
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(api.fetchTransactions).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
    })
  })
})
