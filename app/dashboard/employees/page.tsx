"use client";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
interface Employee {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designations: string;
  department: string;
  dateOfJoining: string;
  salary: number;
  salaryFrequency: string;
  isActive: boolean;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    designations: "",
    department: "",
    dateOfJoining: "",
    salary: 0,
    salaryFrequency: "MONTHLY",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (!user) {
        alert("Session expired. Please login again.");
        setEmployees([]);
        return;
      }

      const response = await fetch("/api/employees", {
        headers: {
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
      });
      const data = await response.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = getCurrentUser();
      if (!user) {
        alert("Session expired. Please login again.");
        return;
      }

      const url = editing
        ? `/api/employees?id=${editing}`
        : "/api/employees";
      const method = editing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
        body: JSON.stringify({
          ...formData,
          salary: parseFloat(formData.salary.toString()),
        }),
      });

      if (response.ok) {
        fetchEmployees();
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      console.error("Error saving employee:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;

    try {
      const user = getCurrentUser();
      if (!user) {
        alert("Session expired. Please login again.");
        return;
      }

      await fetch(`/api/employees?id=${id}`, {
        method: "DELETE",
        headers: {
          "x-user-role": user.role,
          "x-user-id": user.id,
        },
      });
      fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditing(employee.id);
    setFormData({
      employeeId: employee.employeeId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone || "",
      designations: employee.designations,
      department: employee.department,
      dateOfJoining: employee.dateOfJoining.split("T")[0],
      salary: employee.salary,
      salaryFrequency: employee.salaryFrequency,
    });
  };

  const resetForm = () => {
    setFormData({
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      designations: "",
      department: "",
      dateOfJoining: "",
      salary: 0,
      salaryFrequency: "MONTHLY",
    });
    setEditing(null);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          👥 Employees Management
        </h1>

        {/* Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Employee ID"
                value={formData.employeeId}
                onChange={(e) =>
                  setFormData({ ...formData, employeeId: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                
                className="px-3 py-2 border rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Designations"
                value={formData.designations}
                onChange={(e) =>
                  setFormData({ ...formData, designations: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
              <select
                value={formData.department}
                onChange={(e) =>
                  setFormData({ ...formData, department: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              >
                <option value="">Select Department</option>
                <option value="ACCOUNTS">Accounts</option>
                <option value="GODOWN">Godown</option>
                <option value="HR">Human Resources</option>
                <option value="OPERATIONS">Operations</option>
                <option value="SALES">Sales</option>
                <option value="IT">IT</option>
              </select>
              <input
                type="date"
                value={formData.dateOfJoining}
                onChange={(e) =>
                  setFormData({ ...formData, dateOfJoining: e.target.value })
                }
                required
                className="px-3 py-2 border rounded"
              />
              <input
                type="number"
                placeholder="Salary"
                value={formData.salary}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    salary: parseFloat(e.target.value),
                  })
                }
                className="px-3 py-2 border rounded"
              />
              <select
                value={formData.salaryFrequency}
                onChange={(e) =>
                  setFormData({ ...formData, salaryFrequency: e.target.value })
                }
                className="px-3 py-2 border rounded"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="WEEKLY">Weekly</option>
                <option value="HOURLY">Hourly</option>
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
                    : "Add Employee"}
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 bg-gray-400 text-white py-2 rounded font-semibold hover:bg-gray-500"
                >
                  منسوخ کریں
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Designation</th>
                  <th className="px-6 py-3 text-left">Department</th>
                  <th className="px-6 py-3 text-left">Salary</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold">{emp.employeeId}</td>
                    <td className="px-6 py-3">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="px-6 py-3">{emp.email}</td>
                    <td className="px-6 py-3">{emp.designations}</td>
                    <td className="px-6 py-3">{emp.department}</td>
                    <td className="px-6 py-3">{emp.salary.toLocaleString()}</td>
                    <td className="px-6 py-3 text-center space-x-2">
                      <button
                        onClick={() => handleEdit(emp)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                    Edit
                                          </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
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
