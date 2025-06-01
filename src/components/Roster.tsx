
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar as CalendarIcon, Clock, User, Edit, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { WorkingHour, Profile, Client, Project } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { ProfileSelector } from "@/components/common/ProfileSelector";

// Define a local interface for Roster to avoid naming conflicts
interface RosterEntry {
  id: string;
  profile_id: string;
  client_id: string;
  project_id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  status: string;
  notes?: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  clients?: Client;
  projects?: Project;
}

export const Roster = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [rosters, setRosters] = useState<RosterEntry[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoster, setEditingRoster] = useState<RosterEntry | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    profile_id: "",
    client_id: "",
    project_id: "",
    date: "",
    start_time: "",
    end_time: "",
    notes: "",
    status: "pending"
  });

  useEffect(() => {
    if (selectedDate) {
      fetchRosterData();
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchProfiles();
    fetchClients();
    fetchProjects();
  }, []);

  const fetchRosterData = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      // Fetch rosters for selected date
      const { data: rosterData, error: rosterError } = await supabase
        .from('rosters')
        .select(`
          *,
          profiles!rosters_profile_id_fkey (id, full_name, role),
          clients!rosters_client_id_fkey (id, company),
          projects!rosters_project_id_fkey (id, name)
        `)
        .eq('date', dateStr)
        .order('start_time');

      if (rosterError) throw rosterError;
      
      const rosterEntries = (rosterData || []).map(roster => ({
        ...roster,
        profiles: Array.isArray(roster.profiles) ? roster.profiles[0] : roster.profiles,
        clients: Array.isArray(roster.clients) ? roster.clients[0] : roster.clients,
        projects: Array.isArray(roster.projects) ? roster.projects[0] : roster.projects
      }));
      
      setRosters(rosterEntries as RosterEntry[]);

      // Fetch working hours for selected date to check approval status
      const { data: workingHoursData, error: whError } = await supabase
        .from('working_hours')
        .select(`
          *,
          profiles!working_hours_profile_id_fkey (id, full_name, role),
          clients!working_hours_client_id_fkey (id, company),
          projects!working_hours_project_id_fkey (id, name)
        `)
        .eq('date', dateStr)
        .order('start_time');

      if (whError) throw whError;
      
      const workingHoursEntries = (workingHoursData || []).map(wh => ({
        ...wh,
        profiles: Array.isArray(wh.profiles) ? wh.profiles[0] : wh.profiles,
        clients: Array.isArray(wh.clients) ? wh.clients[0] : wh.clients,
        projects: Array.isArray(wh.projects) ? wh.projects[0] : wh.projects
      }));
      
      setWorkingHours(workingHoursEntries as WorkingHour[]);
      
    } catch (error) {
      console.error('Error fetching roster data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch roster data",
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
        .eq('status', 'active')
        .order('company');

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
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProjects(data as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const calculateTotalHours = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, diffHours);
  };

  const getApprovedHoursForRoster = (rosterId: string) => {
    return workingHours.filter(wh => 
      wh.roster_id === rosterId && wh.status === 'approved'
    ).length;
  };

  const isRosterEditable = (roster: RosterEntry) => {
    const approvedHours = getApprovedHoursForRoster(roster.id);
    return approvedHours === 0 && !roster.is_locked;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalHours = calculateTotalHours(formData.start_time, formData.end_time);
      
      const rosterData = {
        ...formData,
        total_hours: totalHours
      };

      if (editingRoster) {
        const { error } = await supabase
          .from('rosters')
          .update(rosterData)
          .eq('id', editingRoster.id);

        if (error) throw error;
        toast({ title: "Success", description: "Roster updated successfully" });
      } else {
        const { error } = await supabase
          .from('rosters')
          .insert([rosterData]);

        if (error) throw error;
        toast({ title: "Success", description: "Roster entry added successfully" });
      }
      
      setIsDialogOpen(false);
      setEditingRoster(null);
      resetForm();
      fetchRosterData();
    } catch (error) {
      console.error('Error saving roster entry:', error);
      toast({
        title: "Error",
        description: "Failed to save roster entry",
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
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : "",
      start_time: "",
      end_time: "",
      notes: "",
      status: "pending"
    });
  };

  const handleEdit = (roster: RosterEntry) => {
    if (!isRosterEditable(roster)) {
      toast({
        title: "Cannot Edit",
        description: "This roster cannot be edited because it has approved working hours.",
        variant: "destructive"
      });
      return;
    }

    setEditingRoster(roster);
    setFormData({
      profile_id: roster.profile_id,
      client_id: roster.client_id,
      project_id: roster.project_id,
      date: roster.date,
      start_time: roster.start_time,
      end_time: roster.end_time,
      notes: roster.notes || "",
      status: roster.status
    });
    setIsDialogOpen(true);
  };

  const getTotalHoursForDay = () => {
    return rosters.reduce((total, roster) => total + roster.total_hours, 0);
  };

  if (loading && rosters.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Roster Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" onClick={() => {
              setEditingRoster(null);
              resetForm();
            }}>
              <Plus className="h-4 w-4" />
              Add Roster Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRoster ? "Edit Roster Entry" : "Add New Roster Entry"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <ProfileSelector
                profiles={profiles}
                selectedProfileId={formData.profile_id}
                onProfileSelect={(profileId) => setFormData({ ...formData, profile_id: profileId })}
                label="Select Profile"
                placeholder="Choose a team member"
                showRoleFilter={true}
              />
              
              <div>
                <Label htmlFor="client_id">Client</Label>
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
                <Label htmlFor="project_id">Project</Label>
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
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes for this roster entry..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving..." : editingRoster ? "Update Roster Entry" : "Add Roster Entry"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Daily Roster - {selectedDate?.toDateString()}
              </CardTitle>
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {getTotalHoursForDay().toFixed(1)}h total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profiles.map((profile) => {
                const profileRosters = rosters.filter(r => r.profile_id === profile.id);
                const totalHours = profileRosters.reduce((sum, r) => sum + r.total_hours, 0);
                
                return (
                  <div key={profile.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{profile.full_name}</h4>
                        <p className="text-sm text-gray-600">{profile.role}</p>
                      </div>
                      <Badge variant="outline">{totalHours.toFixed(1)}h</Badge>
                    </div>
                    
                    {profileRosters.length > 0 ? (
                      <div className="space-y-2">
                        {profileRosters.map((roster) => {
                          const approvedHours = getApprovedHoursForRoster(roster.id);
                          const isEditable = isRosterEditable(roster);
                          
                          return (
                            <div key={roster.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{roster.start_time} - {roster.end_time}</span>
                                  <span className="text-sm text-gray-600">({roster.total_hours}h)</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm text-gray-600">{roster.projects?.name}</span>
                                  <Badge variant={roster.status === "confirmed" ? "default" : roster.status === "pending" ? "secondary" : "outline"} className="text-xs">
                                    {roster.status}
                                  </Badge>
                                </div>
                                {!isEditable && (
                                  <div className="flex items-center gap-1 text-xs text-orange-600">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Roster not editable: {approvedHours} hour(s) already approved</span>
                                  </div>
                                )}
                                {roster.notes && (
                                  <p className="text-xs text-gray-500 mt-1">{roster.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEdit(roster)}
                                  disabled={!isEditable}
                                  className={!isEditable ? "opacity-50 cursor-not-allowed" : ""}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No scheduled hours</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
