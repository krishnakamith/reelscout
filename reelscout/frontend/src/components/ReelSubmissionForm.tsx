import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, MessageSquareText, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const COMMENT_SCRAPER_SCRIPT = String.raw`(async function runCommentsOnlyScraper() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const MAX_COMMENTS = 800;

  const m = window.location.pathname.match(/\/reels?\/([^\/?#]+)/i);
  const short_code = m ? m[1] : null;
  if (!short_code) return alert("Cannot detect reel shortcode from URL.");

  const text = (el) => (el?.innerText || "").trim();
  const isVisible = (el) => !!(el && el.offsetParent !== null);

  function getCommentsRoot() {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return null;

    const all = Array.from(dialog.querySelectorAll("div"));
    const scrollables = all.filter(
      (d) => isVisible(d) && d.scrollHeight > d.clientHeight + 20
    );
    scrollables.sort(
      (a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight)
    );
    return scrollables[0] || null;
  }

  const commentsRoot = getCommentsRoot();
  if (!commentsRoot) {
    alert("Could not find comments panel. Open comments popup first, then run.");
    return;
  }

  const clickPatterns = [
    /view replies?/i,
    /view all replies?/i,
    /see replies?/i,
    /more replies?/i,
    /see more/i,
    /load more comments?/i
  ];

  function clickExpandableInRoot(root) {
    let n = 0;
    const els = Array.from(root.querySelectorAll("button, div[role='button'], span"));
    for (const el of els) {
      const t = text(el).toLowerCase();
      if (!t) continue;
      if (clickPatterns.some((p) => p.test(t))) {
        try { el.click(); n++; } catch {}
      }
    }
    return n;
  }

  function looksLikeCommentLine(s) {
    const t = String(s || "").trim();
    if (t.length < 3 || t.length > 350) return false;
    if (/^\d+\s*[smhdw]$/i.test(t)) return false;

    const junk = [
      "reply", "replies", "see translation", "translated", "like", "likes",
      "follow", "following", "message", "comments", "original audio"
    ];
    if (junk.includes(t.toLowerCase())) return false;

    if (!/\s/.test(t) && t.length < 12) return false;
    return true;
  }

  let stagnant = 0;
  let prevHeight = commentsRoot.scrollHeight;

  for (let i = 0; i < 20; i++) {
    const clicks = clickExpandableInRoot(commentsRoot);
    await sleep(800);

    const before = commentsRoot.scrollTop;
    commentsRoot.scrollTop = Math.min(
      commentsRoot.scrollTop + Math.max(700, commentsRoot.clientHeight * 0.9),
      commentsRoot.scrollHeight
    );
    await sleep(1100);

    const heightGrew = commentsRoot.scrollHeight > prevHeight + 20;
    const moved = commentsRoot.scrollTop > before;

    if (!heightGrew && !moved && clicks === 0) stagnant++;
    else stagnant = 0;

    prevHeight = commentsRoot.scrollHeight;
    if (stagnant >= 4) break;
  }

  const raw = [];
  const candidates = commentsRoot.querySelectorAll("span, h3, div[dir='auto']");
  for (const el of candidates) {
    const t = text(el);
    if (looksLikeCommentLine(t)) raw.push(t);
  }

  const seen = new Set();
  const comments = [];
  for (const c of raw) {
    const k = c.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      comments.push(c);
      if (comments.length >= MAX_COMMENTS) break;
    }
  }

  const payload = JSON.stringify({ short_code, comments });

  function fallbackCopy(str) {
    const ta = document.createElement("textarea");
    ta.value = str;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    document.body.removeChild(ta);
    return ok;
  }

  let copied = false;

  try {
    await navigator.clipboard.writeText(payload);
    copied = true;
  } catch {}

  if (!copied) {
    try {
      copy(payload);
      copied = true;
    } catch {}
  }

  if (!copied) {
    copied = fallbackCopy(payload);
  }

  if (copied) {
    alert("Copied " + comments.length + " comments. Paste directly into ReelScout.");
  } else {
    prompt("Auto-copy failed. Press Ctrl+C then Enter:", payload);
  }

  console.log({
    short_code,
    comments_count: comments.length,
    max_comments: MAX_COMMENTS,
    sample: comments.slice(0, 20)
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

      // Support both raw newline comments and the JSON payload copied from the scraper script.
      try {
        const parsed = JSON.parse(commentsInput);
        if (parsed && typeof parsed === "object") {
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

      // Send URL + comments together so backend can persist comments before AI analysis starts.
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

        // Backward-compatibility fallback for older backend behavior.
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
        // If Django sends back an error (like an invalid URL)
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
      {/* Header */}
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

