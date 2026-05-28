import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const { signIn, profile } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const { error } = await signIn(data.email, data.password);
    setLoading(false);
    if (error) {
      toast.error('Invalid email or password');
      return;
    }
    toast.success('Signed in successfully');
  };

  React.useEffect(() => {
    if (profile) {
      if (profile.role === 'official') navigate('/official');
      else navigate('/receptionist');
    }
  }, [profile, navigate]);

  return (
    <div className="min-h-screen flex">
      {/* Left panel — Scorpion red brand */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ backgroundColor: '#CC0000' }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full border-[40px] border-white" />
          <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full border-[30px] border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border-[20px] border-white" />
        </div>

        <div className="relative z-10 text-center">
          <img
            src="/scorpion-logo.png"
            alt="Scorpion"
            className="h-28 w-auto object-contain mx-auto mb-8 drop-shadow-2xl"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
          <h2 className="text-white text-3xl font-bold mb-3">Visitor Management System</h2>
          <p className="text-white/75 text-base max-w-xs leading-relaxed">
            Streamline visitor check-ins, courier receipts and access approvals — all in one place.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'Visitor Tracking',   icon: '👥' },
              { label: 'Courier Receipts',   icon: '📦' },
              { label: 'Smart Approvals',    icon: '✅' },
            ].map(({ label, icon }) => (
              <div key={label} className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-white text-xs font-medium leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-14 rounded-2xl mb-3"
            style={{ backgroundColor: '#CC0000' }}
          >
            <img
              src="/scorpion-logo.png"
              alt="Scorpion"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Visitor Management System</p>
        </div>

        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardHeader className="pb-4 pt-8 px-8">
              <CardTitle className="text-2xl font-bold" style={{ color: '#CC0000' }}>
                Sign In
              </CardTitle>
              <CardDescription>Enter your credentials to access the system</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@scorpion.com"
                    autoComplete="email"
                    {...register('email')}
                    className={`h-11 ${errors.email ? 'border-destructive' : 'focus-visible:ring-[#CC0000]/30 focus-visible:border-[#CC0000]'}`}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...register('password')}
                      className={`h-11 pr-10 ${errors.password ? 'border-destructive' : 'focus-visible:ring-[#CC0000]/30 focus-visible:border-[#CC0000]'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold mt-2"
                  style={{ backgroundColor: '#CC0000' }}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-muted-foreground">
                <p className="font-semibold text-[#CC0000] mb-2">Demo Accounts:</p>
                <div className="space-y-1">
                  <p>Receptionist: receptionist@scorpion.com / password123</p>
                  <p>Official: official@scorpion.com / password123</p>
                  <p>Admin: admin@scorpion.com / password123</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © 2026 Scorpion. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
