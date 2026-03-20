import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  ClipboardList,
  Crown,
  Loader2,
  Shield,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "../backend.d";
import {
  useBanUser,
  useDismissMarkRequest,
  useGetMarkRequests,
  useSetExamEntry,
} from "../hooks/useExtraQueries";
import { useAssignUserRole, useGetAllUserProfiles } from "../hooks/useQueries";

function formatDate(ts: bigint) {
  return new Date(Number(ts) / 1_000_000).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminPage() {
  const { data: users, isLoading: usersLoading } = useGetAllUserProfiles();
  const { data: markRequests, isLoading: requestsLoading } =
    useGetMarkRequests();
  const assignRole = useAssignUserRole();
  const setExamEntry = useSetExamEntry();
  const dismissMarkRequest = useDismissMarkRequest();
  const banUser = useBanUser();

  const handleMakeAdmin = async (userId: any, displayName: string) => {
    try {
      await assignRole.mutateAsync({ userId, role: UserRole.admin });
      toast.success(`${displayName} is now an admin!`);
    } catch {
      toast.error("Failed to update role.");
    }
  };

  const handleRemoveAdmin = async (userId: any, displayName: string) => {
    try {
      await assignRole.mutateAsync({ userId, role: UserRole.user });
      toast.success(`${displayName}'s admin removed.`);
    } catch {
      toast.error("Failed to update role.");
    }
  };

  const handleApproveMarkRequest = async (req: any) => {
    try {
      await setExamEntry.mutateAsync({
        studentName: req.requesterName,
        examType: req.examType,
        scores: req.scores,
      });
      await dismissMarkRequest.mutateAsync(req.id);
      toast.success("Marks added and request dismissed!");
    } catch {
      toast.error("Failed to approve request.");
    }
  };

  const handleDismissMarkRequest = async (id: bigint) => {
    try {
      await dismissMarkRequest.mutateAsync(id);
      toast.success("Request dismissed.");
    } catch {
      toast.error("Failed to dismiss.");
    }
  };

  const handleBanUser = async (userId: any, displayName: string) => {
    if (!confirm(`Ban ${displayName} for 2 days?`)) return;
    try {
      await banUser.mutateAsync({
        target: userId,
        durationNanos: BigInt("172800000000000"),
      });
      toast.success(`${displayName} has been banned for 2 days.`);
    } catch {
      toast.error("Failed to ban user.");
    }
  };

  return (
    <main
      className="max-w-4xl mx-auto px-4 sm:px-6 py-10"
      data-ocid="admin.page"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Admin Panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage members, mark requests, and moderation
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" data-ocid="admin.tab">
        <TabsList className="mb-6 w-full">
          <TabsTrigger
            value="users"
            className="flex-1 gap-2"
            data-ocid="admin.users.tab"
          >
            <UserCheck className="w-4 h-4" /> Members
          </TabsTrigger>
          <TabsTrigger
            value="marks"
            className="flex-1 gap-2"
            data-ocid="admin.marks.tab"
          >
            <ClipboardList className="w-4 h-4" /> Mark Requests
            {markRequests && markRequests.length > 0 && (
              <Badge className="ml-1 text-xs h-4 px-1 bg-destructive text-destructive-foreground">
                {markRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="moderation"
            className="flex-1 gap-2"
            data-ocid="admin.moderation.tab"
          >
            <Ban className="w-4 h-4" /> Moderation
          </TabsTrigger>
        </TabsList>

        {/* USERS TAB */}
        <TabsContent value="users">
          {usersLoading ? (
            <div className="space-y-3" data-ocid="admin.users.loading_state">
              {Array.from({ length: 4 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !users || users.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20 text-center"
              data-ocid="admin.users.empty_state"
            >
              <UserCheck className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">
                No registered users yet
              </p>
            </div>
          ) : (
            <div className="space-y-3" data-ocid="admin.users.table">
              {users.map((user, idx) => {
                const isOwner = user.username === "mr_science1469";
                const isAdmin =
                  user.role === "admin" || user.role === UserRole.admin;
                const rowNum = idx + 1;
                return (
                  <div
                    key={user.username}
                    data-ocid={`admin.users.item.${rowNum}`}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground font-display font-bold text-sm shrink-0">
                        {user.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground truncate">
                            {user.displayName}
                          </span>
                          {isOwner && (
                            <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          @{user.username}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <Badge
                        variant={isAdmin ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {isOwner ? "Owner" : isAdmin ? "Admin" : "Member"}
                      </Badge>
                      {!isOwner &&
                        (isAdmin ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 text-xs"
                            data-ocid={`admin.remove_admin_button.${rowNum}`}
                            onClick={() =>
                              handleRemoveAdmin(user.userId, user.displayName)
                            }
                            disabled={assignRole.isPending}
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            Remove Admin
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            data-ocid={`admin.make_admin_button.${rowNum}`}
                            onClick={() =>
                              handleMakeAdmin(user.userId, user.displayName)
                            }
                            disabled={assignRole.isPending}
                          >
                            <Shield className="w-3.5 h-3.5 mr-1" />
                            Make Admin
                          </Button>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* MARK REQUESTS TAB */}
        <TabsContent value="marks">
          {requestsLoading ? (
            <div className="space-y-3" data-ocid="admin.marks.loading_state">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : !markRequests || markRequests.length === 0 ? (
            <div
              className="text-center py-20"
              data-ocid="admin.marks.empty_state"
            >
              <ClipboardList className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">
                No mark requests pending
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Members will appear here when they request marks to be added
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {markRequests.map((req, idx) => (
                <Card
                  key={req.id.toString()}
                  className="border-border shadow-card"
                  data-ocid={`admin.marks.item.${idx + 1}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-display">
                          {req.requesterName}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {req.examType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(req.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {req.message && (
                      <p className="text-sm text-muted-foreground italic">
                        "{req.message}"
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {req.scores.map(([subject, score]: [string, bigint]) => (
                        <Badge
                          key={subject}
                          variant="secondary"
                          className="text-xs"
                        >
                          {subject}: {score.toString()}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => handleApproveMarkRequest(req)}
                        disabled={
                          setExamEntry.isPending || dismissMarkRequest.isPending
                        }
                        data-ocid={`admin.marks.confirm_button.${idx + 1}`}
                      >
                        {setExamEntry.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleDismissMarkRequest(req.id)}
                        disabled={dismissMarkRequest.isPending}
                        data-ocid={`admin.marks.cancel_button.${idx + 1}`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Dismiss
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* MODERATION TAB */}
        <TabsContent value="moderation">
          <Card className="border-border mb-4">
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" /> Ban
                Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Ban a member for 2 days if they violate community guidelines
                (posting Italian brainrot, offensive content, etc.)
              </p>
              {usersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(users ?? [])
                    .filter((u) => u.username !== "mr_science1469")
                    .map((user, idx) => (
                      <div
                        key={user.username}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                        data-ocid={`admin.ban.item.${idx + 1}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold">
                            {user.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {user.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 text-xs gap-1"
                          onClick={() =>
                            handleBanUser(user.userId, user.displayName)
                          }
                          disabled={banUser.isPending}
                          data-ocid={`admin.ban.delete_button.${idx + 1}`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Ban 2 Days
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
