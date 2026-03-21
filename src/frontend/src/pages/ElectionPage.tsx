import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Trash2,
  Unlock,
  Users,
  Vote,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Candidate } from "../backend.d";
// Election no longer supports vote changes
import {
  useAddCandidate,
  useCastVote,
  useGetElectionResults,
  useGetElectionStatus,
  useGetVoterList,
  useHasVoted,
  useRemoveCandidate,
  useSetElectionOpen,
  useUpdateCandidate,
} from "../hooks/useQueries";

interface ElectionPageProps {
  isAdmin: boolean;
  isAuthenticated: boolean;
  onLoginClick: () => void;
}

const sampleCandidates: Candidate[] = [
  {
    id: BigInt(1),
    name: "Member 1",
    bio: "Add your campaign bio here.",
    voteCount: BigInt(0),
  },
  {
    id: BigInt(2),
    name: "Member 2",
    bio: "Add your campaign bio here.",
    voteCount: BigInt(0),
  },
  {
    id: BigInt(3),
    name: "Member 3",
    bio: "Add your campaign bio here.",
    voteCount: BigInt(0),
  },
  {
    id: BigInt(4),
    name: "Member 4",
    bio: "Add your campaign bio here.",
    voteCount: BigInt(0),
  },
  {
    id: BigInt(5),
    name: "Member 5",
    bio: "Add your campaign bio here.",
    voteCount: BigInt(0),
  },
  {
    id: BigInt(6),
    name: "Member 6",
    bio: "Add your campaign bio here.",
    voteCount: BigInt(0),
  },
  {
    id: BigInt(7),
    name: "Member 7",
    bio: "Add your campaign bio here.",
    voteCount: BigInt(0),
  },
];

