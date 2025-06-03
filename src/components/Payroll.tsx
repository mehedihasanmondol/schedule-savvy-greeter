import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Profile, Payroll as PayrollType, BankAccount } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Calculator, DollarSign } from "lucide-react";

export const Payroll = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollType[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedProfile, setSelectedProfile] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [payPeriodStart, setPayPeriodStart] = useState('');
  const [payPeriodEnd, setPayPeriodEnd] = useState('');
  const [totalHours, setTotalHours] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
    fetchPayrolls();
    fetchBankAccounts();
  }, []);

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

  const fetchPayrolls = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('payroll')
        .select(`
          *,
          profiles (id, full_name, email, role),
          bank_accounts (id, bank_name, account_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayrolls(data as PayrollType[]);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .is('profile_id', null)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setBankAccounts(data as BankAccount[]);
      
      const primary = data.find(acc => acc.is_primary);
      if (primary) setSelectedBankAccount(primary.id);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const generatePayroll = async () => {
    if (!selectedProfile || !payPeriodStart || !payPeriodEnd || !totalHours || !hourlyRate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      const grossPay = totalHours * hourlyRate;
      const deductions = grossPay * 0.1; // 10% deductions
      const netPay = grossPay - deductions;

      const payrollData = {
        profile_id: selectedProfile,
        pay_period_start: payPeriodStart,
        pay_period_end: payPeriodEnd,
        total_hours: totalHours,
        hourly_rate: hourlyRate,
        gross_pay: grossPay,
        deductions: deductions,
        net_pay: netPay,
        status: 'pending' as const,
        bank_account_id: selectedBankAccount || null
      };

      const { data, error } = await supabase
        .from('payroll')
        .insert([payrollData])
        .select('*');

      if (error) throw error;

      toast({
        title: "Success",
        description: "Payroll generated successfully"
      });

      // Reset form
      setSelectedProfile('');
      setTotalHours(0);
      setHourlyRate(0);
      setPayPeriodStart('');
      setPayPeriodEnd('');
      
      // Refresh payroll list
      fetchPayrolls();
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      toast({
        title: "Error",
        description: "Failed to generate payroll",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const updatePayrollStatus = async (id: string, status: 'pending' | 'approved' | 'paid') => {
    try {
      const { error } = await supabase
        .from('payroll')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payroll status updated to ${status}`
      });

      fetchPayrolls();
    } catch (error) {
      console.error('Error updating payroll status:', error);
      toast({
        title: "Error",
        description: "Failed to update payroll status",
        variant: "destructive"
      });
    }
  };

  const handleProfileChange = (profileId: string) => {
    setSelectedProfile(profileId);
    const profile = profiles.find(p => p.id === profileId);
    if (profile && profile.hourly_rate) {
      setHourlyRate(profile.hourly_rate);
    } else {
      setHourlyRate(0);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'approved':
        return <Badge variant="secondary">Approved</Badge>;
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Generate Payroll
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="profile">Employee</Label>
              <Select value={selectedProfile} onValueChange={handleProfileChange}>
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
              <Label htmlFor="bank-account">Bank Account</Label>
              <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                <SelectTrigger id="bank-account">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_number}
                      {account.is_primary && ' (Primary)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="pay-period-start">Pay Period Start</Label>
              <Input
                id="pay-period-start"
                type="date"
                value={payPeriodStart}
                onChange={(e) => setPayPeriodStart(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="pay-period-end">Pay Period End</Label>
              <Input
                id="pay-period-end"
                type="date"
                value={payPeriodEnd}
                onChange={(e) => setPayPeriodEnd(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="total-hours">Total Hours</Label>
              <Input
                id="total-hours"
                type="number"
                value={totalHours}
                onChange={(e) => setTotalHours(parseFloat(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="hourly-rate">Hourly Rate ($)</Label>
              <Input
                id="hourly-rate"
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseFloat(e.target.value))}
              />
            </div>

            <div className="md:col-span-2">
              <Button 
                onClick={generatePayroll} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Payroll'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payroll Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading payroll records...</div>
          ) : payrolls.length === 0 ? (
            <div className="text-center py-4">No payroll records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Pay Period</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell>{payroll.profiles?.full_name}</TableCell>
                      <TableCell>
                        {new Date(payroll.pay_period_start).toLocaleDateString()} - 
                        {new Date(payroll.pay_period_end).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{payroll.total_hours}</TableCell>
                      <TableCell>${payroll.hourly_rate}</TableCell>
                      <TableCell>${payroll.gross_pay.toFixed(2)}</TableCell>
                      <TableCell>${payroll.net_pay.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {payroll.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updatePayrollStatus(payroll.id, 'approved')}
                            >
                              Approve
                            </Button>
                          )}
                          {payroll.status === 'approved' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updatePayrollStatus(payroll.id, 'paid')}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </TableCell>
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
