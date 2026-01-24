"use client";

import { useState, useEffect } from "react";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone: string;
  company: string;
  position?: string;
  type: string;
  isActive: boolean;
}

export default function CrmContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("ALL");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    position: "",
    type: "CUSTOMER",
  });

  useEffect(() => {
    fetchContacts();
  }, [filterType]);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const url =
        filterType === "ALL"
          ? "/api/crm/contacts"
          : `/api/crm/contacts?type=${filterType}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      const data = await response.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = editing
        ? `/api/crm/contacts?id=${editing}`
        : "/api/crm/contacts";
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchContacts();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Error saving contact:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      await fetch(`/api/crm/contacts?id=${id}`, { method: "DELETE" });
      fetchContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditing(contact.id);
    setFormData({
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone,
      company: contact.company,
      position: contact.position || "",
      type: contact.type,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      position: "",
      type: "CUSTOMER",
    });
    setEditing(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "CUSTOMER":
        return "bg-blue-100 text-blue-800";
      case "SUPPLIER":
        return "bg-green-100 text-green-800";
      case "LEAD":
        return "bg-yellow-100 text-yellow-800";
      case "PARTNER":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          📇 CRM Contacts Management
        </h1>

        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Compaany"
                value={formData.company}
                onChange={(e) =>
                  setFormData({ ...formData, company: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Position"
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="SUPPLIER">Supplier</option>
                <option value="LEAD">Lead</option>
                <option value="PARTNER">Partner</option>
              </select>
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
          {["ALL", "CUSTOMER", "SUPPLIER", "LEAD", "PARTNER"].map((type) => (
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
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Company</th>
                  <th className="px-6 py-3 text-left">Position</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold">{contact.name}</td>
                    <td className="px-6 py-3">{contact.phone}</td>
                    <td className="px-6 py-3">{contact.email || "-"}</td>
                    <td className="px-6 py-3">{contact.company}</td>
                    <td className="px-6 py-3">{contact.position || "-"}</td>
                    <td className="px-6 py-3">
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${getTypeColor(contact.type)}`}>
                        {contact.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center space-x-2">
                      <button
                        onClick={() => handleEdit(contact)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
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
