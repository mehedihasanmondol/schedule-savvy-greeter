
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'employee' | 'accountant' | 'operation' | 'sales_manager';
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    
    // Check role-based permissions
    const rolePermissions: Record<string, string[]> = {
      admin: [
        'dashboard_view', 'employees_view', 'employees_manage',
        'clients_view', 'clients_manage', 'projects_view', 'projects_manage',
        'working_hours_view', 'working_hours_manage', 'working_hours_approve',
        'roster_view', 'roster_manage', 'payroll_view', 'payroll_manage',
        'payroll_process', 'bank_balance_view', 'bank_balance_manage',
        'reports_view', 'reports_generate', 'notifications_view'
      ],
      employee: [
        'dashboard_view', 'working_hours_view', 'roster_view', 'notifications_view'
      ],
      accountant: [
        'dashboard_view', 'payroll_view', 'payroll_manage', 'payroll_process',
        'bank_balance_view', 'bank_balance_manage', 'reports_view', 'reports_generate',
        'working_hours_view', 'working_hours_approve', 'notifications_view'
      ],
      operation: [
        'dashboard_view', 'employees_view', 'projects_view', 'projects_manage',
        'working_hours_view', 'working_hours_manage', 'roster_view', 'roster_manage',
        'notifications_view'
      ],
      sales_manager: [
        'dashboard_view', 'clients_view', 'clients_manage', 'projects_view',
        'projects_manage', 'reports_view', 'reports_generate', 'notifications_view'
      ]
    };

    return rolePermissions[profile.role]?.includes(permission) || false;
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setProfile(null);
      setSession(null);
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account."
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile after auth state change
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      signOut,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
