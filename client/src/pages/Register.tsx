import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const roles = [
  {
    id: "STUDENT",
    title: "Student",
    description: "Access feeds, clubs, confessions, and more",
  },
  {
    id: "PARENT",
    title: "Parent / Guardian",
    description: "View official updates and Parents Hub",
  },
];

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("STUDENT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    studentId: "",
    verificationCode: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined as unknown as string }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Please enter a valid email";
    if (selectedRole === "STUDENT" && !form.studentId.trim())
      e.studentId = "Student ID is required";
    if (selectedRole === "PARENT" && !form.verificationCode.trim())
      e.verificationCode = "Verification code is required";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        role: selectedRole as "STUDENT" | "PARENT",
        studentId: form.studentId || undefined,
        verificationCode: form.verificationCode || undefined,
      });
      toast.success("Account created successfully!");
      navigate("/feed");
    } catch {
      setIsSubmitting(false);
      toast.error("Could not connect to server", {
        description: "Registration will be available once the backend is connected. Use the demo login on the Sign In page.",
      });
    }
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
            Join the Scott Christian University community
          </h2>
          <p className="text-lg text-primary-foreground/70">
            Create your account and start engaging with campus life today.
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
              Create account
            </h1>
            <p className="text-sm text-muted-foreground">
              Get started with Scott Times
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>I am a</Label>
              <div className="grid grid-cols-2 gap-3">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={cn(
                      "text-left p-3 rounded-xl border-2 transition-all duration-200",
                      selectedRole === role.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <span className="text-sm font-semibold text-foreground block">
                      {role.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {role.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                className={errors.fullName ? "border-destructive" : ""}
              />
              {errors.fullName && (
                <p className="text-xs text-destructive">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@scu.ac.ke"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {selectedRole === "STUDENT" && (
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  placeholder="e.g., SCU/2024/12345"
                  value={form.studentId}
                  onChange={(e) => updateField("studentId", e.target.value)}
                  className={errors.studentId ? "border-destructive" : ""}
                />
                {errors.studentId && (
                  <p className="text-xs text-destructive">{errors.studentId}</p>
                )}
              </div>
            )}

            {selectedRole === "PARENT" && (
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  placeholder="Code from registrar's office"
                  value={form.verificationCode}
                  onChange={(e) => updateField("verificationCode", e.target.value)}
                  className={errors.verificationCode ? "border-destructive" : ""}
                />
                {errors.verificationCode && (
                  <p className="text-xs text-destructive">{errors.verificationCode}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min 6 characters)"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
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
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
