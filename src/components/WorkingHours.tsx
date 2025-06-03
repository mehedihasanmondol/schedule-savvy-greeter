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
import { Profile, Client, Project, WorkingHour } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar, DollarSign } from "lucide-react";

export const WorkingHours = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([]);
  const [selectedProfile, setSelectedProfile] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hourlyRate, setHourlyRate] = useState(0);
  const [actualHours, setActualHours] = useState(0);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [signInTime, setSignInTime] = useState("");
  const [signOutTime, setSignOutTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
    fetchClients();
    fetchWorkingHours();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchProjects(selectedClient);
    } else {
      setProjects([]);
    }
  }, [selectedClient]);

  useEffect(() => {
    if (selectedProfile) {
      const profile = profiles.find(p => p.id === selectedProfile);
      if (profile && profile.hourly_rate) {
        setHourlyRate(profile.hourly_rate);
      }
    }
  }, [selectedProfile, profiles]);

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
        .order('name');

      if (error) throw error;
      setClients(data as Client[]);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjects = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProjects(data as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchWorkingHours = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('working_hours')
        .select(`
          *,
          profiles!working_hours_profile_id_fkey (id, full_name, role),
          clients!working_hours_client_id_fkey (id, name, company),
          projects!working_hours_project_id_fkey (id, name)
        `)
        .order('date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setWorkingHours(data as WorkingHour[]);
    } catch (error) {
      console.error('Error fetching working hours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalHours = (start: string, end: string) => {
    const startDate = new Date(`2000-01-01T${start}`);
    const endDate = new Date(`2000-01-01T${end}`);
    const diffMs = endDate.getTime() - startDate.getTime();
    return diffMs / (1000 * 60 * 60);
  };

  const resetForm = () => {
    setSelectedProfile("");
    setSelectedClient("");
    setSelectedProject("");
    setDate("");
    setStartTime("");
    setEndTime("");
    setHourlyRate(0);
    setActualHours(0);
    setOvertimeHours(0);
    setSignInTime("");
    setSignOutTime("");
    setNotes("");
  };

  const submitWorkingHours = async () => {
    if (!selectedProfile || !selectedClient || !selectedProject || !date || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const totalHours = calculateTotalHours(startTime, endTime);
      const payableAmount = totalHours * hourlyRate;

      const workingHoursData = {
        total_hours: totalHours,
        actual_hours: actualHours,
        overtime_hours: overtimeHours,
        payable_amount: payableAmount,
        sign_in_time: signInTime,
        sign_out_time: signOutTime,
        profile_id: selectedProfile,
        client_id: selectedClient,
        project_id: selectedProject,
        date: date,
        start_time: startTime,
        end_time: endTime,
        hourly_rate: hourlyRate,
        notes: notes,
        status: 'pending' as const
      };

      const { data, error } = await supabase
        .from('working_hours')
        .insert([workingHoursData])
        .select('*');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Working hours submitted successfully"
      });

      // Reset form
      resetForm();
      
      // Refresh working hours
      fetchWorkingHours();
    } catch (error: any) {
      console.error('Error submitting working hours:', error);
      toast({
        title: "Error",
        description: "Failed to submit working hours",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-blue-500">Paid</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Submit Working Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="profile">Employee</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger id="profile">
                  <SelectValue placeholder="Select employee" />
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
                <SelectTrigger id="client">
                  <SelectValue placeholder="Select client" />
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
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject} disabled={!selectedClient}>
                <SelectTrigger id="project">
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

            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="actualHours">Actual Hours (optional)</Label>
              <Input
                id="actualHours"
                type="number"
                value={actualHours}
                onChange={(e) => setActualHours(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="overtimeHours">Overtime Hours (optional)</Label>
              <Input
                id="overtimeHours"
                type="number"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="signInTime">Sign In Time (optional)</Label>
              <Input
                id="signInTime"
                type="time"
                value={signInTime}
                onChange={(e) => setSignInTime(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="signOutTime">Sign Out Time (optional)</Label>
              <Input
                id="signOutTime"
                type="time"
                value={signOutTime}
                onChange={(e) => setSignOutTime(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={submitWorkingHours} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Working Hours"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Working Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workingHours.map((wh) => (
                    <TableRow key={wh.id}>
                      <TableCell>{new Date(wh.date).toLocaleDateString()}</TableCell>
                      <TableCell>{wh.profiles?.full_name}</TableCell>
                      <TableCell>{wh.clients?.name}</TableCell>
                      <TableCell>{wh.projects?.name}</TableCell>
                      <TableCell>{wh.total_hours}</TableCell>
                      <TableCell>${wh.hourly_rate}</TableCell>
                      <TableCell>${wh.payable_amount?.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(wh.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
