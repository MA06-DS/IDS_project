function Table({ columns, data, emptyLabel = "No data available" }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white text-sm">
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-gray-500">
                {emptyLabel}
              </td>
            </tr>
          )}
          {data.map((row, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-4 py-2 text-gray-700">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Table;