function VoterListModal({
  candidateId,
  candidateName,
  onClose,
}: { candidateId: bigint; candidateName: string; onClose: () => void }) {
  const { data: voters, isLoading } = useGetVoterList(candidateId);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent data-ocid="election.voters.dialog">
        <DialogHeader>
          <DialogTitle className="font-display">
            Voters for {candidateName}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2" data-ocid="election.voters.loading_state">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 rounded-lg" />
            ))}
          </div>
        ) : voters && voters.length > 0 ? (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {voters.map((p, i) => (
              <div
                key={p.toString()}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                data-ocid={`election.voter.item.${i + 1}`}
              >
                <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-mono text-xs truncate">
                  {p.toString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p
            className="text-muted-foreground text-sm py-4 text-center"
            data-ocid="election.voters.empty_state"
          >
            No votes yet.
          </p>
        )}
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={onClose}
            data-ocid="election.voters.close_button"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ElectionPage({
  isAdmin,
  isAuthenticated,
  onLoginClick,
}: ElectionPageProps) {
  const { data: candidates, isLoading: candidatesLoading } =
    useGetElectionResults();
  const { data: status, isLoading: statusLoading } = useGetElectionStatus();
  const { data: voted } = useHasVoted();
  const castVote = useCastVote();
  const [confirmVoteId, setConfirmVoteId] = useState<bigint | null>(null);
  const safeGetItem = (key: string, fallback = "") => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  };
  const [electionTitle, setElectionTitle] = useState<string>(() =>
    safeGetItem("electionTitle", "Class Election 2026-27"),
  );
  const [electionDate, setElectionDate] = useState<string>(() =>
    safeGetItem("electionDate"),
  );
  const [electionTime, setElectionTime] = useState<string>(() =>
    safeGetItem("electionTime"),
  );
  const [electionDay, setElectionDay] = useState<string>(() =>
    safeGetItem("electionDay"),
  );
  const [editInfoDialog, setEditInfoDialog] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [tempDate, setTempDate] = useState("");
  const [tempTime, setTempTime] = useState("");
  const [tempDay, setTempDay] = useState("");

  const setElectionOpen = useSetElectionOpen();
  const addCandidate = useAddCandidate();
  const updateCandidate = useUpdateCandidate();
  const removeCandidate = useRemoveCandidate();

  const [candidateDialog, setCandidateDialog] = useState(false);
  const [editCandidate, setEditCandidate] = useState<Candidate | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidateBio, setCandidateBio] = useState("");
  const [voterModal, setVoterModal] = useState<{
    id: bigint;
    name: string;
  } | null>(null);
  const [votingId, setVotingId] = useState<bigint | null>(null);

  const displayCandidates =
    candidates && candidates.length > 0 ? candidates : sampleCandidates;
  const isOpen = status?.isOpen ?? false;
  const totalVotes = Number(
    status?.totalVotes ??
      displayCandidates.reduce((s, c) => s + Number(c.voteCount), 0),
  );

  const openAddCandidate = () => {
    setEditCandidate(null);
    setCandidateName("");
    setCandidateBio("");
    setCandidateDialog(true);
  };

  const openEditCandidate = (c: Candidate) => {
    setEditCandidate(c);
    setCandidateName(c.name);
    setCandidateBio(c.bio);
    setCandidateDialog(true);
  };

  const handleSaveCandidate = async () => {
    if (!candidateName.trim() || !candidateBio.trim()) {
      toast.error("Fill in all fields.");
      return;
    }
    try {
      if (editCandidate) {
        await updateCandidate.mutateAsync({
          id: editCandidate.id,
          name: candidateName,
          bio: candidateBio,
        });
        toast.success("Candidate updated!");
      } else {
        await addCandidate.mutateAsync({
          name: candidateName,
          bio: candidateBio,
        });
        toast.success("Candidate added!");
      }
      setCandidateDialog(false);
    } catch {
      toast.error("Failed to save candidate.");
    }
  };

  const handleRemoveCandidate = async (id: bigint) => {
    if (!confirm("Remove this candidate?")) return;
    try {
      await removeCandidate.mutateAsync(id);
      toast.success("Candidate removed.");
    } catch {
      toast.error("Failed to remove.");
    }
  };

  const handleVoteClick = (candidateId: bigint) => {
    if (!isAuthenticated) {
      onLoginClick();
      return;
    }
    if (voted) return; // one vote only
    setConfirmVoteId(candidateId);
  };

  const handleConfirmVote = async () => {
    if (confirmVoteId === null) return;
    setVotingId(confirmVoteId);
    setConfirmVoteId(null);
    try {
      await castVote.mutateAsync(confirmVoteId);
      toast.success("Your vote has been cast! ✅");
    } catch {
      toast.error("Failed to vote. You may have already voted.");
    } finally {
      setVotingId(null);
    }
  };

  const handleSaveElectionInfo = () => {
    try {
      localStorage.setItem("electionTitle", tempTitle);
    } catch {}
    try {
      localStorage.setItem("electionDate", tempDate);
    } catch {}
    try {
      localStorage.setItem("electionTime", tempTime);
    } catch {}
    try {
      localStorage.setItem("electionDay", tempDay);
    } catch {}
    setElectionTitle(tempTitle);
    setElectionDate(tempDate);
    setElectionTime(tempTime);
    setElectionDay(tempDay);
    setEditInfoDialog(false);
    toast.success("Election info updated!");
  };

  const handleToggleElection = async () => {
    try {
      await setElectionOpen.mutateAsync(!isOpen);
      toast.success(isOpen ? "Election closed." : "Election opened!");
    } catch {
      toast.error("Failed to update election status.");
    }
  };

  const isLoading = candidatesLoading || statusLoading;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Vote className="w-5 h-5 text-chart-3" />
            <span
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: "oklch(0.65 0.2 300)" }}
            >
              Group Election
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold text-foreground">
            {electionTitle}
          </h1>
          <p className="text-muted-foreground mt-1">
            One vote per member — make it count!
          </p>
          {(electionDay || electionDate || electionTime) && (
            <p className="text-sm text-primary font-medium mt-1">
              {[electionDay, electionDate, electionTime]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setTempTitle(electionTitle);
                setTempDate(electionDate);
                setTempTime(electionTime);
                setTempDay(electionDay);
                setEditInfoDialog(true);
              }}
              className="gap-2"
              data-ocid="election.editinfo.button"
            >
              <Pencil className="w-4 h-4" /> Edit Info
            </Button>
            <Button
              variant="outline"
              onClick={handleToggleElection}
              disabled={setElectionOpen.isPending}
              className="gap-2"
              data-ocid="election.toggle.button"
            >
              {isOpen ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              {isOpen ? "Close" : "Open"} Election
            </Button>
            <Button
              onClick={openAddCandidate}
              className="gap-2"
              data-ocid="election.add.button"
            >
              <Plus className="w-4 h-4" /> Add Candidate
            </Button>
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div
        className={`rounded-xl p-4 mb-8 flex items-center gap-3 ${
          isOpen
            ? "bg-primary/10 border border-primary/20"
            : "bg-muted border border-border"
        }`}
        data-ocid="election.status.panel"
      >
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOpen ? "bg-primary animate-pulse" : "bg-muted-foreground"}`}
        />
        <div className="flex-1">
          <p className="font-display font-bold">
            Election is {isOpen ? "Open" : "Closed"}
          </p>
          <p className="text-sm text-muted-foreground">
            {totalVotes} total vote{totalVotes !== 1 ? "s" : ""} cast
            {voted && " · You have voted"}
          </p>
        </div>
        {voted && (
          <Badge className="bg-primary text-primary-foreground gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Voted
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div
          className="grid sm:grid-cols-3 gap-4"
          data-ocid="election.loading_state"
        >
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      ) : displayCandidates.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="election.empty_state"
        >
          <Vote className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No candidates added yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {displayCandidates.map((candidate, i) => {
              const voteCount = Number(candidate.voteCount);
              const pct =
                totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const isVoting = votingId === candidate.id;
              return (
                <motion.div
                  key={candidate.id.toString()}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card
                    className="shadow-card border-border h-full flex flex-col"
                    data-ocid={`election.candidate.item.${i + 1}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                            <span className="font-display font-bold text-primary">
                              {candidate.name.charAt(0)}
                            </span>
                          </div>
                          <CardTitle className="font-display text-base">
                            {candidate.name}
                          </CardTitle>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditCandidate(candidate)}
                              data-ocid={`election.edit_button.${i + 1}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() =>
                                handleRemoveCandidate(candidate.id)
                              }
                              data-ocid={`election.delete_button.${i + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 flex-1">
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                        {candidate.bio}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{voteCount} votes</span>
                          <span>{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {isOpen && (
                          <Button
                            className="flex-1 font-medium"
                            onClick={() => handleVoteClick(candidate.id)}
                            disabled={isVoting || !isOpen || !!voted}
                            variant={voted ? "secondary" : "default"}
                            data-ocid={`election.vote_button.${i + 1}`}
                          >
                            {isVoting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Voting...
                              </>
                            ) : voted ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Voted
                              </>
                            ) : (
                              "Vote"
                            )}
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setVoterModal({
                                id: candidate.id,
                                name: candidate.name,
                              })
                            }
                            className="gap-1 text-xs"
                            data-ocid={`election.voters_button.${i + 1}`}
                          >
                            <Users className="w-3.5 h-3.5" /> Voters
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Candidate Dialog */}
      <Dialog open={candidateDialog} onOpenChange={setCandidateDialog}>
        <DialogContent data-ocid="election.candidate.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editCandidate ? "Edit Candidate" : "Add Candidate"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Member's name"
                data-ocid="election.candidate.name.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Campaign Bio</Label>
              <Textarea
                value={candidateBio}
                onChange={(e) => setCandidateBio(e.target.value)}
                placeholder="Why should members vote for this person?"
                rows={4}
                data-ocid="election.candidate.bio.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCandidateDialog(false)}
              data-ocid="election.candidate.cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCandidate}
              disabled={addCandidate.isPending || updateCandidate.isPending}
              data-ocid="election.candidate.submit.button"
            >
              {addCandidate.isPending || updateCandidate.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editCandidate ? (
                "Update"
              ) : (
                "Add Candidate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Voter List Modal */}
      {voterModal && (
        <VoterListModal
          candidateId={voterModal.id}
          candidateName={voterModal.name}
          onClose={() => setVoterModal(null)}
        />
      )}

      {/* Are you sure? Confirmation Dialog */}
      <Dialog
        open={confirmVoteId !== null}
        onOpenChange={(v) => !v && setConfirmVoteId(null)}
      >
        <DialogContent data-ocid="election.confirm.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Are you sure?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Once you cast your vote, it cannot be changed. This decision is
            final.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmVoteId(null)}
              data-ocid="election.confirm.cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmVote}
              data-ocid="election.confirm.yes"
            >
              Yes, Cast My Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin: Edit Election Info Dialog */}
      <Dialog open={editInfoDialog} onOpenChange={setEditInfoDialog}>
        <DialogContent data-ocid="election.editinfo.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit Election Info
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Election Title</Label>
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                placeholder="e.g. Class President Election"
                data-ocid="election.editinfo.title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Day (e.g. Monday)</Label>
              <Input
                value={tempDay}
                onChange={(e) => setTempDay(e.target.value)}
                placeholder="e.g. Monday"
                data-ocid="election.editinfo.day"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date (e.g. 15 March 2026)</Label>
              <Input
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                placeholder="e.g. 15 March 2026"
                data-ocid="election.editinfo.date"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Time (e.g. 10:00 AM)</Label>
              <Input
                value={tempTime}
                onChange={(e) => setTempTime(e.target.value)}
                placeholder="e.g. 10:00 AM"
                data-ocid="election.editinfo.time"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditInfoDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveElectionInfo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
