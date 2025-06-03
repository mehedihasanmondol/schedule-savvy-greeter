import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, DollarSign, Calendar, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { WorkingHour, Profile, Client, Project } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { ProfileSelector } from "@/components/common/ProfileSelector";

export const WorkingHoursComponent = () => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    total_hours: 8,
    actual_hours: 8,
    overtime_hours: 0,
    payable_amount: 0,
    sign_in_time: "09:00",
    sign_out_time: "17:00",
    profile_id: "",
    client_id: "",
    project_id: "",
    date: new Date().toISOString().split('T')[0],
    end_time: "17:00",
    notes: "",
    hourly_rate: 50,
    status: "pending" as const
  });

  useEffect(() => {
    fetchWorkingHours();
    fetchProfiles();
    fetchClients();
    fetchProjects();
  }, []);

  const fetchWorkingHours = async () => {
    try {
      const { data, error } = await supabase
        .from('working_hours')
        .select(`
          *,
          profiles!working_hours_profile_id_fkey (id, full_name, role),
          clients!working_hours_client_id_fkey (id, name, company),
          projects!working_hours_project_id_fkey (id, name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setWorkingHours(data as WorkingHour[]);
    } catch (error) {
      console.error('Error fetching working hours:', error);
      toast({
        title: "Error",
        description: "Failed to fetch working hours records",
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
    } catch (error) {
      console.error('Error fetching profiles:', error);
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
    } catch (error) {
      console.error('Error fetching clients:', error);
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
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const workingHoursData = selectedProfiles.map(profileId => ({
        total_hours: formData.total_hours,
        actual_hours: formData.actual_hours,
        overtime_hours: formData.overtime_hours,
        payable_amount: formData.payable_amount,
        sign_in_time: formData.sign_in_time,
        sign_out_time: formData.sign_out_time,
        profile_id: profileId,
        client_id: formData.client_id,
        project_id: formData.project_id,
        date: formData.date,
        end_time: formData.end_time,
        notes: formData.notes,
        hourly_rate: formData.hourly_rate,
        status: "pending" as const
      }));

      const { error } = await supabase
        .from('working_hours')
        .insert(workingHoursData);

      if (error) throw error;
      toast({ title: "Success", description: "Working hours record created successfully" });
      
      setIsDialogOpen(false);
      setFormData({
        total_hours: 8,
        actual_hours: 8,
        overtime_hours: 0,
        payable_amount: 0,
        sign_in_time: "09:00",
        sign_out_time: "17:00",
        profile_id: "",
        client_id: "",
        project_id: "",
        date: new Date().toISOString().split('T')[0],
        end_time: "17:00",
        notes: "",
        hourly_rate: 50,
        status: "pending"
      });
      setSelectedProfiles([]);
      fetchWorkingHours();
    } catch (error) {
      console.error('Error creating working hours:', error);
      toast({
        title: "Error",
        description: "Failed to create working hours record",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateWorkingHoursStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('working_hours')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      toast({ 
        title: "Success", 
        description: `Working hours ${status} successfully` 
      });
      fetchWorkingHours();
    } catch (error) {
      console.error('Error updating working hours status:', error);
      toast({
        title: "Error",
        description: "Failed to update working hours status",
        variant: "destructive"
      });
    }
  };

  if (loading && workingHours.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Working Hours</h1>
            <p className="text-gray-600">Manage employee working hours and time tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Working Hours
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Working Hours Record</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <ProfileSelector
                  profiles={profiles}
                  selectedProfileId={formData.profile_id}
                  onProfileSelect={(profileId) => {
                    setFormData({ ...formData, profile_id: profileId });
                    setSelectedProfiles([profileId]);
                  }}
                  label="Select Profile(s)"
                  placeholder="Choose employee(s)"
                  showRoleFilter={true}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_id">Client</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name} ({client.company})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="project_id">Project</Label>
                    <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="hourly_rate">Hourly Rate</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="total_hours">Total Hours</Label>
                    <Input
                      id="total_hours"
                      type="number"
                      step="0.5"
                      value={formData.total_hours}
                      onChange={(e) => setFormData({ ...formData, total_hours: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="actual_hours">Actual Hours</Label>
                    <Input
                      id="actual_hours"
                      type="number"
                      step="0.5"
                      value={formData.actual_hours}
                      onChange={(e) => setFormData({ ...formData, actual_hours: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="overtime_hours">Overtime Hours</Label>
                    <Input
                      id="overtime_hours"
                      type="number"
                      step="0.5"
                      value={formData.overtime_hours}
                      onChange={(e) => setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payable_amount">Payable Amount</Label>
                    <Input
                      id="payable_amount"
                      type="number"
                      step="0.01"
                      value={formData.payable_amount}
                      onChange={(e) => setFormData({ ...formData, payable_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sign_in_time">Sign-in Time</Label>
                    <Input
                      id="sign_in_time"
                      type="time"
                      value={formData.sign_in_time}
                      onChange={(e) => setFormData({ ...formData, sign_in_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sign_out_time">Sign-out Time</Label>
                    <Input
                      id="sign_out_time"
                      type="time"
                      value={formData.sign_out_time}
                      onChange={(e) => setFormData({ ...formData, sign_out_time: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create Record"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Working Hours Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Client/Project</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Rate</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workingHours.map((wh) => (
                  <tr key={wh.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{wh.profiles?.full_name || 'Unknown'}</div>
                      <div className="text-sm text-gray-600">{wh.profiles?.role || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {wh.clients?.company && (
                        <div>
                          <div className="font-medium">{wh.clients.company}</div>
                          {wh.projects?.name && (
                            <div className="text-sm text-gray-500">{wh.projects.name}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{new Date(wh.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-gray-600">{wh.total_hours}h</td>
                    <td className="py-3 px-4 text-gray-600">${wh.hourly_rate}/hr</td>
                    <td className="py-3 px-4 text-gray-600">${(wh.total_hours * wh.hourly_rate).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        wh.status === "approved" ? "default" : 
                        wh.status === "rejected" ? "destructive" : "outline"
                      }>
                        {wh.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {wh.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateWorkingHoursStatus(wh.id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateWorkingHoursStatus(wh.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {wh.status !== "pending" && (
                          <AlertCircle className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </td>
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
