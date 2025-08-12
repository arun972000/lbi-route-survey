'use client';

import { useEffect, useState } from 'react';

export default function EnquiriesList() {
    const [enquiries, setEnquiries] = useState([]);
    const [filters, setFilters] = useState({ email: '', start: '', end: '', date: '' });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const perPage = 10;

    const fetchEnquiries = async () => {
        setLoading(true);
        const params = new URLSearchParams(filters);
        const res = await fetch(`/api/admin/enquiries?${params.toString()}`);
        const data = await res.json();
        setEnquiries(data);
        setPage(1);
        setLoading(false);
    };

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const filteredData = enquiries.slice((page - 1) * perPage, page * perPage);
    const totalPages = Math.ceil(enquiries.length / perPage);

    const handleExport = () => {
        const headers = ['Start', 'End', 'Email', 'Phone', 'Length', 'Width', 'Height', 'Weight', 'Created At'];
        const rows = enquiries.map(e => [
            e.start_location, e.end_location, e.email, e.phone, e.length, e.width, e.height, e.weight, e.created_at
        ]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'enquiries.csv';
        a.click();
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Transport Enquiries</h1>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                    type="text"
                    placeholder="Email"
                    value={filters.email}
                    onChange={e => setFilters({ ...filters, email: e.target.value })}
                    className="border p-2 rounded w-full"
                />
                <input
                    type="text"
                    placeholder="Start Location"
                    value={filters.start}
                    onChange={e => setFilters({ ...filters, start: e.target.value })}
                    className="border p-2 rounded w-full"
                />
                <input
                    type="text"
                    placeholder="End Location"
                    value={filters.end}
                    onChange={e => setFilters({ ...filters, end: e.target.value })}
                    className="border p-2 rounded w-full"
                />
                <input
                    type="date"
                    value={filters.date}
                    onChange={e => setFilters({ ...filters, date: e.target.value })}
                    className="border p-2 rounded w-full"
                />
            </div>

            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={fetchEnquiries}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Apply Filters
                </button>
                <button
                    onClick={handleExport}
                    className="text-sm text-blue-600 hover:underline"
                >
                    Export CSV
                </button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="overflow-x-auto bg-white shadow rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 text-sm text-left text-gray-600">
                            <tr>
                                <th className="px-4 py-2">Start</th>
                                <th className="px-4 py-2">End</th>
                                <th className="px-4 py-2">Email</th>
                                <th className="px-4 py-2">Phone</th>
                                <th className="px-4 py-2">Dimensions</th>
                                <th className="px-4 py-2">Created</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-gray-100">
                            {filteredData.map((enq) => (
                                <tr key={enq.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">{enq.start_location}</td>
                                    <td className="px-4 py-2">{enq.end_location}</td>
                                    <td className="px-4 py-2">{enq.email}</td>
                                    <td className="px-4 py-2">{enq.phone}</td>
                                    <td className="px-4 py-2">
                                        L: {enq.length}, W: {enq.width}, H: {enq.height}, Wt: {enq.weight}
                                    </td>
                                    <td className="px-4 py-2 text-gray-500">{new Date(enq.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="mt-6 flex justify-center items-center gap-4">
                <button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                    disabled={page === 1}
                >
                    Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                    disabled={page === totalPages}
                >
                    Next
                </button>
            </div>
        </div>
    );
}
