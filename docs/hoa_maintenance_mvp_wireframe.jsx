import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Home, Wrench, Building2, Users, CloudLightning, FileText } from "lucide-react";

export default function App() {
  const [active, setActive] = useState("dashboard");

  const renderContent = () => {
    switch (active) {
      case "dashboard":
        return <Dashboard />;
      case "tickets":
        return <Tickets />;
      case "assets":
        return <Assets />;
      case "vendors":
        return <Vendors />;
      case "storm":
        return <Storm />;
      case "reports":
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar active={active} setActive={setActive} />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <div className="p-6 overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
}

function Sidebar({ active, setActive }) {
  const nav = [
    { key: "dashboard", label: "Dashboard", icon: <Home size={18} /> },
    { key: "tickets", label: "Tickets", icon: <Wrench size={18} /> },
    { key: "assets", label: "Assets", icon: <Building2 size={18} /> },
    { key: "vendors", label: "Vendors", icon: <Users size={18} /> },
    { key: "storm", label: "Storm Events", icon: <CloudLightning size={18} /> },
    { key: "reports", label: "Reports", icon: <FileText size={18} /> }
  ];

  return (
    <div className="w-64 bg-white shadow-lg p-4 space-y-4">
      <div className="text-xl font-bold">HOA Ops</div>
      {nav.map((item) => (
        <Button
          key={item.key}
          variant={active === item.key ? "default" : "ghost"}
          className="w-full justify-start gap-2"
          onClick={() => setActive(item.key)}
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </div>
  );
}

function TopBar() {
  return (
    <div className="bg-white shadow-sm p-4 flex justify-between items-center">
      <Input placeholder="Search tickets, assets, vendors..." className="w-96" />
      <div className="flex items-center gap-4">
        <Badge>Jacksonville HOA</Badge>
        <div className="w-8 h-8 bg-gray-300 rounded-full" />
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {["Open Tickets", "Overdue", "SLA Breaches"].map((title) => (
        <Card key={title} className="rounded-2xl shadow">
          <CardContent className="p-6">
            <div className="text-sm text-gray-500">{title}</div>
            <div className="text-3xl font-bold mt-2">24</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Tickets() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Maintenance Tickets</h2>
        <Button>+ New Ticket</Button>
      </div>
      <Card className="rounded-2xl shadow">
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-4">
            <Input placeholder="Filter by status" />
            <Input placeholder="Filter by vendor" />
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between">
              <div>#1023 - Gate not closing</div>
              <Badge>In Progress</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Assets() {
  return (
    <Card className="rounded-2xl shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold">Assets</h2>
        <div className="mt-4">Gate A · Pool · Irrigation Zone 1</div>
      </CardContent>
    </Card>
  );
}

function Vendors() {
  return (
    <Card className="rounded-2xl shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold">Vendors</h2>
        <div className="mt-4">GreenScape Landscaping · AquaPool Services</div>
      </CardContent>
    </Card>
  );
}

function Storm() {
  return (
    <Card className="rounded-2xl shadow border border-yellow-400">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold">Storm Event Active</h2>
        <div className="mt-4">Hurricane Milton 2026</div>
      </CardContent>
    </Card>
  );
}

function Reports() {
  return (
    <Card className="rounded-2xl shadow">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold">Reports</h2>
        <Button className="mt-4">Generate Monthly Report</Button>
      </CardContent>
    </Card>
  );
}
