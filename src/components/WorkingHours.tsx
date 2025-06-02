import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, Plus, Edit, Trash2, CheckCircle, XCircle, AlertCircle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WorkingHour, Profile, Client, Project } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { WorkingHoursActions } from "./working-hours/WorkingHoursActions";
import { EditWorkingHoursDialog } from "./EditWorkingHoursDialog";

interface DataTableSearchProps {
  query: string;
  setQuery: (query: string) => void;
}

const statuses = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
  {
    value: "paid",
    label: "Paid",
  },
];

export const DataTableSearch = ({ query, setQuery }: DataTableSearchProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Label htmlFor="search">Search:</Label>
        <Input
          type="text"
          id="search"
          placeholder="Search records..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="max-w-sm"
        />
      </div>
    </div>
  );
};

export const WorkingHours = () => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
	const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWorkingHour, setEditingWorkingHour] = useState<WorkingHour | null>(null);
  const [newWorkingHour, setNewWorkingHour] = useState({
    profile_id: "",
    client_id: "",
    project_id: "",
    date: new Date().toISOString().split('T')[0],
    start_time: "09:00",
    end_time: "17:00",
    total_hours: 8,
    overtime_hours: 0,
    hourly_rate: 50,
    notes: "",
    status: "pending" as "pending" | "approved" | "rejected" | "paid",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchWorkingHours();
    fetchProfiles();
    fetchClients();
    fetchProjects();
  }, []);

  const fetchWorkingHours = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('working_hours')
        .select(`
          *,
          profiles!working_hours_profile_id_fkey (id, full_name, role, hourly_rate),
          clients!working_hours_client_id_fkey (id, name, company),
          projects!working_hours_project_id_fkey (id, name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setWorkingHours(data as WorkingHour[]);
    } catch (error: any) {
      console.error("Error fetching working hours:", error);
      toast({
        title: "Error",
        description: "Failed to fetch working hours",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setProfiles(data as Profile[]);
    } catch (error: any) {
      console.error("Error fetching profiles:", error);
      toast({
        title: "Error",
        description: "Failed to fetch profiles",
        variant: "destructive"
      });
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (error) throw error;
      setClients(data as Client[]);
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive"
      });
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (error) throw error;
      setProjects(data as Project[]);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive"
      });
    }
  };

  const createWorkingHour = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('working_hours')
        .insert([newWorkingHour]);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Working hour created successfully"
      });
      setNewWorkingHour({
        profile_id: "",
        client_id: "",
        project_id: "",
        date: new Date().toISOString().split('T')[0],
        start_time: "09:00",
        end_time: "17:00",
        total_hours: 8,
        overtime_hours: 0,
        hourly_rate: 50,
        notes: "",
        status: "pending",
      });
      setCreateDialogOpen(false);
      fetchWorkingHours();
    } catch (error: any) {
      console.error("Error creating working hour:", error);
      toast({
        title: "Error",
        description: "Failed to create working hour",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkingHours = workingHours.filter((workingHour) => {
    const profile = workingHour.profiles as Profile;
    const client = workingHour.clients as Client;
    const project = workingHour.projects as Project;

    const searchTerms = query.toLowerCase().split(" ");

    const matchesSearch = searchTerms.every(term => {
      return profile?.full_name?.toLowerCase().includes(term) ||
             client?.name?.toLowerCase().includes(term) ||
             project?.name?.toLowerCase().includes(term) ||
             workingHour.notes?.toLowerCase().includes(term) ||
             workingHour.status?.toLowerCase().includes(term);
    });

		const matchesDate = dateFilter ? new Date(workingHour.date).getTime() === dateFilter.getTime() : true;

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Working Hours</h1>
            <p className="text-gray-600">Manage employee working hours and track time spent on projects</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Working Hour
        </Button>
      </div>

      {/* Create Working Hour Form */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button>Add Working Hour</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Working Hour</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="profile_id">Employee</Label>
              <Select onValueChange={(value) => setNewWorkingHour({ ...newWorkingHour, profile_id: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>{profile.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="client_id">Client</Label>
              <Select onValueChange={(value) => setNewWorkingHour({ ...newWorkingHour, client_id: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project_id">Project</Label>
              <Select onValueChange={(value) => setNewWorkingHour({ ...newWorkingHour, project_id: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                type="date"
                id="date"
                value={newWorkingHour.date}
                onChange={(e) => setNewWorkingHour({ ...newWorkingHour, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  type="time"
                  id="start_time"
                  value={newWorkingHour.start_time}
                  onChange={(e) => setNewWorkingHour({ ...newWorkingHour, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  type="time"
                  id="end_time"
                  value={newWorkingHour.end_time}
                  onChange={(e) => setNewWorkingHour({ ...newWorkingHour, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_hours">Total Hours</Label>
                <Input
                  type="number"
                  id="total_hours"
                  value={newWorkingHour.total_hours}
                  onChange={(e) => setNewWorkingHour({ ...newWorkingHour, total_hours: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="overtime_hours">Overtime Hours</Label>
                <Input
                  type="number"
                  id="overtime_hours"
                  value={newWorkingHour.overtime_hours}
                  onChange={(e) => setNewWorkingHour({ ...newWorkingHour, overtime_hours: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="hourly_rate">Hourly Rate</Label>
              <Input
                type="number"
                id="hourly_rate"
                value={newWorkingHour.hourly_rate}
                onChange={(e) => setNewWorkingHour({ ...newWorkingHour, hourly_rate: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or comments"
                value={newWorkingHour.notes}
                onChange={(e) => setNewWorkingHour({ ...newWorkingHour, notes: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value) => setNewWorkingHour({ ...newWorkingHour, status: value as "pending" | "approved" | "rejected" | "paid" })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={createWorkingHour} disabled={loading}>
            {loading ? "Creating..." : "Create Working Hour"}
          </Button>
        </DialogContent>
      </Dialog>

      <DataTableSearch query={query} setQuery={setQuery} />

      {/* Working Hours Table */}
      <Card>
        <CardHeader>
          <CardTitle>Working Hours Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Project</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Notes</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkingHours.map((workingHour) => (
                  <tr key={workingHour.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{workingHour.profiles?.full_name}</div>
                      <div className="text-sm text-gray-600">{workingHour.profiles?.role}</div>
                    </td>
                    <td className="py-3 px-4">{workingHour.clients?.name}</td>
                    <td className="py-3 px-4">{workingHour.projects?.name}</td>
                    <td className="py-3 px-4">{new Date(workingHour.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div>Total: {workingHour.total_hours}h</div>
                      {workingHour.overtime_hours > 0 && (
                        <div className="text-sm text-orange-600">Overtime: {workingHour.overtime_hours}h</div>
                      )}
                    </td>
                    <td className="py-3 px-4">${workingHour.hourly_rate}</td>
                    <td className="py-3 px-4">{workingHour.notes}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={`gap-1 ${
                        workingHour.status === 'pending' ? 'text-gray-600 border-gray-300' :
                        workingHour.status === 'approved' ? 'text-green-600 border-green-300' :
                        workingHour.status === 'rejected' ? 'text-red-600 border-red-300' :
                        workingHour.status === 'paid' ? 'text-blue-600 border-blue-300' : ''
                      }`}>
                        {workingHour.status === 'pending' && <AlertCircle className="h-3 w-3" />}
                        {workingHour.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                        {workingHour.status === 'rejected' && <XCircle className="h-3 w-3" />}
                        {workingHour.status === 'paid' && <DollarSign className="h-3 w-3" />}
                        {workingHour.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <WorkingHoursActions 
                          workingHour={workingHour}
                          onEdit={() => {
                            setEditingWorkingHour(workingHour);
                            setEditDialogOpen(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredWorkingHours.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No working hours records found</p>
                      <p className="text-sm">Add your first working hour above</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <EditWorkingHoursDialog
        workingHour={editingWorkingHour}
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchWorkingHours}
        profiles={profiles}
        clients={clients}
        projects={projects}
      />
    </div>
  );
};
