
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Payroll, BankAccount } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, User, Calendar, CreditCard, Printer, Download } from "lucide-react";

interface PayrollDetailsDialogProps {
  payroll: Payroll | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

export const PayrollDetailsDialog = ({
  payroll,
  open,
  onOpenChange,
  onRefresh
}: PayrollDetailsDialogProps) => {
  const [profileBankAccounts, setProfileBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (payroll && open) {
      fetchProfileBankAccounts();
      setSelectedBankAccount(payroll.bank_account_id || "");
    }
  }, [payroll, open]);

  const fetchProfileBankAccounts = async () => {
    if (!payroll?.profile_id) return;

    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('profile_id', payroll.profile_id)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      setProfileBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching profile bank accounts:', error);
    }
  };

  const updatePayrollBankAccount = async () => {
    if (!payroll) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('payroll')
        .update({ bank_account_id: selectedBankAccount || null })
        .eq('id', payroll.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bank account updated successfully"
      });
      
      onRefresh();
    } catch (error: any) {
      console.error('Error updating payroll bank account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update bank account",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !payroll) return;

    const selectedBank = profileBankAccounts.find(bank => bank.id === selectedBankAccount);
    const printContent = generatePaySlipHTML(payroll, selectedBank);
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    if (!payroll) return;
    
    const selectedBank = profileBankAccounts.find(bank => bank.id === selectedBankAccount);
    const printContent = generatePaySlipHTML(payroll, selectedBank);
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Use browser's print to PDF functionality
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generatePaySlipHTML = (payroll: Payroll, bankAccount?: BankAccount) => {
    const currentDate = new Date().toLocaleDateString();
    const payPeriodStart = new Date(payroll.pay_period_start).toLocaleDateString();
    const payPeriodEnd = new Date(payroll.pay_period_end).toLocaleDateString();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pay Slip - ${payroll.profiles?.full_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              color: #333;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px solid #333; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .company-name { 
              font-size: 24px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .pay-slip-title { 
              font-size: 18px; 
              color: #666;
            }
            .employee-info, .pay-details, .bank-details { 
              margin-bottom: 25px;
            }
            .section-title { 
              font-size: 16px; 
              font-weight: bold; 
              border-bottom: 1px solid #ccc; 
              padding-bottom: 5px; 
              margin-bottom: 15px;
              color: #444;
            }
            .info-grid { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 15px;
            }
            .info-item { 
              display: flex; 
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px dotted #ddd;
            }
            .label { 
              font-weight: bold; 
              color: #555;
            }
            .value { 
              color: #333;
            }
            .net-pay { 
              background: #f0f8f0; 
              padding: 15px; 
              border-radius: 5px; 
              text-align: center; 
              margin: 20px 0;
              border: 2px solid #4CAF50;
            }
            .net-pay-amount { 
              font-size: 28px; 
              font-weight: bold; 
              color: #2E7D32;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              font-size: 12px; 
              color: #777;
              border-top: 1px solid #ccc;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Your Company Name</div>
            <div class="pay-slip-title">PAYROLL STATEMENT</div>
            <div style="font-size: 14px; color: #666; margin-top: 10px;">
              Generated: ${currentDate}
            </div>
          </div>

          <div class="employee-info">
            <div class="section-title">Employee Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Employee Name:</span>
                <span class="value">${payroll.profiles?.full_name || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="label">Employee ID:</span>
                <span class="value">${payroll.profile_id.substring(0, 8)}</span>
              </div>
              <div class="info-item">
                <span class="label">Role:</span>
                <span class="value">${payroll.profiles?.role || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="label">Employment Type:</span>
                <span class="value">${payroll.profiles?.employment_type || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div class="pay-details">
            <div class="section-title">Pay Period & Earnings</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Pay Period:</span>
                <span class="value">${payPeriodStart} - ${payPeriodEnd}</span>
              </div>
              <div class="info-item">
                <span class="label">Total Hours:</span>
                <span class="value">${payroll.total_hours.toFixed(1)} hours</span>
              </div>
              <div class="info-item">
                <span class="label">Hourly Rate:</span>
                <span class="value">$${payroll.hourly_rate.toFixed(2)}</span>
              </div>
              <div class="info-item">
                <span class="label">Gross Pay:</span>
                <span class="value">$${payroll.gross_pay.toFixed(2)}</span>
              </div>
              <div class="info-item">
                <span class="label">Deductions:</span>
                <span class="value" style="color: #d32f2f;">-$${payroll.deductions.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div class="net-pay">
            <div style="font-size: 16px; margin-bottom: 10px;">NET PAY</div>
            <div class="net-pay-amount">$${payroll.net_pay.toFixed(2)}</div>
          </div>

          ${bankAccount ? `
          <div class="bank-details">
            <div class="section-title">Payment Details</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Bank Name:</span>
                <span class="value">${bankAccount.bank_name}</span>
              </div>
              <div class="info-item">
                <span class="label">Account Holder:</span>
                <span class="value">${bankAccount.account_holder_name}</span>
              </div>
              <div class="info-item">
                <span class="label">Account Number:</span>
                <span class="value">${bankAccount.account_number}</span>
              </div>
              ${bankAccount.bsb_code ? `
              <div class="info-item">
                <span class="label">BSB Code:</span>
                <span class="value">${bankAccount.bsb_code}</span>
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <div class="footer">
            <p>This is a computer-generated payroll statement and does not require a signature.</p>
            <p>For any queries regarding this payroll, please contact the HR department.</p>
          </div>
        </body>
      </html>
    `;
  };

  if (!payroll) return null;

  const selectedBank = profileBankAccounts.find(bank => bank.id === selectedBankAccount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Payroll Details - {payroll.profiles?.full_name}</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Save as PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Employee Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Name</Label>
                <div className="font-medium">{payroll.profiles?.full_name}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Role</Label>
                <div>{payroll.profiles?.role}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Email</Label>
                <div>{payroll.profiles?.email}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Employment Type</Label>
                <div>{payroll.profiles?.employment_type}</div>
              </div>
            </CardContent>
          </Card>

          {/* Pay Period Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Pay Period
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Start Date</Label>
                <div className="font-medium">{new Date(payroll.pay_period_start).toLocaleDateString()}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">End Date</Label>
                <div className="font-medium">{new Date(payroll.pay_period_end).toLocaleDateString()}</div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">Total Hours</Label>
                <div className="font-medium">{payroll.total_hours.toFixed(1)} hours</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Hourly Rate</Label>
                <div className="font-medium">${payroll.hourly_rate.toFixed(2)}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Gross Pay</Label>
                <div className="font-medium">${payroll.gross_pay.toFixed(2)}</div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Deductions</Label>
                <div className="font-medium text-red-600">${payroll.deductions.toFixed(2)}</div>
              </div>
              <div className="col-span-2">
                <Label className="text-sm text-gray-600">Net Pay</Label>
                <div className="text-2xl font-bold text-green-600">${payroll.net_pay.toFixed(2)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Account Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" />
                Recommended Payment Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bank_account">Employee Bank Account</Label>
                <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Bank Account</SelectItem>
                    {profileBankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bank_name} - {account.account_number}
                        {account.is_primary && " (Primary)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBank && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium mb-3 text-green-800">Recommended Bank Account Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Bank:</span> 
                      <span className="font-medium ml-2">{selectedBank.bank_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Account:</span> 
                      <span className="font-medium ml-2">{selectedBank.account_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Holder:</span> 
                      <span className="font-medium ml-2">{selectedBank.account_holder_name}</span>
                    </div>
                    {selectedBank.bsb_code && (
                      <div>
                        <span className="text-gray-600">BSB:</span> 
                        <span className="font-medium ml-2">{selectedBank.bsb_code}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button 
                onClick={updatePayrollBankAccount} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Updating..." : "Update Bank Account"}
              </Button>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-600">Status</Label>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  payroll.status === 'paid' ? 'bg-green-100 text-green-800' :
                  payroll.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {payroll.status.toUpperCase()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
