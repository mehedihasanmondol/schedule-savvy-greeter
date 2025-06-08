
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Payroll, Profile, BankAccount, WorkingHour } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PayrollEditDialogProps {
  payroll: Payroll | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  profiles: Profile[];
  bankAccounts: BankAccount[];
}

interface PayrollWorkingHoursData {
  id: string;
  payroll_id: string;
  working_hours_id: string;
  created_at: string;
  working_hours: {
    id: string;
    profile_id: string;
    client_id: string;
    project_id: string;
    date: string;
    start_time: string;
    end_time: string;
    total_hours: number;
    status: string;
    hourly_rate: number;
    payable_amount: number;
    actual_hours: number;
    overtime_hours: number;
    notes: string;
    created_at: string;
    updated_at: string;
    clients: {
      id: string;
      name: string;
    };
    projects: {
      id: string;
      name: string;
    };
  };
}

export const PayrollEditDialog = ({ 
  payroll, 
  isOpen, 
  onClose, 
  onSave, 
  profiles, 
  bankAccounts 
}: PayrollEditDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [linkedWorkingHours, setLinkedWorkingHours] = useState<WorkingHour[]>([]);
  const [loadingWorkingHours, setLoadingWorkingHours] = useState(false);
  
  const [formData, setFormData] = useState({
    profile_id: '',
    pay_period_start: '',
    pay_period_end: '',
    total_hours: 0,
    hourly_rate: 0,
    gross_pay: 0,
    deductions: 0,
    net_pay: 0,
    status: 'pending' as 'pending' | 'approved' | 'paid',
    bank_account_id: ''
  });

  useEffect(() => {
    if (payroll && isOpen) {
      setFormData({
        profile_id: payroll.profile_id || '',
        pay_period_start: payroll.pay_period_start || '',
        pay_period_end: payroll.pay_period_end || '',
        total_hours: payroll.total_hours || 0,
        hourly_rate: payroll.hourly_rate || 0,
        gross_pay: payroll.gross_pay || 0,
        deductions: payroll.deductions || 0,
        net_pay: payroll.net_pay || 0,
        status: payroll.status || 'pending',
        bank_account_id: payroll.bank_account_id || ''
      });
      
      fetchLinkedWorkingHours(payroll.id);
    }
  }, [payroll, isOpen]);

  const fetchLinkedWorkingHours = async (payrollId: string) => {
    try {
      setLoadingWorkingHours(true);
      
      const { data, error } = await supabase
        .from('payroll_working_hours')
        .select(`
          *,
          working_hours (
            *,
            clients!working_hours_client_id_fkey (id, name),
            projects!working_hours_project_id_fkey (id, name)
          )
        `)
        .eq('payroll_id', payrollId);

      if (error) throw error;
      
      // Extract working hours from the linked data
      const workingHoursData = (data as PayrollWorkingHoursData[])?.map(item => item.working_hours) || [];
      setLinkedWorkingHours(workingHoursData as WorkingHour[]);
    } catch (error) {
      console.error('Error fetching linked working hours:', error);
      toast({
        title: "Error",
        description: "Failed to fetch linked working hours",
        variant: "destructive"
      });
    } finally {
      setLoadingWorkingHours(false);
    }
  };

  const calculatePayroll = () => {
    const grossPay = formData.total_hours * formData.hourly_rate;
    const netPay = grossPay - formData.deductions;
    
    setFormData(prev => ({
      ...prev,
      gross_pay: grossPay,
      net_pay: netPay
    }));
  };

  useEffect(() => {
    calculatePayroll();
  }, [formData.total_hours, formData.hourly_rate, formData.deductions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payroll) return;
    
    setLoading(true);

    try {
      const { error } = await supabase
        .from('payroll')
        .update({
          profile_id: formData.profile_id,
          pay_period_start: formData.pay_period_start,
          pay_period_end: formData.pay_period_end,
          total_hours: formData.total_hours,
          hourly_rate: formData.hourly_rate,
          gross_pay: formData.gross_pay,
          deductions: formData.deductions,
          net_pay: formData.net_pay,
          status: formData.status,
          bank_account_id: formData.bank_account_id || null
        })
        .eq('id', payroll.id);

      if (error) throw error;

      toast({ title: "Success", description: "Payroll updated successfully" });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating payroll:', error);
      toast({
        title: "Error",
        description: "Failed to update payroll",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!payroll) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payroll</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="profile_id">Profile</Label>
              <Select value={formData.profile_id} onValueChange={(value) => setFormData({ ...formData, profile_id: value })}>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pay_period_start">Pay Period Start</Label>
                <Input
                  id="pay_period_start"
                  type="date"
                  value={formData.pay_period_start}
                  onChange={(e) => setFormData({ ...formData, pay_period_start: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="pay_period_end">Pay Period End</Label>
                <Input
                  id="pay_period_end"
                  type="date"
                  value={formData.pay_period_end}
                  onChange={(e) => setFormData({ ...formData, pay_period_end: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="total_hours">Total Hours</Label>
                <Input
                  id="total_hours"
                  type="number"
                  step="0.01"
                  value={formData.total_hours}
                  onChange={(e) => setFormData({ ...formData, total_hours: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="hourly_rate">Hourly Rate</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gross_pay">Gross Pay</Label>
                <Input
                  id="gross_pay"
                  type="number"
                  step="0.01"
                  value={formData.gross_pay}
                  readOnly
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="deductions">Deductions</Label>
                <Input
                  id="deductions"
                  type="number"
                  step="0.01"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="net_pay">Net Pay</Label>
              <Input
                id="net_pay"
                type="number"
                step="0.01"
                value={formData.net_pay}
                readOnly
                className="bg-gray-100 font-bold"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: 'pending' | 'approved' | 'paid') => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bank_account_id">Bank Account (Optional)</Label>
              <Select value={formData.bank_account_id} onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.bank_name} - {account.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Payroll"}
              </Button>
            </div>
          </form>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linked Working Hours</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingWorkingHours ? (
                  <div className="text-center py-4">Loading linked working hours...</div>
                ) : linkedWorkingHours.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {linkedWorkingHours.map((wh) => (
                      <div key={wh.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{format(new Date(wh.date), 'MMM dd, yyyy')}</div>
                            <div className="text-sm text-gray-600">
                              {wh.start_time} - {wh.end_time}
                            </div>
                          </div>
                          <Badge variant="secondary">{wh.total_hours}h</Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>Client: {wh.clients?.name || 'N/A'}</div>
                          <div>Project: {wh.projects?.name || 'N/A'}</div>
                          <div>Rate: ${wh.hourly_rate}/hr</div>
                          <div>Amount: ${wh.payable_amount}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No working hours linked to this payroll
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
