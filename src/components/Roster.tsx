
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Users, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Client, Project } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { EnhancedProfileSelector } from "./salary/EnhancedProfileSelector";

interface RosterData {
  id: string;
  name: string;
  profile_id: string;
  client_id: string;
  project_id: string;
  date: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  expected_profiles: number;
  per_hour_rate: number;
  notes?: string;
  status: string;
  is_editable: boolean;
}

export const Roster = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rosters, setRosters] = useState<RosterData[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [showSelectedProfiles, setShowSelectedProfiles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: `Roster ${new Date().toLocaleString()}`,
    client_id: "",
    project_id: "",
    date: new Date().toISOString().split('T')[0],
    end_date: "",
    start_time: "09:00",
    end_time: "17:00",
    expected_profiles: 1,
    per_hour_rate: 0,
    notes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateTotalHours();
  }, [formData.start_time, formData.end_time]);

  const fetchData = async () => {
    try {
      const [profilesRes, clientsRes, projectsRes, rostersRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('is_active', true),
        supabase.from('clients').select('*').eq('status', 'active'),
        supabase.from('projects').select('*, clients(*)'),
        supabase.from('rosters').select('*, profiles(*), clients(*), projects(*)').order('created_at', { ascending: false })
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (projectsRes.error) throw projectsRes.error;
      if (rostersRes.error) throw rostersRes.error;

      setProfiles(profilesRes.data as Profile[]);
      setClients(clientsRes.data as Client[]);
      setProjects(projectsRes.data as Project[]);
      setRosters(rostersRes.data as RosterData[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive"
      });
    }
  };

  const calculateTotalHours = () => {
    const start = new Date(`2000-01-01 ${formData.start_time}`);
    const end = new Date(`2000-01-01 ${formData.end_time}`);
    const diffMs = end.getTime() - start.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return Math.max(0, hours);
  };

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
      const totalHours = calculateTotalHours();

      for (const profileId of selectedProfileIds) {
        const rosterData = {
          name: formData.name,
          profile_id: profileId,
          client_id: formData.client_id,
          project_id: formData.project_id,
          date: formData.date,
          end_date: formData.end_date || null,
          start_time: formData.start_time,
          end_time: formData.end_time,
          total_hours: totalHours,
          expected_profiles: formData.expected_profiles,
          per_hour_rate: formData.per_hour_rate,
          notes: formData.notes,
          status: 'pending'
        };

        const { error } = await supabase
          .from('rosters')
          .insert(rosterData);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Created roster for ${selectedProfileIds.length} profiles`
      });

      // Reset form
      setFormData({
        name: `Roster ${new Date().toLocaleString()}`,
        client_id: "",
        project_id: "",
        date: new Date().toISOString().split('T')[0],
        end_date: "",
        start_time: "09:00",
        end_time: "17:00",
        expected_profiles: 1,
        per_hour_rate: 0,
        notes: ""
      });
      setSelectedProfileIds([]);
      fetchData();
    } catch (error) {
      console.error('Error creating roster:', error);
      toast({
        title: "Error",
        description: "Failed to create roster",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => p.client_id === formData.client_id);

  return (
    <div className="space-y-6">
      {/* Roster Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create New Roster
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Roster Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter roster name"
                />
              </div>

              <div>
                <Label htmlFor="client">Client</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value, project_id: "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company} - {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="project">Project</Label>
                <Select value={formData.project_id} onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Start Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="expected_profiles">Expected Profiles</Label>
                <Input
                  id="expected_profiles"
                  type="number"
                  min="1"
                  value={formData.expected_profiles}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_profiles: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div>
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="per_hour_rate">Per Hour Rate ($)</Label>
                <Input
                  id="per_hour_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.per_hour_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, per_hour_rate: parseFloat(e.target.value) || 0 }))}
                  placeholder="Leave 0 to use profile rate"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter any additional notes..."
              />
            </div>

            {/* Profile Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Team Members</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSelectedProfiles(!showSelectedProfiles)}
                  className="flex items-center gap-2"
                >
                  {showSelectedProfiles ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showSelectedProfiles ? 'Hide' : 'View'} Selected ({selectedProfileIds.length})
                </Button>
              </div>

              {showSelectedProfiles && selectedProfileIds.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2">Selected Team Members:</h4>
                  <div className="space-y-1">
                    {selectedProfileIds.map(id => {
                      const profile = profiles.find(p => p.id === id);
                      return profile ? (
                        <div key={id} className="text-sm">
                          • {profile.full_name} ({profile.role})
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <EnhancedProfileSelector
                profiles={profiles}
                workingHours={[]}
                selectedProfileIds={selectedProfileIds}
                onProfileSelect={setSelectedProfileIds}
                mode="multiple"
                label="Available Team Members"
                showStats={false}
              />
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Total Hours: {calculateTotalHours().toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Selected Profiles: {selectedProfileIds.length}</span>
              </div>
            </div>

            <Button type="submit" disabled={loading || !formData.client_id || !formData.project_id || selectedProfileIds.length === 0}>
              {loading ? "Creating..." : "Create Roster"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Rosters List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Rosters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Profile</th>
                  <th className="text-left py-3 px-4">Client</th>
                  <th className="text-left py-3 px-4">Project</th>
                  <th className="text-left py-3 px-4">Date Range</th>
                  <th className="text-left py-3 px-4">Time</th>
                  <th className="text-left py-3 px-4">Hours</th>
                  <th className="text-left py-3 px-4">Status</th>
                  <th className="text-left py-3 px-4">Editable</th>
                </tr>
              </thead>
              <tbody>
                {rosters.map((roster) => (
                  <tr key={roster.id} className="border-b">
                    <td className="py-3 px-4 font-medium">{roster.name}</td>
                    <td className="py-3 px-4">{roster.profile_id}</td>
                    <td className="py-3 px-4">{roster.client_id}</td>
                    <td className="py-3 px-4">{roster.project_id}</td>
                    <td className="py-3 px-4">
                      {roster.date}
                      {roster.end_date && ` - ${roster.end_date}`}
                    </td>
                    <td className="py-3 px-4">{roster.start_time} - {roster.end_time}</td>
                    <td className="py-3 px-4">{roster.total_hours}h</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${roster.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {roster.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${roster.is_editable ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {roster.is_editable ? 'Yes' : 'No'}
                      </span>
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
