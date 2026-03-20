import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ExamEntry, Feedback, MarkRequest } from "../backend.d";
import { createActorWithConfig } from "../config";
import { useActor } from "./useActor";

// ── Exam Leaderboard ─────────────────────────────────────────────────────────

export function useGetExamLeaderboard(examType: string | null) {
  return useQuery<ExamEntry[]>({
    queryKey: ["examLeaderboard", examType],
    queryFn: async () => {
      if (!examType) return [];
      const actor = await createActorWithConfig();
      return (actor as any).getExamLeaderboard(examType) as Promise<
        ExamEntry[]
      >;
    },
    enabled: !!examType,
    staleTime: 30_000,
  });
}

export function useSetExamEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentName,
      examType,
      scores,
    }: {
      studentName: string;
      examType: string;
      scores: Array<[string, bigint]>;
    }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).setExamEntry(studentName, examType, scores);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["examLeaderboard", variables.examType],
      });
    },
  });
}

export function useDeleteExamEntry() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      examType: _examType,
    }: { id: bigint; examType: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).deleteExamEntry(id);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["examLeaderboard", variables.examType],
      });
    },
  });
}

export function useSubmitMarkRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requesterName,
      examType,
      scores,
      message,
    }: {
      requesterName: string;
      examType: string;
      scores: Array<[string, bigint]>;
      message: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).submitMarkRequest(
        requesterName,
        examType,
        scores,
        message,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["markRequests"] }),
  });
}

export function useGetMarkRequests() {
  const { actor, isFetching } = useActor();
  return useQuery<MarkRequest[]>({
    queryKey: ["markRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getMarkRequests() as Promise<MarkRequest[]>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDismissMarkRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).dismissMarkRequest(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["markRequests"] }),
  });
}

// ── Feedback ─────────────────────────────────────────────────────────────────

export function useGetAllFeedback() {
  return useQuery<Feedback[]>({
    queryKey: ["feedback"],
    queryFn: async () => {
      const actor = await createActorWithConfig();
      return (actor as any).getAllFeedback() as Promise<Feedback[]>;
    },
    staleTime: 30_000,
  });
}

export function useSubmitFeedback() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      authorName,
      rating,
      reviewText,
      feedbackType,
    }: {
      authorName: string;
      rating: bigint;
      reviewText: string;
      feedbackType: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).submitFeedback(
        authorName,
        rating,
        reviewText,
        feedbackType,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback"] }),
  });
}

export function useDeleteFeedback() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).deleteFeedback(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback"] }),
  });
}

// ── Election Vote Change ──────────────────────────────────────────────────────

export function useGetMyElectionVote() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint | null>({
    queryKey: ["myElectionVote"],
    queryFn: async () => {
      if (!actor) return null;
      return (actor as any).getMyElectionVote() as Promise<bigint | null>;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useChangeElectionVote() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newCandidateId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).changeElectionVote(newCandidateId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["electionResults"] });
      qc.invalidateQueries({ queryKey: ["electionStatus"] });
      qc.invalidateQueries({ queryKey: ["hasVoted"] });
      qc.invalidateQueries({ queryKey: ["myElectionVote"] });
    },
  });
}

// ── Online Status ─────────────────────────────────────────────────────────────

export function useGetOnlineUsernames(enabled = true) {
  return useQuery<string[]>({
    queryKey: ["onlineUsernames"],
    queryFn: async () => {
      const actor = await createActorWithConfig();
      return (actor as any).getOnlineUsernames() as Promise<string[]>;
    },
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    staleTime: 25_000,
  });
}

// ── Ban User ─────────────────────────────────────────────────────────────────

export function useBanUser() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      target,
      durationNanos,
    }: { target: any; durationNanos: bigint }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).banUser(target, durationNanos);
    },
  });
}
