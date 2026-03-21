import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, MessageSquareText, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Fix: Removed inner backticks and ${} template literals so it doesn't break React compilation
const COMMENT_SCRAPER_SCRIPT = String.raw`(async function runReelScoutExtractorV9() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const TARGET_COMMENTS = 250;
  const globalComments = [];
  const seen = new Set();
  const knownUsernames = new Set(); 

  const m = window.location.pathname.match(/\/reels?\/([^\/?#]+)/i);
  if (!m) return alert("Please run this on a Reel page!");

  const dialog = document.querySelector('div[role="dialog"]');
  if (!dialog) return alert("Please open the comments popup first!");

  const scrollables = Array.from(dialog.querySelectorAll("div")).filter(
    (d) => d.scrollHeight > d.clientHeight + 40 && d.clientHeight > 0
  );
  const commentsRoot = scrollables.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];

  if (!commentsRoot) return alert("Could not find scrollable comments area.");

  console.log("🚁 ReelScout Scraper V9 FIXED: Extracting with timestamps...");

  for (let i = 0; i < 50; i++) {
    // Expand buttons
    const expanders = Array.from(commentsRoot.querySelectorAll('span, div[role="button"]'))
      .filter(el => el.innerText && /^(more|view replies)$/i.test(el.innerText.trim()));
    expanders.forEach(btn => { try { btn.click(); } catch(e){} });

    await sleep(600);

    // Username blacklist
    const profileLinks = commentsRoot.querySelectorAll('a[href]');
    profileLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/') && href.split('/').length === 3) {
        const username = href.replaceAll('/', '').trim().toLowerCase();
        if (username && username !== "p" && username !== "reels") knownUsernames.add(username);
        if (link.innerText) knownUsernames.add(link.innerText.trim().toLowerCase());
      }
    });

    // Extract comments + timestamps
    const commentNodes = commentsRoot.querySelectorAll('span[dir="auto"]');

    commentNodes.forEach(node => {
      const text = node.innerText.trim();
      const lowerText = text.toLowerCase();

      const isUI = /^(reply|hide replies|see translation|translated|like|likes|follow|following)$/i.test(text) || /^view all \d+ replies$/i.test(text);
      const isNumberOrTime = /^\d+[smhdw]$/i.test(text) || /^\d+$/.test(text);
      const isLikeCount = /^\d+\s+likes?$/i.test(text);
      const isTagOnly = /^@[a-z0-9_.]+$/i.test(text);
      const isUsername = knownUsernames.has(lowerText);

      if (!text || text.length <= 1 || isUI || isNumberOrTime || isLikeCount || isTagOnly || isUsername) return;

      // 🔥 FIXED PARENT DETECTION
      let parent = node.closest('li');

      // fallback if no <li>
      if (!parent) {
        parent = node;
        for (let i = 0; i < 4; i++) {
          if (parent.parentElement) parent = parent.parentElement;
        }
      }

      // ⏱ Extract timestamp (FIXED)
      let timestamp = null;

      // 1. Try exact <time> inside comment block
      const timeEl = parent.querySelector('time');
      if (timeEl) {
        timestamp = timeEl.getAttribute('datetime') || timeEl.innerText;
      }

      // 2. Expand search to nearby container (important fix)
      if (!timestamp) {
        let container = parent;
        for (let i = 0; i < 2; i++) {
          if (container.parentElement) container = container.parentElement;
        }

        const timeEl2 = container.querySelector('time');
        if (timeEl2) {
          timestamp = timeEl2.getAttribute('datetime') || timeEl2.innerText;
        }
      }

      // 3. Fallback: "2h", "3d"
      if (!timestamp) {
        const possibleTimes = Array.from(parent.querySelectorAll('a, span'))
          .map(el => el.innerText.trim())
          .find(t => /^\d+[smhdw]$/i.test(t));

        if (possibleTimes) timestamp = possibleTimes;
      }

      const key = text + "|" + timestamp;
      if (!seen.has(key)) {
        seen.add(key);
        globalComments.push({
          comment: text,
          timestamp: timestamp || "unknown"
        });
      }
    });

    // Scroll
    const previousHeight = commentsRoot.scrollHeight;
    commentsRoot.scrollTop = commentsRoot.scrollHeight;

    console.log("Scroll \${i+1}: \${globalComments.length} comments");

    if (globalComments.length >= TARGET_COMMENTS) break;

    await sleep(1500);
    if (commentsRoot.scrollHeight === previousHeight && i > 5) break;
  }

  // Output
  const payload = JSON.stringify(globalComments, null, 2);

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.9);z-index:999999;display:flex;flex-direction:column;justify-content:center;align-items:center;color:white;font-family:sans-serif;";
  
  const title = document.createElement("h2");
  title.innerText = "✅ Scraped " + globalComments.length + " Comments with timestamps!";
  title.style.marginBottom = "30px";

  const copyBtn = document.createElement("button");
  copyBtn.innerText = "📋 CLICK HERE TO COPY";
  copyBtn.style.cssText = "padding:20px 40px;font-size:24px;background:#0095f6;color:white;border:none;border-radius:8px;cursor:pointer;margin-bottom:20px;";

  overlay.appendChild(title);
  overlay.appendChild(copyBtn);
  document.body.appendChild(overlay);

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(payload);
      copyBtn.innerText = "✅ COPIED!";
    } catch {
      alert("Clipboard blocked!");
    }
  });

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
      // 1. Try modern Clipboard API first
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(COMMENT_SCRAPER_SCRIPT);
        toast.success("Script copied!");
        return;
      }
      throw new Error("Clipboard API not available");
    } catch (err) {
      // 2. Fallback to older execCommand method
      try {
        const textArea = document.createElement("textarea");
        textArea.value = COMMENT_SCRAPER_SCRIPT;
        
        // Make it invisible
        textArea.style.position = "absolute";
        textArea.style.left = "-999999px";
        
        document.body.appendChild(textArea);
        textArea.select();
        
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          toast.success("Script copied (fallback method)!");
        } else {
          toast.error("Could not copy script. Please copy manually.");
        }
      } catch (fallbackErr) {
        console.error("Both copy methods failed:", fallbackErr);
        toast.error("Could not copy script. Please copy manually.");
      }
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

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Contribute a <span className="text-gradient-hero">Reel</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Share your discovery! Submit a reel link and help others find Kerala's hidden gems.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 text-base">
          <div className="space-y-2">
            <Label htmlFor="reelUrl" className="flex items-center gap-2 text-base text-foreground">
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
              className="h-12 text-base bg-card border-border focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <div className="space-y-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-base font-medium text-foreground">Comment Scraper Script</p>
                <Button type="button" variant="outline" onClick={copyScriptToClipboard}>
                  Copy Script
                </Button>
              </div>
              <div className="rounded-lg border border-border bg-background/70 p-3">
                <p className="text-sm font-medium text-foreground mb-2">How to get comments</p>
                <ol className="list-decimal pl-4 space-y-1 text-sm text-muted-foreground">
                  <li>Open the reel in Instagram web on desktop.</li>
                  <li>Open the comments popup for that reel.</li>
                  <li>Press <span className="font-mono text-foreground">Ctrl + Shift + I</span>, go to Console, paste the copied script, and press Enter.</li>
                  <li>In the popup, click <span className="font-mono text-foreground">CLICK HERE TO COPY</span>.</li>
                  <li>Paste the copied output in the <span className="font-medium text-foreground">Paste Comments</span> field below.</li>
                </ol>
              </div>
                <Textarea
                  value={COMMENT_SCRAPER_SCRIPT}
                  readOnly
                  rows={12}
                  className="bg-background border-border font-mono text-sm"
                />
              </div>

            <Label htmlFor="commentsText" className="flex items-center gap-2 text-base text-foreground">
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
              className="text-base bg-card border-border focus-visible:ring-primary resize-none"
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
