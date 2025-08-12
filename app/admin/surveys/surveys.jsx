'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SurveyList() {
  const [surveys, setSurveys] = useState([]);
  const [filteredSurveys, setFilteredSurveys] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const router = useRouter();

  const fetchSurveys = async () => {
    const res = await fetch('/api/admin/surveys');
    const data = await res.json();
    setSurveys(data);
    setFilteredSurveys(data);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this survey?')) return;
    const res = await fetch(`/api/admin/surveys/${id}`, { method: 'DELETE' });

    if (res.ok) {
      alert('Survey deleted');
      fetchSurveys();
    } else {
      alert('Delete failed');
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    const filtered = surveys.filter((s) =>
      `${s.title} ${s.start_keyword} ${s.end_keyword}`.toLowerCase().includes(query)
    );
    setFilteredSurveys(filtered);
  };

  const handleView = async (id) => {
    const res = await fetch(`/api/admin/surveys/${id}`);
    if (res.ok) {
      const fullSurvey = await res.json();
      setSelectedSurvey(fullSurvey);
    } else {
      alert('Failed to load survey details');
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Survey Reports</h1>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search by title or location..."
          className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredSurveys.length === 0 ? (
        <p className="text-gray-500 text-center mt-8">No surveys found.</p>
      ) : (
        <ul className="space-y-4">
          {filteredSurveys.map((s) => (
            <li
              key={s.id}
              className="bg-white p-6 rounded-lg shadow-md border hover:shadow-lg transition"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{s.title}</h2>
                  {/* <p className="text-sm text-gray-500 mt-1">
                    <span className="font-medium">From:</span> {s.start_keyword} &nbsp;|&nbsp;
                    <span className="font-medium">To:</span> {s.end_keyword}
                  </p> */}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => handleView(s.id)}
                    className="px-4 py-2 text-sm font-medium text-green-700 border border-green-600 rounded hover:bg-green-50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/admin/survey/${s.id}`)}
                    className="px-4 py-2 text-sm font-medium text-blue-700 border border-blue-600 rounded hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-500 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 border border-gray-300 relative">
            <button
              onClick={() => setSelectedSurvey(null)}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              &times;
            </button>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">{selectedSurvey.title}</h2>
            <p className="mb-2 text-sm text-gray-700">
              <strong>Start Keywords:</strong> {selectedSurvey.start_keyword}
            </p>
            <p className="mb-4 text-sm text-gray-700">
              <strong>End Keywords:</strong> {selectedSurvey.end_keyword}
            </p>

            <div className="mb-4">
              <h3 className="text-md font-semibold text-gray-800 mb-2">Constraints:</h3>
              {selectedSurvey.constraints?.length ? (
                <ul className="space-y-1">
                  {selectedSurvey.constraints.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-700">{c.point}</span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded text-white ${c.category === 'A'
                            ? 'bg-red-500'
                            : c.category === 'B'
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                      >
                        {c.category}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No constraints available.</p>
              )}
            </div>

            {selectedSurvey.word_file_path && (
              <div className="text-center mt-6">
                <a
                  href={`${process.env.NEXT_PUBLIC_S3_BUCKET_URL}${selectedSurvey.word_file_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-block px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition"
                >
                  View Survey Document
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
