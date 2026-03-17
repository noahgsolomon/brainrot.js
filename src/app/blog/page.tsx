import { getAllPosts } from "@/lib/blog";
import Link from "next/link";
import { type Metadata } from "next";
import { Calendar, Clock, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "The Brainrot Blog — meme breakdowns, trend explainers, AI video tips, and more unhinged content.",
  alternates: {
    canonical: "https://brainrotjs.com/blog",
  },
  openGraph: {
    title: "Brainrot.js Blog",
    description:
      "Meme breakdowns, trend explainers, AI video tips, and more.",
    url: "https://brainrotjs.com/blog",
  },
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 pb-20 pt-28">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="text-lg text-muted-foreground">
          Meme breakdowns, trend explainers, and whatever else is rotting our brains this week.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card/50 py-20 text-center">
          <p className="text-xl font-semibold">No posts yet</p>
          <p className="text-muted-foreground">
            Check back soon — we&apos;re cooking something up.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card/50 p-6 transition-colors hover:bg-card/80"
            >
              <h2 className="text-2xl font-bold group-hover:text-pink-500 transition-colors">
                {post.title}
              </h2>
              <p className="text-muted-foreground line-clamp-2">
                {post.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readingTime}
                </span>
                {post.tags.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {post.tags.join(", ")}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
