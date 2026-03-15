import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, MessageSquareText, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Fix: Removed inner backticks and ${} template literals so it doesn't break React compilation
const COMMENT_SCRAPER_SCRIPT = String.raw`(async function runReelScoutExtractorV7() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const TARGET_COMMENTS = 150; 
  const globalComments = new Set();
  const knownUsernames = new Set(); // 🚀 Our new dynamic blacklist

  const m = window.location.pathname.match(/\/reels?\/([^\/?#]+)/i);
  if (!m) return alert("Please run this on a Reel page!");

  const dialog = document.querySelector('div[role="dialog"]');
  if (!dialog) return alert("Please open the comments popup first!");

  const scrollables = Array.from(dialog.querySelectorAll("div")).filter(
    (d) => d.scrollHeight > d.clientHeight + 40 && d.clientHeight > 0
  );
  const commentsRoot = scrollables.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];

  if (!commentsRoot) return alert("Could not find scrollable comments area.");

  console.log("🚁 ReelScout Scraper V7: Building username blacklist & extracting...");

  for (let i = 0; i < 50; i++) {
    // 1. Expand all "more" text
    const expanders = Array.from(commentsRoot.querySelectorAll('span, div[role="button"]'))
        .filter(el => el.innerText && /^(more|view replies)$/i.test(el.innerText.trim()));
    expanders.forEach(btn => { try { btn.click(); } catch(e){} });

    await sleep(600);

    // 2. 🚀 NEW: Build the Username Blacklist from actual profile links
    const profileLinks = commentsRoot.querySelectorAll('a[href]');
    profileLinks.forEach(link => {
        const href = link.getAttribute('href');
        // Look for typical IG profile links like "/username/"
        if (href && href.startsWith('/') && href.split('/').length === 3) {
            const username = href.replaceAll('/', '').trim().toLowerCase();
            if (username && username !== "p" && username !== "reels") {
                knownUsernames.add(username);
            }
            // Also grab the literal text of the link just to be safe
            if (link.innerText) knownUsernames.add(link.innerText.trim().toLowerCase());
        }
    });

    // 3. Harvest and Filter
    const commentNodes = commentsRoot.querySelectorAll('span[dir="auto"]');
    commentNodes.forEach(node => {
        const text = node.innerText.trim();
        const lowerText = text.toLowerCase();
        
        // Basic UI filters
        const isUI = /^(reply|hide replies|see translation|translated|like|likes|follow|following)$/i.test(text) || /^view all \d+ replies$/i.test(text);
        const isNumberOrTime = /^\d+[smhdw]$/i.test(text) || /^\d+w$/i.test(text) || /^\d+$/.test(text);
        const isLikeCount = /^\d+\s+likes?$/i.test(text);
        const isTagOnly = /^@[a-z0-9_.]+$/i.test(text);

        // 🚀 THE MAGIC: Is this text in our dynamic blacklist?
        const isUsername = knownUsernames.has(lowerText);

        // If it passes all tests, add it to our clean array
        if (text && text.length > 1 && !isUI && !isNumberOrTime && !isLikeCount && !isTagOnly && !isUsername) {
            globalComments.add(text);
        }
    });

    // 4. Scroll Down
    const previousHeight = commentsRoot.scrollHeight;
    commentsRoot.scrollTop = commentsRoot.scrollHeight;
    console.log("Scroll Pass \${i+1}: Logged \${globalComments.size} comments (Blocked \${knownUsernames.size} usernames)...");

    if (globalComments.size >= TARGET_COMMENTS) break;

    await sleep(1500);

    // Break if we hit the true bottom
    if (commentsRoot.scrollHeight === previousHeight && i > 5) break;
  }

  // 5. Output
  const allCommentsArray = Array.from(globalComments);
  const payload = JSON.stringify(allCommentsArray, null, 2);

  // Force Copy to Clipboard
  try {
    const ta = document.createElement("textarea");
    ta.value = payload;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    alert("✅ Success! Copied comments!");
  } catch (err) {
    console.error("Payload:", payload);
    alert("Clipboard copy failed, but the array is printed in the browser console.");
  }
})();`;

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

  const parseJsonSafe = async (response: Response) => {
    const raw = await response.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {
        error: `Server returned non-JSON response (HTTP ${response.status}).`,
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let pastedShortCode: string | null = null;
      let comments: string[] = [];
      const commentsInput = formData.commentsText.trim();

      try {
        const parsed = JSON.parse(commentsInput);
        if (Array.isArray(parsed)) {
          comments = parsed
            .map((item) => String(item).trim())
            .filter((line) => line.length > 0);
        } else if (parsed && typeof parsed === "object") {
          if (typeof parsed.short_code === "string") {
            pastedShortCode = parsed.short_code;
          }
          if (Array.isArray(parsed.comments)) {
            comments = parsed.comments
              .map((item) => String(item).trim())
              .filter((line) => line.length > 0);
          }
        }
      } catch {
        comments = commentsInput
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
      }

      const response = await fetch('/api/search/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formData.reelUrl,
          comments,
        }),
      });

      const data = await parseJsonSafe(response);

      if (response.ok) {
        const shortCode = data?.data?.short_code || pastedShortCode;

        if (shortCode && comments.length > 0 && (data?.data?.comments_count ?? 0) === 0) {
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
            const commentsData = await parseJsonSafe(commentsResponse);
            throw new Error(commentsData.error || "Failed to save comments");
          }
        }

        toast.success("Reel submitted successfully!", {
          description: `Detected location: ${data.data.location_name}${data?.data?.category ? ` (${data.data.category})` : ""}`,
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
        throw new Error(data.error || `Submission failed (HTTP ${response.status})`);
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
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
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