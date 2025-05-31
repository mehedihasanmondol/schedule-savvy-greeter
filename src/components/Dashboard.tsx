import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FolderOpen, Clock, DollarSign, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeClients: 0,
    currentProjects: 0,
    hoursThisWeek: 0,
    bankBalance: 0,
    scheduledToday: 0,
    pendingApprovals: 0,
    overdueProjects: 0,
    topClient: "",
    topProject: "",
    avgHoursPerDay: 0
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivity();
    fetchTopPerformers();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch employees count
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'active');

      // Fetch active clients count
      const { data: clients } = await supabase
        .from('clients')
        .select('id, company')
        .eq('status', 'active');

      // Fetch current projects count
      const { data: projects } = await supabase
        .from('projects')
        .select('id, end_date, name')
        .eq('status', 'active');

      // Check for overdue projects
      const today = new Date().toISOString().split('T')[0];
      const overdueProjects = projects?.filter(p => p.end_date && p.end_date < today).length || 0;

      // Fetch working hours this week
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
      
      const { data: workingHours } = await supabase
        .from('working_hours')
        .select('total_hours, project_id')
        .gte('date', weekStart.toISOString().split('T')[0])
        .lte('date', weekEnd.toISOString().split('T')[0]);

      // Fetch bank balance with proper select
      const { data: transactions } = await supabase
        .from('bank_transactions')
        .select('amount, type');

      const totalDeposits = transactions?.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalWithdrawals = transactions?.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0) || 0;
      const bankBalance = totalDeposits - totalWithdrawals;

      // Calculate hours this week
      const hoursThisWeek = workingHours?.reduce((sum, h) => sum + h.total_hours, 0) || 0;

      // Fetch today's schedule
      const todayString = new Date().toISOString().split('T')[0];
      const { data: todayHours } = await supabase
        .from('working_hours')
        .select('id')
        .eq('date', todayString);

      // Fetch pending approvals
      const { data: pendingHours } = await supabase
        .from('working_hours')
        .select('id')
        .eq('status', 'pending');

      // Get top client (simplified)
      const topClient = clients && clients.length > 0 ? clients[0].company : '';

      // Fetch top project by hours
      const projectHoursMap = workingHours?.reduce((acc: any, curr) => {
        const projectId = curr.project_id;
        acc[projectId] = (acc[projectId] || 0) + curr.total_hours;
        return acc;
      }, {});

      let topProject = '';
      if (projectHoursMap && projects) {
        const topProjectId = Object.keys(projectHoursMap).reduce((a, b) => 
          projectHoursMap[a] > projectHoursMap[b] ? a : b, Object.keys(projectHoursMap)[0]
        );
        const project = projects.find(p => p.id === topProjectId);
        topProject = project?.name || '';
      }

      // Calculate average hours per day
      const avgHoursPerDay = hoursThisWeek / 7;

      setStats({
        totalEmployees: employees?.length || 0,
        activeClients: clients?.length || 0,
        currentProjects: projects?.length || 0,
        hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
        bankBalance,
        scheduledToday: todayHours?.length || 0,
        pendingApprovals: pendingHours?.length || 0,
        overdueProjects,
        topClient,
        topProject,
        avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: recentHours } = await supabase
        .from('working_hours')
        .select(`
          *,
          employees(name),
          clients(company),
          projects(name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentTransactions } = await supabase
        .from('bank_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      const activities = [
        ...(recentHours?.map(h => ({
          type: 'hours',
          description: `${h.employees?.name} logged ${h.total_hours}h for ${h.projects?.name}`,
          time: new Date(h.created_at).toLocaleDateString(),
          color: 'bg-blue-500'
        })) || []),
        ...(recentTransactions?.map(t => ({
          type: 'transaction',
          description: `${t.type === 'deposit' ? 'Received' : 'Paid'} $${t.amount} - ${t.description}`,
          time: new Date(t.created_at).toLocaleDateString(),
          color: t.type === 'deposit' ? 'bg-green-500' : 'bg-red-500'
        })) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchTopPerformers = async () => {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());

      const { data: weeklyHours } = await supabase
        .from('working_hours')
        .select(`
          total_hours,
          employees(id, name)
        `)
        .gte('date', weekStart.toISOString().split('T')[0]);

      const employeeHours = weeklyHours?.reduce((acc: any, curr) => {
        const employeeId = curr.employees?.id;
        const employeeName = curr.employees?.name;
        if (employeeId && employeeName) {
          if (!acc[employeeId]) {
            acc[employeeId] = { name: employeeName, hours: 0 };
          }
          acc[employeeId].hours += curr.total_hours;
        }
        return acc;
      }, {});

      const topPerformers = Object.values(employeeHours || {})
        .sort((a: any, b: any) => b.hours - a.hours)
        .slice(0, 3);

      setTopPerformers(topPerformers as any[]);
    } catch (error) {
      console.error('Error fetching top performers:', error);
    }
  };

  const dashboardStats = [
    { 
      title: "Total Employees", 
      value: stats.totalEmployees.toString(), 
      icon: Users, 
      color: "text-blue-600",
      subtitle: `${stats.pendingApprovals} pending approvals`
    },
    { 
      title: "Active Clients", 
      value: stats.activeClients.toString(), 
      icon: Building2, 
      color: "text-green-600",
      subtitle: stats.topClient ? `Top: ${stats.topClient}` : "No client data"
    },
    { 
      title: "Current Projects", 
      value: stats.currentProjects.toString(), 
      icon: FolderOpen, 
      color: "text-purple-600",
      subtitle: stats.overdueProjects > 0 ? `${stats.overdueProjects} overdue` : "All on track"
    },
    { 
      title: "Hours This Week", 
      value: `${stats.hoursThisWeek}h`, 
      icon: Clock, 
      color: "text-orange-600",
      subtitle: `${stats.avgHoursPerDay}h avg/day`
    },
    { 
      title: "Bank Balance", 
      value: `$${stats.bankBalance.toLocaleString()}`, 
      icon: DollarSign, 
      color: stats.bankBalance >= 0 ? "text-emerald-600" : "text-red-600",
      subtitle: stats.bankBalance >= 0 ? "Positive balance" : "Negative balance"
    },
    { 
      title: "Scheduled Today", 
      value: stats.scheduledToday.toString(), 
      icon: Calendar, 
      color: "text-indigo-600",
      subtitle: "Active sessions"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="text-sm text-gray-600">
          Welcome back! Here's your business overview.
        </div>
      </div>

      {stats.overdueProjects > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Attention Required</p>
              <p className="text-sm text-red-700">{stats.overdueProjects} project(s) are overdue. Please review project timelines.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 ${activity.color} rounded-full`}></div>
                  <div className="flex-1">
                    <span className="text-sm">{activity.description}</span>
                    <span className="text-xs text-gray-500 ml-2">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performers This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">{performer.name}</p>
                    <p className="text-sm text-gray-600">{performer.hours.toFixed(1)} hours</p>
                  </div>
                  <div className="flex items-center">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2">
                      #{index + 1}
                    </span>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No data available for this week</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">Most Active Project</p>
                  <p className="text-sm text-gray-600">{stats.topProject || "No data"}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div>
                  <p className="font-medium">Avg Hours/Employee</p>
                  <p className="text-sm text-gray-600">{(stats.hoursThisWeek / (stats.totalEmployees || 1)).toFixed(1)}h this week</p>
                </div>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Weekly</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-medium">Pending Approvals</p>
                  <p className="text-sm text-gray-600">{stats.pendingApprovals} hours awaiting approval</p>
                </div>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Action Needed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
