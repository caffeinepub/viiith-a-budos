import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Users } from "lucide-react";
import { motion } from "motion/react";
import { useGetOnlineUsernames } from "../hooks/useExtraQueries";
import { useGetAllUserProfiles } from "../hooks/useQueries";

export default function MembersPage() {
  const { data: members, isLoading } = useGetAllUserProfiles();
  const cookieConsent = localStorage.getItem("cookie_consent") === "true";
  const { data: onlineUsernames } = useGetOnlineUsernames(cookieConsent);
  const onlineSet = new Set(onlineUsernames ?? []);

  return (
    <main
      className="max-w-4xl mx-auto px-4 sm:px-6 py-10"
      data-ocid="members.page"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5 text-primary" />
          <span className="text-primary text-sm font-semibold uppercase tracking-wide">
            Group
          </span>
        </div>
        <h1 className="font-display text-4xl font-bold text-foreground">
          Our Members
        </h1>
        <p className="text-muted-foreground mt-1">
          {cookieConsent
            ? "Green dot means currently online."
            : "Cookie consent required to see live online status. Accept cookies in the banner below."}
        </p>
      </motion.div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
          data-ocid="members.loading_state"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <div className="text-center py-20" data-ocid="members.empty_state">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="font-display text-xl font-bold text-foreground mb-2">
            No Members Yet
          </h2>
          <p className="text-muted-foreground">
            Members will appear here once they register.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {members.map((member, i) => {
            const isOwner = member.username === "mr_science1469";
            const isAdmin = member.role === "admin";
            const isOnline = cookieConsent && onlineSet.has(member.username);
            return (
              <motion.div
                key={member.username}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-ocid={`members.item.${i + 1}`}
              >
                <Card className="border-border shadow-card hover:shadow-card-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground font-display font-bold text-lg">
                            {member.displayName.slice(0, 2).toUpperCase()}
                          </div>
                          {cookieConsent && (
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                                isOnline
                                  ? "bg-green-500"
                                  : "bg-muted-foreground/40"
                              }`}
                              title={isOnline ? "Online" : "Offline"}
                            />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-foreground">
                              {member.displayName}
                            </span>
                            {isOwner && (
                              <Crown className="w-3.5 h-3.5 text-amber-500" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            @{member.username}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          isOwner
                            ? "default"
                            : isAdmin
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs shrink-0"
                      >
                        {isOwner ? "Owner" : isAdmin ? "Admin" : "Member"}
                      </Badge>
                    </div>
                    {cookieConsent && (
                      <div className="mt-3 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOnline ? "bg-green-500" : "bg-muted-foreground/40"
                          }`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {isOnline ? "Online now" : "Offline"}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </main>
  );
}
