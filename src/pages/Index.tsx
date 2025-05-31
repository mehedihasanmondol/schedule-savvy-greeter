
import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Dashboard } from "@/components/Dashboard";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { ClientManagement } from "@/components/ClientManagement";
import { ProjectManagement } from "@/components/ProjectManagement";
import { WorkingHours } from "@/components/WorkingHours";
import { Roster } from "@/components/Roster";
import { PayrollComponent } from "@/components/Payroll";
import { BankBalance } from "@/components/BankBalance";
import { Reports } from "@/components/Reports";
import { UserMenu } from "@/components/UserMenu";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { hasPermission } = useAuth();

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <ProtectedRoute requiredPermission="dashboard_view">
            <Dashboard />
          </ProtectedRoute>
        );
      case "employees":
        return (
          <ProtectedRoute requiredPermission="employees_view">
            <EmployeeManagement />
          </ProtectedRoute>
        );
      case "clients":
        return (
          <ProtectedRoute requiredPermission="clients_view">
            <ClientManagement />
          </ProtectedRoute>
        );
      case "projects":
        return (
          <ProtectedRoute requiredPermission="projects_view">
            <ProjectManagement />
          </ProtectedRoute>
        );
      case "working-hours":
        return (
          <ProtectedRoute requiredPermission="working_hours_view">
            <WorkingHours />
          </ProtectedRoute>
        );
      case "roster":
        return (
          <ProtectedRoute requiredPermission="roster_view">
            <Roster />
          </ProtectedRoute>
        );
      case "payroll":
        return (
          <ProtectedRoute requiredPermission="payroll_view">
            <PayrollComponent />
          </ProtectedRoute>
        );
      case "bank-balance":
        return (
          <ProtectedRoute requiredPermission="bank_balance_view">
            <BankBalance />
          </ProtectedRoute>
        );
      case "reports":
        return (
          <ProtectedRoute requiredPermission="reports_view">
            <Reports />
          </ProtectedRoute>
        );
      default:
        return (
          <ProtectedRoute requiredPermission="dashboard_view">
            <Dashboard />
          </ProtectedRoute>
        );
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-100">
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          hasPermission={hasPermission}
        />
        <div className="flex-1 flex flex-col overflow-hidden ml-64">
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Schedule & Payroll Manager</h1>
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {renderActiveComponent()}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Index;
