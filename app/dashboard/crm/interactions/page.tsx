"use client";

import { useState, useEffect } from "react";

interface Interaction {
  id: string;
  type: string;
  date: string;
  subject: string;
  description: string;
  outcome?: string;
  nextFollowUp?: string;
  contact: { name: string };
}

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("ALL");
  const [formData, setFormData] = useState({
    contactId: "",
    type: "CALL",
    date: new Date().toISOString().split("T")[0],
    subject: "",
    description: "",
    outcome: "NEUTRAL",
    nextFollowUp: "",
  });

  useEffect(() => {
    fetchContacts();
    fetchInteractions();
  }, [filterType]);

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

  const fetchInteractions = async () => {
    setLoading(true);
    try {
      const url =
        filterType === "ALL"
          ? "/api/crm/interactions"
          : `/api/crm/interactions?type=${filterType}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch interactions");
      }
      const data = await response.json();
      setInteractions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      setInteractions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editing
        ? `/api/crm/interactions?id=${editing}`
        : "/api/crm/interactions";
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchInteractions();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Error saving interaction:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this interaction?")) return;

    try {
      await fetch(`/api/crm/interactions?id=${id}`, { method: "DELETE" });
      fetchInteractions();
    } catch (error) {
      console.error("Error deleting interaction:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      contactId: "",
      type: "CALL",
      date: new Date().toISOString().split("T")[0],
      subject: "",
      description: "",
      outcome: "NEUTRAL",
      nextFollowUp: "",
    });
    setEditing(null);
  };

  const types = ["CALL", "EMAIL", "MEETING", "MESSAGE", "VISIT"];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          📞 CRM Interaction History
        </h1>

        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    {contact.name}
                  </option>
                ))}
              </select>

              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="px-3 py-2 border rounded"
              >
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />

              <select
                value={formData.outcome}
                onChange={(e) =>
                  setFormData({ ...formData, outcome: e.target.value })
                }
                className="px-3 py-2 border rounded"
              >
                <option value="POSITIVE">Positive</option>
                <option value="NEUTRAL">Neutral</option>
                <option value="NEGATIVE">Negative</option>
              </select>
            </div>

            <input
              type="text"
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
              className="w-full px-3 py-2 border rounded"
            />

            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />

            <input
              type="date"
              placeholder="Next Follow-up Date"
              value={formData.nextFollowUp}
              onChange={(e) =>
                setFormData({ ...formData, nextFollowUp: e.target.value })
              }
              className="w-full px-3 py-2 border rounded"
            />

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
          {["ALL", ...types].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded font-semibold ${
                filterType === type
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 border"
              }`}
            >
              {type === "ALL" ? "All" : type}
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
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-left">Subject</th>
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Outcome</th>
                  <th className="px-6 py-3 text-left">Next Follow-up</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {interactions.map((interaction) => (
                  <tr key={interaction.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold">
                      {interaction.contact.name}
                    </td>
                    <td className="px-6 py-3">{interaction.type}</td>
                    <td className="px-6 py-3">{interaction.subject}</td>
                    <td className="px-6 py-3">
                      {new Date(interaction.date).toLocaleDateString("ur-PK")}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded text-sm font-semibold ${
                          interaction.outcome === "POSITIVE"
                            ? "bg-green-100 text-green-800"
                            : interaction.outcome === "NEGATIVE"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {interaction.outcome}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {interaction.nextFollowUp
                        ? new Date(interaction.nextFollowUp).toLocaleDateString(
                            "en-PK"
                          )
                        : "-"}
                    </td>
                    <td className="px-6 py-3 text-center space-x-2">
                      <button
                        onClick={() => setEditing(interaction.id)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(interaction.id)}
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
