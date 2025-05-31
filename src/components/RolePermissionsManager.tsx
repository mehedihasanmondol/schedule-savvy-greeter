
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Save, RefreshCw } from "lucide-react";

interface RolePermission {
  role: string;
  permission: string;
}

interface PermissionGroup {
  category: string;
  permissions: string[];
  description: string;
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: "Dashboard",
    permissions: ["dashboard_view"],
    description: "Access to main dashboard"
  },
  {
    category: "Employees",
    permissions: ["employees_view", "employees_manage"],
    description: "View and manage employee records"
  },
  {
    category: "Clients", 
    permissions: ["clients_view", "clients_manage"],
    description: "View and manage client information"
  },
  {
    category: "Projects",
    permissions: ["projects_view", "projects_manage"],
    description: "View and manage project details"
  },
  {
    category: "Working Hours",
    permissions: ["working_hours_view", "working_hours_manage", "working_hours_approve"],
    description: "Track, manage and approve working hours"
  },
  {
    category: "Roster",
    permissions: ["roster_view", "roster_manage"],
    description: "View and manage work schedules"
  },
  {
    category: "Payroll",
    permissions: ["payroll_view", "payroll_manage", "payroll_process"],
    description: "View, manage and process payroll"
  },
  {
    category: "Bank Balance",
    permissions: ["bank_balance_view", "bank_balance_manage"],
    description: "View and manage financial balances"
  },
  {
    category: "Reports",
    permissions: ["reports_view", "reports_generate"],
    description: "View and generate reports"
  },
  {
    category: "Notifications",
    permissions: ["notifications_view"],
    description: "View system notifications"
  }
];

const ROLES = [
  { value: "admin", label: "Administrator", color: "bg-red-100 text-red-800" },
  { value: "employee", label: "Employee", color: "bg-blue-100 text-blue-800" },
  { value: "accountant", label: "Accountant", color: "bg-green-100 text-green-800" },
  { value: "operation", label: "Operations", color: "bg-yellow-100 text-yellow-800" },
  { value: "sales_manager", label: "Sales Manager", color: "bg-purple-100 text-purple-800" }
];

export const RolePermissionsManager = () => {
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchRolePermissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permission');

      if (error) throw error;

      // Group permissions by role
      const groupedPermissions: Record<string, string[]> = {};
      data?.forEach((item: RolePermission) => {
        if (!groupedPermissions[item.role]) {
          groupedPermissions[item.role] = [];
        }
        groupedPermissions[item.role].push(item.permission);
      });

      setRolePermissions(groupedPermissions);
    } catch (error: any) {
      toast({
        title: "Error loading permissions",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRolePermissions = async () => {
    try {
      setSaving(true);

      // Delete all existing role permissions
      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

      if (deleteError) throw deleteError;

      // Insert new permissions
      const permissionsToInsert: { role: string; permission: string }[] = [];
      Object.entries(rolePermissions).forEach(([role, permissions]) => {
        permissions.forEach(permission => {
          permissionsToInsert.push({ role, permission });
        });
      });

      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: "Permissions updated",
        description: "Role permissions have been successfully updated."
      });
    } catch (error: any) {
      toast({
        title: "Error updating permissions",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (role: string, permission: string) => {
    setRolePermissions(prev => {
      const currentPermissions = prev[role] || [];
      const hasPermission = currentPermissions.includes(permission);
      
      return {
        ...prev,
        [role]: hasPermission
          ? currentPermissions.filter(p => p !== permission)
          : [...currentPermissions, permission]
      };
    });
  };

  const hasPermission = (role: string, permission: string) => {
    return rolePermissions[role]?.includes(permission) || false;
  };

  const getPermissionCount = (role: string) => {
    return rolePermissions[role]?.length || 0;
  };

  useEffect(() => {
    fetchRolePermissions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Loading permissions...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Role Permissions Management</CardTitle>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={fetchRolePermissions} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={updateRolePermissions} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Define what each role can access and manage in the system.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {/* Role Overview */}
            <div>
              <h3 className="text-lg font-medium mb-4">Role Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {ROLES.map(role => (
                  <Card key={role.value} className="p-4">
                    <div className="text-center">
                      <Badge className={role.color}>
                        {role.label}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-2">
                        {getPermissionCount(role.value)} permissions
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Permission Matrix */}
            <div>
              <h3 className="text-lg font-medium mb-4">Permission Matrix</h3>
              <div className="space-y-6">
                {PERMISSION_GROUPS.map(group => (
                  <Card key={group.category} className="p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{group.category}</h4>
                    <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                    
                    <div className="space-y-3">
                      {group.permissions.map(permission => (
                        <div key={permission} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {ROLES.map(role => (
                              <div key={`${role.value}-${permission}`} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${role.value}-${permission}`}
                                  checked={hasPermission(role.value, permission)}
                                  onCheckedChange={() => togglePermission(role.value, permission)}
                                />
                                <label
                                  htmlFor={`${role.value}-${permission}`}
                                  className="text-xs text-gray-700 cursor-pointer"
                                >
                                  {role.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
