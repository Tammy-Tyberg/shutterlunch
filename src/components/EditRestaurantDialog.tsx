import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface EditRestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: {
    id: string;
    name: string;
    description: string;
    cuisine_types: string[];
    dietary_restrictions: string[];
  };
  onUpdate: () => void;
}

const DIETARY_OPTIONS = ["halal", "kosher", "vegan", "vegetarian", "gluten_free"];

export function EditRestaurantDialog({ open, onOpenChange, restaurant, onUpdate }: EditRestaurantDialogProps) {
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description);
  const [cuisineTypes, setCuisineTypes] = useState<string[]>(restaurant.cuisine_types);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(restaurant.dietary_restrictions);
  const [newCuisine, setNewCuisine] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAddCuisine = () => {
    if (newCuisine.trim() && !cuisineTypes.includes(newCuisine.trim().toLowerCase())) {
      setCuisineTypes([...cuisineTypes, newCuisine.trim().toLowerCase()]);
      setNewCuisine("");
    }
  };

  const handleRemoveCuisine = (cuisine: string) => {
    setCuisineTypes(cuisineTypes.filter(c => c !== cuisine));
  };

  const toggleDietaryRestriction = (restriction: string) => {
    if (dietaryRestrictions.includes(restriction)) {
      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
    } else {
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          name,
          description,
          cuisine_types: cuisineTypes,
          dietary_restrictions: dietaryRestrictions as any,
        })
        .eq("id", restaurant.id);

      if (error) throw error;

      toast.success("Restaurant updated successfully");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update restaurant");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Restaurant</DialogTitle>
          <DialogDescription>
            Update restaurant details for today's recommendation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Restaurant Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Restaurant name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Restaurant description"
              rows={3}
            />
          </div>

          <div>
            <Label>Cuisine Types</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newCuisine}
                onChange={(e) => setNewCuisine(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddCuisine()}
                placeholder="Add cuisine type"
              />
              <Button type="button" onClick={handleAddCuisine}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {cuisineTypes.map((cuisine) => (
                <Badge key={cuisine} variant="secondary" className="gap-1">
                  {cuisine}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleRemoveCuisine(cuisine)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <Label>Dietary Restrictions</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DIETARY_OPTIONS.map((restriction) => (
                <Badge
                  key={restriction}
                  variant={dietaryRestrictions.includes(restriction) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleDietaryRestriction(restriction)}
                >
                  {restriction.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
