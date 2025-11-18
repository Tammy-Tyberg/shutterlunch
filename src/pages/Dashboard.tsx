import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, Users, Star, TrendingUp, Settings, ThumbsUp, Shuffle } from "lucide-react";

interface AttendingUser {
  name: string;
}

interface RecommendedRestaurant {
  id: string;
  name: string;
  cuisine_types: string[];
  dietary_restrictions: string[];
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
  const [userName, setUserName] = useState<string>("");
  const [userRating, setUserRating] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [noMatchFound, setNoMatchFound] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        checkOnboarding(session.user.id);
      }
    });

    // Set up realtime listener for attendance changes
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_attendance'
        },
        () => {
          // Reload data when any attendance changes
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              loadDashboardData(session.user.id);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      loadDashboardData(uid);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    }
  };

  const loadDashboardData = async (uid: string) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", uid)
        .single();

      if (profile) {
        setUserName(profile.name);
      }

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
      setNoMatchFound(false);
      
      // First check if there's already a daily selection
      const { data: existingSelection } = await supabase
        .from("daily_restaurant_selection")
        .select("restaurant_id, restaurants(id, name, cuisine_types, dietary_restrictions, description, rating)")
        .eq("date", date)
        .maybeSingle();

      if (existingSelection?.restaurants) {
        const restaurant = existingSelection.restaurants as any;
        setRecommendedRestaurant({
          ...restaurant,
          score: 0
        });
        return;
      }

      // If no selection exists, calculate the best restaurant
      const { data: attendingUsers } = await supabase
        .from("daily_attendance")
        .select("user_id")
        .eq("date", date)
        .eq("is_attending", true);

      if (!attendingUsers || attendingUsers.length === 0) return;

      const userIds = attendingUsers.map((u) => u.user_id);

      // Get all user preferences
      const { data: allPreferences } = await supabase
        .from("user_preferences")
        .select("user_id, preference_type, preference_value")
        .in("user_id", userIds);

      // Group preferences by user
      const userPrefs: { [userId: string]: { dietary: string[], cuisine: string[] } } = {};
      allPreferences?.forEach((pref) => {
        if (!userPrefs[pref.user_id]) {
          userPrefs[pref.user_id] = { dietary: [], cuisine: [] };
        }
        if (pref.preference_type === "dietary") {
          userPrefs[pref.user_id].dietary.push(pref.preference_value);
        } else if (pref.preference_type === "cuisine") {
          userPrefs[pref.user_id].cuisine.push(pref.preference_value);
        }
      });

      const { data: allFavorites } = await supabase
        .from("user_favorites")
        .select("restaurant_id, restaurants(id, name, cuisine_types, dietary_restrictions, description, rating)")
        .in("user_id", userIds);

      if (!allFavorites || allFavorites.length === 0) {
        setNoMatchFound(true);
        return;
      }

      // Filter restaurants that match ALL users' dietary restrictions and cuisine preferences
      const matchingRestaurants = allFavorites.filter((fav: any) => {
        const restaurant = fav.restaurants;
        if (!restaurant) return false;

        // Check if restaurant matches all users' preferences
        for (const userId of userIds) {
          const prefs = userPrefs[userId];
          if (!prefs) continue;

          // Check dietary restrictions
          if (prefs.dietary.length > 0) {
            const hasMatchingDietary = prefs.dietary.some((diet) =>
              restaurant.dietary_restrictions?.includes(diet)
            );
            if (!hasMatchingDietary) return false;
          }

          // Check cuisine types
          if (prefs.cuisine.length > 0) {
            const hasMatchingCuisine = prefs.cuisine.some((cuisine) =>
              restaurant.cuisine_types?.includes(cuisine)
            );
            if (!hasMatchingCuisine) return false;
          }
        }

        return true;
      });

      if (matchingRestaurants.length === 0) {
        setNoMatchFound(true);
        return;
      }

      const restaurantScores: { [key: string]: { count: number; data: any } } = {};

      matchingRestaurants.forEach((fav: any) => {
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
        const topRestaurant = scored[0];
        setRecommendedRestaurant(topRestaurant);

        await supabase.from("daily_restaurant_selection").upsert({
          date: date,
          restaurant_id: topRestaurant.id,
        });
      } else {
        setNoMatchFound(true);
      }
    } catch (error: any) {
      console.error("Failed to calculate recommendation:", error);
    }
  };

  const handleLike = () => {
    setHasLiked(true);
    toast.success("Great! Rate your experience");
  };

  const handleReshuffle = async () => {
    if (!userId) return;
    
    setHasLiked(false);
    setUserRating(0);
    setRecommendedRestaurant(null);
    
    const today = new Date().toISOString().split("T")[0];
    
    // Delete current selection
    await supabase
      .from("daily_restaurant_selection")
      .delete()
      .eq("date", today);
    
    // Recalculate
    await calculateRecommendation(userId, today);
    toast.success("Reshuffled recommendation for everyone");
  };

  const handleRating = async (rating: number) => {
    if (!recommendedRestaurant) return;
    
    setUserRating(rating);
    
    // Update restaurant rating
    const newRating = ((recommendedRestaurant.rating || 0) + rating) / 2;
    await supabase
      .from("restaurants")
      .update({ rating: newRating })
      .eq("id", recommendedRestaurant.id);
    
    toast.success("Rating submitted!");
  };

  const handleChooseRandom = async () => {
    if (!userId) return;
    
    const today = new Date().toISOString().split("T")[0];
    const { data: attendingUsers } = await supabase
      .from("daily_attendance")
      .select("user_id")
      .eq("date", today)
      .eq("is_attending", true);

    if (!attendingUsers || attendingUsers.length === 0) return;

    const userIds = attendingUsers.map((u) => u.user_id);
    const { data: allFavorites } = await supabase
      .from("user_favorites")
      .select("restaurant_id, restaurants(id, name, cuisine_types, dietary_restrictions, description, rating)")
      .in("user_id", userIds);

    if (!allFavorites || allFavorites.length === 0) return;

    const uniqueRestaurants = Array.from(
      new Map(allFavorites.map((fav: any) => [fav.restaurants.id, fav.restaurants])).values()
    );

    const randomRestaurant = uniqueRestaurants[Math.floor(Math.random() * uniqueRestaurants.length)] as any;
    
    setRecommendedRestaurant({
      ...randomRestaurant,
      score: 0
    });
    setNoMatchFound(false);

    await supabase.from("daily_restaurant_selection").upsert({
      date: today,
      restaurant_id: randomRestaurant.id,
    });

    toast.success("Random restaurant selected!");
  };

  const toggleAttendance = async (checked: boolean) => {
    if (!userId) return;

    const today = new Date().toISOString().split("T")[0];

    try {
      const { error } = await supabase.from("daily_attendance").upsert({
        user_id: userId,
        date: today,
        is_attending: checked,
      });

      if (error) throw error;

      setIsAttending(checked);
      toast.success(checked ? "You're attending today!" : "Attendance updated");
      
      // Reload data to update the attendees list and recalculate recommendation
      await loadDashboardData(userId);
    } catch (error: any) {
      toast.error(error.message || "Failed to update attendance");
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
            <p className="text-muted-foreground">
              {userName ? `Hi, ${userName} - welcome back!` : "Where should we eat today?"}
            </p>
          </div>
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => navigate("/onboarding")}>
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button variant="outline" onClick={handleLogout} className="sm:hidden">
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            <Button variant="outline" onClick={handleLogout} className="hidden sm:flex">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
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

          {noMatchFound ? (
            <Card className="border-2 border-muted">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  No Perfect Match Found
                </CardTitle>
                <CardDescription>
                  We couldn't find a restaurant that matches everyone's preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    No restaurants match all attendees' dietary restrictions and cuisine preferences.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleChooseRandom} className="flex-1">
                      Choose Random
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : recommendedRestaurant && (
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
                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold">{recommendedRestaurant.name}</h3>
                    <p className="text-muted-foreground capitalize">
                      {recommendedRestaurant.cuisine_types.join(", ")}
                    </p>
                    {recommendedRestaurant.dietary_restrictions && recommendedRestaurant.dietary_restrictions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {recommendedRestaurant.dietary_restrictions.map((restriction) => (
                          <span
                            key={restriction}
                            className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                          >
                            {restriction.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm">{recommendedRestaurant.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="font-medium">{recommendedRestaurant.rating?.toFixed(1)}</span>
                    </div>
                  </div>

                  {!hasLiked ? (
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleLike} className="flex-1 gap-2">
                        <ThumbsUp className="h-4 w-4" />
                        Like This
                      </Button>
                      <Button onClick={handleReshuffle} variant="outline" className="flex-1 gap-2">
                        <Shuffle className="h-4 w-4" />
                        Reshuffle
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
                      <Label>Rate your experience</Label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Star
                            key={rating}
                            className={`h-8 w-8 cursor-pointer transition-colors ${
                              rating <= userRating
                                ? "fill-primary text-primary"
                                : "text-muted-foreground hover:text-primary"
                            }`}
                            onClick={() => handleRating(rating)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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