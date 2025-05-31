import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BankTransaction, Client, Project, Employee } from "@/types/database";
import { useToast } from "@/hooks/use-toast";

export const BankBalance = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"deposit" | "withdrawal">("deposit");
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    description: "",
    amount: 0,
    category: "",
    date: new Date().toISOString().split('T')[0],
    client_id: "",
    project_id: "",
    employee_id: ""
  });

  useEffect(() => {
    fetchTransactions();
    fetchClients();
    fetchProjects();
    fetchEmployees();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_transactions')
        .select(`
          *,
          clients (id, company),
          projects (id, name),
          employees (id, name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as BankTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const transactionData = {
        description: formData.description,
        amount: formData.amount,
        type: transactionType,
        category: formData.category,
        date: formData.date,
        client_id: formData.client_id || null,
        project_id: formData.project_id || null,
        employee_id: formData.employee_id || null
      };

      const { error } = await supabase
        .from('bank_transactions')
        .insert([transactionData]);

      if (error) throw error;
      toast({ title: "Success", description: "Transaction added successfully" });
      
      setIsDialogOpen(false);
      setFormData({ 
        description: "", 
        amount: 0, 
        category: "", 
        date: new Date().toISOString().split('T')[0],
        client_id: "",
        project_id: "",
        employee_id: ""
      });
      fetchTransactions();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Error",
        description: "Failed to save transaction",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (type: "deposit" | "withdrawal") => {
    setTransactionType(type);
    setFormData({ 
      description: "", 
      amount: 0, 
      category: "", 
      date: new Date().toISOString().split('T')[0],
      client_id: "",
      project_id: "",
      employee_id: ""
    });
    setIsDialogOpen(true);
  };

  const getClientName = (transaction: BankTransaction) => {
    return transaction.clients?.company || "-";
  };

  const getProjectName = (transaction: BankTransaction) => {
    return transaction.projects?.name || "-";
  };

  const getEmployeeName = (transaction: BankTransaction) => {
    return transaction.employees?.name || "-";
  };

  const totalDeposits = transactions
    .filter(t => t.type === "deposit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.type === "withdrawal")
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalDeposits - totalWithdrawals;

  if (loading && transactions.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Bank Balance</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2" onClick={() => openDialog("deposit")}>
            <Plus className="h-4 w-4" />
            Add Deposit
          </Button>
          <Button variant="outline" className="flex items-center gap-2" onClick={() => openDialog("withdrawal")}>
            <Minus className="h-4 w-4" />
            Add Withdrawal
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {transactionType === "deposit" ? "Deposit" : "Withdrawal"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {transactionType === "deposit" ? (
                    <>
                      <SelectItem value="Revenue">Revenue</SelectItem>
                      <SelectItem value="Investment">Investment</SelectItem>
                      <SelectItem value="Other Income">Other Income</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Payroll">Payroll</SelectItem>
                      <SelectItem value="Expenses">Expenses</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="client_id">Client (Optional)</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="project_id">Project (Optional)</Label>
              <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Project</SelectItem>
                  {projects.filter(p => !formData.client_id || p.client_id === formData.client_id).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employee_id">Employee (Optional)</Label>
              <Select value={formData.employee_id} onValueChange={(value) => setFormData({ ...formData, employee_id: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Employee</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
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
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : `Add ${transactionType}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Current Balance</CardTitle>
            <Wallet className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${currentBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">As of today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Deposits</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +${totalDeposits.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Withdrawals</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -${totalWithdrawals.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Project</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">{transaction.date}</td>
                    <td className="py-3 px-4 font-medium text-gray-900">{transaction.description}</td>
                    <td className="py-3 px-4 text-gray-600">{transaction.category}</td>
                    <td className="py-3 px-4 text-gray-600">{getClientName(transaction)}</td>
                    <td className="py-3 px-4 text-gray-600">{getProjectName(transaction)}</td>
                    <td className="py-3 px-4 text-gray-600">{getEmployeeName(transaction)}</td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={transaction.type === "deposit" ? "default" : "secondary"}
                        className={transaction.type === "deposit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
                      >
                        {transaction.type}
                      </Badge>
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      transaction.type === "deposit" ? "text-green-600" : "text-red-600"
                    }`}>
                      {transaction.type === "deposit" ? "+" : "-"}${transaction.amount.toLocaleString()}
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
