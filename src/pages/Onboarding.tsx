import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";

const cuisineTypes = [
  { value: "italian", label: "🍝 Italian" },
  { value: "chinese", label: "🥡 Chinese" },
  { value: "japanese", label: "🍱 Japanese" },
  { value: "mexican", label: "🌮 Mexican" },
  { value: "indian", label: "🍛 Indian" },
  { value: "american", label: "🍔 American" },
  { value: "mediterranean", label: "🥗 Mediterranean" },
];

const dietaryRestrictions = [
  { value: "vegetarian", label: "🥕 Vegetarian" },
  { value: "vegan", label: "🌱 Vegan" },
  { value: "halal", label: "☪️ Halal" },
  { value: "kosher", label: "✡️ Kosher" },
  { value: "gluten_free", label: "🌾 Gluten Free" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
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

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine)
        ? prev.filter((p) => p !== cuisine)
        : [...prev, cuisine]
    );
  };

  const toggleDietary = (dietary: string) => {
    setSelectedDietary((prev) =>
      prev.includes(dietary)
        ? prev.filter((p) => p !== dietary)
        : [...prev, dietary]
    );
  };

  const handleSubmit = async () => {
    if (selectedCuisines.length === 0) {
      toast.error("Please select at least one cuisine type");
      return;
    }

    setLoading(true);
    try {
      const preferences = [
        ...selectedCuisines.map((cuisine) => ({
          user_id: userId,
          preference_type: 'cuisine',
          preference_value: cuisine,
        })),
        ...selectedDietary.map((dietary) => ({
          user_id: userId,
          preference_type: 'dietary',
          preference_value: dietary,
        })),
      ];

      const { error } = await supabase.from("user_preferences").insert(preferences);

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
            Choose your favorite cuisines and any dietary restrictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Cuisine Types Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Cuisine Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cuisineTypes.map((cuisine) => (
                <div
                  key={cuisine.value}
                  onClick={() => toggleCuisine(cuisine.value)}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedCuisines.includes(cuisine.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedCuisines.includes(cuisine.value)}
                    onCheckedChange={() => toggleCuisine(cuisine.value)}
                  />
                  <Label className="cursor-pointer text-base">{cuisine.label}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Dietary Restrictions Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Dietary Restrictions (Optional)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {dietaryRestrictions.map((dietary) => (
                <div
                  key={dietary.value}
                  onClick={() => toggleDietary(dietary.value)}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    selectedDietary.includes(dietary.value)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedDietary.includes(dietary.value)}
                    onCheckedChange={() => toggleDietary(dietary.value)}
                  />
                  <Label className="cursor-pointer text-base">{dietary.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || selectedCuisines.length === 0}
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