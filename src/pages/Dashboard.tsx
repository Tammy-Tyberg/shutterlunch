import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Users, Star, TrendingUp } from "lucide-react";

interface AttendingUser {
  name: string;
}

interface RecommendedRestaurant {
  id: string;
  name: string;
  cuisine_type: string;
  description: string;
  rating: number;
  score: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [isAttending, setIsAttending] = useState(false);
  const [attendingUsers, setAttendingUsers] = useState<AttendingUser[]>([]);
  const [recommendedRestaurant, setRecommendedRestaurant] = useState<RecommendedRestaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        checkOnboarding(session.user.id);
      }
    });
  }, [navigate]);

  const checkOnboarding = async (uid: string) => {
    try {
      const { data: preferences } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", uid)
        .limit(1);

      if (!preferences || preferences.length === 0) {
        navigate("/onboarding");
        return;
      }

      const { data: favorites } = await supabase
        .from("user_favorites")
        .select("*")
        .eq("user_id", uid)
        .limit(1);

      if (!favorites || favorites.length === 0) {
        navigate("/restaurants");
        return;
      }

      loadDashboardData(uid);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    }
  };

  const loadDashboardData = async (uid: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: attendance } = await supabase
        .from("daily_attendance")
        .select("is_attending")
        .eq("user_id", uid)
        .eq("date", today)
        .maybeSingle();

      setIsAttending(attendance?.is_attending || false);

      const { data: attendingData } = await supabase
        .from("daily_attendance")
        .select("user_id, profiles(name)")
        .eq("date", today)
        .eq("is_attending", true);

      setAttendingUsers(
        attendingData?.map((a: any) => ({ name: a.profiles.name })) || []
      );

      await calculateRecommendation(uid, today);
    } catch (error: any) {
      toast.error(error.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const calculateRecommendation = async (uid: string, date: string) => {
    try {
      const { data: attendingUsers } = await supabase
        .from("daily_attendance")
        .select("user_id")
        .eq("date", date)
        .eq("is_attending", true);

      if (!attendingUsers || attendingUsers.length === 0) return;

      const userIds = attendingUsers.map((u) => u.user_id);

      const { data: allFavorites } = await supabase
        .from("user_favorites")
        .select("restaurant_id, restaurants(id, name, cuisine_type, description, rating)")
        .in("user_id", userIds);

      if (!allFavorites || allFavorites.length === 0) return;

      const restaurantScores: { [key: string]: { count: number; data: any } } = {};

      allFavorites.forEach((fav: any) => {
        const restaurant = fav.restaurants;
        if (!restaurant) return;

        if (!restaurantScores[restaurant.id]) {
          restaurantScores[restaurant.id] = { count: 0, data: restaurant };
        }
        restaurantScores[restaurant.id].count++;
      });

      const scored = Object.values(restaurantScores)
        .map((r) => ({
          ...r.data,
          score: (r.count / userIds.length) * 100 + r.data.rating * 10,
        }))
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        setRecommendedRestaurant(scored[0]);
      }
    } catch (error: any) {
      console.error("Failed to calculate recommendation:", error);
    }
  };

  const toggleAttendance = async (checked: boolean) => {
    if (!userId) return;

    setIsAttending(checked);
    const today = new Date().toISOString().split("T")[0];

    try {
      const { error } = await supabase.from("daily_attendance").upsert({
        user_id: userId,
        date: today,
        is_attending: checked,
      });

      if (error) throw error;

      toast.success(checked ? "You're attending today!" : "Attendance updated");
      loadDashboardData(userId);
    } catch (error: any) {
      toast.error(error.message || "Failed to update attendance");
      setIsAttending(!checked);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">ShutterLunch</h1>
            <p className="text-muted-foreground">Where should we eat today?</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance</CardTitle>
              <CardDescription>Will you join us for lunch today?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="attendance" className="text-lg">
                  I'm attending today
                </Label>
                <Switch
                  id="attendance"
                  checked={isAttending}
                  onCheckedChange={toggleAttendance}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Who's Coming ({attendingUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendingUsers.length === 0 ? (
                <p className="text-muted-foreground">No one has confirmed yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {attendingUsers.map((user, index) => (
                    <div
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                    >
                      {user.name}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {recommendedRestaurant && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Today's Recommendation
                </CardTitle>
                <CardDescription>
                  Based on everyone's preferences and favorites
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h3 className="text-2xl font-bold">{recommendedRestaurant.name}</h3>
                    <p className="text-muted-foreground capitalize">
                      {recommendedRestaurant.cuisine_type}
                    </p>
                  </div>
                  <p className="text-sm">{recommendedRestaurant.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-medium">{recommendedRestaurant.rating}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Match: {Math.round((recommendedRestaurant.score / (attendingUsers.length * 100 + 50)) * 100)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;