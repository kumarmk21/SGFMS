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
import ScorpionLogo from '@/components/layout/ScorpionLogo';
import { toast } from 'sonner';
import { isSupabaseConfigured } from '@/lib/supabase';

const BRAND = '#CC0000';
const BRAND_DARK = '#A80000';

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

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginForm) => {
    if (!isSupabaseConfigured) {
      toast.error('Configure Supabase in .env before signing in');
      return;
    }

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

      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
      >
        {/* Decorative rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-28 -left-28 w-96 h-96 rounded-full border-[50px] border-white/10" />
          <div className="absolute -bottom-40 -right-20 w-[28rem] h-[28rem] rounded-full border-[40px] border-white/10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full border-[25px] border-white/5" />
        </div>

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="mb-8">
            <ScorpionLogo heightClass="h-28" className="mx-auto drop-shadow-xl" />
          </div>

          <h2 className="text-white text-3xl font-bold mb-3 drop-shadow">
            Visitor Management System
          </h2>
          <p className="text-white/70 text-sm max-w-xs mx-auto leading-relaxed">
            Streamline visitor check-ins, courier receipts and access approvals — all in one place.
          </p>

          {/* Feature cards */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { label: 'Visitor Tracking',  icon: '👥' },
              { label: 'Courier Receipts',  icon: '📦' },
              { label: 'Smart Approvals',   icon: '✅' },
            ].map(({ label, icon }) => (
              <div
                key={label}
                className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 border border-white/10"
              >
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-white text-xs font-semibold leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">

        {/* Mobile logo */}
        <div className="lg:hidden mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-24 h-16 rounded-2xl mb-3 shadow-md"
            style={{ background: `linear-gradient(145deg, ${BRAND} 0%, ${BRAND_DARK} 100%)` }}
          >
            <ScorpionLogo heightClass="h-10" />
          </div>
          <p className="text-sm text-muted-foreground font-medium tracking-wide">
            Visitor Management System
          </p>
        </div>

        <div className="w-full max-w-md">
          <Card className="shadow-2xl border-0">
            <CardHeader className="pb-4 pt-8 px-8">
              <CardTitle className="text-2xl font-bold" style={{ color: BRAND }}>
                Sign In
              </CardTitle>
              <CardDescription>Enter your credentials to access the system</CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              {!isSupabaseConfigured && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Supabase is not configured</p>
                  <p className="mt-1">
                    Copy <code>.env.example</code> to <code>.env</code>, then set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-semibold">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@scorpion.com"
                    autoComplete="email"
                    {...register('email')}
                    className={`h-11 ${errors.email ? 'border-destructive' : ''}`}
                    style={{ outline: 'none' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = BRAND; e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND}20`; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...register('password')}
                      className={`h-11 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                      onFocus={(e) => { e.currentTarget.style.borderColor = BRAND; e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND}20`; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold mt-1 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: BRAND }}
                  disabled={loading || !isSupabaseConfigured}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                </Button>
              </form>

              {/* Demo accounts — click to auto-fill */}
              <div
                className="mt-6 p-4 rounded-xl text-xs"
                style={{ backgroundColor: `${BRAND}0D`, border: `1px solid ${BRAND}25` }}
              >
                <p className="font-bold mb-2.5" style={{ color: BRAND }}>Demo Accounts — click to fill</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Receptionist', email: 'receptionist@scorpion.com', pw: 'password123' },
                    { label: 'Official',     email: 'official@scorpion.com',     pw: 'password123' },
                    { label: 'Admin',        email: 'admin@scorpion.com',        pw: 'password123' },
                  ].map(({ label, email, pw }) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => {
                        setValue('email', email, { shouldValidate: true });
                        setValue('password', pw,    { shouldValidate: true });
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white border text-left hover:border-[#CC0000] hover:bg-red-50 transition-colors group"
                    >
                      <span className="font-semibold text-foreground group-hover:text-[#CC0000]">{label}</span>
                      <span className="text-muted-foreground font-mono">{email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground mt-5">
            © 2026 Scorpion. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
