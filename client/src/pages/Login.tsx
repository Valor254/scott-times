import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, setDemoUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Please enter a valid email";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
const u = await login({ email, password });
toast.success("Welcome back!");

if (u.role === "ADMIN") navigate("/admin");
else if (u.role === "PARENT") navigate("/parents");
else navigate("/feed");
    } catch {
      // Backend not available — offer demo mode
      setIsSubmitting(false);
      toast.error("Could not connect to server", {
        description: "Use 'Demo Login' below to explore the app offline.",
      });
    }
  };

  const handleDemoLogin = (role: "STUDENT" | "PARENT" | "ADMIN") => {
    const demoUsers = {
      STUDENT: { id: 1, fullName: "Jane Student", email: "jane@scu.ac.ke", role: "STUDENT" as const },
      PARENT: { id: 2, fullName: "John Parent", email: "john.parent@gmail.com", role: "PARENT" as const },
      ADMIN: { id: 3, fullName: "Admin User", email: "admin@scu.ac.ke", role: "ADMIN" as const },
    };
    setDemoUser(demoUsers[role]);
    toast.success(`Signed in as ${demoUsers[role].fullName} (Demo)`);
    navigate("/feed");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Branding Panel - Desktop */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-navy-dark" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gold rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-navy-dark" />
            </div>
            <span className="font-heading font-bold text-primary-foreground text-2xl">
              Scott Times
            </span>
          </div>
          <h2 className="text-4xl font-heading font-bold text-primary-foreground mb-4 leading-tight">
            Welcome back to your campus community
          </h2>
          <p className="text-lg text-primary-foreground/70">
            Connect with fellow students, stay updated with campus life, and
            make your voice heard.
          </p>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex justify-between items-center mb-8">
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-foreground">
                Scott Times
              </span>
            </Link>
            <div className="lg:ml-auto">
              <ThemeToggle />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@scu.ac.ke"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => toast.info("Password reset coming soon")}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                  className={errors.password ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Demo Login */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Quick demo access (no backend required)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("STUDENT")}
                className="text-xs"
              >
                Student
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("PARENT")}
                className="text-xs"
              >
                Parent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("ADMIN")}
                className="text-xs"
              >
                Admin
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-primary font-medium hover:text-primary/80 transition-colors"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
