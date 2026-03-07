import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, MessageSquareText, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const COMMENT_SCRAPER_SCRIPT = String.raw`async function run() {
    console.log("🚀 Script Started...");

    // 1. Get Shortcode
    const match = window.location.pathname.match(/\/reels?\/([^\/]+)/);
    const sc = match ? match[1] : null;
    if (!sc) { alert("❌ Error: Can't find Reel ID in URL"); return; }
    console.log("✅ Reel ID found:", sc);

    // 2. Scrape Text (Instant Mode - No clicking for now)
    const comments = [];
    document.querySelectorAll('span').forEach(s => {
        if (s.innerText.length > 2 && s.innerText.length < 300) comments.push(s.innerText);
    });
    const uniqueComments = [...new Set(comments)];
    console.log(\`✅ Scraped \${uniqueComments.length} comments.\`);

    // 3. Prepare Data
    const payload = JSON.stringify({ short_code: sc, comments: uniqueComments });

    // 4. Try to Copy (The "Triple Fallback" Method)
    try {
        // Method A: Standard Clipboard API
        await navigator.clipboard.writeText(payload);
        alert("✅ COPIED! (Method A)\n\nGo paste it in ReelScout.");
    } catch (errA) {
        console.warn("Method A failed. Trying Method B...");
        try {
            // Method B: DevTools Command
            copy(payload);
            alert("✅ COPIED! (Method B)\n\nGo paste it in ReelScout.");
        } catch (errB) {
            console.warn("Method B failed. Switching to Manual Mode.");
            // Method C: Brute Force Prompt
            window.prompt("❌ Auto-copy failed. Press Ctrl+C to copy this manually:", payload);
        }
    }
}
run();`;

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function ReelSubmissionForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    reelUrl: "",
    commentsText: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const copyScriptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(COMMENT_SCRAPER_SCRIPT);
      toast.success("Script copied");
    } catch {
      toast.error("Could not copy script");
    }
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
        body: JSON.stringify({
          url: formData.reelUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const shortCode = data?.data?.short_code;
        const comments = formData.commentsText
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);

        if (shortCode && comments.length > 0) {
          const commentsResponse = await fetch('/api/save-comments/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              short_code: shortCode,
              comments,
            }),
          });

          if (!commentsResponse.ok) {
            const commentsData = await commentsResponse.json().catch(() => ({}));
            throw new Error(commentsData.error || "Failed to save comments");
          }
        }

        toast.success("Reel submitted successfully!", {
          description: `Detected location: ${data.data.location_name}`,
        });
        const locationSlug =
          data?.data?.location_slug ||
          toSlug(data?.data?.location_name || "hidden-gem");

        navigate(`/location/${locationSlug}`, {
          state: {
            submittedReel: {
              shortCode,
              reelUrl: formData.reelUrl,
            },
          },
        });
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
              value={formData.reelUrl}
              onChange={handleChange}
              required
              className="bg-card border-border focus-visible:ring-primary"
            />
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Comment Scraper Script</p>
                <Button type="button" variant="outline" onClick={copyScriptToClipboard}>
                  Copy Script
                </Button>
              </div>
              <Textarea
                value={COMMENT_SCRAPER_SCRIPT}
                readOnly
                rows={12}
                className="bg-background border-border font-mono text-xs"
              />
            </div>

            <Label htmlFor="commentsText" className="flex items-center gap-2 text-foreground">
              <MessageSquareText className="h-4 w-4 text-secondary" />
              Paste Comments
            </Label>
            <Textarea
              id="commentsText"
              name="commentsText"
              value={formData.commentsText}
              onChange={handleChange}
              required
              rows={8}
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
