export function getImportStatus(successfulRows, failedRows) {
    if (successfulRows === 0 && failedRows > 0) {
        return "FAILED";
    }
    if (successfulRows > 0 && failedRows > 0) {
        return "PARTIALLY_COMPLETED";
    }
    return "COMPLETED";
}
