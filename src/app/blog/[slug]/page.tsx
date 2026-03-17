import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `https://brainrotjs.com/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      tags: post.tags,
      url: `https://brainrotjs.com/blog/${slug}`,
      ...(post.image && { images: [{ url: post.image }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      ...(post.image && { images: [post.image] }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-4 pb-20 pt-28">
      <Link
        href="/blog"
        className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to blog
      </Link>

      <article>
        <header className="flex flex-col gap-4 border-b border-border pb-8">
          <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
          <p className="text-lg text-muted-foreground">{post.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readingTime}
            </span>
            {post.tags.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4" />
                {post.tags.join(", ")}
              </span>
            )}
          </div>
        </header>

        <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none prose-headings:scroll-mt-20 prose-a:text-pink-500 prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg">
          <MarkdownRenderer content={post.content} />
        </div>
      </article>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            author: {
              "@type": "Person",
              name: "Noah Solomon",
              url: "https://twitter.com/noahgsolomon",
            },
            publisher: {
              "@type": "Organization",
              name: "Brainrot.js",
              logo: {
                "@type": "ImageObject",
                url: "https://brainrotjs.com/brainrot_new2.png",
              },
            },
            ...(post.image && { image: post.image }),
            keywords: post.tags.join(", "),
          }),
        }}
      />
    </main>
  );
}
