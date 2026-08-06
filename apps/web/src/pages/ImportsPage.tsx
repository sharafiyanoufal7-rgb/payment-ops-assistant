// apps/web/src/pages/ImportsPage.tsx
import { Fragment, useCallback, useEffect, useState } from 'react';
import { fetchImports, type ImportSummary } from '../api/imports';
import { UploadForm } from '../components/UploadForm';

const STATUS_LABEL: Record<ImportSummary['status'], string> = {
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  COMPLETED_WITH_ERRORS: 'Completed with errors',
  FAILED: 'Failed',
};

export function ImportsPage() {
  const [imports, setImports] = useState<ImportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadImports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchImports();
      setImports(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load import history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImports();
  }, [loadImports]);

  return (
    <div className="imports-page">
      <h1>Import History</h1>

      <UploadForm onUploaded={() => loadImports()} />

      {loading && <p>Loading import history…</p>}

      {!loading && error && (
        <p role="alert" className="imports-page__error">
          {error} <button onClick={loadImports}>Retry</button>
        </p>
      )}

      {!loading && !error && imports.length === 0 && (
        <p className="imports-page__empty">No imports yet. Upload a CSV to get started.</p>
      )}

      {!loading && !error && imports.length > 0 && (
        <table className="imports-table">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Status</th>
              <th>Total</th>
              <th>Successful</th>
              <th>Failed</th>
              <th>Uploaded</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => (
              <Fragment key={imp.id}>
                <tr>
                  <td>{imp.filename}</td>
                  <td>
                    <span className={`status-badge status-badge--${imp.status.toLowerCase()}`}>
                      {STATUS_LABEL[imp.status]}
                    </span>
                  </td>
                  <td>{imp.totalRows}</td>
                  <td>{imp.successfulRows}</td>
                  <td>{imp.failedRows}</td>
                  <td>{new Date(imp.createdAt).toLocaleString()}</td>
                  <td>
                    {imp.importErrors.length > 0 && (
                      <button onClick={() => setExpandedId(expandedId === imp.id ? null : imp.id)}>
                        {expandedId === imp.id ? 'Hide errors' : `View errors (${imp.importErrors.length})`}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedId === imp.id && (
                  <tr>
                    <td colSpan={7}>
                      <table className="import-errors-table">
                        <thead>
                          <tr>
                            <th>Row</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {imp.importErrors.map((e, i) => (
                            <tr key={`${imp.id}-err-${i}`}>
                              <td>{e.rowNumber}</td>
                              <td>{e.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
