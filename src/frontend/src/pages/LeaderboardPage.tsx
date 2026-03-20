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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Send,
  Star,
  Trash2,
  Trophy,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { ExamEntry, LeaderboardEntry, UserProfile } from "../backend.d";
import {
  useDeleteExamEntry,
  useGetExamLeaderboard,
  useSetExamEntry,
  useSubmitMarkRequest,
} from "../hooks/useExtraQueries";
import {
  useDeleteLeaderboardEntry,
  useGetLeaderboard,
  useSetLeaderboardEntry,
} from "../hooks/useQueries";

interface LeaderboardPageProps {
  isAdmin: boolean;
  isAuthenticated: boolean;
  userProfile?: UserProfile | null;
}

// Subject definitions per exam type
const PT_SUBJECTS = [
  { key: "Maths", max: 30 },
  { key: "Science", max: 30 },
  { key: "Hindi", max: 30 },
  { key: "French", max: 30 },
  { key: "SST", max: 30 },
  { key: "English", max: 30 },
  { key: "Computer", max: 20 },
];

const TERM_SUBJECTS = [
  { key: "Maths", max: 80 },
  { key: "Science", max: 80 },
  { key: "Hindi", max: 80 },
  { key: "French", max: 80 },
  { key: "SST", max: 80 },
  { key: "English", max: 80 },
  { key: "Computer", max: 25 },
  { key: "GK", max: 50 },
];

const LAST_YEAR_SUBJECTS = [
  { key: "Maths", max: 80 },
  { key: "Science", max: 80 },
  { key: "Hindi", max: 80 },
  { key: "French", max: 80 },
  { key: "SST", max: 80 },
  { key: "English", max: 80 },
  { key: "Computer Theory", max: 25 },
  { key: "Computer Practical", max: 25 },
  { key: "GK", max: 50 },
];

const EXAM_TYPES = [
  "PT-1",
  "PT-2",
  "PT-3",
  "PT-4",
  "Term-1",
  "Term-2",
  "Last-Year",
] as const;
type ExamType = (typeof EXAM_TYPES)[number];

function getSubjectsForExam(examType: ExamType) {
  if (examType === "Last-Year") return LAST_YEAR_SUBJECTS;
  return examType.startsWith("PT") ? PT_SUBJECTS : TERM_SUBJECTS;
}

function getTotalMax(subjects: { key: string; max: number }[]) {
  return subjects.reduce((s, sub) => s + sub.max, 0);
}

// Badge definitions
const SUBJECT_BADGES: Record<string, string> = {
  Maths: "🔢 The Mathematician",
  Science: "🔬 The Scientist",
  Hindi: "📖 Maharaja of Hindi",
  English: "✍️ Best in English",
  French: "🥐 l'empereur de francaise",
  Computer: "💻 The Computer Wizard",
  GK: "🌍 The GK Master",
  SST: "🗺️ Emperor of SST Empire",
};

function getChampions(
  entries: ExamEntry[],
  subjects: { key: string; max: number }[],
) {
  const champs: Record<string, { name: string; score: number }> = {};
  for (const entry of entries) {
    const scoreMap = new Map(entry.scores.map(([s, v]) => [s, Number(v)]));
    for (const sub of subjects) {
      const score = scoreMap.get(sub.key) ?? 0;
      if (!champs[sub.key] || score > champs[sub.key].score) {
        champs[sub.key] = { name: entry.studentName, score };
      }
    }
  }
  return champs;
}

const sampleEntries: LeaderboardEntry[] = [
  {
    id: BigInt(1),
    studentName: "Member 1",
    rank: BigInt(1),
    totalScore: BigInt(476),
    scores: [["Score", BigInt(476)]],
  },
  {
    id: BigInt(2),
    studentName: "Member 2",
    rank: BigInt(2),
    totalScore: BigInt(461),
    scores: [["Score", BigInt(461)]],
  },
  {
    id: BigInt(3),
    studentName: "Member 3",
    rank: BigInt(3),
    totalScore: BigInt(445),
    scores: [["Score", BigInt(445)]],
  },
  {
    id: BigInt(4),
    studentName: "Member 4",
    rank: BigInt(4),
    totalScore: BigInt(430),
    scores: [["Score", BigInt(430)]],
  },
  {
    id: BigInt(5),
    studentName: "Member 5",
    rank: BigInt(5),
    totalScore: BigInt(415),
    scores: [["Score", BigInt(415)]],
  },
  {
    id: BigInt(6),
    studentName: "Member 6",
    rank: BigInt(6),
    totalScore: BigInt(398),
    scores: [["Score", BigInt(398)]],
  },
  {
    id: BigInt(7),
    studentName: "Member 7",
    rank: BigInt(7),
    totalScore: BigInt(380),
    scores: [["Score", BigInt(380)]],
  },
  {
    id: BigInt(8),
    studentName: "Member 8",
    rank: BigInt(8),
    totalScore: BigInt(360),
    scores: [["Score", BigInt(360)]],
  },
];

