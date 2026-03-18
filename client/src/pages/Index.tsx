import { Link } from "react-router-dom";
import { GraduationCap, Github, Twitter, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground text-lg">
              Scott Times
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <HeroSection />

      {/* Features */}
      <FeaturesSection />

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto">
          <div className="bg-primary rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-navy-dark opacity-90" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary-foreground mb-4">
                Ready to Join the Conversation?
              </h2>
              <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Sign up today and become part of the Scott Christian University
                digital community.
              </p>
              <Button asChild variant="gold" size="xl">
                <Link to="/register">Create Your Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-semibold text-foreground">
                Scott Times
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/feed" className="hover:text-foreground transition-colors">
                Feed
              </Link>
              <Link to="/clubs" className="hover:text-foreground transition-colors">
                Clubs
              </Link>
              <Link to="/parents" className="hover:text-foreground transition-colors">
                Parents Hub
              </Link>
              <Link to="/confessions" className="hover:text-foreground transition-colors">
                Confessions
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Github className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} Scott Times — Scott Christian
              University. A Final Year Project.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
