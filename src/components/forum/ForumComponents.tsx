"use client";
import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  X,
  Lock,
  Send,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useForumRealtime, useSearch } from "@/hooks";
import {
  highlightText,
  timeAgo,
  avatarColor,
  avatarInitials,
  TAG_LABELS,
  TAG_CLASSES,
  cn,
} from "@/lib/utils";
import { EmojiReactions } from "@/components/reactions/EmojiReactions";
import { OnlinePlupp } from "@/components/ui/OnlinePlupp";
import { VoiceChat } from "@/components/voice/VoiceChat";
import { MatchForumChat } from "@/components/match-forum/MatchForumChat";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Post, Comment, MatchForum } from "@/types";
import type { Session } from "@supabase/supabase-js";

// ─── ForumFeed ────────────────────────────────────────────────────────────────
const TAGS = [
  { key: "all", label: "Alla" },
  { key: "match", label: "⚽ Match" },
  { key: "transfer", label: "💼 Transfer" },
  { key: "general", label: "💬 Allmänt" },
  { key: "tactic", label: "📊 Taktik" },
];

export function ForumFeed({
  initialPosts,
  forum,
  session,
  userAlias,
}: {
  initialPosts: Post[];
  forum: { id: string };
  session: Session | null;
  userAlias: string | null;
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [matchForum, setMatchForum] = useState<MatchForum | null>(null);
  const [activeTab, setActiveTab] = useState<"forum" | "match">("forum");
  const searchRef = useRef<HTMLInputElement>(null);
  const {
    query,
    setQuery,
    tagFilter,
    setTagFilter,
    results,
    commentMatchCount,
  } = useSearch(posts, []);
  const { newPosts, typingUsers } = useForumRealtime(
    forum.id,
    session?.user?.id,
    session?.user?.user_metadata?.username,
  );

  useEffect(() => {
    const check = async () => {
      const res = await fetch(`/api/match-forum?forumId=${forum.id}`);
      const data = await res.json();
      setMatchForum(data.matchForum ?? null);
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [forum.id]);

  const matchActive = matchForum?.status === "active";
  const allPosts = useMemo(() => {
    const ids = new Set(newPosts.map((p) => p.id));
    return [...newPosts, ...posts.filter((p) => !ids.has(p.id))];
  }, [posts, newPosts]);
  const filtered = useMemo(() => {
    const base =
      results.length > 0 || query || tagFilter !== "all" ? results : allPosts;
    return base.filter((p) => {
      if (fromDate && new Date(p.created_at) < new Date(fromDate)) return false;
      if (toDate) {
        const t = new Date(toDate);
        t.setHours(23, 59, 59);
        if (new Date(p.created_at) > t) return false;
      }
      return true;
    });
  }, [results, allPosts, query, tagFilter, fromDate, toDate]);

  return (
    <div>
      <VoiceChat forumId={forum.id} session={session} />

      {matchForum &&
        (matchForum.status === "active" || matchForum.status === "closed") && (
          <div
            className={cn(
              "rounded-xl border mb-3 overflow-hidden",
              matchActive ? "border-mp-red/40 bg-mp-red/5" : "border-mp-border",
            )}
          >
            {matchActive && (
              <div className="flex border-b border-mp-border">
                <button
                  onClick={() => setActiveTab("forum")}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-bold transition-colors",
                    activeTab === "forum"
                      ? "bg-mp-s1 text-mp-t0 border-b-2 border-mp-red"
                      : "text-mp-t2 hover:text-mp-t1",
                  )}
                >
                  <i className="fa-solid fa-lock"></i> Forumet (låst)
                </button>
                <button
                  onClick={() => setActiveTab("match")}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2",
                    activeTab === "match"
                      ? "bg-mp-s1 text-mp-red border-b-2 border-mp-red"
                      : "text-mp-red/70 hover:text-mp-red",
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-mp-red animate-pulse-slow" />
                  Live Matchforum
                </button>
              </div>
            )}
            {((matchActive && activeTab === "match") ||
              matchForum.status === "closed") && (
              <div className="p-3">
                <MatchForumChat matchForum={matchForum} session={session} />
              </div>
            )}
          </div>
        )}

      {matchActive && activeTab === "forum" && (
        <div className="flex items-center gap-3 p-3 bg-mp-red/8 border border-mp-red/20 rounded-xl mb-3">
          <Lock size={15} className="text-mp-red flex-shrink-0" />
          <p className="text-xs">
            <span className="font-bold text-mp-red">
              Forumet är låst under matchen.
            </span>
            <span className="text-mp-t1 ml-1">Gå till Live Matchforum.</span>
          </p>
          <button
            onClick={() => setActiveTab("match")}
            className="ml-auto text-xs font-bold text-mp-red hover:underline"
          >
            Gå dit →
          </button>
        </div>
      )}

      {/* Search */}
      <div className="sticky top-0 z-10 bg-mp-bg pt-2 pb-2 space-y-2">
        <div
          className={cn(
            "flex items-center gap-2 bg-mp-s1 border rounded-xl px-3 py-2 transition-colors",
            query
              ? "border-mp-red/50"
              : "border-mp-border focus-within:border-mp-red/50",
          )}
        >
          <Search size={14} className="text-mp-t2 flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-mp-t0 text-sm placeholder:text-mp-t2 min-w-0"
            placeholder="Sök i forumet — ord highlightas direkt..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-mp-t2 hover:text-mp-t0"
            >
              <X size={15} />
            </button>
          )}
          <button
            onClick={() => setShowFilters((f) => !f)}
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors",
              showFilters
                ? "border-mp-red text-mp-red bg-mp-red/10"
                : "border-mp-border text-mp-t2 hover:text-mp-t1",
            )}
          >
            <SlidersHorizontal size={11} />{" "}
            <span className="hidden xs:inline">Filter</span>
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap px-0.5">
          <span className="text-[11px] text-mp-t2">
            {query ? (
              <>
                <span className="text-mp-amber font-bold">
                  {filtered.length}
                </span>{" "}
                inlägg
                {commentMatchCount > 0
                  ? ` · ${commentMatchCount} i kommentarer`
                  : ""}
              </>
            ) : (
              <>{allPosts.length} inlägg</>
            )}
          </span>
          <div className="flex gap-1 flex-wrap">
            {TAGS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTagFilter(t.key)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                  tagFilter === t.key
                    ? "border-mp-red bg-mp-red/12 text-mp-red"
                    : "border-mp-border text-mp-t2 hover:text-mp-t1",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {showFilters && (
          <div className="bg-mp-s1 border border-mp-border rounded-xl p-3 animate-fade-in">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 w-12">
                Från
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="mp-input text-xs py-1.5 flex-1 min-w-[130px]"
              />
              <span className="text-mp-t2 text-xs font-bold">–</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="mp-input text-xs py-1.5 flex-1 min-w-[130px]"
              />
              {(fromDate || toDate) && (
                <button
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                  className="text-xs text-mp-red font-semibold"
                >
                  Rensa
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {typingUsers.length > 0 && !matchActive && (
        <div className="flex items-center gap-2 py-1.5 px-1 text-mp-t2 text-xs">
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-mp-t2 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          {typingUsers[0]} skriver...
        </div>
      )}

      <button
        onClick={() => {
          if (matchActive) {
            setActiveTab("match");
            return;
          }
          if (!session) {
            window.location.href = "/auth/login";
            return;
          }
          setShowModal(true);
        }}
        className={cn(
          "flex items-center gap-2 mb-3 mt-1 rounded-lg px-4 py-2 text-sm font-bold transition-all",
          matchActive
            ? "bg-mp-s2 border border-mp-border text-mp-t2"
            : "btn-primary",
        )}
      >
        {matchActive ? (
          <>
            <Lock size={14} /> Låst under match
          </>
        ) : (
          <>
            <span className="text-base leading-none">+</span> Nytt inlägg
          </>
        )}
      </button>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-mp-t2">
          <div className="text-4xl mb-3">
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <p className="font-semibold text-mp-t1 mb-1">Inga inlägg matchar</p>
          <p className="text-sm">Prova ett annat sökord eller filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              session={session}
              userAlias={userAlias}
              forumId={forum.id}
              searchQuery={query}
              isNew={newPosts.some((p) => p.id === post.id)}
              matchForumActive={matchActive}
            />
          ))}
        </div>
      )}

      <div className="bg-mp-s2 border border-dashed border-mp-border rounded-lg h-12 flex items-center justify-center mt-4">
        <span className="text-[8px] font-bold tracking-widest text-mp-t2 uppercase">
          Annons – mitt i forumet
        </span>
      </div>

      {showModal && session && (
        <NewPostModal
          forumId={forum.id}
          session={session}
          userAlias={userAlias}
          onClose={() => setShowModal(false)}
          onCreated={(p) => {
            setPosts((prev) => [p, ...prev]);
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────
export function PostCard({
  post,
  session,
  userAlias,
  forumId,
  searchQuery = "",
  isNew,
  matchForumActive,
}: {
  post: Post;
  session: Session | null;
  userAlias: string | null;
  forumId: string;
  searchQuery?: string;
  isNew?: boolean;
  matchForumActive?: boolean;
}) {
  const supabase = createClient();
  const [liked, setLiked] = useState(post.user_liked ?? false);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [showReply, setShowReply] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const titleHL = { __html: highlightText(post.title, searchQuery) };
  const bodyHL = { __html: highlightText(post.content, searchQuery) };
  const dispName = userAlias ?? post.alias ?? post.author?.username ?? "Okänd";
  const authorHL = { __html: highlightText(dispName, searchQuery) };
  const isMod =
    post.author?.role === "moderator" || post.author?.role === "admin";

  const loadComments = useCallback(async () => {
    if (loaded) return;
    const { data } = await supabase
      .from("comments")
      .select(
        "*, author:profiles(id,username,default_alias,avatar_url,is_online,role,badge)",
      )
      .eq("post_id", post.id)
      .is("parent_id", null)
      .order("created_at");
    setComments((data as Comment[]) || []);
    setLoaded(true);
  }, [post.id, loaded, supabase]);

  const handleLike = async () => {
    if (!session) {
      window.location.href = "/auth/login";
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next)
      await supabase
        .from("post_likes")
        .insert({ post_id: post.id, user_id: session.user.id });
    else
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", session.user.id);
  };

  const handleReply = async () => {
    if (!session || !replyText.trim()) return;
    setSubmitting(true);
    const { data } = await supabase
      .from("comments")
      .insert({
        post_id: post.id,
        author_id: session.user.id,
        content: replyText.trim(),
        parent_id: null,
      })
      .select(
        "*, author:profiles(id,username,default_alias,avatar_url,is_online,role,badge)",
      )
      .single();
    if (data) {
      setComments((p) => [...p, data as Comment]);
      setLoaded(true);
      setShowAll(true);
    }
    setReplyText("");
    setShowReply(false);
    setSubmitting(false);
  };

  const tagClass = TAG_CLASSES[post.tag] ?? TAG_CLASSES.general;
  const tagLabel = TAG_LABELS[post.tag] ?? "Övrigt";
  const visible = showAll ? comments : comments.slice(0, 1);
  const hidden = comments.length - 1;

  return (
    <article className={cn("post-card", isNew && "new-post")}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="relative flex-shrink-0">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-[7px] font-black text-white"
            style={{ background: avatarColor(post.author?.username ?? "u") }}
          >
            {avatarInitials(post.author?.username ?? "u")}
          </div>
          <OnlinePlupp isOnline={post.author?.is_online ?? false} size="sm" />
        </div>
        <span
          className="text-xs font-bold"
          dangerouslySetInnerHTML={authorHL}
        />
        {post.alias && post.author && (
          <span className="text-[9px] text-mp-t2 bg-mp-s3 px-1.5 py-0.5 rounded">
            {post.author.username}
          </span>
        )}
        {isMod && (
          <span className="text-[8px] bg-mp-amber/20 text-mp-amber px-1.5 rounded font-bold">
            MOD
          </span>
        )}
        <span className="text-[10px] text-mp-t2">
          · {timeAgo(post.created_at)}
        </span>
        {post.like_count > 50 && (
          <span className="text-[10px] text-mp-amber ml-auto">🔥</span>
        )}
      </div>
      <h3
        className="text-[13px] font-bold leading-snug mb-1"
        dangerouslySetInnerHTML={titleHL}
      />
      <p
        className="text-xs text-mp-t1 leading-relaxed"
        dangerouslySetInnerHTML={bodyHL}
      />
      {post.link_url && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-mp-blue hover:underline mt-1 block truncate"
        >
          🔗 {post.link_url}
        </a>
      )}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={cn("tag-pill", tagClass)}>{tagLabel}</span>
        <span className="text-[10px] text-mp-t2">
          {post.comment_count} svar
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={handleLike}
            className={cn("action-btn", liked && "liked")}
          >
            <Heart size={12} fill={liked ? "currentColor" : "none"} />
            <span>{likeCount}</span>
          </button>
          <button
            onClick={() => {
              if (matchForumActive) {
                return;
              }
              if (!session) {
                window.location.href = "/auth/login";
                return;
              }
              setShowReply((f) => !f);
              if (!loaded) loadComments();
            }}
            title={matchForumActive ? "Låst under match" : undefined}
            className={cn(
              "action-btn",
              showReply && "rp",
              matchForumActive && "opacity-40 cursor-not-allowed",
            )}
          >
            <MessageCircle size={12} />
            {matchForumActive ? "🔒 Låst" : "Kommentera"}
          </button>
        </div>
      </div>
      <div className="mt-2">
        <EmojiReactions
          postId={post.id}
          session={session}
          initialReactions={post.reactions ?? []}
        />
      </div>
      {loaded && comments.length > 0 && (
        <div className="mt-3">
          {visible.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              postId={post.id}
              session={session}
              searchQuery={searchQuery}
              depth={0}
              canWrite={!matchForumActive}
            />
          ))}
          {!showAll && hidden > 0 && (
            <button
              onClick={() => {
                setShowAll(true);
                if (!loaded) loadComments();
              }}
              className="show-more mt-1"
            >
              <ChevronDown size={12} /> {hidden} kommentarer till
            </button>
          )}
          {showAll && comments.length > 1 && (
            <button
              onClick={() => setShowAll(false)}
              className="show-more mt-1"
            >
              <ChevronUp size={12} /> Dölj
            </button>
          )}
        </div>
      )}
      {showReply && !matchForumActive && session && (
        <div className="flex gap-2 mt-3 items-start animate-fade-in">
          <div className="relative flex-shrink-0">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-[7px] font-black text-white mt-0.5"
              style={{
                background: avatarColor(
                  session.user.user_metadata?.username ?? "u",
                ),
              }}
            >
              {avatarInitials(session.user.user_metadata?.username ?? "PK")}
            </div>
            <OnlinePlupp isOnline size="sm" />
          </div>
          <textarea
            className="mp-input flex-1 resize-none text-xs"
            rows={2}
            placeholder="Skriv en kommentar..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleReply();
            }}
          />
          <button
            onClick={handleReply}
            disabled={submitting || !replyText.trim()}
            className="btn-primary text-xs py-1.5 px-3"
          >
            Skicka
          </button>
          <button
            onClick={() => setShowReply(false)}
            className="btn-ghost text-xs py-1.5 px-3"
          >
            Avbryt
          </button>
        </div>
      )}
    </article>
  );
}

