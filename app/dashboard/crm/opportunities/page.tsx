"use client";

import { useState, useEffect } from "react";

interface Opportunity {
  id: string;
  title: string;
  description: string;
  value: number;
  probability: number;
  stage: string;
  expectedCloseDate: string;
  contact: { name: string; company: string };
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<Any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState("ALL");
  const [formData, setFormData] = useState({
    contactId: "",
    title: "",
    description: "",
    value: 0,
    probability: 50,
    stage: "LEAD",
    expectedCloseDate: "",
  });

  useEffect(() => {
    fetchContacts();
    fetchOpportunities();
  }, [filterStage]);

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/crm/contacts");
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      const data = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setContacts([]);
    }
  };

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const url =
        filterStage === "ALL"
          ? "/api/crm/opportunities"
          : `/api/crm/opportunities?stage=${filterStage}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch opportunities");
      }
      const data = await response.json();
      setOpportunities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editing
        ? `/api/crm/opportunities?id=${editing}`
        : "/api/crm/opportunities";
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value.toString()),
          probability: parseInt(formData.probability.toString()),
        }),
      });

      if (response.ok) {
        fetchOpportunities();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Error saving opportunity:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;

    try {
      await fetch(`/api/crm/opportunities?id=${id}`, { method: "DELETE" });
      fetchOpportunities();
    } catch (error) {
      console.error("Error deleting opportunity:", error);
    }
  };

  const handleEdit = (opp: Opportunity) => {
    setEditing(opp.id);
    setFormData({
      contactId: opp.contact.name,
      title: opp.title,
      description: opp.description,
      value: opp.value,
      probability: opp.probability,
      stage: opp.stage,
      expectedCloseDate: opp.expectedCloseDate.split("T")[0],
    });
  };

  const resetForm = () => {
    setFormData({
      contactId: "",
      title: "",
      description: "",
      value: 0,
      probability: 50,
      stage: "LEAD",
      expectedCloseDate: "",
    });
    setEditing(null);
  };

  const stages = ["LEAD", "PROSPECT", "NEGOTIATION", "CLOSE", "WON", "LOST"];
  const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
  const weightedValue = opportunities.reduce(
    (sum, opp) => sum + (opp.value * opp.probability) / 100,
    0
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          💼 CRM Opportunities
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Total Opportunities</div>
            <div className="text-2xl font-bold text-blue-600">
              {opportunities.length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Total Value</div>
            <div className="text-2xl font-bold text-green-600">
              {totalValue.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Weighted Value</div>
            <div className="text-2xl font-bold text-purple-600">
              {weightedValue.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={formData.contactId}
                onChange={(e) =>
                  setFormData({ ...formData, contactId: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              >
                <option value="">Select Contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} - {contact.company}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />

              <input
                type="number"
                placeholder="Value"
                step="0.01"
                value={formData.value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    value: parseFloat(e.target.value),
                  })
                }
                required
                className="px-3 py-2 border rounded"
              />
            </div>

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <select
                value={formData.stage}
                onChange={(e) =>
                  setFormData({ ...formData, stage: e.target.value })
                }
                className="px-3 py-2 border rounded"
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Chances (%)"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    probability: parseInt(e.target.value),
                  })
                }
                className="px-3 py-2 border rounded"
              />

              <input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expectedCloseDate: e.target.value,
                  })
                }
                required
                className="px-3 py-2 border rounded col-span-2"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700"
              >
                {loading
                  ? "Loading..."
                  : editing
                    ? "Update"
                    : "Add"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 bg-gray-400 text-white py-2 rounded font-semibold hover:bg-gray-500"
                >
                 Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {["ALL", ...stages].map((stage) => (
            <button
              key={stage}
              onClick={() => setFilterStage(stage)}
              className={`px-4 py-2 rounded font-semibold ${
                filterStage === stage
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border"
              }`}
            >
              {stage === "ALL" ? "All" : stage}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">Title</th>
                  <th className="px-6 py-3 text-left">Contact</th>
                  <th className="px-6 py-3 text-left">Value</th>
                  <th className="px-6 py-3 text-left">Chances (%)</th>
                  <th className="px-6 py-3 text-left">Stage</th>
                  <th className="px-6 py-3 text-left">Expected Close Date</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp) => (
                  <tr key={opp.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold">{opp.title}</td>
                    <td className="px-6 py-3">
                      {opp.contact.name} ({opp.contact.company})
                    </td>
                    <td className="px-6 py-3">
                      {opp.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${opp.probability}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">{opp.probability}%</span>
                    </td>
                    <td className="px-6 py-3">{opp.stage}</td>
                    <td className="px-6 py-3">
                      {new Date(opp.expectedCloseDate).toLocaleDateString(
                        "ur-PK"
                      )}
                    </td>
                    <td className="px-6 py-3 text-center space-x-2">
                      <button
                        onClick={() => handleEdit(opp)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(opp.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
