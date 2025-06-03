import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Client, Project, Roster as RosterType } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users } from "lucide-react";

export const Roster = () => {
  const [rosters, setRosters] = useState<RosterType[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [rosterName, setRosterName] = useState('');
  const [expectedProfiles, setExpectedProfiles] = useState(1);
  const [perHourRate, setPerHourRate] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchRosters();
    fetchProfiles();
    fetchClients();
    fetchProjects();
  }, []);

  const fetchRosters = async () => {
    try {
      const { data, error } = await supabase
        .from('rosters')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setRosters(data as RosterType[]);
    } catch (error) {
      console.error('Error fetching rosters:', error);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
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
        .order('name');

      if (error) throw error;
      setProjects(data as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const calculateTotalHours = (start: string, end: string) => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    let diffInMinutes = endTimeInMinutes - startTimeInMinutes;
    if (diffInMinutes < 0) {
      diffInMinutes += 24 * 60;
    }

    return diffInMinutes / 60;
  };

  const resetForm = () => {
    setSelectedProfile('');
    setSelectedClient('');
    setSelectedProject('');
    setDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setNotes('');
    setRosterName('');
    setExpectedProfiles(1);
    setPerHourRate(0);
  };

  const createRoster = async () => {
    if (!selectedProfile || !selectedClient || !selectedProject || !date || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCreating(true);

      const rosterData = {
        profile_id: selectedProfile,
        client_id: selectedClient,
        project_id: selectedProject,
        date: date,
        end_date: endDate || date,
        start_time: startTime,
        end_time: endTime,
        total_hours: calculateTotalHours(startTime, endTime),
        notes: notes,
        status: 'pending' as const,
        name: rosterName,
        expected_profiles: expectedProfiles,
        per_hour_rate: perHourRate
      };

      const { data, error } = await supabase
        .from('rosters')
        .insert([rosterData])
        .select('*');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Roster created successfully"
      });

      // Reset form
      resetForm();
      
      // Refresh rosters
      fetchRosters();
    } catch (error: any) {
      console.error('Error creating roster:', error);
      toast({
        title: "Error",
        description: "Failed to create roster",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="rosterName">Roster Name</Label>
              <Input
                id="rosterName"
                value={rosterName}
                onChange={(e) => setRosterName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="profile">Profile</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="Select profile" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="client">Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
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
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  type="date"
                  id="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  type="time"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  type="time"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expectedProfiles">Expected Profiles</Label>
                <Input
                  type="number"
                  id="expectedProfiles"
                  value={expectedProfiles}
                  onChange={(e) => setExpectedProfiles(parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="perHourRate">Per Hour Rate</Label>
                <Input
                  type="number"
                  id="perHourRate"
                  value={perHourRate}
                  onChange={(e) => setPerHourRate(parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <Button className="mt-4" onClick={createRoster} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Roster"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roster List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rosters.map((roster) => (
                <TableRow key={roster.id}>
                  <TableCell>{roster.name}</TableCell>
                  <TableCell>
                    {profiles.find((profile) => profile.id === roster.profile_id)?.full_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {clients.find((client) => client.id === roster.client_id)?.company || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {projects.find((project) => project.id === roster.project_id)?.name || 'N/A'}
                  </TableCell>
                  <TableCell>{new Date(roster.date).toLocaleDateString()}</TableCell>
                  <TableCell>{roster.start_time}</TableCell>
                  <TableCell>{roster.end_time}</TableCell>
                  <TableCell>{roster.total_hours}</TableCell>
                  <TableCell>
                    <Badge>{roster.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
