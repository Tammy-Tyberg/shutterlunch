import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";

const foodPreferences = [
  { value: "italian", label: "🍝 Italian" },
  { value: "chinese", label: "🥡 Chinese" },
  { value: "japanese", label: "🍱 Japanese" },
  { value: "mexican", label: "🌮 Mexican" },
  { value: "indian", label: "🍛 Indian" },
  { value: "american", label: "🍔 American" },
  { value: "mediterranean", label: "🥗 Mediterranean" },
  { value: "vegetarian", label: "🥕 Vegetarian" },
  { value: "vegan", label: "🌱 Vegan" },
  { value: "halal", label: "☪️ Halal" },
  { value: "kosher", label: "✡️ Kosher" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const togglePreference = (preference: string) => {
    setSelectedPreferences((prev) =>
      prev.includes(preference)
        ? prev.filter((p) => p !== preference)
        : [...prev, preference]
    );
  };

  const handleSubmit = async () => {
    if (selectedPreferences.length === 0) {
      toast.error("Please select at least one preference");
      return;
    }

    setLoading(true);
    try {
      // Insert preferences
      const { error } = await supabase.from("user_preferences").insert(
        selectedPreferences.map((pref) => ({
          user_id: userId,
          preference: pref as "italian" | "chinese" | "japanese" | "mexican" | "indian" | "american" | "mediterranean" | "vegetarian" | "vegan" | "halal" | "kosher",
        }))
      );

      if (error) throw error;

      toast.success("Preferences saved!");
      navigate("/restaurants");
    } catch (error: any) {
      toast.error(error.message || "Failed to save preferences");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Select Your Food Preferences</CardTitle>
          <CardDescription className="text-base">
            Choose the cuisines you enjoy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {foodPreferences.map((pref) => (
              <div
                key={pref.value}
                onClick={() => togglePreference(pref.value)}
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedPreferences.includes(pref.value)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <Checkbox
                  checked={selectedPreferences.includes(pref.value)}
                  onCheckedChange={() => togglePreference(pref.value)}
                />
                <Label className="cursor-pointer text-base">{pref.label}</Label>
              </div>
            ))}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading || selectedPreferences.length === 0}
            className="w-full"
            size="lg"
          >
            Continue
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;