// ─── CommentThread ────────────────────────────────────────────────────────────
export function CommentThread({
  comment,
  postId,
  session,
  searchQuery = "",
  depth,
  canWrite = true,
}: {
  comment: Comment;
  postId: string;
  session: Session | null;
  searchQuery?: string;
  depth: number;
  canWrite?: boolean;
}) {
  const supabase = createClient();
  const [liked, setLiked] = useState(comment.user_liked ?? false);
  const [likeCount, setLikeCount] = useState(comment.like_count);
  const [showForm, setShowForm] = useState(false);
  const [replies, setReplies] = useState<Comment[]>(comment.replies ?? []);
  const [repliesLoaded, setRepliesLoaded] = useState(!!comment.replies?.length);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const contentHL = { __html: highlightText(comment.content, searchQuery) };
  const name = comment.alias ?? comment.author?.username ?? "Okänd";
  const isMod =
    comment.author?.role === "moderator" || comment.author?.role === "admin";

  const handleLike = async () => {
    if (!session) {
      window.location.href = "/auth/login";
      return;
    }
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    if (next)
      await supabase
        .from("comment_likes")
        .insert({ comment_id: comment.id, user_id: session.user.id });
    else
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", comment.id)
        .eq("user_id", session.user.id);
  };

  const loadReplies = async () => {
    if (repliesLoaded) return;
    const { data } = await supabase
      .from("comments")
      .select(
        "*, author:profiles(id,username,default_alias,avatar_url,is_online,role,badge)",
      )
      .eq("parent_id", comment.id)
      .order("created_at");
    setReplies((data as Comment[]) || []);
    setRepliesLoaded(true);
  };

  const sendReply = async () => {
    if (!session || !text.trim()) return;
    setSubmitting(true);
    const { data } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        parent_id: comment.id,
        author_id: session.user.id,
        content: text.trim(),
      })
      .select(
        "*, author:profiles(id,username,default_alias,avatar_url,is_online,role,badge)",
      )
      .single();
    if (data) {
      setReplies((p) => [...p, data as Comment]);
      setRepliesLoaded(true);
      setShowAllReplies(true);
    }
    setText("");
    setShowForm(false);
    setSubmitting(false);
  };

  const visible = showAllReplies ? replies : replies.slice(0, 1);
  const hidden = replies.length - 1;

  return (
    <div className={cn("flex gap-2 mt-2", depth > 0 && "ml-3.5")}>
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="relative">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[6px] font-black text-white mt-0.5"
            style={{ background: avatarColor(comment.author?.username ?? "u") }}
          >
            {avatarInitials(comment.author?.username ?? "u")}
          </div>
          <OnlinePlupp
            isOnline={comment.author?.is_online ?? false}
            size="sm"
          />
        </div>
        {replies.length > 0 && (
          <div className="w-px flex-1 bg-mp-border mt-1" />
        )}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-[11px] font-bold">{name}</span>
          {comment.alias && comment.author && (
            <span className="text-[9px] text-mp-t2 bg-mp-s3 px-1 rounded">
              {comment.author.username}
            </span>
          )}
          {isMod && (
            <span className="text-[8px] bg-mp-amber/20 text-mp-amber px-1 rounded font-bold">
              MOD
            </span>
          )}
          <span className="text-[10px] text-mp-t2">
            · {timeAgo(comment.created_at)}
          </span>
        </div>
        <p
          className="text-xs text-mp-t1 leading-relaxed"
          dangerouslySetInnerHTML={contentHL}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleLike}
            className={cn("action-btn text-[10px] py-0.5", liked && "liked")}
          >
            <Heart size={10} fill={liked ? "currentColor" : "none"} />
            {likeCount}
          </button>
          {depth < 3 && canWrite && (
            <button
              onClick={() => {
                if (!session) {
                  window.location.href = "/auth/login";
                  return;
                }
                setShowForm((f) => !f);
                loadReplies();
              }}
              className={cn("action-btn text-[10px] py-0.5", showForm && "rp")}
            >
              ↩ Svara
            </button>
          )}
        </div>
        {showForm && session && canWrite && (
          <div className="flex gap-2 mt-2 animate-fade-in">
            <textarea
              className="mp-input flex-1 resize-none text-xs"
              rows={2}
              placeholder={`Svara på ${name}...`}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              onClick={sendReply}
              disabled={submitting || !text.trim()}
              className="btn-primary text-xs py-1 px-2.5"
            >
              Skicka
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-ghost text-xs py-1 px-2"
            >
              Avbryt
            </button>
          </div>
        )}
        {repliesLoaded && replies.length > 0 && (
          <div className="mt-1">
            {visible.map((r) => (
              <CommentThread
                key={r.id}
                comment={r}
                postId={postId}
                session={session}
                searchQuery={searchQuery}
                depth={depth + 1}
                canWrite={canWrite}
              />
            ))}
            {!showAllReplies && hidden > 0 && (
              <button
                onClick={() => setShowAllReplies(true)}
                className="show-more text-[10px]"
              >
                <ChevronDown size={10} /> {hidden} svar till
              </button>
            )}
            {showAllReplies && replies.length > 1 && (
              <button
                onClick={() => setShowAllReplies(false)}
                className="show-more text-[10px]"
              >
                <ChevronUp size={10} /> Dölj
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NewPostModal ─────────────────────────────────────────────────────────────
const postSchema = z.object({
  tag: z.enum(["match", "transfer", "general", "tactic", "other"]),
  title: z.string().min(3, "Minst 3 tecken").max(120),
  content: z.string().min(10, "Minst 10 tecken").max(5000),
  link_url: z
    .string()
    .url("Måste vara en giltig URL")
    .or(z.literal(""))
    .optional(),
  alias: z.string().max(30).optional(),
});
type PostForm = z.infer<typeof postSchema>;

const PTAGS = [
  {
    value: "general",
    label: <i className="fa-regular fa-comment-dots"></i> + " Allmänt",
  },
  {
    value: "match",
    label: <i className="fa-regular fa-futbol"></i> + "Match",
  },
  {
    value: "transfer",
    label: <i className="fa-solid fa-arrow-right-arrow-left"></i> + "Transfer",
  },
  {
    value: "tactic",
    label: <i className="fa-solid fa-chess-board"></i> + "Taktik",
  },
  { value: "other", label: <i className="fa-solid fa-box"></i> + "Övrigt" },
];

export function NewPostModal({
  forumId,
  session,
  userAlias,
  onClose,
  onCreated,
}: {
  forumId: string;
  session: Session;
  userAlias: string | null;
  onClose: () => void;
  onCreated: (p: Post) => void;
}) {
  const supabase = createClient();
  const [showAlias, setShowAlias] = useState(false);
  const [alias, setAlias] = useState(userAlias);
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { tag: "general", alias: userAlias ?? "" },
  });

  const saveAlias = async (a: string) => {
    const t = a.trim();
    await supabase
      .from("user_aliases")
      .upsert(
        { user_id: session.user.id, forum_id: forumId, alias: t },
        { onConflict: "user_id,forum_id" },
      );
    setAlias(t || null);
    setShowAlias(false);
  };

  const onSubmit = async (data: PostForm) => {
    setSaving(true);
    const { data: post } = await supabase
      .from("posts")
      .insert({
        forum_id: forumId,
        author_id: session.user.id,
        title: data.title,
        content: data.content,
        tag: data.tag,
        link_url: data.link_url || null,
      })
      .select(
        "*, author:profiles(id,username,default_alias,avatar_url,is_online,role,badge)",
      )
      .single();
    if (post) onCreated({ ...(post as Post), alias });
    setSaving(false);
  };

  const uname =
    session.user.user_metadata?.username ??
    session.user.email?.split("@")[0] ??
    "Du";

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-mp-s1 border border-mp-border rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-2xl tracking-wide">NYTT INLÄGG</h2>
          <button
            onClick={onClose}
            className="text-mp-t2 hover:text-mp-t0 text-xl"
          >
            ×
          </button>
        </div>
        <div className="flex items-center gap-3 bg-mp-s2 border border-mp-border rounded-lg p-3 mb-4">
          <div className="text-xl">🎭</div>
          <div className="flex-1">
            <div className="text-xs font-bold">{alias || uname}</div>
            <div className="text-[10px] text-mp-t2">
              {alias ? `Alias · ${uname}` : "Ditt användarnamn"}
            </div>
          </div>
          <button
            onClick={() => setShowAlias((v) => !v)}
            className="btn-ghost text-[10px] py-1 px-2"
          >
            Redigera alias
          </button>
        </div>
        {showAlias && (
          <div className="mb-4 animate-fade-in">
            <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">
              Alias för detta forum
            </label>
            <div className="flex gap-2">
              <input
                {...register("alias")}
                className="mp-input flex-1"
                placeholder="Välj ett forumnamn..."
              />
              <button
                type="button"
                onClick={() => saveAlias(watch("alias") ?? "")}
                className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
              >
                Spara
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">
              Ämne
            </label>
            <select {...register("tag")} className="mp-input">
              {PTAGS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">
              Rubrik
            </label>
            <input
              {...register("title")}
              className="mp-input"
              placeholder="Skriv en rubrik..."
            />
            {errors.title && (
              <p className="text-mp-red text-[10px] mt-1">
                {errors.title.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">
              Meddelande
            </label>
            <textarea
              {...register("content")}
              className="mp-input resize-y min-h-[90px]"
              placeholder="Dela dina tankar..."
            />
            {errors.content && (
              <p className="text-mp-red text-[10px] mt-1">
                {errors.content.message}
              </p>
            )}
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-widest text-mp-t2 block mb-1">
              Länk{" "}
              <span className="font-normal text-mp-t2 normal-case tracking-normal">
                (valfritt)
              </span>
            </label>
            <input
              {...register("link_url")}
              className="mp-input"
              placeholder="https://..."
            />
            {errors.link_url && (
              <p className="text-mp-red text-[10px] mt-1">
                {errors.link_url.message}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-ghost">
              Avbryt
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Publicerar..." : "Publicera inlägg"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
