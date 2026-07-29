import type { ImportListResponse } from "./api.js";

type Props = {
  importsResponse: ImportListResponse;
  onPageChange: (page: number) => void;
};

export function ImportsTable({ importsResponse, onPageChange }: Props) {
  const { data, total, page, pageSize } = importsResponse;
  const pageCount = Math.ceil(total / pageSize);

  return (
    <div className="page-card">
      <h2>Imports</h2>

      {data.length === 0 ? (
        <p>No imports to display.</p>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Success</th>
                  <th>Failed</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {data.map((importSummary) => (
                  <tr key={importSummary.id}>
                    <td>{importSummary.filename}</td>
                    <td>{importSummary.status}</td>
                    <td>{importSummary.totalRows}</td>
                    <td>{importSummary.successfulRows}</td>
                    <td>{importSummary.failedRows}</td>
                    <td>{new Date(importSummary.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-controls">
            <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
