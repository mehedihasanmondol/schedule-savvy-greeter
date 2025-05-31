
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Save, Edit, Trash2, Check, X, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Employee, Client, Project, WorkingHour } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export const Roster = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WorkingHour | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const { toast } = useToast();

  const [rosterEntries, setRosterEntries] = useState<{[key: string]: any}>({});
  const [formData, setFormData] = useState({
    employee_id: "",
    client_id: "",
    project_id: "",
    date: new Date().toISOString().split('T')[0],
    start_time: "",
    end_time: "",
    status: "pending" as "pending" | "approved" | "rejected"
  });

  useEffect(() => {
    fetchEmployees();
    fetchClients();
    fetchProjects();
    fetchWorkingHours();
  }, []);

  useEffect(() => {
    fetchWorkingHours();
  }, [dateRange]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('roster-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'working_hours' },
        () => { fetchWorkingHours(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setEmployees((data || []) as Employee[]);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('company');

      if (error) throw error;
      setClients((data || []) as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProjects((data || []) as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchWorkingHours = async () => {
    try {
      const { data, error } = await supabase
        .from('working_hours')
        .select(`
          *,
          employees (id, name),
          clients (id, company),
          projects (id, name)
        `)
        .gte('date', dateRange.startDate)
        .lte('date', dateRange.endDate)
        .order('date');

      if (error) throw error;
      setWorkingHours((data || []) as WorkingHour[]);
    } catch (error) {
      console.error('Error fetching working hours:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDatesInRange = () => {
    const dates = [];
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    return dates;
  };

  const getWorkingHoursForEmployeeAndDate = (employeeId: string, date: string) => {
    return workingHours.filter(wh => wh.employee_id === employeeId && wh.date === date);
  };

  const handleRosterEntryChange = (employeeId: string, date: string, field: string, value: any) => {
    const key = `${employeeId}-${date}`;
    setRosterEntries(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        employee_id: employeeId,
        date: date,
        [field]: value
      }
    }));
  };

  const calculateTotalHours = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const diffMs = end.getTime() - start.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  };

  const saveRosterEntries = async () => {
    setLoading(true);
    try {
      const entries = Object.values(rosterEntries).filter((entry: any) => 
        entry.start_time && entry.end_time && entry.client_id && entry.project_id
      ).map((entry: any) => ({
        ...entry,
        total_hours: calculateTotalHours(entry.start_time, entry.end_time),
        status: 'pending'
      }));

      if (entries.length === 0) {
        toast({
          title: "No entries to save",
          description: "Please fill in the required fields for at least one entry",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('working_hours')
        .insert(entries);

      if (error) throw error;
      
      toast({ title: "Success", description: `${entries.length} roster entries saved successfully` });
      setRosterEntries({});
      fetchWorkingHours();
    } catch (error) {
      console.error('Error saving roster entries:', error);
      toast({
        title: "Error",
        description: "Failed to save roster entries",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditEntry = (entry: WorkingHour) => {
    setEditingEntry(entry);
    setFormData({
      employee_id: entry.employee_id,
      client_id: entry.client_id,
      project_id: entry.project_id,
      date: entry.date,
      start_time: entry.start_time,
      end_time: entry.end_time,
      status: entry.status as "pending" | "approved" | "rejected"
    });
    setIsDialogOpen(true);
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('working_hours')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Entry deleted successfully" });
      fetchWorkingHours();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: "pending" | "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from('working_hours')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: "Success", description: `Status updated to ${newStatus}` });
      fetchWorkingHours();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    try {
      const totalHours = calculateTotalHours(formData.start_time, formData.end_time);
      
      const { error } = await supabase
        .from('working_hours')
        .update({
          employee_id: formData.employee_id,
          client_id: formData.client_id,
          project_id: formData.project_id,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          total_hours: totalHours,
          status: formData.status
        })
        .eq('id', editingEntry.id);

      if (error) throw error;
      
      toast({ title: "Success", description: "Entry updated successfully" });
      setIsDialogOpen(false);
      setEditingEntry(null);
      fetchWorkingHours();
    } catch (error) {
      console.error('Error updating entry:', error);
      toast({
        title: "Error",
        description: "Failed to update entry",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check className="h-3 w-3" />;
      case 'rejected': return <X className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  if (loading && workingHours.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Roster Management</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Start Date:</Label>
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label>End Date:</Label>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-40"
            />
          </div>
          <Button onClick={saveRosterEntries} disabled={loading} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save All Entries
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit" : "Add"} Working Hours</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.filter(p => !formData.client_id || p.client_id === formData.client_id).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
            {editingEntry && (
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value: "pending" | "approved" | "rejected") => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {formData.start_time && formData.end_time && (
              <div className="text-center">
                <span className="text-lg font-medium">
                  Total Hours: {calculateTotalHours(formData.start_time, formData.end_time)}h
                </span>
              </div>
            )}
            <Button onClick={handleSaveEdit} className="w-full">
              {editingEntry ? "Update Entry" : "Add Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 sticky left-0 bg-white min-w-32">Employee</th>
                  {getDatesInRange().map((date) => (
                    <th key={date} className="text-center py-3 px-2 font-medium text-gray-600 min-w-48">
                      <div>{new Date(date).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-900 sticky left-0 bg-white">
                      {employee.name}
                    </td>
                    {getDatesInRange().map((date) => {
                      const existingHours = getWorkingHoursForEmployeeAndDate(employee.id, date);
                      const entryKey = `${employee.id}-${date}`;
                      const rosterEntry = rosterEntries[entryKey] || {};
                      
                      return (
                        <td key={date} className="py-2 px-2">
                          {existingHours.length > 0 ? (
                            <div className="space-y-1">
                              {existingHours.map((wh) => (
                                <div key={wh.id} className="text-xs bg-blue-50 p-2 rounded border relative group">
                                  <div className="font-medium">{wh.clients?.company}</div>
                                  <div>{wh.projects?.name}</div>
                                  <div>{wh.start_time} - {wh.end_time}</div>
                                  <div className="text-blue-600">{wh.total_hours}h</div>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Badge variant={getStatusBadgeVariant(wh.status)} className="text-xs">
                                      {getStatusIcon(wh.status)}
                                      {wh.status}
                                    </Badge>
                                  </div>
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleEditEntry(wh)}
                                    >
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-red-600"
                                      onClick={() => handleDeleteEntry(wh.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  {wh.status === 'pending' && (
                                    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 p-0 text-green-600"
                                        onClick={() => handleStatusChange(wh.id, 'approved')}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-5 p-0 text-red-600"
                                        onClick={() => handleStatusChange(wh.id, 'rejected')}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Select value={rosterEntry.client_id || ""} onValueChange={(value) => handleRosterEntryChange(employee.id, date, 'client_id', value)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Client" />
                                </SelectTrigger>
                                <SelectContent>
                                  {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                      {client.company}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <Select value={rosterEntry.project_id || ""} onValueChange={(value) => handleRosterEntryChange(employee.id, date, 'project_id', value)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Project" />
                                </SelectTrigger>
                                <SelectContent>
                                  {projects.filter(p => !rosterEntry.client_id || p.client_id === rosterEntry.client_id).map((project) => (
                                    <SelectItem key={project.id} value={project.id}>
                                      {project.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              <div className="flex gap-1">
                                <Input
                                  type="time"
                                  value={rosterEntry.start_time || ""}
                                  onChange={(e) => handleRosterEntryChange(employee.id, date, 'start_time', e.target.value)}
                                  className="h-8 text-xs"
                                  placeholder="Start"
                                />
                                <Input
                                  type="time"
                                  value={rosterEntry.end_time || ""}
                                  onChange={(e) => handleRosterEntryChange(employee.id, date, 'end_time', e.target.value)}
                                  className="h-8 text-xs"
                                  placeholder="End"
                                />
                              </div>
                              
                              {rosterEntry.start_time && rosterEntry.end_time && (
                                <div className="text-xs text-center text-blue-600 font-medium">
                                  {calculateTotalHours(rosterEntry.start_time, rosterEntry.end_time)}h
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
