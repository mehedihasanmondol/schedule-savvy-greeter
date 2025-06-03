import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, DollarSign, Calendar, Users, Printer, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Payroll, Profile, BankAccount } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { PayrollDetailsDialog } from "./PayrollDetailsDialog";
import { SalarySheetPrintView } from "./SalarySheetPrintView";

interface SalarySheetManagerProps {
  onRefresh?: () => void;
}

export const SalarySheetManager = ({ onRefresh }: SalarySheetManagerProps) => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [isPrintViewOpen, setIsPrintViewOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayrolls();
    fetchProfiles();
    fetchBankAccounts();
  }, []);

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payroll')
        .select('*')
        .order('pay_period_end', { ascending: false });

      if (selectedProfile) {
        query = query.eq('profile_id', selectedProfile);
      }

      if (selectedStatus) {
        query = query.eq('status', selectedStatus);
      }

      if (dateRange.from) {
        query = query.gte('pay_period_end', dateRange.from);
      }

      if (dateRange.to) {
        query = query.lte('pay_period_end', dateRange.to);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setPayrolls(data || []);
    } catch (error: any) {
      console.error('Error fetching payrolls:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payrolls",
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
        .order('full_name');

      if (error) {
        throw error;
      }

      setProfiles(data || []);
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch profiles",
        variant: "destructive"
      });
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*');

      if (error) {
        throw error;
      }

      setBankAccounts(data || []);
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bank accounts",
        variant: "destructive"
      });
    }
  };

  const handleViewDetails = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setDetailsDialogOpen(true);
  };

  const filteredPayrolls = () => {
    return payrolls.filter(payroll => {
      const profileMatch = !selectedProfile || payroll.profile_id === selectedProfile;
      const statusMatch = !selectedStatus || payroll.status === selectedStatus;
      const dateMatch = (!dateRange.from || new Date(payroll.pay_period_end) >= new Date(dateRange.from)) &&
        (!dateRange.to || new Date(payroll.pay_period_end) <= new Date(dateRange.to));

      return profileMatch && statusMatch && dateMatch;
    });
  };

  const handlePrintSalarySheets = () => {
    setIsPrintViewOpen(true);
  };

  const handleClosePrintView = () => {
    setIsPrintViewOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Salary Sheet Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="profile">Filter by Employee</Label>
              <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Employees</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Filter by Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <CardTitle className="text-xl font-bold">Salary Sheets</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={fetchPayrolls} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
              <Button onClick={handlePrintSalarySheets}>
                <Printer className="h-4 w-4 mr-2" />
                Print Salary Sheets
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Pay Period</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayrolls().map((payroll) => {
                const profile = profiles.find(p => p.id === payroll.profile_id);
                return (
                  <TableRow key={payroll.id}>
                    <TableCell>{profile?.full_name}</TableCell>
                    <TableCell>{payroll.pay_period_start} to {payroll.pay_period_end}</TableCell>
                    <TableCell>{payroll.total_hours}</TableCell>
                    <TableCell>{payroll.hourly_rate}</TableCell>
                    <TableCell>{payroll.gross_pay}</TableCell>
                    <TableCell>{payroll.deductions}</TableCell>
                    <TableCell>{payroll.net_pay}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payroll.status === 'paid'
                            ? 'success'
                            : payroll.status === 'approved'
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {payroll.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(payroll)}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedPayroll && (
        <PayrollDetailsDialog
          payroll={selectedPayroll}
          isOpen={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          onRefresh={() => {
            fetchPayrolls();
            onRefresh?.();
          }}
        />
      )}

      <SalarySheetPrintView
        isOpen={isPrintViewOpen}
        onClose={handleClosePrintView}
        payrolls={filteredPayrolls()}
        profiles={profiles}
        bankAccounts={bankAccounts}
      />
    </div>
  );
};
