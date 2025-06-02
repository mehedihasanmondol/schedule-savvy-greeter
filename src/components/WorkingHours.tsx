import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Clock, User, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Client, Project, WorkingHour } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { EditWorkingHoursDialog } from "./EditWorkingHoursDialog";
import { WorkingHoursActions } from "./working-hours/WorkingHoursActions";
import type { Database } from "@/integrations/supabase/types";

type WorkingHoursStatus = Database["public"]["Enums"]["working_hours_status"];

export const WorkingHours = () => {
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editingWorkingHour, setEditingWorkingHour] = useState<WorkingHour | null>(null);
  const [formData, setFormData] = useState({
    profile_id: "",
    client_id: "",
    project_id: "",
    date: new Date().toISOString().split('T')[0],
    start_time: "09:00",
    end_time: "17:00",
    total_hours: 8,
    actual_hours: 8,
    overtime_hours: 0,
    hourly_rate: 0,
    payable_amount: 0,
    notes: "",
    sign_in_time: "09:00",
    sign_out_time: "17:00"
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [workingHoursRes, profilesRes, clientsRes, projectsRes] = await Promise.all([
        supabase.from('working_hours').select(`
          *,
          profiles!working_hours_profile_id_fkey (id, full_name, email, role, hourly_rate),
          clients!working_hours_client_id_fkey (id, name, company),
          projects!working_hours_project_id_fkey (id, name)
        `).order('date', { ascending: false }),
        
        supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
        supabase.from('clients').select('*').eq('status', 'active').order('name'),
        supabase.from('projects').select('*').eq('status', 'active').order('name')
      ]);

      if (workingHoursRes.error) throw workingHoursRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setWorkingHours(workingHoursRes.data as WorkingHour[]);
      setProfiles(profilesRes.data as Profile[]);
      setClients(clientsRes.data as Client[]);
      setProjects(projectsRes.data as Project[]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch working hours data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalHours = () => {
    const start = new Date(`2000-01-01T${formData.start_time}`);
    const end = new Date(`2000-01-01T${formData.end_time}`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(0, diff);
  };

  const calculatePayableAmount = () => {
    const regularHours = Math.min(formData.actual_hours, 8);
    const overtimeHours = Math.max(0, formData.actual_hours - 8);
    const regularPay = regularHours * formData.hourly_rate;
    const overtimePay = overtimeHours * formData.hourly_rate * 1.5;
    return regularPay + overtimePay;
  };

  useEffect(() => {
    const totalHours = calculateTotalHours();
    setFormData(prev => ({ 
      ...prev, 
      total_hours: totalHours,
      actual_hours: totalHours
    }));
  }, [formData.start_time, formData.end_time]);

  useEffect(() => {
    const payableAmount = calculatePayableAmount();
    const overtimeHours = Math.max(0, formData.actual_hours - 8);
    setFormData(prev => ({ 
      ...prev, 
      payable_amount: payableAmount,
      overtime_hours: overtimeHours
    }));
  }, [formData.actual_hours, formData.hourly_rate]);

  useEffect(() => {
    const selectedProfile = profiles.find(p => p.id === formData.profile_id);
    if (selectedProfile && selectedProfile.hourly_rate) {
      setFormData(prev => ({ ...prev, hourly_rate: selectedProfile.hourly_rate || 0 }));
    }
  }, [formData.profile_id, profiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);

      const workingHourData = {
        profile_id: formData.profile_id,
        client_id: formData.client_id,
        project_id: formData.project_id,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        total_hours: formData.total_hours,
        actual_hours: formData.actual_hours,
        overtime_hours: formData.overtime_hours,
        hourly_rate: formData.hourly_rate,
        payable_amount: formData.payable_amount,
        notes: formData.notes,
        sign_in_time: formData.sign_in_time,
        sign_out_time: formData.sign_out_time,
        status: 'pending' as WorkingHoursStatus
      };

      const workingHoursArray = [workingHourData];

      const { error } = await supabase
        .from('working_hours')
        .insert(workingHoursArray);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Working hours submitted successfully"
      });

      // Reset form
      setFormData({
        profile_id: "",
        client_id: "",
        project_id: "",
        date: new Date().toISOString().split('T')[0],
        start_time: "09:00",
        end_time: "17:00",
        total_hours: 8,
        actual_hours: 8,
        overtime_hours: 0,
        hourly_rate: 0,
        payable_amount: 0,
        notes: "",
        sign_in_time: "09:00",
        sign_out_time: "17:00"
      });
      setIsCreateMode(false);
      fetchData();
    } catch (error: any) {
      console.error('Error submitting working hours:', error);
      toast({
        title: "Error",
        description: "Failed to submit working hours",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      profile_id: "",
      client_id: "",
      project_id: "",
      date: new Date().toISOString().split('T')[0],
      start_time: "09:00",
      end_time: "17:00",
      total_hours: 8,
      actual_hours: 8,
      overtime_hours: 0,
      hourly_rate: 0,
      payable_amount: 0,
      notes: "",
      sign_in_time: "09:00",
      sign_out_time: "17:00"
    });
    setIsCreateMode(false);
    setEditingWorkingHour(null);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading working hours data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Working Hours</h1>
            <p className="text-gray-600">Track and manage daily working hours</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateMode(true)}>
          <Clock className="h-4 w-4 mr-2" />
          Log Hours
        </Button>
      </div>

      {isCreateMode && (
        <Card>
          <CardHeader>
            <CardTitle>Log Working Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Team Member</Label>
                  <Select value={formData.profile_id} onValueChange={(value) => setFormData(prev => ({ ...prev, profile_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name} - {profile.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Client</Label>
                  <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Project</Label>
                  <Select value={formData.project_id} onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Sign In Time</Label>
                  <Input
                    type="time"
                    value={formData.sign_in_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, sign_in_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Sign Out Time</Label>
                  <Input
                    type="time"
                    value={formData.sign_out_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, sign_out_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Total Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.total_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_hours: parseFloat(e.target.value) || 0 }))}
                    readOnly
                  />
                </div>
                <div>
                  <Label>Actual Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={formData.actual_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, actual_hours: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label>Hourly Rate ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <Label>Payable Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.payable_amount.toFixed(2)}
                    readOnly
                  />
                </div>
              </div>

              {formData.overtime_hours > 0 && (
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-800">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Overtime Detected</span>
                  </div>
                  <p className="text-sm text-orange-700 mt-1">
                    {formData.overtime_hours.toFixed(1)} hours of overtime (1.5x rate applied)
                  </p>
                </div>
              )}

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about the work performed..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Hours"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Working Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Team Member</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Client/Project</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workingHours.map((wh) => (
                  <tr key={wh.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{wh.profiles?.full_name}</div>
                          <div className="text-sm text-gray-600">{wh.profiles?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div>{new Date(wh.date).toLocaleDateString()}</div>
                        <div className="text-gray-600">{wh.start_time} - {wh.end_time}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium">{wh.clients?.name}</div>
                        <div className="text-gray-600">{wh.projects?.name}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div>Actual: {wh.actual_hours}h</div>
                        {wh.overtime_hours > 0 && (
                          <div className="text-orange-600">Overtime: {wh.overtime_hours}h</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span className="font-medium">{wh.payable_amount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="text-xs text-gray-600">@ ${wh.hourly_rate}/hr</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        wh.status === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : wh.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : wh.status === 'paid'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {wh.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <WorkingHoursActions 
                        workingHour={wh}
                        onEdit={() => setEditingWorkingHour(wh)}
                        onRefresh={fetchData}
                      />
                    </td>
                  </tr>
                ))}
                {workingHours.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No working hours found</p>
                      <p className="text-sm">Start by logging your first working hours</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {editingWorkingHour && (
        <EditWorkingHoursDialog
          workingHour={editingWorkingHour}
          open={!!editingWorkingHour}
          onOpenChange={(open) => !open && setEditingWorkingHour(null)}
          onSuccess={fetchData}
          profiles={profiles}
          clients={clients}
          projects={projects}
        />
      )}
    </div>
  );
};
