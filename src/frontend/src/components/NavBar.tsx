import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Briefcase,
  ChevronDown,
  Crown,
  Gamepad2,
  Home,
  LogOut,
  MessageSquare,
  Shield,
  Trophy,
  User,
  Users,
  Vote,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Page } from "../App";
import type { UserProfile } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useGetOnlineUsernames } from "../hooks/useExtraQueries";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

interface NavBarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  userProfile: UserProfile | null | undefined;
  onLoginClick: () => void;
  isAdmin?: boolean;
}

const navLinks: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home className="w-4 h-4" /> },
  { id: "news", label: "News", icon: <BookOpen className="w-4 h-4" /> },
  {
    id: "leaderboard",
    label: "Leaderboard",
    icon: <Trophy className="w-4 h-4" />,
  },
  { id: "election", label: "Election", icon: <Vote className="w-4 h-4" /> },
  { id: "work", label: "Work", icon: <Briefcase className="w-4 h-4" /> },
  { id: "polls", label: "Polls & Plans", icon: <Vote className="w-4 h-4" /> },
  { id: "games", label: "Games", icon: <Gamepad2 className="w-4 h-4" /> },
  { id: "members", label: "Members", icon: <Users className="w-4 h-4" /> },
  {
    id: "feedback",
    label: "Feedback",
    icon: <MessageSquare className="w-4 h-4" />,
  },
];

export default function NavBar({
  currentPage,
  onNavigate,
  userProfile,
  onLoginClick,
  isAdmin = false,
}: NavBarProps) {
  const { identity, clear, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;
  const { actor } = useActor();
  const [challengeCount, setChallengeCount] = useState(0);
  const [cookieConsent, setCookieConsent] = useState<boolean | null>(() => {
    const stored = localStorage.getItem("cookie_consent");
    if (stored === "true") return true;
    if (stored === "false") return false;
    return null;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: onlineUsernames } = useGetOnlineUsernames(
    cookieConsent === true,
  );
  const onlineCount = onlineUsernames?.length ?? 0;

  // Record heartbeat every 30s when logged in
  useEffect(() => {
    if (!isAuthenticated || !actor) return;
    const sendHeartbeat = () => {
      (actor as any).recordHeartbeat().catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30_000);
    return () => clearInterval(interval);
  }, [isAuthenticated, actor]);

  // Fetch challenges
  useEffect(() => {
    if (!isAuthenticated || !userProfile || !actor) {
      setChallengeCount(0);
      return;
    }
    const fetch = async () => {
      try {
        const result = await (actor as any).getPendingChallenges(
          userProfile.username,
        );
        setChallengeCount((result ?? []).length);
      } catch {
        // silently ignore
      }
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, userProfile, actor]);

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleCookieConsent = (accept: boolean) => {
    localStorage.setItem("cookie_consent", String(accept));
    setCookieConsent(accept);
  };

  const initials = userProfile?.displayName
    ? userProfile.displayName.slice(0, 2).toUpperCase()
    : "?";

  const isOwner = userProfile?.username === "mr_science1469";

  const allLinks = isAdmin
    ? [
        ...navLinks,
        {
          id: "admin" as Page,
          label: "Admin Panel",
          icon: <Shield className="w-4 h-4" />,
        },
      ]
    : navLinks;

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button
              type="button"
              onClick={() => onNavigate("home")}
              className="flex items-center gap-2 group"
              data-ocid="nav.link"
            >
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-sm">
                VIII
              </div>
              <span className="font-display font-bold text-foreground text-lg hidden sm:block">
                BUDOS
              </span>
            </button>

            {/* Nav links */}
            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
              {allLinks.map((link) => (
                <button
                  type="button"
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  data-ocid={
                    link.id === "admin"
                      ? "nav.admin.link"
                      : `nav.${link.id}.link`
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    currentPage === link.id
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {link.icon}
                  {link.label}
                </button>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Online dot */}
              {cookieConsent === true && (
                <div
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                  title={`${onlineCount} online`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="hidden sm:inline">{onlineCount}</span>
                </div>
              )}

              {/* Challenge bell */}
              {isAuthenticated && userProfile && challengeCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate("games")}
                  className="relative p-1.5 rounded-md hover:bg-muted transition-colors"
                  title="You have pending game challenges"
                  data-ocid="nav.challenges.button"
                >
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    {challengeCount > 9 ? "9+" : challengeCount}
                  </span>
                </button>
              )}

              {/* Mobile menu toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen((v) => !v)}
              >
                ☰
              </Button>

              {isAuthenticated && userProfile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 h-9 px-3"
                      data-ocid="nav.dropdown_menu"
                    >
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground font-display font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
                        {userProfile.displayName}
                      </span>
                      {isOwner && (
                        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => onNavigate("members")}
                      data-ocid="nav.profile.link"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Members
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-destructive"
                      data-ocid="nav.logout.button"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  size="sm"
                  onClick={onLoginClick}
                  disabled={loginStatus === "logging-in"}
                  data-ocid="nav.login.button"
                >
                  {loginStatus === "logging-in" ? "Logging in..." : "Login"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden border-t border-border"
            >
              <nav className="px-4 py-3 flex flex-col gap-1 bg-card">
                {allLinks.map((link) => (
                  <button
                    type="button"
                    key={link.id}
                    onClick={() => {
                      onNavigate(link.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === link.id
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Cookie Consent Banner */}
      <AnimatePresence>
        {cookieConsent === null && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-card border-t border-border shadow-card-lg"
          >
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  🍪 Cookie Consent
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We use cookies to show live online status of members. Accept
                  to enable this feature.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCookieConsent(false)}
                  data-ocid="nav.cookie.cancel_button"
                >
                  Decline
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCookieConsent(true)}
                  data-ocid="nav.cookie.confirm_button"
                >
                  Accept
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