const medalColors = ["text-yellow-500", "text-slate-400", "text-amber-600"];

// ─── Overall Leaderboard ─────────────────────────────────────────────────────

function OverallLeaderboard({ isAdmin }: { isAdmin: boolean }) {
  const { data: entries, isLoading } = useGetLeaderboard();
  const setEntry = useSetLeaderboardEntry();
  const deleteEntry = useDeleteLeaderboardEntry();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  const [subjects, setSubjects] = useState<[string, string][]>([["Score", ""]]);

  const displayEntries =
    entries && entries.length > 0 ? entries : sampleEntries;
  const sorted = [...displayEntries].sort(
    (a, b) => Number(a.rank) - Number(b.rank),
  );

  const openAddDialog = () => {
    setEditingName(null);
    setStudentName("");
    setSubjects([["Score", ""]]);
    setDialogOpen(true);
  };
  const openEditDialog = (entry: LeaderboardEntry) => {
    setEditingName(entry.studentName);
    setStudentName(entry.studentName);
    setSubjects(
      entry.scores.map(([s, v]) => [s, v.toString()] as [string, string]),
    );
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!studentName.trim()) {
      toast.error("Enter a student name.");
      return;
    }
    const parsedScores: [string, bigint][] = subjects
      .filter(([s]) => s.trim())
      .map(([s, v]) => [s, BigInt(Number(v) || 0)]);
    try {
      await setEntry.mutateAsync({ studentName, scores: parsedScores });
      toast.success(editingName ? "Entry updated!" : "Entry added!");
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save.");
    }
  };

  const handleDelete = async (entry: LeaderboardEntry) => {
    if (!confirm(`Delete ${entry.studentName}?`)) return;
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast.success("Deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  return (
    <>
      {isAdmin && (
        <div className="mb-4">
          <Button
            size="sm"
            onClick={openAddDialog}
            className="gap-2"
            data-ocid="leaderboard.add.button"
          >
            <Plus className="w-4 h-4" /> Add Entry
          </Button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="pb-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Rank
              </th>
              <th className="pb-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Member
              </th>
              <th className="pb-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                Score
              </th>
              {isAdmin && (
                <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td colSpan={4}>
                  <Skeleton className="h-12 w-full" />
                </td>
              </tr>
            ) : (
              sorted.map((entry, i) => (
                <tr
                  key={entry.id.toString()}
                  className="group"
                  data-ocid={`leaderboard.item.${i + 1}`}
                >
                  <td className="py-3 pr-4">
                    <span
                      className={`font-display font-bold text-lg ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}
                    >
                      {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-medium text-foreground">
                      {entry.studentName}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="font-display font-bold text-primary">
                      {entry.totalScore.toString()}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(entry)}
                          data-ocid={`leaderboard.edit_button.${i + 1}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(entry)}
                          data-ocid={`leaderboard.delete_button.${i + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="leaderboard.edit.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingName ? "Edit Entry" : "Add Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Student Name</Label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Member name"
                data-ocid="leaderboard.name.input"
              />
            </div>
            <div className="space-y-2">
              <Label>Scores</Label>
              {subjects.map(([subj, score], i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: positional
                <div key={i} className="flex gap-2">
                  <Input
                    value={subj}
                    onChange={(e) => {
                      const u = [...subjects];
                      u[i] = [e.target.value, u[i][1]];
                      setSubjects(u);
                    }}
                    placeholder="Subject"
                    className="flex-1"
                  />
                  <Input
                    value={score}
                    onChange={(e) => {
                      const u = [...subjects];
                      u[i] = [u[i][0], e.target.value];
                      setSubjects(u);
                    }}
                    placeholder="Score"
                    type="number"
                    className="w-24"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setSubjects(subjects.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSubjects([...subjects, ["", ""]])}
                className="gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add Subject
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="leaderboard.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={setEntry.isPending}
              data-ocid="leaderboard.edit.save_button"
            >
              {setEntry.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}{" "}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Exam Leaderboard ─────────────────────────────────────────────────────────

function ExamLeaderboard({
  examType,
  isAdmin,
  isAuthenticated,
  userProfile,
}: {
  examType: ExamType;
  isAdmin: boolean;
  isAuthenticated: boolean;
  userProfile?: UserProfile | null;
}) {
  const subjects = getSubjectsForExam(examType);
  const totalMax = getTotalMax(subjects);
  const { data: entries, isLoading } = useGetExamLeaderboard(examType);
  const setExamEntry = useSetExamEntry();
  const deleteExamEntry = useDeleteExamEntry();
  const submitMarkRequest = useSubmitMarkRequest();

  const [editDialog, setEditDialog] = useState(false);
  const [editStudent, setEditStudent] = useState("");
  const [editScores, setEditScores] = useState<Record<string, string>>({});
  const [_editId, setEditId] = useState<bigint | null>(null);

  const [requestDialog, setRequestDialog] = useState(false);
  const [reqScores, setReqScores] = useState<Record<string, string>>({});
  const [reqMessage, setReqMessage] = useState("");

  const champions =
    entries && entries.length > 0 ? getChampions(entries, subjects) : {};

  const sorted = [...(entries ?? [])].sort((a, b) => {
    const aTotal = a.scores.reduce((s, [, v]) => s + Number(v), 0);
    const bTotal = b.scores.reduce((s, [, v]) => s + Number(v), 0);
    return bTotal - aTotal;
  });

  const openEdit = (entry?: ExamEntry) => {
    if (entry) {
      setEditStudent(entry.studentName);
      setEditId(entry.id);
      const sc: Record<string, string> = {};
      for (const [s, v] of entry.scores) sc[s] = v.toString();
      setEditScores(sc);
    } else {
      setEditStudent("");
      setEditId(null);
      setEditScores({});
    }
    setEditDialog(true);
  };

  const handleSaveExam = async () => {
    if (!editStudent.trim()) {
      toast.error("Enter a name.");
      return;
    }
    const scores: [string, bigint][] = subjects.map((s) => [
      s.key,
      BigInt(Number(editScores[s.key] ?? 0)),
    ]);
    try {
      await setExamEntry.mutateAsync({
        studentName: editStudent,
        examType,
        scores,
      });
      toast.success("Entry saved!");
      setEditDialog(false);
    } catch {
      toast.error("Failed to save.");
    }
  };

  const handleDeleteExam = async (id: bigint) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await deleteExamEntry.mutateAsync({ id, examType });
      toast.success("Deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleSubmitRequest = async () => {
    if (!userProfile) {
      toast.error("Please log in.");
      return;
    }
    const scores: [string, bigint][] = subjects.map((s) => [
      s.key,
      BigInt(Number(reqScores[s.key] ?? 0)),
    ]);
    try {
      await submitMarkRequest.mutateAsync({
        requesterName: userProfile.displayName,
        examType,
        scores,
        message: reqMessage,
      });
      toast.success("Request submitted! Admin will review it.");
      setRequestDialog(false);
      setReqScores({});
      setReqMessage("");
    } catch {
      toast.error("Failed to submit request.");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              size="sm"
              onClick={() => openEdit()}
              className="gap-2"
              data-ocid="leaderboard.exam.add.button"
            >
              <Plus className="w-4 h-4" /> Add Marks
            </Button>
          )}
          {isAuthenticated && !isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRequestDialog(true)}
              className="gap-2"
              data-ocid="leaderboard.request.button"
            >
              <ClipboardList className="w-4 h-4" /> Request My Marks
            </Button>
          )}
        </div>
      </div>

      {/* Champions row */}
      {Object.keys(champions).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {subjects.map((sub) => {
            const champ = champions[sub.key];
            const badge = SUBJECT_BADGES[sub.key];
            if (!champ || !badge) return null;
            return (
              <div
                key={sub.key}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs"
              >
                <span>{badge}</span>
                <span className="text-muted-foreground">→ {champ.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="text-center py-16"
          data-ocid="leaderboard.exam.empty_state"
        >
          <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="font-display text-xl font-bold">
            No Scores for {examType}
          </p>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Add scores using the button above."
              : isAuthenticated
                ? "Request your marks using the button above."
                : "No data yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Rank
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Name
                </th>
                {subjects.map((s) => (
                  <th
                    key={s.key}
                    className="text-center px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  >
                    {s.key}
                    <br />
                    <span className="text-[10px] font-normal">/{s.max}</span>
                  </th>
                ))}
                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Total
                  <br />
                  <span className="text-[10px] font-normal">/{totalMax}</span>
                </th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  %
                </th>
                {isAdmin && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((entry, i) => {
                const scoreMap = new Map(
                  entry.scores.map(([s, v]) => [s, Number(v)]),
                );
                const total = subjects.reduce(
                  (sum, s) => sum + (scoreMap.get(s.key) ?? 0),
                  0,
                );
                const pct = Math.round((total / totalMax) * 100);
                const badgesForEntry = subjects
                  .filter(
                    (s) =>
                      champions[s.key]?.name === entry.studentName &&
                      SUBJECT_BADGES[s.key],
                  )
                  .map((s) => SUBJECT_BADGES[s.key]);
                return (
                  <tr
                    key={entry.id.toString()}
                    className="group hover:bg-muted/20"
                    data-ocid={`leaderboard.exam.item.${i + 1}`}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`font-display font-bold ${i < 3 ? medalColors[i] : "text-muted-foreground"}`}
                      >
                        {i < 3 ? ["🥇", "🥈", "🥉"][i] : `#${i + 1}`}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div>
                        <span className="font-medium text-foreground">
                          {entry.studentName}
                        </span>
                        {badgesForEntry.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {badgesForEntry.map((b) => (
                              <span
                                key={b}
                                className="text-[10px] text-amber-600 bg-amber-50 px-1 py-0.5 rounded"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    {subjects.map((s) => {
                      const score = scoreMap.get(s.key) ?? 0;
                      const isChamp =
                        champions[s.key]?.name === entry.studentName;
                      return (
                        <td key={s.key} className="text-center px-2 py-2">
                          <span
                            className={`font-medium ${isChamp ? "text-amber-600 font-bold" : "text-foreground"}`}
                          >
                            {score}
                            {isChamp ? " ⭐" : ""}
                          </span>
                        </td>
                      );
                    })}
                    <td className="text-center px-3 py-2 font-display font-bold text-primary">
                      {total}
                    </td>
                    <td className="text-center px-3 py-2">
                      <Badge
                        variant={
                          pct >= 75
                            ? "default"
                            : pct >= 50
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {pct}%
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-2">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(entry)}
                            data-ocid={`leaderboard.exam.edit_button.${i + 1}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteExam(entry.id)}
                            data-ocid={`leaderboard.exam.delete_button.${i + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin edit dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent data-ocid="leaderboard.exam.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit {examType} Marks
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Student Name</Label>
              <Input
                value={editStudent}
                onChange={(e) => setEditStudent(e.target.value)}
                placeholder="Member name"
                data-ocid="leaderboard.exam.name.input"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {subjects.map((s) => (
                <div key={s.key} className="space-y-1">
                  <Label className="text-xs">
                    {s.key} (max {s.max})
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={s.max}
                    value={editScores[s.key] ?? ""}
                    onChange={(e) =>
                      setEditScores((prev) => ({
                        ...prev,
                        [s.key]: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="h-8"
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialog(false)}
              data-ocid="leaderboard.exam.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveExam}
              disabled={setExamEntry.isPending}
              data-ocid="leaderboard.exam.save_button"
            >
              {setExamEntry.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}{" "}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request dialog */}
      <Dialog open={requestDialog} onOpenChange={setRequestDialog}>
        <DialogContent data-ocid="leaderboard.request.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Request Marks for {examType}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Enter your marks and admin will verify and add them.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {subjects.map((s) => (
                <div key={s.key} className="space-y-1">
                  <Label className="text-xs">
                    {s.key} (max {s.max})
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={s.max}
                    value={reqScores[s.key] ?? ""}
                    onChange={(e) =>
                      setReqScores((prev) => ({
                        ...prev,
                        [s.key]: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className="h-8"
                    data-ocid="leaderboard.request.score.input"
                  />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Message to Admin (optional)</Label>
              <Textarea
                value={reqMessage}
                onChange={(e) => setReqMessage(e.target.value)}
                placeholder="Any notes for the admin..."
                rows={2}
                data-ocid="leaderboard.request.message.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestDialog(false)}
              data-ocid="leaderboard.request.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={submitMarkRequest.isPending}
              data-ocid="leaderboard.request.submit_button"
            >
              {submitMarkRequest.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}{" "}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeaderboardPage({
  isAdmin,
  isAuthenticated,
  userProfile,
}: LeaderboardPageProps) {
  const [selectedExam, setSelectedExam] = useState<"overall" | ExamType>(
    "overall",
  );

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-yellow-600 text-sm font-semibold uppercase tracking-wide">
            Rankings
          </span>
        </div>
        <h1 className="font-display text-4xl font-bold text-foreground">
          Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Top Score of Last Term — Class VIIIth A
        </p>
      </motion.div>

      {/* Exam selector */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">View:</span>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={selectedExam === "overall" ? "default" : "outline"}
            onClick={() => setSelectedExam("overall")}
            data-ocid="leaderboard.overall.tab"
          >
            Overall
          </Button>
          {EXAM_TYPES.map((exam) => (
            <Button
              key={exam}
              size="sm"
              variant={selectedExam === exam ? "default" : "outline"}
              onClick={() => setSelectedExam(exam)}
              data-ocid={`leaderboard.${exam.toLowerCase().replace("-", "")}.tab`}
            >
              {exam === "Last-Year" ? "Last Year Overall" : exam}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-border shadow-card">
        <CardContent className="p-6">
          {selectedExam === "overall" ? (
            <OverallLeaderboard isAdmin={isAdmin} />
          ) : (
            <ExamLeaderboard
              examType={selectedExam}
              isAdmin={isAdmin}
              isAuthenticated={isAuthenticated}
              userProfile={userProfile}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
