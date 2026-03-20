import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);


  // ─── BAN SYSTEM ───────────────────────────────────────────
  let bans = Map.empty<Principal, Int>(); // principal -> unban timestamp

  public shared ({ caller }) func banUser(target : Principal, durationNanos : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can ban users");
    };
    let unbanAt = Time.now() + durationNanos;
    bans.add(target, unbanAt);
  };

  public query func isUserBanned(user : Principal) : async Bool {
    switch (bans.get(user)) {
      case (?unbanAt) { Time.now() < unbanAt };
      case (null) { false };
    };
  };

  func checkNotBanned(caller : Principal) {
    switch (bans.get(caller)) {
      case (?unbanAt) {
        if (Time.now() < unbanAt) {
          Runtime.trap("You are temporarily banned from posting.");
        };
      };
      case (null) {};
    };
  };

  // ─── ONLINE HEARTBEAT ─────────────────────────────────────
  let heartbeats = Map.empty<Principal, Int>();

  public shared ({ caller }) func recordHeartbeat() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    heartbeats.add(caller, Time.now());
  };

  public query func getOnlineUsernames() : async [Text] {
    let threshold = Time.now() - 60_000_000_000; // 60 seconds in nanoseconds
    let result = Map.empty<Text, Bool>();
    for ((principal, lastSeen) in heartbeats.entries()) {
      if (lastSeen > threshold) {
        switch (userProfiles.get(principal)) {
          case (?profile) { result.add(profile.username, true) };
          case (null) {};
        };
      };
    };
    result.keys().toArray();
  };

  // ─── USER PROFILES ────────────────────────────────────────
  public type UserProfile = {
    userId : Principal;
    username : Text;
    displayName : Text;
  };

  public type UserProfileWithRole = {
    userId : Principal;
    username : Text;
    displayName : Text;
    role : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(userId : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    userProfiles.get(userId);
  };

  public query ({ caller }) func getAllUserProfiles() : async [UserProfileWithRole] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let profiles = userProfiles.values().toArray();
    profiles.map(
      func(p : UserProfile) : UserProfileWithRole {
        let roleText = switch (accessControlState.userRoles.get(p.userId)) {
          case (?(#admin)) { "admin" };
          case (_) { "user" };
        };
        { userId = p.userId; username = p.username; displayName = p.displayName; role = roleText };
      }
    );
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let updatedProfile = { userId = caller; username = profile.username; displayName = profile.displayName };
    userProfiles.add(caller, updatedProfile);
    if (profile.username == "mr_science1469") {
      accessControlState.userRoles.add(caller, #admin);
    };
  };

  public shared ({ caller }) func updateDisplayName(name : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (userProfiles.get(caller)) {
      case (?profile) {
        userProfiles.add(caller, { userId = profile.userId; username = profile.username; displayName = name });
      };
      case (null) { Runtime.trap("Profile not found") };
    };
  };

  // ─── NEWS POSTS ───────────────────────────────────────────
  public type NewsPost = {
    id : Nat;
    title : Text;
    content : Text;
    author : Principal;
    timestamp : Int;
    isAnnouncement : Bool;
  };

  var nextNewsPostId : Nat = 0;
  let newsPosts = Map.empty<Nat, NewsPost>();

  public shared ({ caller }) func createNewsPost(title : Text, content : Text, isAnnouncement : Bool) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    checkNotBanned(caller);
    let id = nextNewsPostId;
    nextNewsPostId += 1;
    newsPosts.add(id, { id; title; content; author = caller; timestamp = Time.now(); isAnnouncement });
    id;
  };

  public shared ({ caller }) func updateNewsPost(id : Nat, title : Text, content : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (newsPosts.get(id)) {
      case (?post) {
        let isMrScience = switch (userProfiles.get(caller)) {
          case (?profile) { profile.username == "mr_science1469" };
          case (null) { false };
        };
        if (not (isMrScience or post.author == caller)) {
          Runtime.trap("Unauthorized");
        };
        newsPosts.add(id, { id = post.id; title; content; author = post.author; timestamp = post.timestamp; isAnnouncement = post.isAnnouncement });
      };
      case (null) { Runtime.trap("Not found") };
    };
  };

  public shared ({ caller }) func deleteNewsPost(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (newsPosts.get(id)) {
      case (?post) {
        let isMrScience = switch (userProfiles.get(caller)) {
          case (?profile) { profile.username == "mr_science1469" };
          case (null) { false };
        };
        if (not (isMrScience or post.author == caller)) {
          Runtime.trap("Unauthorized");
        };
        newsPosts.remove(id);
      };
      case (null) { Runtime.trap("Not found") };
    };
  };

  public query func getNewsPosts() : async [NewsPost] {
    let posts = newsPosts.values().toArray();
    posts.sort(func(a, b) { if (a.timestamp > b.timestamp) { #less } else if (a.timestamp < b.timestamp) { #greater } else { #equal } });
  };

  // ─── NEWS REQUESTS ────────────────────────────────────────
  public type NewsRequest = {
    id : Nat;
    requester : Principal;
    requesterName : Text;
    message : Text;
    timestamp : Int;
  };

  var nextNewsRequestId : Nat = 0;
  let newsRequests = Map.empty<Nat, NewsRequest>();

  public shared ({ caller }) func submitNewsRequest(requesterName : Text, message : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let id = nextNewsRequestId;
    nextNewsRequestId += 1;
    newsRequests.add(id, { id; requester = caller; requesterName; message; timestamp = Time.now() });
  };

  public query ({ caller }) func getNewsRequests() : async [NewsRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    newsRequests.values().toArray();
  };

  public shared ({ caller }) func dismissNewsRequest(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    newsRequests.remove(id);
  };

  // ─── LEADERBOARD (legacy single) ──────────────────────────
  public type LeaderboardEntry = {
    id : Nat;
    studentName : Text;
    scores : [(Text, Nat)];
    totalScore : Nat;
    rank : Nat;
  };

  var nextLeaderboardId : Nat = 0;
  let leaderboard = Map.empty<Nat, LeaderboardEntry>();

  public shared ({ caller }) func setLeaderboardEntry(studentName : Text, scores : [(Text, Nat)]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    var total : Nat = 0;
    for ((_, score) in scores.values()) { total += score };
    var existingId : ?Nat = null;
    for ((id, entry) in leaderboard.entries()) {
      if (entry.studentName == studentName) { existingId := ?id };
    };
    let id = switch (existingId) {
      case (?eid) { eid };
      case (null) { let newId = nextLeaderboardId; nextLeaderboardId += 1; newId };
    };
    leaderboard.add(id, { id; studentName; scores; totalScore = total; rank = 0 });
  };

  public shared ({ caller }) func deleteLeaderboardEntry(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    leaderboard.remove(id);
  };

  public query func getLeaderboard() : async [LeaderboardEntry] {
    let entries = leaderboard.values().toArray();
    let sorted = entries.sort(func(a, b) { if (a.totalScore > b.totalScore) { #less } else if (a.totalScore < b.totalScore) { #greater } else { #equal } });
    var rank = 1;
    sorted.map(func(entry) {
      let ranked = { id = entry.id; studentName = entry.studentName; scores = entry.scores; totalScore = entry.totalScore; rank };
      rank += 1;
      ranked;
    });
  };

  // ─── MULTI-EXAM LEADERBOARD ───────────────────────────────
  public type ExamEntry = {
    id : Nat;
    studentName : Text;
    examType : Text;
    scores : [(Text, Nat)];
    totalScore : Nat;
  };

  var nextExamEntryId : Nat = 0;
  let examLeaderboards = Map.empty<Nat, ExamEntry>();

  public shared ({ caller }) func setExamEntry(studentName : Text, examType : Text, scores : [(Text, Nat)]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    var total : Nat = 0;
    for ((_, score) in scores.values()) { total += score };
    var existingId : ?Nat = null;
    for ((id, entry) in examLeaderboards.entries()) {
      if (entry.studentName == studentName and entry.examType == examType) { existingId := ?id };
    };
    let id = switch (existingId) {
      case (?eid) { eid };
      case (null) { let newId = nextExamEntryId; nextExamEntryId += 1; newId };
    };
    examLeaderboards.add(id, { id; studentName; examType; scores; totalScore = total });
  };

  public shared ({ caller }) func deleteExamEntry(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    examLeaderboards.remove(id);
  };

  public query func getExamLeaderboard(examType : Text) : async [ExamEntry] {
    let all = examLeaderboards.values().toArray();
    let filtered = all.filter(func(e : ExamEntry) : Bool { e.examType == examType });
    filtered.sort(func(a, b) { if (a.totalScore > b.totalScore) { #less } else if (a.totalScore < b.totalScore) { #greater } else { #equal } });
  };

  // ─── MARK REQUESTS ────────────────────────────────────────
  public type MarkRequest = {
    id : Nat;
    requester : Principal;
    requesterName : Text;
    examType : Text;
    scores : [(Text, Nat)];
    message : Text;
    timestamp : Int;
  };

  var nextMarkRequestId : Nat = 0;
  let markRequests = Map.empty<Nat, MarkRequest>();

  public shared ({ caller }) func submitMarkRequest(requesterName : Text, examType : Text, scores : [(Text, Nat)], message : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let id = nextMarkRequestId;
    nextMarkRequestId += 1;
    markRequests.add(id, { id; requester = caller; requesterName; examType; scores; message; timestamp = Time.now() });
  };

  public query ({ caller }) func getMarkRequests() : async [MarkRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    markRequests.values().toArray();
  };

  public shared ({ caller }) func dismissMarkRequest(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    markRequests.remove(id);
  };

  // ─── FEEDBACK ─────────────────────────────────────────────
  public type Feedback = {
    id : Nat;
    author : Principal;
    authorName : Text;
    rating : Nat;
    reviewText : Text;
    feedbackType : Text;
    timestamp : Int;
  };

  var nextFeedbackId : Nat = 0;
  let feedbacks = Map.empty<Nat, Feedback>();

  public shared ({ caller }) func submitFeedback(authorName : Text, rating : Nat, reviewText : Text, feedbackType : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let id = nextFeedbackId;
    nextFeedbackId += 1;
    feedbacks.add(id, { id; author = caller; authorName; rating; reviewText; feedbackType; timestamp = Time.now() });
  };

  public query func getAllFeedback() : async [Feedback] {
    feedbacks.values().toArray();
  };

  public shared ({ caller }) func deleteFeedback(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    feedbacks.remove(id);
  };

  // ─── ELECTION ─────────────────────────────────────────────
  public type Candidate = {
    id : Nat;
    name : Text;
    photo : ?Text;
    bio : Text;
    voteCount : Nat;
  };

  var nextCandidateId : Nat = 0;
  let candidates = Map.empty<Nat, Candidate>();
  let votes = Map.empty<Principal, Nat>();
  let voteTimestamps = Map.empty<Principal, Int>();
  let votersByCandidateMap = Map.empty<Nat, [Principal]>();
  var electionOpen : Bool = false;

  public shared ({ caller }) func addCandidate(name : Text, bio : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    let id = nextCandidateId;
    nextCandidateId += 1;
    candidates.add(id, { id; name; photo = null; bio; voteCount = 0 });
    votersByCandidateMap.add(id, []);
    id;
  };

  public shared ({ caller }) func updateCandidate(id : Nat, name : Text, bio : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    switch (candidates.get(id)) {
      case (?candidate) {
        candidates.add(id, { id = candidate.id; name; photo = candidate.photo; bio; voteCount = candidate.voteCount });
      };
      case (null) { Runtime.trap("Not found") };
    };
  };

  public shared ({ caller }) func removeCandidate(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    candidates.remove(id);
    votersByCandidateMap.remove(id);
  };

  public shared ({ caller }) func castVote(candidateId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not electionOpen) { Runtime.trap("Election is not open") };
    if (votes.containsKey(caller)) { Runtime.trap("You have already voted") };
    switch (candidates.get(candidateId)) {
      case (?candidate) {
        candidates.add(candidateId, { id = candidate.id; name = candidate.name; photo = candidate.photo; bio = candidate.bio; voteCount = candidate.voteCount + 1 });
        votes.add(caller, candidateId);
        voteTimestamps.add(caller, Time.now());
        let currentVoters = switch (votersByCandidateMap.get(candidateId)) {
          case (?v) { v }; case (null) { [] };
        };
        votersByCandidateMap.add(candidateId, currentVoters.concat([caller]));
      };
      case (null) { Runtime.trap("Candidate not found") };
    };
  };

  public query ({ caller }) func getMyElectionVote() : async ?Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    votes.get(caller);
  };

  public shared ({ caller }) func changeElectionVote(newCandidateId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (not electionOpen) { Runtime.trap("Election is not open") };
    switch (votes.get(caller)) {
      case (?oldCandidateId) {
        let voteTime = switch (voteTimestamps.get(caller)) {
          case (?t) { t }; case (null) { 0 };
        };
        let twentyFourHours : Int = 86_400_000_000_000;
        if (Time.now() - voteTime > twentyFourHours) {
          Runtime.trap("Vote can only be changed within 24 hours of casting");
        };
        // Remove old vote
        switch (candidates.get(oldCandidateId)) {
          case (?oldCandidate) {
            let newCount = if (oldCandidate.voteCount > 0) { oldCandidate.voteCount - 1 } else { 0 };
            candidates.add(oldCandidateId, { id = oldCandidate.id; name = oldCandidate.name; photo = oldCandidate.photo; bio = oldCandidate.bio; voteCount = newCount });
            let newVoters = switch (votersByCandidateMap.get(oldCandidateId)) {
              case (?voters) { voters.filter(func(p : Principal) : Bool { p != caller }) };
              case (null) { [] };
            };
            votersByCandidateMap.add(oldCandidateId, newVoters);
          };
          case (null) {};
        };
        // Add new vote
        switch (candidates.get(newCandidateId)) {
          case (?newCandidate) {
            candidates.add(newCandidateId, { id = newCandidate.id; name = newCandidate.name; photo = newCandidate.photo; bio = newCandidate.bio; voteCount = newCandidate.voteCount + 1 });
            let currentVoters = switch (votersByCandidateMap.get(newCandidateId)) {
              case (?v) { v }; case (null) { [] };
            };
            votersByCandidateMap.add(newCandidateId, currentVoters.concat([caller]));
          };
          case (null) { Runtime.trap("New candidate not found") };
        };
        votes.add(caller, newCandidateId);
        voteTimestamps.add(caller, Time.now());
      };
      case (null) { Runtime.trap("You have not voted yet") };
    };
  };

  public query ({ caller }) func hasVoted() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    votes.containsKey(caller);
  };

  public query ({ caller }) func getElectionResults() : async [Candidate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    candidates.values().toArray();
  };

  public query ({ caller }) func getVoterList(candidateId : Nat) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    switch (votersByCandidateMap.get(candidateId)) {
      case (?voters) { voters }; case (null) { [] };
    };
  };

  public query ({ caller }) func getElectionStatus() : async { isOpen : Bool; totalVotes : Nat } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    { isOpen = electionOpen; totalVotes = votes.size() };
  };

  public shared ({ caller }) func setElectionOpen(open : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized");
    };
    electionOpen := open;
  };

  // ─── WORK POSTS ───────────────────────────────────────────
  public type WorkPost = {
    id : Nat;
    title : Text;
    description : Text;
    author : Principal;
    timestamp : Int;
  };

  public type WorkResponse = {
    id : Nat;
    postId : Nat;
    responder : Principal;
    message : Text;
    timestamp : Int;
  };

  var nextWorkPostId : Nat = 0;
  var nextWorkResponseId : Nat = 0;
  let workPosts = Map.empty<Nat, WorkPost>();
  let workResponses = Map.empty<Nat, [WorkResponse]>();

  public shared ({ caller }) func createWorkPost(title : Text, description : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    checkNotBanned(caller);
    let id = nextWorkPostId;
    nextWorkPostId += 1;
    workPosts.add(id, { id; title; description; author = caller; timestamp = Time.now() });
    id;
  };

  public shared ({ caller }) func respondToWorkPost(postId : Nat, message : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    checkNotBanned(caller);
    switch (workPosts.get(postId)) {
      case (?_) {
        let id = nextWorkResponseId;
        nextWorkResponseId += 1;
        let response : WorkResponse = { id; postId; responder = caller; message; timestamp = Time.now() };
        let currentResponses = switch (workResponses.get(postId)) {
          case (?r) { r }; case (null) { [] };
        };
        workResponses.add(postId, currentResponses.concat([response]));
        id;
      };
      case (null) { Runtime.trap("Post not found") };
    };
  };

  public query func getAllWorkPosts() : async [WorkPost] {
    workPosts.values().toArray();
  };

  public query func getWorkPostResponses(postId : Nat) : async [WorkResponse] {
    switch (workResponses.get(postId)) {
      case (?r) { r }; case (null) { [] };
    };
  };

  // ─── POLLS ────────────────────────────────────────────────
  public type Poll = {
    id : Nat;
    question : Text;
    options : [Text];
    votes : [Nat];
    creator : Principal;
    timestamp : Int;
  };

  var nextPollId : Nat = 0;
  let polls = Map.empty<Nat, Poll>();
  let pollVotes = Map.empty<Nat, Map.Map<Principal, Nat>>();
  let pollVoteTimestamps = Map.empty<Nat, Map.Map<Principal, Int>>();

  public shared ({ caller }) func createPoll(question : Text, options : [Text]) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    checkNotBanned(caller);
    let id = nextPollId;
    nextPollId += 1;
    polls.add(id, { id; question; options; votes = Array.tabulate(options.size(), func(_) { 0 }); creator = caller; timestamp = Time.now() });
    pollVotes.add(id, Map.empty<Principal, Nat>());
    pollVoteTimestamps.add(id, Map.empty<Principal, Int>());
    id;
  };

  public shared ({ caller }) func voteInPoll(pollId : Nat, optionIndex : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (optionIndex >= 10) { Runtime.trap("Invalid option") };
    switch (polls.get(pollId)) {
      case (?poll) {
        switch (pollVotes.get(pollId)) {
          case (?votesMap) {
            if (votesMap.containsKey(caller)) { Runtime.trap("Already voted") };
            votesMap.add(caller, optionIndex);
            switch (pollVoteTimestamps.get(pollId)) {
              case (?tsMap) { tsMap.add(caller, Time.now()) };
              case (null) {};
            };
            let newVotes = Array.tabulate(poll.options.size(), func(i) {
              if (i == optionIndex) { poll.votes[i] + 1 } else { poll.votes[i] };
            });
            polls.add(pollId, { id = poll.id; question = poll.question; options = poll.options; votes = newVotes; creator = poll.creator; timestamp = poll.timestamp });
          };
          case (null) { Runtime.trap("Poll votes not found") };
        };
      };
      case (null) { Runtime.trap("Poll not found") };
    };
  };

  public query ({ caller }) func getUserVote(pollId : Nat) : async ?Nat {
    switch (pollVotes.get(pollId)) {
      case (?votesMap) { votesMap.get(caller) };
      case (null) { null };
    };
  };

  public shared ({ caller }) func changeVote(pollId : Nat, newOptionIndex : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    if (newOptionIndex >= 10) { Runtime.trap("Invalid option") };
    switch (polls.get(pollId)) {
      case (?poll) {
        switch (pollVotes.get(pollId)) {
          case (?votesMap) {
            switch (votesMap.get(caller)) {
              case (?oldIndex) {
                // check 24hr window
                let voteTime = switch (pollVoteTimestamps.get(pollId)) {
                  case (?tsMap) { switch (tsMap.get(caller)) { case (?t) { t }; case (null) { 0 } } };
                  case (null) { 0 };
                };
                let twentyFourHours : Int = 86_400_000_000_000;
                if (Time.now() - voteTime > twentyFourHours) {
                  Runtime.trap("Vote can only be changed within 24 hours");
                };
                votesMap.add(caller, newOptionIndex);
                let newVotes = Array.tabulate(poll.options.size(), func(i) {
                  if (i == oldIndex and i != newOptionIndex) {
                    if (poll.votes[i] > 0) { poll.votes[i] - 1 } else { 0 };
                  } else if (i == newOptionIndex and i != oldIndex) {
                    poll.votes[i] + 1;
                  } else { poll.votes[i] };
                });
                polls.add(pollId, { id = poll.id; question = poll.question; options = poll.options; votes = newVotes; creator = poll.creator; timestamp = poll.timestamp });
              };
              case (null) { Runtime.trap("Not voted yet") };
            };
          };
          case (null) { Runtime.trap("Poll votes not found") };
        };
      };
      case (null) { Runtime.trap("Poll not found") };
    };
  };

  public query func getAllPolls() : async [Poll] {
    polls.values().toArray();
  };

  // ─── PLANS ────────────────────────────────────────────────
  public type Plan = {
    id : Nat;
    title : Text;
    description : Text;
    dateText : Text;
    creator : Principal;
    timestamp : Int;
  };

  var nextPlanId : Nat = 0;
  let plans = Map.empty<Nat, Plan>();

  public shared ({ caller }) func createPlan(title : Text, description : Text, dateText : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    checkNotBanned(caller);
    let id = nextPlanId;
    nextPlanId += 1;
    plans.add(id, { id; title; description; dateText; creator = caller; timestamp = Time.now() });
    id;
  };

  public shared ({ caller }) func deletePlan(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    switch (plans.get(id)) {
      case (?plan) {
        if (plan.creator != caller) { Runtime.trap("Unauthorized") };
        plans.remove(id);
      };
      case (null) { Runtime.trap("Not found") };
    };
  };

  public query func getAllPlans() : async [Plan] {
    plans.values().toArray();
  };

  // ─── GAME CHALLENGES ──────────────────────────────────────
  public type GameChallenge = {
    id : Nat;
    challengerUsername : Text;
    challengedUsername : Text;
    gameName : Text;
    timestamp : Int;
  };

  var nextChallengeId : Nat = 0;
  let gameChallenges = Map.empty<Nat, GameChallenge>();

  public shared ({ caller }) func sendGameChallenge(challengerUsername : Text, challengedUsername : Text, gameName : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let id = nextChallengeId;
    nextChallengeId += 1;
    gameChallenges.add(id, { id; challengerUsername; challengedUsername; gameName; timestamp = Time.now() });
    id;
  };

  public query ({ caller }) func getPendingChallenges(username : Text) : async [GameChallenge] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    let all = gameChallenges.values().toArray();
    all.filter(func(c : GameChallenge) : Bool { c.challengedUsername == username });
  };

  public shared ({ caller }) func dismissChallenge(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized");
    };
    gameChallenges.remove(id);
  };
};
