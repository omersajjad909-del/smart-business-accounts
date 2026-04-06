"use client";

import { BusinessRecordWorkspace } from "../../_components/BusinessRecordWorkspace";
import { mapSolarProject, solarAccent } from "../_shared";

const statusOptions = ["planned", "survey", "installing", "commissioned"];

export default function SolarProjectsPage() {
  return (
    <BusinessRecordWorkspace
      title="Solar Projects"
      subtitle="Track installations from survey through commissioning with commercial visibility."
      accent={solarAccent}
      category="solar_project"
      emptyState="No solar projects yet. Create your first project to start tracking sites."
      fields={[
        { key: "project", label: "Project Name", placeholder: "Airport rooftop phase 1", required: true },
        { key: "customer", label: "Customer", placeholder: "Northwind Foods", required: true },
        { key: "site", label: "Site", placeholder: "Lahore warehouse roof", required: true },
        { key: "capacityKw", label: "Capacity (kW)", type: "number", placeholder: "250", required: true },
        { key: "budget", label: "Budget", type: "number", placeholder: "1800000", required: true },
        { key: "deadline", label: "Deadline", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: statusOptions, required: true },
      ]}
      defaultValues={{ status: "planned" }}
      columns={[
        { key: "project", label: "Project" },
        { key: "customer", label: "Customer" },
        { key: "site", label: "Site" },
        { key: "capacity", label: "Capacity (kW)" },
        { key: "budget", label: "Budget" },
        { key: "deadline", label: "Deadline" },
        { key: "status", label: "Status" },
      ]}
      statusOptions={statusOptions}
      mapRecord={mapSolarProject}
      buildCreatePayload={(form) => ({
        title: form.project,
        status: form.status,
        amount: Number(form.budget || 0),
        date: form.deadline,
        data: {
          customer: form.customer,
          site: form.site,
          capacityKw: Number(form.capacityKw || 0),
          deadline: form.deadline,
        },
      })}
      summarize={(rows) => {
        const totalBudget = rows.reduce((sum, row) => sum + Number(row.budget || 0), 0);
        const liveSites = rows.filter((row) => String(row.status) === "installing").length;
        const commissioned = rows.filter((row) => String(row.status) === "commissioned").length;
        return [
          { label: "Projects", value: rows.length, color: "#fbbf24" },
          { label: "Installing", value: liveSites, color: "#60a5fa" },
          { label: "Commissioned", value: commissioned, color: "#34d399" },
          { label: "Pipeline Budget", value: totalBudget.toLocaleString(), color: "#f59e0b" },
        ];
      }}
    />
  );
}
