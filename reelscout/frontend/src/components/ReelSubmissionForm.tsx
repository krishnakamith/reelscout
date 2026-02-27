import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, MapPin, Tag, FileText, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ReelSubmissionForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reelUrl: "",
    locationName: "",
    district: "",
    tags: "",
    description: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Send the data to our Vite proxy, which forwards it to Django
      const response = await fetch('/api/search/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Django is expecting the field to be named 'url', so we map reelUrl to url
        body: JSON.stringify({
          url: formData.reelUrl,
          locationName: formData.locationName,
          district: formData.district,
          tags: formData.tags,
          description: formData.description
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Reel submitted successfully!", {
          description: `Detected location: ${data.data.location_name}`,
        });
        // Clear the form or navigate away
        navigate("/");
      } else {
        // If Django sends back an error (like an invalid URL)
        throw new Error(data.error || "Submission failed");
      }
    } catch (error) {
      toast.error("Error submitting reel", {
        description: error instanceof Error ? error.message : "Our AI couldn't process this reel.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Contribute a <span className="text-gradient-hero">Reel</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Share your discovery! Submit a reel link and help others find Kerala's hidden gems.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Reel URL */}
          <div className="space-y-2">
            <Label htmlFor="reelUrl" className="flex items-center gap-2 text-foreground">
              <Link2 className="h-4 w-4 text-secondary" />
              Reel URL *
            </Label>
            <Input
              id="reelUrl"
              name="reelUrl"
              type="url"
              placeholder="https://instagram.com/reel/..."
              value={formData.reelUrl}
              onChange={handleChange}
              required
              className="bg-card border-border focus-visible:ring-primary"
            />
            <p className="text-sm text-muted-foreground">
              Paste the Instagram or YouTube reel/shorts link
            </p>
          </div>

          {/* Location Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="locationName" className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-secondary" />
                Location Name *
              </Label>
              <Input
                id="locationName"
                name="locationName"
                placeholder="e.g., Athirappilly Falls"
                value={formData.locationName}
                onChange={handleChange}
                required
                className="bg-card border-border focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="district" className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4 text-secondary" />
                District
              </Label>
              <Input
                id="district"
                name="district"
                placeholder="e.g., Thrissur"
                value={formData.district}
                onChange={handleChange}
                className="bg-card border-border focus-visible:ring-primary"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags" className="flex items-center gap-2 text-foreground">
              <Tag className="h-4 w-4 text-secondary" />
              Tags
            </Label>
            <Input
              id="tags"
              name="tags"
              placeholder="waterfall, nature, trekking (comma separated)"
              value={formData.tags}
              onChange={handleChange}
              className="bg-card border-border focus-visible:ring-primary"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2 text-foreground">
              <FileText className="h-4 w-4 text-secondary" />
              Your Experience (Optional)
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Share any tips, best time to visit, or your experience..."
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="bg-card border-border focus-visible:ring-primary resize-none"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-semibold bg-gradient-accent hover:opacity-90 transition-opacity"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Submitting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Submit Reel
              </span>
            )}
          </Button>
        </form>

        {/* Info Card */}
        <div className="mt-10 p-6 rounded-2xl bg-muted/50 border border-border">
          <h3 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            What happens next?
          </h3>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              Our AI analyzes the reel for location details
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              Location is geo-tagged and added to the map
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              Community can contribute additional details
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
