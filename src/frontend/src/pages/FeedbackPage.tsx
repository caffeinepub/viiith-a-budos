import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Loader2, MessageSquare, Star, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import {
  useDeleteFeedback,
  useGetAllFeedback,
  useSubmitFeedback,
} from "../hooks/useExtraQueries";
import { useIsAdmin } from "../hooks/useQueries";

interface FeedbackPageProps {
  isAuthenticated: boolean;
  userProfile: UserProfile | null | undefined;
}

function StarRating({
  value,
  onChange,
}: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          className={`transition-colors ${
            onChange ? "cursor-pointer hover:scale-110" : "cursor-default"
          }`}
        >
          <Star
            className={`w-5 h-5 ${
              star <= value
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(ts: bigint) {
  return new Date(Number(ts) / 1_000_000).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FeedbackPage({
  isAuthenticated,
  userProfile,
}: FeedbackPageProps) {
  const { data: allFeedback, isLoading } = useGetAllFeedback();
  const { data: isAdmin } = useIsAdmin();
  const submitFeedback = useSubmitFeedback();
  const deleteFeedback = useDeleteFeedback();

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [feedbackType, setFeedbackType] = useState<
    "review" | "feature_request"
  >("review");

  const reviews = (allFeedback ?? []).filter(
    (f) => f.feedbackType === "review",
  );
  const requests = (allFeedback ?? []).filter(
    (f) => f.feedbackType === "feature_request",
  );

  const handleSubmit = async () => {
    if (!reviewText.trim()) {
      toast.error("Please write something.");
      return;
    }
    if (!userProfile) {
      toast.error("Please log in first.");
      return;
    }
    try {
      await submitFeedback.mutateAsync({
        authorName: userProfile.displayName,
        rating: BigInt(rating),
        reviewText,
        feedbackType,
      });
      toast.success(
        feedbackType === "review"
          ? "Review submitted!"
          : "Feature request submitted!",
      );
      setReviewText("");
      setRating(5);
    } catch {
      toast.error("Failed to submit. Please try again.");
    }
  };

  const handleDelete = async (id: bigint) => {
    if (!confirm("Delete this feedback?")) return;
    try {
      await deleteFeedback.mutateAsync(id);
      toast.success("Deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const FeedbackCard = ({
    item,
    index,
  }: { item: NonNullable<typeof allFeedback>[0]; index: number }) => (
    <motion.div
      key={item.id.toString()}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      data-ocid={`feedback.item.${index + 1}`}
    >
      <Card className="border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <StarRating value={Number(item.rating)} />
                <Badge variant="outline" className="text-xs">
                  {item.authorName}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(item.timestamp)}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {item.reviewText}
              </p>
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                onClick={() => handleDelete(item.id)}
                data-ocid={`feedback.delete_button.${index + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <main
      className="max-w-3xl mx-auto px-4 sm:px-6 py-10"
      data-ocid="feedback.page"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          <span className="text-primary text-sm font-semibold uppercase tracking-wide">
            Community
          </span>
        </div>
        <h1 className="font-display text-4xl font-bold text-foreground">
          Feedback Area
        </h1>
        <p className="text-muted-foreground mt-1">
          Rate the site, leave a review, or request new features.
        </p>
      </motion.div>

      {/* Submit form */}
      {isAuthenticated && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display">
                Share Your Feedback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={feedbackType === "review" ? "default" : "outline"}
                  onClick={() => setFeedbackType("review")}
                  className="gap-2"
                  data-ocid="feedback.review.tab"
                >
                  <Star className="w-3.5 h-3.5" /> Review
                </Button>
                <Button
                  size="sm"
                  variant={
                    feedbackType === "feature_request" ? "default" : "outline"
                  }
                  onClick={() => setFeedbackType("feature_request")}
                  className="gap-2"
                  data-ocid="feedback.feature.tab"
                >
                  <Lightbulb className="w-3.5 h-3.5" /> Feature Request
                </Button>
              </div>
              {feedbackType === "review" && (
                <div className="space-y-1.5">
                  <Label>Your Rating</Label>
                  <StarRating value={rating} onChange={setRating} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>
                  {feedbackType === "review"
                    ? "Your Review"
                    : "Describe the feature"}
                </Label>
                <Textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder={
                    feedbackType === "review"
                      ? "What do you think of the site?"
                      : "What feature would you like to see?"
                  }
                  rows={3}
                  data-ocid="feedback.textarea"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitFeedback.isPending}
                className="gap-2"
                data-ocid="feedback.submit.primary_button"
              >
                {submitFeedback.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : feedbackType === "review" ? (
                  <Star className="w-4 h-4" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
                Submit
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Tabs defaultValue="reviews" data-ocid="feedback.tab">
        <TabsList className="mb-6 w-full">
          <TabsTrigger
            value="reviews"
            className="flex-1 gap-2"
            data-ocid="feedback.reviews.tab"
          >
            <Star className="w-4 h-4" /> Reviews ({reviews.length})
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="flex-1 gap-2"
            data-ocid="feedback.requests.tab"
          >
            <Lightbulb className="w-4 h-4" /> Feature Requests (
            {requests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-3">
          {isLoading ? (
            <div className="space-y-3" data-ocid="feedback.loading_state">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div
              className="text-center py-16"
              data-ocid="feedback.reviews.empty_state"
            >
              <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="font-display text-xl font-bold">No Reviews Yet</p>
              <p className="text-muted-foreground mt-1">
                {isAuthenticated
                  ? "Be the first to leave a review!"
                  : "Login to leave a review."}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {reviews.map((item, i) => (
                <FeedbackCard key={item.id.toString()} item={item} index={i} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-3">
          {isLoading ? (
            <div
              className="space-y-3"
              data-ocid="feedback.requests.loading_state"
            >
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div
              className="text-center py-16"
              data-ocid="feedback.requests.empty_state"
            >
              <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <p className="font-display text-xl font-bold">
                No Feature Requests Yet
              </p>
              <p className="text-muted-foreground mt-1">
                {isAuthenticated
                  ? "Request a feature!"
                  : "Login to request features."}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {requests.map((item, i) => (
                <FeedbackCard key={item.id.toString()} item={item} index={i} />
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
