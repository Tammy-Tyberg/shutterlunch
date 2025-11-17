import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Utensils } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentUserId = localStorage.getItem("userId");
    if (currentUserId) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .insert([{ name: name.trim() }])
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem("userId", data.id);
      localStorage.setItem("userName", data.name);
      toast.success("Welcome to Lunch Squad!");
      navigate("/onboarding");
    } catch (error: any) {
      toast.error(error.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-2">
            <Utensils className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Lunch Squad</CardTitle>
          <CardDescription>
            What's your name?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your name"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !name.trim()}
            >
              {loading ? "Getting Started..." : "Get Started"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;