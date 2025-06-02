import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Users, Clock, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Client, Project, Roster } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { MultipleProfileSelector } from "./common/MultipleProfileSelector";
import type { Database } from "@/integrations/supabase/types";

type RosterStatus = Database["public"]["Enums"]["roster_status"];

export const Roster = () => {
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [editingRoster, setEditingRoster] = useState<Roster | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    project_id: "",
    date: new Date().toISOString().split('T')[0],
    end_date: "",
    start_time: "09:00",
    end_time: "17:00",
    total_hours: 8,
    notes: "",
    expected_profiles: 1,
    per_hour_rate: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [rostersRes, profilesRes, clientsRes, projectsRes] = await Promise.all([
        supabase.from('rosters').select(`
          *,
          profiles!rosters_profile_id_fkey (id, full_name, email, role),
          clients (id, name, company),
          projects (id, name),
          roster_profiles (
            profile_id,
            profiles (id, full_name, email, role)
          )
        `).order('created_at', { ascending: false }),
        
        supabase.from('profiles').select('*').eq('is_active', true).order('full_name'),
        supabase.from('clients').select('*').eq('status', 'active').order('name'),
        supabase.from('projects').select('*').eq('status', 'active').order('name')
      ]);

      if (rostersRes.error) throw rostersRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (projectsRes.error) throw projectsRes.error;

      setRosters(rostersRes.data as Roster[]);
      setProfiles(profilesRes.data as Profile[]);
      setClients(clientsRes.data as Client[]);
      setProjects(projectsRes.data as Project[]);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch roster data",
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

  useEffect(() => {
    const totalHours = calculateTotalHours();
    setFormData(prev => ({ ...prev, total_hours: totalHours }));
  }, [formData.start_time, formData.end_time]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedProfileIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one profile",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      if (editingRoster) {
        // Update existing roster
        const { error: rosterError } = await supabase
          .from('rosters')
          .update({
            name: formData.name,
            client_id: formData.client_id,
            project_id: formData.project_id,
            date: formData.date,
            end_date: formData.end_date || null,
            start_time: formData.start_time,
            end_time: formData.end_time,
            total_hours: formData.total_hours,
            notes: formData.notes,
            expected_profiles: formData.expected_profiles,
            per_hour_rate: formData.per_hour_rate
          })
          .eq('id', editingRoster.id);

        if (rosterError) throw rosterError;

        // Update roster profiles
        await supabase.from('roster_profiles').delete().eq('roster_id', editingRoster.id);
        
        const rosterProfiles = selectedProfileIds.map(profileId => ({
          roster_id: editingRoster.id,
          profile_id: profileId
        }));

        const { error: profilesError } = await supabase
          .from('roster_profiles')
          .insert(rosterProfiles);

        if (profilesError) throw profilesError;

        toast({
          title: "Success",
          description: "Roster updated successfully"
        });
      } else {
        // Create multiple roster records for bulk creation
        const rosterRecords = selectedProfileIds.map(profileId => ({
          profile_id: profileId,
          client_id: formData.client_id,
          project_id: formData.project_id,
          date: formData.date,
          end_date: formData.end_date || null,
          start_time: formData.start_time,
          end_time: formData.end_time,
          total_hours: formData.total_hours,
          notes: formData.notes,
          status: 'pending' as RosterStatus,
          name: formData.name,
          expected_profiles: formData.expected_profiles,
          per_hour_rate: formData.per_hour_rate
        }));

        const { error } = await supabase
          .from('rosters')
          .insert(rosterRecords);

        if (error) throw error;

        toast({
          title: "Success",
          description: `${selectedProfileIds.length} roster(s) created successfully`
        });
      }

      // Reset form
      setFormData({
        name: "",
        client_id: "",
        project_id: "",
        date: new Date().toISOString().split('T')[0],
        end_date: "",
        start_time: "09:00",
        end_time: "17:00",
        total_hours: 8,
        notes: "",
        expected_profiles: 1,
        per_hour_rate: 0
      });
      setSelectedProfileIds([]);
      setIsCreateMode(false);
      setEditingRoster(null);
      fetchData();
    } catch (error: any) {
      console.error('Error saving roster:', error);
      toast({
        title: "Error",
        description: "Failed to save roster",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const editRoster = (roster: Roster) => {
    setEditingRoster(roster);
    setFormData({
      name: roster.name || "",
      client_id: roster.client_id,
      project_id: roster.project_id,
      date: roster.date,
      end_date: roster.end_date || "",
      start_time: roster.start_time,
      end_time: roster.end_time,
      total_hours: roster.total_hours,
      notes: roster.notes || "",
      expected_profiles: roster.expected_profiles || 1,
      per_hour_rate: roster.per_hour_rate || 0
    });
    setIsCreateMode(true);
  };

  const deleteRoster = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this roster?')) {
      try {
        const { error } = await supabase.from('rosters').delete().eq('id', id);
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Roster deleted successfully"
        });
        fetchData();
      } catch (error: any) {
        console.error('Error deleting roster:', error);
        toast({
          title: "Error",
          description: "Failed to delete roster",
          variant: "destructive"
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      client_id: "",
      project_id: "",
      date: new Date().toISOString().split('T')[0],
      end_date: "",
      start_time: "09:00",
      end_time: "17:00",
      total_hours: 8,
      notes: "",
      expected_profiles: 1,
      per_hour_rate: 0
    });
    setSelectedProfileIds([]);
    setIsCreateMode(false);
    setEditingRoster(null);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading roster data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Roster Management</h1>
            <p className="text-gray-600">Schedule and manage team assignments</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateMode(true)}>
          <Users className="h-4 w-4 mr-2" />
          Create Roster
        </Button>
      </div>

      {isCreateMode && (
        <Card>
          <CardHeader>
            <CardTitle>{editingRoster ? 'Edit Roster' : 'Create New Roster'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Roster Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter roster name"
                    required
                  />
                </div>
                <div>
                  <Label>Expected Profiles</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.expected_profiles}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_profiles: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div>
                  <Label>Per Hour Rate ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.per_hour_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, per_hour_rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div>
                <Label>Total Hours: {formData.total_hours.toFixed(1)}</Label>
                <div className="text-sm text-gray-600 mt-1">
                  Automatically calculated from start and end time
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <MultipleProfileSelector
                profiles={profiles}
                selectedProfileIds={selectedProfileIds}
                onProfileSelect={setSelectedProfileIds}
                label="Assign Team Members"
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : (editingRoster ? "Update Roster" : "Create Roster")}
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
          <CardTitle>Existing Rosters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Client/Project</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rosters.map((roster) => (
                  <tr key={roster.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{roster.name}</div>
                      <div className="text-sm text-gray-600">{roster.notes}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium">{roster.clients?.name}</div>
                        <div className="text-gray-600">{roster.projects?.name}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">
                        <div>{new Date(roster.date).toLocaleDateString()}</div>
                        {roster.end_date && (
                          <div className="text-gray-600">to {new Date(roster.end_date).toLocaleDateString()}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {roster.start_time} - {roster.end_time}
                    </td>
                    <td className="py-3 px-4 text-sm">{roster.total_hours}h</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        roster.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : roster.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {roster.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => editRoster(roster)}
                          disabled={!roster.is_editable}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => deleteRoster(roster.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rosters.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No rosters found</p>
                      <p className="text-sm">Create your first roster to get started</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
