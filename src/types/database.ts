
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  hourly_rate: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_id: string;
  status: 'active' | 'completed' | 'on-hold';
  start_date: string;
  end_date?: string;
  budget: number;
  created_at: string;
  updated_at: string;
  clients?: Client;
}

export interface WorkingHour {
  id: string;
  employee_id: string;
  client_id: string;
  project_id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  employees?: Employee;
  clients?: Client;
  projects?: Project;
}

export interface BankTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
  client_id?: string;
  project_id?: string;
  employee_id?: string;
  clients?: Client;
  projects?: Project;
  employees?: Employee;
}

export interface Payroll {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  total_hours: number;
  hourly_rate: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
  status: 'pending' | 'approved' | 'paid';
  created_at: string;
  updated_at: string;
  employees?: Employee;
}
