import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Heart, ChevronRight, Star } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  cuisine_types: string[];
  dietary_restrictions: string[];
  description: string;
  rating: number;
}

const Restaurants = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        loadData(session.user.id);
      }
    });
  }, [navigate]);

  const loadData = async (uid: string) => {
    try {
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from("restaurants")
        .select("*")
        .order("name");

      if (restaurantsError) throw restaurantsError;

      const { data: favoritesData, error: favoritesError } = await supabase
        .from("user_favorites")
        .select("restaurant_id")
        .eq("user_id", uid);

      if (favoritesError) throw favoritesError;

      setRestaurants(restaurantsData || []);
      setFavorites(favoritesData?.map((f) => f.restaurant_id) || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (restaurantId: string) => {
    if (!userId) return;

    const isFavorite = favorites.includes(restaurantId);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("restaurant_id", restaurantId);

        if (error) throw error;
        setFavorites(favorites.filter((id) => id !== restaurantId));
      } else {
        const { error } = await supabase
          .from("user_favorites")
          .insert({ user_id: userId, restaurant_id: restaurantId });

        if (error) throw error;
        setFavorites([...favorites, restaurantId]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update favorites");
    }
  };

  const handleContinue = () => {
    if (favorites.length === 0) {
      toast.error("Please select at least one favorite restaurant");
      return;
    }
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background p-4 pb-24">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Choose Your Favorites</h1>
          <p className="text-muted-foreground text-lg">
            Select restaurants you'd like to visit for lunch
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {restaurants.map((restaurant) => {
            const isFavorite = favorites.includes(restaurant.id);
            return (
              <Card
                key={restaurant.id}
                className={`cursor-pointer transition-all ${
                  isFavorite ? "ring-2 ring-primary" : "hover:shadow-lg"
                }`}
                onClick={() => toggleFavorite(restaurant.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{restaurant.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {restaurant.cuisine_types.join(", ")}
                      </CardDescription>
                      {restaurant.dietary_restrictions && restaurant.dietary_restrictions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {restaurant.dietary_restrictions.map((restriction) => (
                            <span
                              key={restriction}
                              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                            >
                              {restriction.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Heart
                      className={`h-6 w-6 ${
                        isFavorite ? "fill-primary text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {restaurant.description}
                  </p>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span>{restaurant.rating}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={handleContinue}
              disabled={favorites.length === 0}
              className="w-full"
              size="lg"
            >
              Continue ({favorites.length} selected)
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Restaurants;